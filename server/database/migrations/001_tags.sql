-- ============================================
-- 光影手记 / SNAPSHOT — 标签功能迁移脚本
-- ============================================

USE shimmer;

-- --------------------------------------------
-- 1. 标签表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS `tags` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签 ID',
  `name`        VARCHAR(50)     NOT NULL COMMENT '标签名称',
  `color`       VARCHAR(20)     DEFAULT '#3b82f6' COMMENT '标签颜色',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- --------------------------------------------
-- 2. 照片-标签关联表
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS `photo_tags` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关联 ID',
  `photo_id`    BIGINT UNSIGNED NOT NULL COMMENT '照片 ID',
  `tag_id`      BIGINT UNSIGNED NOT NULL COMMENT '标签 ID',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_photo_tag` (`photo_id`, `tag_id`),
  INDEX `idx_tag_id` (`tag_id`),

  CONSTRAINT `fk_photo_tags_photo_id`
    FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_photo_tags_tag_id`
    FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='照片-标签关联表';

-- --------------------------------------------
-- 3. 为 photos 表添加全文索引（支持搜索）
-- --------------------------------------------
-- MySQL 5.6+ 支持全文索引
ALTER TABLE `photos` ADD FULLTEXT INDEX `ft_title_mood_location` (`title`, `mood`, `location`);
