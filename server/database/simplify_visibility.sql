-- 简化可见性控制：删除 is_visible 字段，统一使用 visibility 字段
-- visibility 值: public(公开) | private(私有) | hidden(隐藏)

-- 1. 修改 visibility 枚举类型，添加 hidden 选项
ALTER TABLE photos MODIFY COLUMN visibility ENUM('public', 'private', 'hidden') DEFAULT 'public';

-- 2. 迁移现有数据：is_visible=0 的照片改为 visibility='hidden'
UPDATE photos SET visibility = 'hidden' WHERE is_visible = 0;

-- 3. 删除 is_visible 字段
ALTER TABLE photos DROP COLUMN is_visible;

-- 4. 删除索引（如果存在）
-- 注意：根据实际情况决定是否需要删除相关索引
