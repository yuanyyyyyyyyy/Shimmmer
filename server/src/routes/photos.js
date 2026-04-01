import { Router } from 'express';
import { query, getConnection } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';

const router = Router();

// 将 ISO 日期转换为 MYSQL 日期格式
const formatDate = (v) => {
  if (!v) return null;
  if (typeof v === 'string') {
    const match = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    return v;
  }
  return null;
};

// 获取照片列表（公开接口）
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'random', year, month, search, tag } = req.query;
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));
    const safeOffset = Math.max(0, (parseInt(page) - 1) * safeLimit);

    let orderBy;
    switch (sort) {
      case 'date':
        orderBy = 'shot_date DESC, create_time DESC';
        break;
      case 'created':
        orderBy = 'create_time DESC';
        break;
      case 'manual':
        orderBy = 'sort_order DESC, create_time DESC';
        break;
      case 'random':
      default:
        orderBy = 'RAND()';
    }

    let whereClause = 'WHERE p.visibility = "public"';
    const params = [];

    // 搜索支持（标题、心情、地点的模糊搜索）
    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.mood LIKE ? OR p.location LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 标签过滤
    if (tag) {
      // 支持多个标签，用逗号分隔
      const tagIds = tag.split(',').map(t => parseInt(t)).filter(t => !isNaN(t));
      if (tagIds.length > 0) {
        const placeholders = tagIds.map(() => '?').join(',');
        whereClause += ` AND p.id IN (
          SELECT DISTINCT pt.photo_id FROM photo_tags pt 
          WHERE pt.tag_id IN (${placeholders})
        )`;
        params.push(...tagIds);
      }
    }

    if (year) {
      whereClause += ' AND YEAR(p.shot_date) = ?';
      params.push(year);
    }
    if (month) {
      whereClause += ' AND MONTH(p.shot_date) = ?';
      params.push(month);
    }

    // 获取总数
    const [countResult] = await query(
      `SELECT COUNT(DISTINCT p.id) as total FROM photos p ${whereClause}`,
      params
    );
    const total = countResult.total;

    // 获取列表（添加 tags 字段）
    const photos = await query(
      `SELECT p.id, p.title, p.url, p.thumbnail_url, p.mood, p.shot_date, p.location, p.width, p.height,
              p.created_at as create_time, p.latitude, p.longitude
       FROM photos p ${whereClause}
       GROUP BY p.id
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    // 获取每张照片的标签
    if (photos.length > 0) {
      const photoIds = photos.map(p => p.id);
      // 手动构建 IN 子句，因为 execute 不支持 IN (?)
      const placeholders = photoIds.map(() => '?').join(',');
      const photoTags = await query(`
        SELECT pt.photo_id, t.id, t.name, t.color
        FROM photo_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.photo_id IN (${placeholders})
      `, photoIds);

      // 将标签附加到照片对象
      const tagsMap = {};
      for (const pt of photoTags) {
        if (!tagsMap[pt.photo_id]) {
          tagsMap[pt.photo_id] = [];
        }
        tagsMap[pt.photo_id].push({ id: pt.id, name: pt.name, color: pt.color });
      }

      for (const photo of photos) {
        photo.tags = tagsMap[photo.id] || [];
      }
    }

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

// 获取所有照片（管理员专用，返回包括隐藏的所有照片）
router.get('/admin/all', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'created' } = req.query;
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
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
      default:
        orderBy = 'created_at DESC';
    }

    // 获取所有照片（包括隐藏的）
    const photos = await query(
      `SELECT id, title, url, thumbnail_url, original_url, mood, shot_date, location,
              width, height, file_size, sort_order, visibility,
              created_at, user_id, latitude, longitude
       FROM photos
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`
    );

    const [countResult] = await query('SELECT COUNT(*) as total FROM photos');

    res.json({
      data: photos,
      total: countResult.total,
      page: parseInt(page),
      limit: safeLimit,
      totalPages: Math.ceil(countResult.total / safeLimit)
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
      `SELECT p.*, u.username, u.nickname as author_name, u.avatar as author_avatar
       FROM photos p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.visibility = 'public'`,
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

// 获取我的照片（需要登录）
router.get('/my/list', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 12, sort = 'date' } = req.query;
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));
    const safeOffset = Math.max(0, (parseInt(page) - 1) * safeLimit);
    const userId = req.user.id;

    let orderBy;
    switch (sort) {
      case 'date':
        orderBy = 'shot_date DESC, create_time DESC';
        break;
      case 'created':
        orderBy = 'create_time DESC';
        break;
      case 'manual':
        orderBy = 'sort_order DESC, create_time DESC';
        break;
      default:
        orderBy = 'shot_date DESC, create_time DESC';
    }

    // 获取用户自己的照片（所有状态）
    const photos = await query(
      `SELECT id, title, url, thumbnail_url, original_url, mood, shot_date, location,
              width, height, file_size, sort_order, visibility, created_at
       FROM photos
       WHERE user_id = ?
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId]
    );

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM photos WHERE user_id = ?',
      [userId]
    );

    res.json({
      data: photos,
      total: countResult.total,
      page: parseInt(page),
      limit: safeLimit,
      totalPages: Math.ceil(countResult.total / safeLimit)
    });
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
       FROM photos WHERE visibility != 'hidden'
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
       FROM photos WHERE visibility != 'hidden' AND shot_date IS NOT NULL
       GROUP BY YEAR(shot_date) ORDER BY year DESC`
    );

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// 获取地图标记点
router.get('/map/markers', async (req, res, next) => {
  try {
    const markers = await query(
      `SELECT id, title, thumbnail_url, shot_date, location, latitude, longitude
       FROM photos 
       WHERE visibility != 'hidden' AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY shot_date DESC`
    );

    res.json({ markers });
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
      file_size, sort_order, visibility = 'public',
      latitude, longitude
    } = req.body;

    if (!url) {
      throw new ValidationError('图片URL不能为空');
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    const result = await query(
      `INSERT INTO photos (user_id, title, url, thumbnail_url, original_url, mood, shot_date, location, width, height, file_size, sort_order, visibility, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, toNull(title), toNull(url), toNull(thumbnail_url), toNull(original_url), toNull(mood), formatDate(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), sort_order || 0, visibility, toNull(latitude), toNull(longitude)]
    );

    const photos = await query('SELECT * FROM photos WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: '照片创建成功', photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 更新照片（需要登录，且是照片所有者或管理员）
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, url, thumbnail_url, original_url,
      mood, shot_date, location, width, height,
      file_size, sort_order, visibility,
      latitude, longitude
    } = req.body;

    // 获取照片信息
    const existing = await query('SELECT id, user_id FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new ValidationError('照片不存在');
    }

    // 权限检查：只有照片所有者或管理员可以更新
    const isOwner = existing[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: '无权修改此照片' });
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    // 普通用户不能设置 visibility，除非是管理员
    const visibilityValue = isAdmin ? toNull(visibility) : null;


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
        visibility = COALESCE(?, visibility),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude)
       WHERE id = ?`,
      [toNull(title), toNull(url), toNull(thumbnail_url), toNull(original_url), toNull(mood), formatDate(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), toNull(sort_order), visibilityValue, toNull(latitude), toNull(longitude), id]
    );

    const photos = await query('SELECT * FROM photos WHERE id = ?', [id]);
    res.json({ message: '照片更新成功', photo: photos[0] });
  } catch (err) {
    next(err);
  }
});

// 删除照片（需要登录，且是照片所有者或管理员）
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, user_id FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new ValidationError('照片不存在');
    }

    // 权限检查：只有照片所有者或管理员可以删除
    const isOwner = existing[0].user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: '无权删除此照片' });
    }

    await query('DELETE FROM photos WHERE id = ?', [id]);
    res.json({ message: '照片删除成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
