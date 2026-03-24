import { Router } from 'express';
import { query, getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';

const router = Router();

// 获取照片列表（公开接口）
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'random', year, month } = req.query;
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));
    const safeOffset = Math.max(0, (parseInt(page) - 1) * safeLimit);

    let orderBy;
    switch (sort) {
      case 'date':
        orderBy = 'shot_date DESC, created_at DESC';
        break;
      case 'created':
        orderBy = 'created_at DESC';
        break;
      case 'manual':
        orderBy = 'sort_order DESC, created_at DESC';
        break;
      case 'random':
      default:
        orderBy = 'RAND()';
    }

    let whereClause = 'WHERE is_visible = 1';
    const params = [];

    if (year) {
      whereClause += ' AND YEAR(shot_date) = ?';
      params.push(year);
    }
    if (month) {
      whereClause += ' AND MONTH(shot_date) = ?';
      params.push(month);
    }

    // 获取总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM photos ${whereClause}`,
      params
    );
    const total = countResult.total;

    // 获取列表
    const photos = await query(
      `SELECT id, title, url, thumbnail_url, mood, shot_date, location, width, height
       FROM photos ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    res.json({
      data: photos,
      total,
      page: parseInt(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    });
  } catch (err) {
    next(err);
  }
});

// 获取单张照片详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const photos = await query(
      `SELECT id, title, url, thumbnail_url, original_url, mood, shot_date, location,
              width, height, file_size, sort_order, is_visible, created_at
       FROM photos WHERE id = ? AND is_visible = 1`,
      [id]
    );

    if (photos.length === 0) {
      throw new ValidationError('照片不存在或已隐藏');
    }

    res.json({ photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 获取随机照片（用于暗房手电筒效果）
router.get('/random/diary', async (req, res, next) => {
  try {
    // 只要上传成功就显示，不要求必须填写mood等信息
    const photos = await query(
      `SELECT id, title, url, thumbnail_url, mood, shot_date, location
       FROM photos WHERE is_visible = 1
       ORDER BY RAND() LIMIT 1`
    );

    if (photos.length === 0) {
      return res.json({ photo: null });
    }

    res.json({ photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 获取照片统计数据（时间轴）
router.get('/stats/timeline', async (req, res, next) => {
  try {
    const stats = await query(
      `SELECT YEAR(shot_date) as year, COUNT(*) as count
       FROM photos WHERE is_visible = 1 AND shot_date IS NOT NULL
       GROUP BY YEAR(shot_date) ORDER BY year DESC`
    );

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// 以下为需要认证的管理员接口

// 创建照片
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      title, url, thumbnail_url, original_url,
      mood, shot_date, location, width, height,
      file_size, sort_order, is_visible = 1
    } = req.body;

    if (!url) {
      throw new ValidationError('图片URL不能为空');
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    const result = await query(
      `INSERT INTO photos (user_id, title, url, thumbnail_url, original_url, mood, shot_date, location, width, height, file_size, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, url, toNull(thumbnail_url), toNull(original_url), toNull(mood), toNull(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), sort_order || 0, is_visible]
    );

    const photos = await query('SELECT * FROM photos WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: '照片创建成功', photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 更新照片
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, url, thumbnail_url, original_url,
      mood, shot_date, location, width, height,
      file_size, sort_order, is_visible
    } = req.body;

    const existing = await query('SELECT id FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new ValidationError('照片不存在');
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    await query(
      `UPDATE photos SET
        title = COALESCE(?, title),
        url = COALESCE(?, url),
        thumbnail_url = COALESCE(?, thumbnail_url),
        original_url = COALESCE(?, original_url),
        mood = COALESCE(?, mood),
        shot_date = COALESCE(?, shot_date),
        location = COALESCE(?, location),
        width = COALESCE(?, width),
        height = COALESCE(?, height),
        file_size = COALESCE(?, file_size),
        sort_order = COALESCE(?, sort_order),
        is_visible = COALESCE(?, is_visible)
       WHERE id = ?`,
      [title, url, toNull(thumbnail_url), toNull(original_url), toNull(mood), toNull(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), toNull(sort_order), toNull(is_visible), id]
    );

    const photos = await query('SELECT * FROM photos WHERE id = ?', [id]);
    res.json({ message: '照片更新成功', photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 删除照片
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new ValidationError('照片不存在');
    }

    await query('DELETE FROM photos WHERE id = ?', [id]);
    res.json({ message: '照片删除成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
