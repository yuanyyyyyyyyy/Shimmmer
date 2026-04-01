import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取所有标签
router.get('/', async (req, res, next) => {
  try {
    const [tags] = await db.query(`
      SELECT t.*, COUNT(pt.photo_id) as photo_count
      FROM tags t
      LEFT JOIN photo_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY photo_count DESC, t.name ASC
    `);
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// 获取热门标签（使用最多的前 N 个）
router.get('/popular', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [tags] = await db.query(`
      SELECT t.*, COUNT(pt.photo_id) as photo_count
      FROM tags t
      LEFT JOIN photo_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY photo_count DESC
      LIMIT ?
    `, [limit]);
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// 创建标签（需要登录）- 如果标签已存在则返回已有的标签
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    // 先检查是否已存在
    const [existing] = await db.query('SELECT * FROM tags WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.json({ tag: existing[0], message: '标签已存在' });
    }

    const [result] = await db.query(
      'INSERT INTO tags (name, color) VALUES (?, ?)',
      [name.trim(), color || '#3b82f6']
    );

    const [tags] = await db.query('SELECT * FROM tags WHERE id = ?', [result.insertId]);
    res.status(201).json({ tag: tags[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // 并发情况下再次检查
      const [existing] = await db.query('SELECT * FROM tags WHERE name = ?', [name.trim()]);
      if (existing.length > 0) {
        return res.json({ tag: existing[0], message: '标签已存在' });
      }
    }
    next(error);
  }
});

// 删除标签（需要登录）
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM tags WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    res.json({ message: '标签已删除' });
  } catch (error) {
    next(error);
  }
});

// 获取照片的标签
router.get('/photo/:photoId', async (req, res, next) => {
  try {
    const { photoId } = req.params;
    
    const [tags] = await db.query(`
      SELECT t.* FROM tags t
      JOIN photo_tags pt ON t.id = pt.tag_id
      WHERE pt.photo_id = ?
    `, [photoId]);
    
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// 为照片添加标签（需要登录）
router.post('/photo/:photoId', authenticateToken, async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { tagIds } = req.body;
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ error: '请提供标签 ID 数组' });
    }
    
    // 删除现有关联
    await db.query('DELETE FROM photo_tags WHERE photo_id = ?', [photoId]);
    
    // 添加新关联
    for (const tagId of tagIds) {
      await db.query(
        'INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)',
        [photoId, tagId]
      );
    }
    
    res.json({ message: '标签已更新' });
  } catch (error) {
    next(error);
  }
});

export default router;
