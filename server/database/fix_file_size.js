/**
 * 修复照片 file_size 脚本
 * 用法：node fix_file_size.js
 * 
 * 此脚本会：
 * 1. 查找所有 file_size 为 NULL 或 0 的照片
 * 2. 根据 URL 计算实际文件大小
 * 3. 更新数据库中的 file_size 字段
 */

import fs from 'fs';
import path from 'path';
import { query } from '../src/config/database.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取上传目录路径
const uploadDir = path.join(__dirname, '..', 'uploads', 'compressed');

async function fixFileSize() {
  console.log('🔍 开始修复照片 file_size...\n');

  // 1. 查找需要修复的照片
  const photos = await query(
    'SELECT id, url FROM photos WHERE file_size IS NULL OR file_size = 0'
  );

  if (photos.length === 0) {
    console.log('✅ 所有照片的 file_size 都已正确设置');
    return;
  }

  console.log(`📷 找到 ${photos.length} 张照片需要修复\n`);

  let fixed = 0;
  let failed = 0;

  for (const photo of photos) {
    try {
      // 从 URL 提取文件名
      // URL 格式: http://localhost:3000/uploads/compressed/xxx.jpg
      // 或 /uploads/compressed/xxx.jpg
      const url = photo.url || '';
      const filename = url.split('/').pop() || url.split('/uploads/').pop();

      if (!filename) {
        console.log(`  ⚠️ 照片 ${photo.id}: 无法解析文件名`);
        failed++;
        continue;
      }

      const filePath = path.join(uploadDir, filename);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️ 照片 ${photo.id}: 文件不存在 - ${filename}`);
        // 设置一个默认值
        await query(
          'UPDATE photos SET file_size = 200 WHERE id = ?',
          [photo.id]
        );
        fixed++;
        continue;
      }

      // 计算文件大小（KB）
      const stats = fs.statSync(filePath);
      const fileSizeKB = Math.round(stats.size / 1024);

      // 更新数据库
      await query(
        'UPDATE photos SET file_size = ? WHERE id = ?',
        [fileSizeKB, photo.id]
      );

      console.log(`  ✅ 照片 ${photo.id}: ${filename} -> ${fileSizeKB} KB`);
      fixed++;
    } catch (err) {
      console.log(`  ❌ 照片 ${photo.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 修复完成: ${fixed} 成功, ${failed} 失败`);
}

// 运行脚本
fixFileSize()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
