-- ============================================
-- 光影手记 / SNAPSHOT — 种子数据脚本
-- 注意：执行前请先运行 schema.sql 建表
-- 默认管理员密码：admin123（bcrypt 哈希）
-- ============================================

USE shimmer;

-- 插入默认管理员账号
-- 密码: admin123
-- bcrypt hash (10 rounds)
INSERT INTO `users` (`username`, `password_hash`, `avatar`) VALUES
('admin', '$2b$10$.qQs8hIiQcdWCqBoLqppPeLrddQepwYwop.APSpyL18/MWcbtQTeu', NULL);
