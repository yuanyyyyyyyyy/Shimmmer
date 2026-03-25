-- ============================================
-- 光影手记 / SNAPSHOT — GPS 坐标迁移脚本
-- ============================================

USE shimmer;

-- --------------------------------------------
-- 为 photos 表添加 GPS 字段
-- --------------------------------------------
ALTER TABLE `photos` 
  ADD COLUMN `latitude` DECIMAL(10, 8) NULL COMMENT 'GPS 纬度' AFTER `location`,
  ADD COLUMN `longitude` DECIMAL(11, 8) NULL COMMENT 'GPS 经度' AFTER `latitude`;

CREATE INDEX `idx_location_coords` ON `photos` (`latitude`, `longitude`);
