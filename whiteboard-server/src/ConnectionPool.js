/**
 * 连接池管理类
 * 用于管理 WebSocket 连接的统计和日志
 */
export class ConnectionPool {
  constructor() {
    this.connections = new Map() // 存储活跃连接
    this.totalConnections = 0    // 累计连接数
    this.totalDisconnections = 0 // 累计断开数
  }

  /**
   * 添加连接到连接池
   * @param {string} connectionId - 连接 ID
   * @param {object} info - 连接信息
   */
  add(connectionId, info) {
    this.connections.set(connectionId, {
      ...info,
      connectedAt: Date.now()
    })
    this.totalConnections++
    this.printStatus('connect', connectionId)
  }

  /**
   * 从连接池移除连接
   * @param {string} connectionId - 连接 ID
   */
  remove(connectionId) {
    const connInfo = this.connections.get(connectionId)
    const duration = connInfo ? Date.now() - connInfo.connectedAt : 0

    this.connections.delete(connectionId)
    this.totalDisconnections++
    this.printStatus('disconnect', connectionId, duration)

    return { connInfo, duration }
  }

  /**
   * 获取连接信息
   * @param {string} connectionId - 连接 ID
   * @returns {object|null}
   */
  get(connectionId) {
    return this.connections.get(connectionId) || null
  }

  /**
   * 获取活跃连接数
   * @returns {number}
   */
  getActiveCount() {
    return this.connections.size
  }

  /**
   * 获取统计信息
   * @returns {object}
   */
  getStats() {
    return {
      active: this.connections.size,
      total: this.totalConnections,
      disconnections: this.totalDisconnections
    }
  }

  /**
   * 打印连接池状态日志
   * @param {string} action - 操作类型
   * @param {string} connectionId - 连接 ID
   * @param {number} duration - 连接时长 (ms)
   */
  printStatus(action, connectionId, duration = 0) {
    console.log('=== 连接池状态 ===')
    console.log(`操作：${action}`)
    console.log(`连接 ID: ${connectionId}`)
    if (duration > 0) {
      console.log(`在线时长：${duration}ms`)
    }
    console.log(`活跃连接数：${this.connections.size}`)
    console.log(`累计连接数：${this.totalConnections}`)
    console.log(`累计断开数：${this.totalDisconnections}`)
    console.log('==================')
  }
}
