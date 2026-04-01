-- =====================================================
-- 方案B：完整用户系统 - 数据库迁移脚本（MySQL 兼容版）
-- =====================================================

-- 1. users 表新增字段
ALTER TABLE `users`
  ADD COLUMN `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT '角色：admin=管理员, user=普通用户' AFTER `password_hash`;

ALTER TABLE `users`
  ADD COLUMN `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称（显示名）' AFTER `username`;

ALTER TABLE `users`
  ADD COLUMN `bio` VARCHAR(200) DEFAULT NULL COMMENT '个人简介' AFTER `avatar`;

-- 将现有管理员设置为 admin 角色
UPDATE `users` SET `role` = 'admin' WHERE `username` = 'admin';

-- 2. photos 表改造
-- 2.1 先删除现有的外键约束（如果存在）
-- 注意：如果外键不存在会报错，请手动忽略
-- 先查询外键名称再删除
SELECT CONSTRAINT_NAME INTO @fk_name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'photos'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND CONSTRAINT_NAME LIKE '%user%';

SET @drop_fk = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `photos` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1');
PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.2 删除现有索引（如果存在）
SET @drop_idx = IF(EXISTS(
  SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'photos' AND INDEX_NAME = 'idx_user_id'
), 'ALTER TABLE `photos` DROP INDEX `idx_user_id`', 'SELECT 1');
PREPARE stmt FROM @drop_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.3 新增 visibility 字段
ALTER TABLE `photos`
  ADD COLUMN `visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public' COMMENT '可见性：public=公开, private=仅自己可见' AFTER `is_visible`;

-- 2.4 修改 user_id 为可空
ALTER TABLE `photos`
  MODIFY COLUMN `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '照片所有者用户ID';

-- 2.5 重新添加 user_id 索引（不带外键，允许 NULL）
ALTER TABLE `photos` ADD INDEX `idx_user_id` (`user_id`);

-- 3. favorites 表改造
ALTER TABLE `favorites`
  ADD COLUMN `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '用户ID（登录用户）' AFTER `photo_id`;

ALTER TABLE `favorites`
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER `created_at`;

-- 添加 user_id 索引
ALTER TABLE `favorites` ADD INDEX `idx_user_id` (`user_id`);

-- 4. 新建关注表（后续扩展用）
CREATE TABLE IF NOT EXISTS `follows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `follower_id` BIGINT UNSIGNED NOT NULL COMMENT '关注者ID',
  `following_id` BIGINT UNSIGNED NOT NULL COMMENT '被关注者ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_follow` (`follower_id`, `following_id`),
  INDEX `idx_follower` (`follower_id`),
  INDEX `idx_following` (`following_id`),
  CONSTRAINT `fk_follows_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_follows_following` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关注关系表';
