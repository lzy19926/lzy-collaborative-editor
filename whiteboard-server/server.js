import http from 'http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync.js'
import * as awarenessProtocol from 'y-protocols/awareness.js'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

// 消息类型常量
const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

const PORT = 1234
const HOST = 'localhost'

// 存储房间的 Y.Doc
const docs = new Map()
// 存储每个 WebSocket 连接的状态
const wsStates = new Map()
// 存储每个房间的客户端集合
const roomClients = new Map()

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('Yjs WebSocket Server\n')
})

const wss = new WebSocketServer({ noServer: true })

function getDoc(roomName) {
  let doc = docs.get(roomName)
  if (!doc) {
    doc = new Y.Doc()
    docs.set(roomName, doc)

    // 监听 Y.Doc 的 update 事件，广播给房间内所有客户端
    doc.on('update', (update, origin) => {
      // 如果 origin 是服务器自己（来自某个客户端的更新），则广播给其他客户端
      if (origin !== null && origin !== 'server') {
        broadcastUpdate(roomName, update, origin)
      }
    })

    console.log(`[room] created: ${roomName}`)
  }
  return doc
}

// 广播 Y.Doc update 给房间内**其他**客户端（不广播回发送者）
function broadcastUpdate(roomName, update, origin) {
  const clients = roomClients.get(roomName)
  if (!clients) return

  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeUpdate(encoder, update)
  const message = encoding.toUint8Array(encoder)

  let sentCount = 0
  for (const ws of clients) {
    // 不广播回发送者
    if (ws !== origin && ws.readyState === 1) {
      ws.send(message)
      sentCount++
    }
  }

  console.log(`[broadcast] ${roomName}: sent update (${message.length} bytes) to ${sentCount} clients (origin excluded)`)
}

// 广播 awareness 给房间内其他客户端
function broadcastAwareness(roomName, sender, update) {
  const clients = roomClients.get(roomName)
  if (!clients) return

  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeVarUint8Array(encoder, update)
  const message = encoding.toUint8Array(encoder)

  let sentCount = 0
  for (const ws of clients) {
    if (ws !== sender && ws.readyState === 1) {
      ws.send(message)
      sentCount++
    }
  }

  console.log(`[broadcast] ${roomName}: sent awareness (${message.length} bytes) to ${sentCount} clients`)
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const roomName = url.pathname.slice(1) || 'default'

  const currentClients = roomClients.get(roomName)?.size || 0
  console.log(`[connect] room: ${roomName}, existing clients: ${currentClients}`)

  const doc = getDoc(roomName)
  const awareness = new awarenessProtocol.Awareness(doc)

  // 将客户端添加到房间
  if (!roomClients.has(roomName)) {
    roomClients.set(roomName, new Set())
  }
  roomClients.get(roomName).add(ws)

  const totalClients = roomClients.get(roomName).size
  console.log(`[connect] ${roomName}: added client, total: ${totalClients}`)

  wsStates.set(ws, { doc, awareness, roomName })

  ws.on('message', (data) => {
    try {
      const message = new Uint8Array(data)
      if (message.length === 0) {
        console.log(`[recv] empty message from ${roomName}`)
        return // 忽略空消息
      }

      const decoder = decoding.createDecoder(message)
      const type = decoding.readVarUint(decoder)

      switch (type) {
        case messageSync: {
          // 创建响应 encoder
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageSync)
          // 读取客户端的 sync 消息并响应，传入 ws 作为 origin
          syncProtocol.readSyncMessage(decoder, encoder, doc, ws)
          // 如果有响应，发送回去
          if (encoding.length(encoder) > 1) {
            const response = encoding.toUint8Array(encoder)
            console.log(`[recv] sync message (${message.length} bytes), sending response (${response.length} bytes)`)
            ws.send(response)
          } else {
            console.log(`[recv] sync message (${message.length} bytes), applied update`)
          }
          break
        }
        case messageAwareness: {
          const update = decoding.readVarUint8Array(decoder)
          console.log(`[recv] awareness message (${message.length} bytes), update: ${update.length} bytes`)
          if (update.length > 0) {
            awarenessProtocol.applyAwarenessUpdate(awareness, update, ws)
            broadcastAwareness(roomName, ws, update)
          }
          break
        }
        case messageQueryAwareness: {
          console.log(`[recv] query awareness (${message.length} bytes)`)
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageAwareness)
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(awareness, [...awareness.getStates().keys()])
          )
          ws.send(encoding.toUint8Array(encoder))
          break
        }
      }
    } catch (err) {
      console.error('[error]', err)
    }
  })

  ws.on('close', () => {
    const clients = roomClients.get(roomName)
    const remaining = clients ? clients.size - 1 : 0
    console.log(`[disconnect] room: ${roomName}, closing client, remaining: ${remaining}`)
    if (clients) {
      clients.delete(ws)
      if (clients.size === 0) {
        roomClients.delete(roomName)
        docs.delete(roomName)
        console.log(`[room] removed: ${roomName}`)
      } else {
        console.log(`[room] ${roomName}: ${clients.size} clients remaining`)
      }
    }
    wsStates.delete(ws)
  })

  ws.on('error', (err) => {
    console.error('[ws error]', err)
  })
})

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`)
})
