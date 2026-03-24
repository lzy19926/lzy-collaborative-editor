import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from '@y/websocket-server/utils'
import { v4 as uuidv4 } from 'uuid'
import { ConnectionPool } from './ConnectionPool.js'

const PORT = 1234
const HOST = 'localhost'

// 创建连接池实例
const pool = new ConnectionPool()

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('Yjs WebSocket Server\n')
})

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ noServer: true })

// 处理连接
wss.on('connection', (ws, req) => {
  // 生成连接 ID (UUID)
  const connectionId = `conn_${uuidv4()}`

  // 获取客户端信息
  const clientIp = req.socket.remoteAddress
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const roomName = url.pathname.slice(1) || 'default'

  // 添加到连接池
  pool.add(connectionId, { ws, clientIp, roomName })

  console.log(`[connect] ${connectionId} - IP: ${clientIp}, Room: ${roomName}`)

  // Yjs 官方连接处理
  setupWSConnection(ws, req, { docName: roomName })

  // 处理断开连接
  ws.on('close', () => {
    pool.remove(connectionId)
    console.log(`[disconnect] ${connectionId}`)
  })

  // 处理错误
  ws.on('error', (err) => {
    console.error(`[error] ${connectionId} - ${err.message}`)
  })
})

// 处理协议升级
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

// 启动服务
server.listen(PORT, HOST, () => {
  console.log(`Yjs WebSocket 服务运行在：ws://${HOST}:${PORT}`)
  console.log('======================================')
})
