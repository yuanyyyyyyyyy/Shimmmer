import { Router } from 'express';
import { query, getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';

const router = Router();

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

    let whereClause = 'WHERE p.is_visible = 1';
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

// 获取地图标记点
router.get('/map/markers', async (req, res, next) => {
  try {
    const markers = await query(
      `SELECT id, title, thumbnail_url, shot_date, location, latitude, longitude
       FROM photos 
       WHERE is_visible = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
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
      file_size, sort_order, is_visible = 1,
      latitude, longitude
    } = req.body;

    if (!url) {
      throw new ValidationError('图片URL不能为空');
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    const result = await query(
      `INSERT INTO photos (user_id, title, url, thumbnail_url, original_url, mood, shot_date, location, width, height, file_size, sort_order, is_visible, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, url, toNull(thumbnail_url), toNull(original_url), toNull(mood), toNull(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), sort_order || 0, is_visible, toNull(latitude), toNull(longitude)]
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
      file_size, sort_order, is_visible,
      latitude, longitude
    } = req.body;

    const existing = await query('SELECT id FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      throw new ValidationError('照片不存在');
    }

    // 将 undefined 和空字符串转换为 null
    const toNull = (v) => (v === undefined || v === '' ? null : v);

    //将ISO日期转换为MYSQL日期格式
    const formatDate = (v) => {
      if(!v) return null;
      if(typeof v === 'string'){
        // 如果字符串是ISO格式(YYYY-MM-DDTHH:mm:ss.sssZ)，提取日期部分
        const match = v.match(/^(\d{4}-\d{2}-\d{2})/); //  
        if(match) return match[1]; 
        return v; //已经是YYYY-MM-DD格式，直接返回
      }
      return null;
    };

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
        is_visible = COALESCE(?, is_visible),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude)
       WHERE id = ?`,
      [title, url, toNull(thumbnail_url), toNull(original_url), toNull(mood), formatDate(shot_date), toNull(location), toNull(width), toNull(height), toNull(file_size), toNull(sort_order), toNull(is_visible), toNull(latitude), toNull(longitude), id]
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
