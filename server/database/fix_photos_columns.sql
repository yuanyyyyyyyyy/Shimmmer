-- =====================================================
-- 修复 photos 表缺失列
-- =====================================================

-- 1. 添加 visibility 列（如果不存在）
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'photos' 
    AND COLUMN_NAME = 'visibility'
);

SET @add_visibility = IF(@column_exists = 0,
  'ALTER TABLE `photos` ADD COLUMN `visibility` ENUM(''public'', ''private'') NOT NULL DEFAULT ''public'' COMMENT ''可见性：public=公开, private=仅自己可见'' AFTER `is_visible`',
  'SELECT ''visibility column already exists'''
);

PREPARE stmt FROM @add_visibility;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 添加 latitude 列
SET @lat_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'photos' 
    AND COLUMN_NAME = 'latitude'
);

SET @add_latitude = IF(@lat_exists = 0,
  'ALTER TABLE `photos` ADD COLUMN `latitude` DECIMAL(10, 8) DEFAULT NULL COMMENT ''拍摄地点纬度'' AFTER `location`',
  'SELECT ''latitude column already exists'''
);

PREPARE stmt FROM @add_latitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 添加 longitude 列
SET @lng_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'photos' 
    AND COLUMN_NAME = 'longitude'
);

SET @add_longitude = IF(@lng_exists = 0,
  'ALTER TABLE `photos` ADD COLUMN `longitude` DECIMAL(11, 8) DEFAULT NULL COMMENT ''拍摄地点经度'' AFTER `latitude`',
  'SELECT ''longitude column already exists'''
);

PREPARE stmt FROM @add_longitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证结果
SELECT 'Migration completed. Columns in photos table:' AS message;
SHOW COLUMNS FROM photos;
