import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';

const router = Router();

// 获取收藏列表（支持用户ID和指纹）
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { fingerprint } = req.query;

    // 优先使用用户ID（登录用户）
    if (req.user) {
      const favorites = await query(
        `SELECT f.id, f.created_at, f.photo_id,
                p.title, p.url, p.thumbnail_url, p.mood, p.shot_date, p.location
         FROM favorites f
         JOIN photos p ON f.photo_id = p.id
         WHERE f.user_id = ? AND p.visibility != 'hidden'
         ORDER BY f.created_at DESC`,
        [req.user.id]
      );

      return res.json({ favorites, isLoggedIn: true });
    }

    // 未登录用户使用指纹
    if (!fingerprint) {
      return res.status(400).json({ error: '缺少访客标识' });
    }

    const favorites = await query(
      `SELECT f.id, f.created_at, f.photo_id,
              p.title, p.url, p.thumbnail_url, p.mood, p.shot_date, p.location
       FROM favorites f
       JOIN photos p ON f.photo_id = p.id
       WHERE f.fingerprint = ? AND f.user_id IS NULL AND p.visibility != 'hidden'
       ORDER BY f.created_at DESC`,
      [fingerprint]
    );

    res.json({ favorites, isLoggedIn: false });
  } catch (err) {
    next(err);
  }
});

// 检查是否已收藏
router.get('/check', optionalAuth, async (req, res, next) => {
  try {
    const { photo_id, fingerprint } = req.query;

    if (!photo_id) {
      return res.status(400).json({ error: '缺少照片ID' });
    }

    // 优先检查用户收藏
    if (req.user) {
      const userFavorites = await query(
        'SELECT id FROM favorites WHERE photo_id = ? AND user_id = ?',
        [photo_id, req.user.id]
      );
      return res.json({ isFavorited: userFavorites.length > 0, isLoggedIn: true });
    }

    // 未登录检查指纹收藏
    if (!fingerprint) {
      return res.json({ isFavorited: false, isLoggedIn: false });
    }

    const favorites = await query(
      'SELECT id FROM favorites WHERE photo_id = ? AND fingerprint = ? AND user_id IS NULL',
      [photo_id, fingerprint]
    );

    res.json({ isFavorited: favorites.length > 0, isLoggedIn: false });
  } catch (err) {
    next(err);
  }
});

// 添加收藏
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { photo_id, fingerprint } = req.body;
    const userId = req.user.id;

    if (!photo_id) {
      throw new ValidationError('缺少照片ID');
    }

    // 检查照片是否存在且可见
    const photos = await query(
      'SELECT id FROM photos WHERE id = ? AND visibility != ?',
      [photo_id, 'hidden']
    );
    if (photos.length === 0) {
      throw new ValidationError('照片不存在或已隐藏');
    }

    // 检查是否已收藏（同一用户不能重复收藏）
    const existing = await query(
      'SELECT id FROM favorites WHERE photo_id = ? AND user_id = ?',
      [photo_id, userId]
    );

    if (existing.length > 0) {
      throw new ValidationError('已收藏过该照片');
    }

    const result = await query(
      'INSERT INTO favorites (photo_id, user_id, fingerprint) VALUES (?, ?, ?)',
      [photo_id, userId, fingerprint || null]
    );

    res.status(201).json({
      message: '收藏成功',
      favorite: { id: result.insertId, photo_id, user_id: userId }
    });
  } catch (err) {
    next(err);
  }
});

// 取消收藏
router.delete('/:photo_id', authenticateToken, async (req, res, next) => {
  try {
    const { photo_id } = req.params;

    // 使用用户ID删除（登录用户）
    const result = await query(
      'DELETE FROM favorites WHERE photo_id = ? AND user_id = ?',
      [photo_id, req.user.id]
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
