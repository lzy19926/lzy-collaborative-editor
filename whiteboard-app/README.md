# 协作白板应用 (Whiteboard App)

基于 Tldraw 和 Yjs 的实时协作白板应用。

## 功能

- 实时多人协作白板
- 支持画笔、形状、文本等基础工具
- 断线重连自动同步

## 启动说明

### 1. 启动服务端

```bash
cd ../whiteboard-server
npm start
```

服务端将在 `http://localhost:1234` 启动。

### 2. 启动前端

```bash
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 3. 验证

打开多个浏览器标签访问 `http://localhost:5173`，在任一标签中的操作将实时同步到其他标签。

## 部署说明

### 服务端部署

服务端是纯 WebSocket 服务，可部署到任何支持 Node.js 的平台：

- Docker: 构建并运行 `whiteboard-server` 容器
- VPS: 直接使用 `node server.js` 运行
- Heroku/Railway: 使用 `npm start` 作为启动命令

### 前端部署

构建静态文件：

```bash
npm run build
```

将 `dist/` 目录部署到任意静态托管服务（Vercel、Netlify、GitHub Pages 等）。

确保前端能访问服务端 WebSocket 地址，可通过环境变量配置：

```
VITE_WEBSOCKET_URL=ws://your-server-url:1234
```
