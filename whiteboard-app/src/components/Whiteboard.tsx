import { Tldraw, useEditor, type TLRecord } from 'tldraw'
import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import 'tldraw/tldraw.css'

const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:1234'
const ROOM_NAME = 'default-room'

// ==================== 同步工具函数 ====================

/**
 * 判断是否为需要同步的记录类型（只同步 shape，不同步 camera/instance 等视口相关）
 */
function shouldSyncRecord(record: TLRecord): boolean {
  const typeName = record.typeName
  // 只同步 shape 类型的记录
  return typeName === 'shape'
}

/**
 * 从记录列表中过滤出需要同步的记录
 */
function filterSyncRecords(records: TLRecord[]): TLRecord[] {
  return records.filter(shouldSyncRecord)
}

/**
 * 同步新增/更新的记录到编辑器
 */
function syncRecordsPut(editor: ReturnType<typeof useEditor>, records: TLRecord[]) {
  const syncRecords = filterSyncRecords(records)
  if (!syncRecords || syncRecords.length === 0) return
  editor.store.mergeRemoteChanges(() => {
    editor.store.put(syncRecords)
  })
}

/**
 * 同步删除记录（删除本地有但远程没有的形状记录）
 */
function syncRecordsRemove(editor: ReturnType<typeof useEditor>, remoteRecords: TLRecord[]) {
  const remoteShapeIds = new Set(
    remoteRecords.filter(shouldSyncRecord).map(r => r.id)
  )
  const idsToRemove: string[] = []

  for (const localRecord of editor.store.allRecords()) {
    // 只删除形状记录
    if (localRecord.typeName === 'shape' && !remoteShapeIds.has(localRecord.id)) {
      idsToRemove.push(localRecord.id)
    }
  }

  if (idsToRemove.length > 0) {
    editor.store.mergeRemoteChanges(() => {
      editor.store.remove(idsToRemove as any)
    })
  }
}

/**
 * 从 Yjs 加载状态到编辑器
 */
function loadStateFromYjs(ystate: Y.Map<unknown>, editor: ReturnType<typeof useEditor>) {
  const recordsJson = ystate.get('records')
  if (!recordsJson || typeof recordsJson !== 'string') return

  try {
    const records = JSON.parse(recordsJson) as TLRecord[]
    if (!records || records.length === 0) return

    syncRecordsPut(editor, records)
    syncRecordsRemove(editor, records)
  } catch (e) {
    console.error('Failed to load state:', e)
  }
}

/**
 * 处理 Yjs 远程状态变化
 */
function handleYjsChange(ystate: Y.Map<unknown>, editor: ReturnType<typeof useEditor>) {
  const recordsJson = ystate.get('records')
  if (!recordsJson || typeof recordsJson !== 'string') return

  try {
    const records = JSON.parse(recordsJson) as TLRecord[]
    syncRecordsPut(editor, records)
    syncRecordsRemove(editor, records)
    console.log('[sync] applied remote state', records.length, 'records')
  } catch (e) {
    console.error('Failed to apply remote state:', e)
  }
}

/**
 * 保存编辑器状态到 Yjs（只保存形状记录）
 */
function saveStateToYjs(ystate: Y.Map<unknown>, editor: ReturnType<typeof useEditor>) {
  const allRecords = Array.from(editor.store.allRecords())
  const shapeRecords = filterSyncRecords(allRecords)
  ystate.set('records', JSON.stringify(shapeRecords))
  console.log('[sync] saved state to yjs', shapeRecords.length, 'shapes')
}

/**
 * 清理 WebSocket 连接和相关资源
 */
function cleanupConnection(
  provider: WebsocketProvider | null,
  ydoc: Y.Doc | null,
  unsubscribeEditor: (() => void) | null
) {
  console.log('[ws] cleaning up connection')
  unsubscribeEditor?.()
  provider?.destroy()
  ydoc?.destroy()
}

// ==================== React 组件 ====================

function YjsSync() {
  const editor = useEditor()
  const initializedRef = useRef(false)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const ystateRef = useRef<Y.Map<unknown> | null>(null)
  const unsubscribeEditorRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!editor) return
    if (initializedRef.current) return

    initializedRef.current = true

    // 步骤 1: 初始化 Yjs 文档和 Provider
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(WS_URL, ROOM_NAME, ydoc)
    ydocRef.current = ydoc
    providerRef.current = provider

    // 步骤 2: 获取 Y.Map 用于存储状态
    const ystate = ydoc.getMap('tldraw')
    ystateRef.current = ystate

    // 步骤 3: 监听 Yjs 远程变化
    const handleChange = () => handleYjsChange(ystate, editor)
    ystate.observeDeep(handleChange)

    // 步骤 4: 订阅本地编辑器变化并保存
    const unsubscribeEditor = editor.store.listen((changes) => {
      if (changes.source === 'user') {
        saveStateToYjs(ystate, editor)
      }
    }, { scope: 'document' })
    unsubscribeEditorRef.current = unsubscribeEditor

    // 步骤 5: 加载初始状态
    loadStateFromYjs(ystate, editor)

    console.log('[ws] connected to', WS_URL, 'room:', ROOM_NAME)

    // 清理函数
    return () => {
      cleanupConnection(provider, ydoc, unsubscribeEditor)
      providerRef.current = null
      ydocRef.current = null
      unsubscribeEditorRef.current = null
      initializedRef.current = false
    }
  }, [editor])

  return null
}

function Whiteboard() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Tldraw inferDarkMode forceMobile={false}>
        <YjsSync />
      </Tldraw>
    </div>
  )
}

export default Whiteboard
