import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();

// 获取可回顾的年份列表（需要放在 /:year 前面）
router.get('/years', async (req, res, next) => {
  try {
    const years = await query(
      `SELECT DISTINCT YEAR(shot_date) as year
       FROM photos 
       WHERE is_visible = 1 AND shot_date IS NOT NULL
       ORDER BY year DESC`
    );

    res.json({ years: years.map(y => y.year) });
  } catch (err) {
    next(err);
  }
});

// 获取年度回顾数据
router.get('/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    const yearInt = parseInt(year);
    
    if (isNaN(yearInt)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // 1. 年度照片统计
    const yearStats = await query(
      `SELECT 
        COUNT(*) as total_photos,
        SUM(file_size) as total_size
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ?`,
      [yearInt]
    );

    // 2. 月度分布
    const monthlyStats = await query(
      `SELECT 
        MONTH(shot_date) as month,
        COUNT(*) as count
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ? AND shot_date IS NOT NULL
       GROUP BY MONTH(shot_date)
       ORDER BY month`,
      [yearInt]
    );

    // 3. 热门标签 TOP 10
    const topTags = await query(
      `SELECT t.id, t.name, t.color, COUNT(pt.photo_id) as count
       FROM tags t
       JOIN photo_tags pt ON t.id = pt.tag_id
       JOIN photos p ON pt.photo_id = p.id
       WHERE p.is_visible = 1 AND YEAR(p.shot_date) = ?
       GROUP BY t.id
       ORDER BY count DESC
       LIMIT 10`,
      [yearInt]
    );

    // 4. 热门地点 TOP 10
    const topLocations = await query(
      `SELECT location, COUNT(*) as count
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ? AND location IS NOT NULL AND location != ''
       GROUP BY location
       ORDER BY count DESC
       LIMIT 10`,
      [yearInt]
    );

    // 5. 首次和最后的照片日期
    const dateRange = await query(
      `SELECT 
        MIN(shot_date) as first_photo,
        MAX(shot_date) as last_photo
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ? AND shot_date IS NOT NULL`,
      [yearInt]
    );

    // 6. 照片尺寸统计
    const sizeStats = await query(
      `SELECT 
        AVG(width) as avg_width,
        AVG(height) as avg_height,
        MIN(width) as min_width,
        MAX(width) as max_width
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ? AND width IS NOT NULL`,
      [yearInt]
    );

    // 7. 有 GPS 坐标的照片数
    const gpsStats = await query(
      `SELECT COUNT(*) as count
       FROM photos 
       WHERE is_visible = 1 AND YEAR(shot_date) = ? AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [yearInt]
    );

    res.json({
      year: yearInt,
      totalPhotos: yearStats[0].total_photos || 0,
      totalSize: yearStats[0].total_size || 0,
      monthlyStats,
      topTags,
      topLocations,
      firstPhoto: dateRange[0].first_photo,
      lastPhoto: dateRange[0].last_photo,
      avgWidth: sizeStats[0].avg_width ? Math.round(sizeStats[0].avg_width) : 0,
      avgHeight: sizeStats[0].avg_height ? Math.round(sizeStats[0].avg_height) : 0,
      photosWithGps: gpsStats[0].count || 0
    });
  } catch (err) {
    next(err);
  }
});

export default router;
