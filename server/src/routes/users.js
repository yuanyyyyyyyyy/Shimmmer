import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 获取用户公开信息
router.get('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    const users = await query(
      'SELECT id, username, nickname, avatar, bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 统计用户的公开照片数量
    const photoCount = await query(
      'SELECT COUNT(*) as count FROM photos WHERE user_id = ? AND visibility = "public"',
      [userId]
    );

    res.json({
      user: {
        ...users[0],
        photoCount: photoCount[0].count
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取用户的公开照片列表
router.get('/:id/photos', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    // 获取用户信息
    const users = await query('SELECT id, username, nickname FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取照片列表
    const photos = await query(
      `SELECT id, url, thumbnail_url, title, description, shot_date, camera, lens,
              aperture, shutter_speed, iso, location_name, tags, visibility,
              user_id, created_at
       FROM photos
       WHERE user_id = ? AND visibility = 'public'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // 获取总数
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM photos WHERE user_id = ? AND visibility = "public"',
      [userId]
    );

    res.json({
      user: users[0],
      photos,
      pagination: {
        page,
        limit,
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 更新当前用户资料（需要登录）
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { nickname, bio, avatar } = req.body;
    const userId = req.user.id;

    // 验证昵称长度
    if (nickname && (nickname.length < 2 || nickname.length > 50)) {
      return res.status(400).json({ error: '昵称长度需在2-50个字符之间' });
    }

    // 验证简介长度
    if (bio && bio.length > 200) {
      return res.status(400).json({ error: '简介长度不能超过200个字符' });
    }

    await query(
      'UPDATE users SET nickname = ?, bio = ?, avatar = ? WHERE id = ?',
      [nickname || null, bio || null, avatar || null, userId]
    );

    // 返回更新后的用户信息
    const users = await query(
      'SELECT id, username, nickname, avatar, role, bio FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: '资料更新成功',
      user: users[0]
    });
  } catch (err) {
    next(err);
  }
});

// 获取用户列表（仅管理员）
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const users = await query(
      `SELECT id, username, nickname, avatar, role, bio, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const totalResult = await query('SELECT COUNT(*) as total FROM users');

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 修改用户角色（仅管理员）
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }

    // 不能修改自己的角色
    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能修改自己的角色' });
    }

    const result = await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ message: '角色修改成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
