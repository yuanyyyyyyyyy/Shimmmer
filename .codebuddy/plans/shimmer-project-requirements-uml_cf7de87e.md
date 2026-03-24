---
name: shimmer-project-requirements-uml
overview: 为"光影手记(SNAPSHOT)"个人摄影日记平台完成课程实践要求的项目需求分析文档（项目概述、功能/非功能性需求）和 UML 建模（用例图、活动图、时序图），技术栈为 Vue3 + Node.js/Express + MySQL。
todos:
  - id: create-requirements-doc
    content: 创建 docs/requirements-analysis.md 需求分析与UML建模文档，包含项目概述、角色定义、功能需求、非功能需求
    status: completed
  - id: create-usecase-diagram
    content: 在文档中编写 Mermaid 用例图，包含访客和管理员角色及至少4个功能用例
    status: completed
    dependencies:
      - create-requirements-doc
  - id: create-activity-diagram
    content: 在文档中编写 Mermaid 活动图，描述管理员登录并上传照片添加心情文字的完整业务流程
    status: completed
    dependencies:
      - create-requirements-doc
  - id: create-sequence-diagram
    content: 在文档中编写 Mermaid 时序图，描述前端从后端获取照片列表的交互过程（含用户/浏览器/后端API/数据库）
    status: completed
    dependencies:
      - create-requirements-doc
---

## Product Overview

**"光影手记 / SNAPSHOT"** -- 一个个人摄影日记平台，以 Vue3 + Node.js/Express + MySQL 前后端分离架构实现。核心创意：照片网格展示 + 鼠标划过随机区域高亮（暗房手电筒效果）+ 点击弹出心情文字（一句话日记）。

## 核心用户角色与诉求

| 角色 | 核心诉求 |
| --- | --- |
| **访客** | 浏览照片作品集，通过鼠标划过发现照片隐藏细节，点击查看照片背后的心情故事 |
| **管理员（博主）** | 登录后台，上传/编辑/删除照片及心情文字，管理作品展示 |


## 功能性需求

### 模块一：摄影作品展示（前台核心）

- 瀑布流/网格展示所有照片，每次刷新随机排列
- 鼠标划过照片时，随机区域出现光晕高亮效果（暗房手电筒）
- 点击照片弹出详情卡片：心情文字、拍摄日期、地点
- 照片加载/划过/点击均有柔和过渡动画
- 懒加载，图片按需加载

### 模块二：照片管理（后台）

- 管理员登录/登出认证
- 照片上传（支持自动压缩）
- 为照片添加/编辑心情文字、日期、地点
- 照片删除/编辑

### 模块三：浏览模式

- 时间轴视图：按时间顺序浏览照片
- 随机日记："今日幸运照片"按钮，随机展示一张照片和它的故事
- 收藏精选：标记喜欢的照片，形成精选集

### 模块四：API 接口

- RESTful 风格接口：照片 CRUD、管理员认证、收藏管理

## 非功能性需求

| 维度 | 要求 |
| --- | --- |
| **性能** | 首屏加载 < 2秒；单张照片压缩至 200KB-500KB；支持懒加载 |
| **安全性** | 管理员登录 JWT 鉴权保护后台接口；图片上传校验（格式/大小） |
| **易用性** | 响应式适配移动端（移动端高亮改为点击触发）；暖色调/胶片感 UI 风格 |
| **可维护性** | 前后端分离，RESTful API，模块化代码结构 |


## UML 建模要求

1. **用例图**：包含访客、管理员两个角色，以及浏览照片、划过高亮、查看心情文字、随机日记、收藏照片、管理员登录、上传照片、编辑照片、删除照片等用例
2. **活动图**：针对"管理员登录后上传一张新照片并添加心情文字"业务流程绘制完整活动图
3. **时序图**：针对"前端页面从后端获取并显示照片列表"交互场景，包含用户、浏览器前端、后端 API、数据库四个对象间的调用与返回消息序列

## Tech Stack

| 层级 | 技术选型 | 说明 |
| --- | --- | --- |
| 前端 | Vue3 + TypeScript + Vite | 组合式 API，类型安全 |
| UI 框架 | Element Plus | 后台管理用；前台使用自定义样式 |
| 状态管理 | Pinia | Vue3 官方推荐 |
| 后端 | Node.js + Express + TypeScript | RESTful API 服务 |
| ORM | Prisma | 类型安全的数据库访问 |
| 数据库 | MySQL 8.x | 关系型数据存储 |
| 认证 | JWT (jsonwebtoken) | 管理员登录鉴权 |
| 图片处理 | Sharp | 服务端图片压缩 |
| UML 绘制 | Mermaid | 在 Markdown 中直接渲染 UML 图 |


## Implementation Approach

本次任务聚焦于 **需求分析与 UML 建模文档** 的编写，不涉及代码实现。将创建一份完整的 Markdown 文档，使用 Mermaid 语法绘制三类 UML 图（用例图、活动图、时序图），可直接在支持 Mermaid 的 Markdown 编辑器（如 VS Code + Mermaid 插件、Typora）中预览。

关键决策：

- 使用 **Mermaid** 而非 PlantUML：Mermaid 可直接在 Markdown 中渲染，无需额外安装 Java 环境，更方便查看和提交
- 用例图使用 Mermaid 的 graph 语法模拟（Mermaid 原生不支持标准用例图，但可通过 graph 语法清晰表达角色与用例关系）
- 活动图和时序图使用 Mermaid 原生 sequenceDiagram 语法

## Directory Structure

```
d:/Improve/Project/Mine/Shimmer/
└── docs/
    └── requirements-analysis.md  # [NEW] 需求分析与 UML 建模文档，包含项目概述、功能需求列表、非功能需求，以及用例图（Mermaid graph）、活动图（Mermaid sequenceDiagram）、时序图（Mermaid sequenceDiagram）的完整内容
```

## Key Code Structures

无需代码结构定义，本文档为纯 Markdown + Mermaid 格式的需求分析文档。

## Agent Extensions

无需使用任何 Agent 扩展。本文档为纯文本内容，不涉及代码探索、技能创建或外部集成。