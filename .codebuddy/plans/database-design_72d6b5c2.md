---
name: database-design
overview: 为光影手记项目设计完整的 MySQL 数据库方案，包含 users、photos、favorites 三张表的详细字段定义、索引设计、外键约束和初始化 SQL 脚本
todos:
  - id: create-server-directory
    content: 创建 server/database 目录结构
    status: completed
  - id: write-schema-sql
    content: 编写 server/database/schema.sql 建表脚本（users、photos、favorites 含索引和外键）
    status: completed
    dependencies:
      - create-server-directory
  - id: write-seed-sql
    content: 编写 server/database/seed.sql 种子数据脚本（默认管理员账号）
    status: completed
    dependencies:
      - create-server-directory
  - id: write-database-doc
    content: 编写 docs/database-design.md 数据库设计文档（含 Mermaid ER 图和字段说明）
    status: completed
    dependencies:
      - write-schema-sql
      - write-seed-sql
---

## 用户需求

为"光影手记 / SNAPSHOT"项目设计完整的 MySQL 数据库，从需求文档附录 5.2 的概要设计细化到可直接执行的 SQL 建表语句。

## 具体内容

- 设计 `users`、`photos`、`favorites` 三张表的完整字段（类型、约束、索引、默认值）
- 编写 SQL 建表脚本文件
- 编写初始化种子数据（默认管理员账号等）
- 编写数据库设计文档，包含 ER 图和字段说明

## 约束

- MySQL 8.x
- 管理员认证用 JWT，`users` 表需存储 bcrypt 哈希密码
- 收藏功能针对未登录访客，用浏览器指纹标识，需同时支持 `session_id` 和 `photo_id` 的联合唯一约束
- 照片支持分页查询、随机排序、时间轴排序，需合理建立索引
- 单张照片压缩后 200-500KB，需存储原图 URL 和缩略图 URL

## Tech Stack

- 数据库：MySQL 8.x
- 认证：JWT（后端 jsonwebtoken + bcryptjs）
- 图片处理：Sharp（服务端压缩生成缩略图）

## Implementation Approach

### 表设计策略

基于需求文档附录 5.2 概要，结合全部 14 项功能需求，细化三张表的字段设计：

1. **`users` 表**：管理员账户表。字段保持精简（id, username, password_hash, avatar, created_at, updated_at），使用 `username` 唯一索引。初始种子数据插入一个默认管理员账号。

2. **`photos` 表**：照片主表，承载核心业务数据。除概要中的字段外，补充 `title`（照片标题）、`width`/`height`（原始尺寸，用于瀑布流布局）、`file_size`（压缩后大小）、`sort_order`（手动排序权重）、`is_visible`（是否公开）。索引覆盖 `created_at`（时间轴排序）、`sort_order`（手动排序）、`is_visible`（过滤公开照片）。

3. **`favorites` 表**：访客收藏表。使用 `fingerprint`（浏览器指纹，VARCHAR 64）标识匿名访客，联合 `photo_id` 建立唯一约束防止重复收藏。复合索引 `(fingerprint, created_at)` 支持按访客查询收藏列表并按时间排序。

### ER 关系

- `users` 1:N `photos`（一个管理员可上传多张照片）
- `photos` 1:N `favorites`（一张照片可被多个访客收藏）
- `favorites` N:1 `photos`（通过 `photo_id` 外键关联）

### 输出物

- `server/database/schema.sql` — 建表 DDL + 索引 + 外键
- `server/database/seed.sql` — 种子数据（默认管理员）
- `docs/database-design.md` — 数据库设计文档（含 Mermaid ER 图）

## Directory Structure

```
d:\Improve\Project\Mine\Shimmer\
├── docs/
│   ├── requirements-analysis.md   # [已有] 需求分析文档
│   └── database-design.md         # [新建] 数据库设计文档，含 ER 图和字段说明
└── server/                        # [新建] 后端项目根目录
    └── database/
        ├── schema.sql             # [新建] 完整建表 DDL
        └── seed.sql               # [新建] 种子数据脚本
```

## Agent Extensions

无需要使用的扩展。本任务为纯数据库设计文档编写，不涉及代码探索或技能调用。