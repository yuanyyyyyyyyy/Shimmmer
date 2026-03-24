import { Router } from 'express';
import { query } from '../config/database.js';
import { ValidationError } from '../middleware/error.js';

const router = Router();

// 获取访客收藏列表
router.get('/', async (req, res, next) => {
  try {
    const { fingerprint } = req.query;

    if (!fingerprint) {
      return res.status(400).json({ error: '缺少访客标识' });
    }

    const favorites = await query(
      `SELECT f.id, f.created_at, f.photo_id,
              p.title, p.url, p.thumbnail_url, p.mood, p.shot_date, p.location
       FROM favorites f
       JOIN photos p ON f.photo_id = p.id
       WHERE f.fingerprint = ? AND p.is_visible = 1
       ORDER BY f.created_at DESC`,
      [fingerprint]
    );

    res.json({ favorites });
  } catch (err) {
    next(err);
  }
});

// 检查是否已收藏
router.get('/check', async (req, res, next) => {
  try {
    const { photo_id, fingerprint } = req.query;

    if (!photo_id || !fingerprint) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const favorites = await query(
      'SELECT id FROM favorites WHERE photo_id = ? AND fingerprint = ?',
      [photo_id, fingerprint]
    );

    res.json({ isFavorited: favorites.length > 0 });
  } catch (err) {
    next(err);
  }
});

// 添加收藏
router.post('/', async (req, res, next) => {
  try {
    const { photo_id, fingerprint } = req.body;

    if (!photo_id || !fingerprint) {
      throw new ValidationError('缺少必要参数');
    }

    // 检查照片是否存在
    const photos = await query('SELECT id FROM photos WHERE id = ? AND is_visible = 1', [photo_id]);
    if (photos.length === 0) {
      throw new ValidationError('照片不存在或已隐藏');
    }

    // 检查是否已收藏
    const existing = await query(
      'SELECT id FROM favorites WHERE photo_id = ? AND fingerprint = ?',
      [photo_id, fingerprint]
    );

    if (existing.length > 0) {
      throw new ValidationError('已收藏过该照片');
    }

    const result = await query(
      'INSERT INTO favorites (photo_id, fingerprint) VALUES (?, ?)',
      [photo_id, fingerprint]
    );

    res.status(201).json({
      message: '收藏成功',
      favorite: { id: result.insertId, photo_id, fingerprint }
    });
  } catch (err) {
    next(err);
  }
});

// 取消收藏
router.delete('/:photo_id', async (req, res, next) => {
  try {
    const { photo_id } = req.params;
    const { fingerprint } = req.query;

    if (!fingerprint) {
      throw new ValidationError('缺少访客标识');
    }

    const result = await query(
      'DELETE FROM favorites WHERE photo_id = ? AND fingerprint = ?',
      [photo_id, fingerprint]
    );

    if (result.affectedRows === 0) {
      throw new ValidationError('收藏记录不存在');
    }

    res.json({ message: '取消收藏成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
