# React + Tldraw 协作白板

一个极简的实时协作白板应用，使用 Tldraw 作为画布，Yjs 解决冲突，WebSocket 进行通信。

## 项目结构

```
web_learn/
├── whiteboard-app/      # 前端 (Vite + React + Tldraw + Yjs)
└── whiteboard-server/   # 后端 (Node.js + y-websocket)
```

## 快速开始

### 1. 启动服务端

打开终端：

```bash
cd whiteboard-server
npm install
npm start
```

服务端将在 `ws://localhost:1234` 启动。

### 2. 启动前端

打开新终端：

```bash
cd whiteboard-app
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 3. 测试协作

- 打开多个浏览器标签访问 `http://localhost:5173`
- 在一个标签中绘制内容
- 观察其他标签自动同步

## 技术栈

### 前端
- **构建工具**: Vite
- **框架**: React + TypeScript
- **画布**: Tldraw v4
- **协作**: Yjs + y-websocket

### 后端
- **运行时**: Node.js
- **WebSocket**: ws
- **协作协议**: y-websocket

## 功能

- [x] 画布绘制（画笔、形状、文本、便签等）
- [x] Yjs 状态同步
- [x] WebSocket 通信
- [x] 断线重连
- [ ] 数据持久化（服务端重启后数据保留）
- [ ] 多房间支持

## 环境变量

前端支持以下环境变量（`.env` 文件）：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `VITE_WEBSOCKET_URL` | `ws://localhost:1234` | WebSocket 服务端地址 |

## 部署

### 服务端

```bash
cd whiteboard-server
npm install
PORT=1234 npm start
```

### 前端

```bash
cd whiteboard-app
npm install
npm run build
# 部署 dist 目录到任意静态托管服务
```

## 注意事项

1. **当前版本**: 这是一个极简实现，Yjs 同步功能已集成但需要更完善的冲突解决逻辑
2. **持久化**: 当前服务端重启后数据会丢失，可添加 y-leveldb 实现持久化
3. **认证**: 无认证机制，仅限内网/测试环境使用

## 后续改进

- 添加 y-leveldb 实现数据持久化
- 实现多房间支持（通过 URL 参数）
- 添加用户认证
- 优化 Yjs 同步逻辑，实现真正的实时协作
