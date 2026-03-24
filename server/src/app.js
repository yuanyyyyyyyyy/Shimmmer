import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.js';
import photoRoutes from './routes/photos.js';
import favoriteRoutes from './routes/favorites.js';
import uploadRoutes from './routes/upload.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

// 静态文件服务 - 提供上传的图片访问
app.use('/uploads', express.static(path.join(process.cwd(), uploadDir)));

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api', uploadRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: '光影手记 API',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📸 光影手记 API 服务已启动`);
});

export default app;
