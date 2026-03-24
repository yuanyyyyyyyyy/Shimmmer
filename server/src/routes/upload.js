import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';

const router = express.Router();

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const thumbnailDir = path.join(uploadDir, 'thumbnails');
const compressedDir = path.join(uploadDir, 'compressed');

[uploadDir, thumbnailDir, compressedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer 配置
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'), false);
    }
  }
});

// 图片处理函数
async function processImage(buffer, filename) {
  const ext = '.jpg';
  const name = uuidv4();
  
  // 压缩图 (1920px 宽度)
  const compressedPath = path.join(compressedDir, name + ext);
  await sharp(buffer)
    .resize(1920, null, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(compressedPath);
  
  // 缩略图 (400px 宽度)
  const thumbnailPath = path.join(thumbnailDir, name + ext);
  await sharp(buffer)
    .resize(400, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
  
  // 获取图片尺寸
  const metadata = await sharp(buffer).metadata();
  
  return {
    url: `/uploads/compressed/${name}${ext}`,
    thumbnailUrl: `/uploads/thumbnails/${name}${ext}`,
    width: metadata.width,
    height: metadata.height,
    fileSize: Math.round(fs.statSync(compressedPath).size / 1024) // KB
  };
}

// 上传单张图片
router.post('/upload', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('请选择要上传的图片');
    }

    const processed = await processImage(req.file.buffer, req.file.originalname);
    
    res.json({
      message: '上传成功',
      ...processed
    });
  } catch (err) {
    next(err);
  }
});

// 上传多张图片
router.post('/upload-multiple', authenticateToken, upload.array('photos', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ValidationError('请选择要上传的图片');
    }

    const results = await Promise.all(
      req.files.map(file => processImage(file.buffer, file.originalname))
    );

    res.json({
      message: `成功上传 ${results.length} 张图片`,
      photos: results
    });
  } catch (err) {
    next(err);
  }
});

// 静态文件服务
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.use('/uploads', express.static(path.join(__dirname, '../../', uploadDir)));

export default router;
