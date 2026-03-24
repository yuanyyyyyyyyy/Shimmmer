-- ============================================
-- 光影手记 / SNAPSHOT — 数据库建表脚本
-- 数据库：MySQL 8.x
-- 字符集：utf8mb4（支持完整 Unicode，含 emoji）
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS shimmer
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE shimmer;

-- --------------------------------------------
-- 1. 用户表（管理员账户）
-- --------------------------------------------
DROP TABLE IF EXISTS `photos`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户 ID',
  `username`    VARCHAR(50)     NOT NULL COMMENT '用户名（唯一，用于登录）',
  `password_hash` VARCHAR(255)  NOT NULL COMMENT '密码哈希（bcrypt）',
  `avatar`      VARCHAR(500)    DEFAULT NULL COMMENT '头像 URL',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员用户表';


-- --------------------------------------------
-- 2. 照片表
-- --------------------------------------------
CREATE TABLE `photos` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '照片 ID',
  `user_id`       BIGINT UNSIGNED NOT NULL COMMENT '上传者（管理员）ID',
  `title`         VARCHAR(200)    DEFAULT NULL COMMENT '照片标题',
  `url`           VARCHAR(500)    NOT NULL COMMENT '原图 URL（压缩后 200-500KB）',
  `thumbnail_url` VARCHAR(500)    DEFAULT NULL COMMENT '缩略图 URL（用于列表展示）',
  `original_url`  VARCHAR(500)    DEFAULT NULL COMMENT '原始未压缩图片 URL（可选备份）',
  `mood`          TEXT            DEFAULT NULL COMMENT '心情文字（一句话日记）',
  `shot_date`     DATE            DEFAULT NULL COMMENT '拍摄日期',
  `location`      VARCHAR(200)    DEFAULT NULL COMMENT '拍摄地点',
  `width`         INT UNSIGNED    DEFAULT NULL COMMENT '图片宽度（px，瀑布流布局用）',
  `height`        INT UNSIGNED    DEFAULT NULL COMMENT '图片高度（px，瀑布流布局用）',
  `file_size`     INT UNSIGNED    DEFAULT NULL COMMENT '压缩后文件大小（KB）',
  `sort_order`    INT             DEFAULT 0 COMMENT '手动排序权重，越大越靠前',
  `is_visible`    TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '是否公开：1=公开，0=隐藏',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（上传时间）',
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_visible` (`is_visible`),
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_shot_date` (`shot_date`),
  INDEX `idx_visible_created` (`is_visible`, `created_at`),
  INDEX `idx_visible_sort` (`is_visible`, `sort_order`),

  CONSTRAINT `fk_photos_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='照片表';


-- --------------------------------------------
-- 3. 收藏表（访客收藏）
-- --------------------------------------------
CREATE TABLE `favorites` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏 ID',
  `photo_id`    BIGINT UNSIGNED NOT NULL COMMENT '照片 ID',
  `fingerprint` VARCHAR(64)     NOT NULL COMMENT '访客浏览器指纹（唯一标识匿名用户）',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_photo_fingerprint` (`photo_id`, `fingerprint`),
  INDEX `idx_fingerprint_created` (`fingerprint`, `created_at`),

  CONSTRAINT `fk_favorites_photo_id`
    FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客收藏表';
