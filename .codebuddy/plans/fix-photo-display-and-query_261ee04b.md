---
name: fix-photo-display-and-query
overview: 修复照片无法显示和列表查询报错的根本原因：LIMIT/OFFSET 参数化绑定错误、Admin页面缺少认证token导致列表请求失败、暗房照片显示为黑色。
todos:
  - id: fix-limit-offset
    content: 修复 photos.js 中 LIMIT/OFFSET 参数绑定导致 mysqld_stmt_execute 错误
    status: completed
---

## 产品概述

修复照片上传后无法在首页、暗房、后台管理页面正常显示的问题。

## 核心问题

- `/api/photos` 接口返回 `{"error":"Incorrect arguments to mysqld_stmt_execute"}`，导致首页、后台管理页面无法加载照片列表
- 根因：`pool.execute()` 使用 prepared statement，`LIMIT ?` 和 `OFFSET ?` 作为绑定参数时类型校验严格，query string 传入的字符串类型无法通过检查
- 暗房"显示黑色"是其设计预期（手电筒探索效果），暗房接口本身可以正常返回数据

## Tech Stack

- 后端: Node.js + Express + mysql2/promise
- 前端: Vue 3 + Vite
- 数据库: MySQL 8.x

## Implementation Approach

将 `LIMIT ? OFFSET ?` 从 prepared statement 参数绑定改为安全值拼接。`page`、`limit`、`offset` 均为内部派生的整数值（由 `Math.max/Math.min` 钳位），不来自用户直接输入的字符串，拼接安全。

## Implementation Notes

- `query` 函数使用 `pool.execute()`（第22行），prepared statement 对 `LIMIT`/`OFFSET` 参数类型严格检查
- 需要同时修复第12行的 `offset` 计算，确保在安全值钳位之后计算
- 暗房的"黑色"是 CSS `filter: blur(20px) brightness(0.3)` 的设计效果，无需修改

## Directory Structure

```
server/src/routes/
  photos.js  # [MODIFY] 修复 LIMIT/OFFSET 参数绑定方式
```