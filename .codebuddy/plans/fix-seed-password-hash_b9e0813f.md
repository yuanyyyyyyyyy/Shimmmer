---
name: fix-seed-password-hash
overview: 修复 seed.sql 中错误的 bcrypt 哈希值，使其正确匹配 admin123 密码
todos:
  - id: fix-seed-hash
    content: 修改 seed.sql 中 admin 用户的 bcrypt 哈希为正确值
    status: completed
---

## 问题分析

`seed.sql` 中的 bcrypt 哈希值 `$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Kz2L3lGtNH4FMBjJGYvOq` 不是 `admin123` 的正确哈希（经实测验证，该哈希与 admin123 和 password 均不匹配），导致登录时 bcrypt.compare 返回 false。

## 修复方案

1. 修改 `seed.sql`，使用预先验证过的正确 bcrypt 哈希替换错误哈希
2. 提供 UPDATE SQL 语句，用于修复用户已执行过的数据库中的记录

## 修复方案

**根因**：seed.sql 中硬编码的 bcrypt 哈希是无效的示例值，不对应任何密码。bcrypt 每次生成的哈希因含随机 salt 而不同，但只要用正确的算法生成就一定能通过 compare 验证。

**策略**：将 seed.sql 中的哈希替换为通过 `bcrypt.hash('admin123', 10)` 实际生成的正确哈希值。同时考虑到用户可能已经执行过旧版 seed.sql，需提供 UPDATE 语句修复已有数据库记录。

**实现步骤**：

1. 更新 `server/database/seed.sql`，将 INSERT 语句中的哈希替换为正确值
2. 提示用户在 MySQL 中执行 UPDATE 语句修复已插入的错误记录