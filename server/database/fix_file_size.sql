-- 修复照片 file_size 的脚本
-- 此脚本需要根据实际服务器上的文件来计算大小

-- 1. 查看有多少照片 file_size 为空
SELECT COUNT(*) as null_count FROM photos WHERE file_size IS NULL OR file_size = 0;

-- 2. 临时方案：给没有 file_size 的照片设置一个估算值（200KB）
-- 适合服务器文件已删除或无法计算的情况
-- UPDATE photos SET file_size = 200 WHERE file_size IS NULL OR file_size = 0;

-- 3. 如果文件还在，可以通过 URL 路径手动计算
-- 示例（需要根据实际 URL 格式调整）：
-- SELECT id, url FROM photos WHERE file_size IS NULL OR file_size = 0;
