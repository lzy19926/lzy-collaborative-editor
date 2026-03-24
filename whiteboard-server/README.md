# 协作白板服务端 (Whiteboard Server)

基于 Yjs 和 WebSocket 的实时协作服务端。

## 功能

- WebSocket 实时通信
- Yjs CRDT 数据同步
- 多房间支持（通过 URL 路径）
- 感知状态（Awareness）广播

## 启动说明

```bash
npm install
npm start
```

服务端将在 `http://localhost:1234` 启动。

## 配置

通过环境变量配置：

- `PORT`: 端口号（默认：1234）
- `HOST`: 主机地址（默认：localhost）

示例：
```bash
PORT=8080 HOST=0.0.0.0 node server.js
```

## 房间

房间名称通过 WebSocket URL 路径指定：

- `ws://localhost:1234/room-1` - 房间 1
- `ws://localhost:1234/room-2` - 房间 2
- `ws://localhost:1234/` - 默认房间

## 协议

使用 y-websocket 标准协议，与 `y-websocket` 客户端兼容。
