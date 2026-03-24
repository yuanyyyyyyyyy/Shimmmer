# 光影手记 (Shimmer / SNAPSHOT)

一个精美的个人照片日记 Web 应用，记录生活中的每一个光影瞬间。

![Vue 3](https://img.shields.io/badge/Vue-3.5.12-brightgreen)
![Express](https://img.shields.io/badge/Express-4.21.0-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)

## 项目介绍

光影手记是一个个人照片日记应用，帮助你用照片记录生活中的美好瞬间。主要功能包括：

- **照片管理** - 上传、编辑、删除照片，支持自动压缩
- **瀑布流展示** - 精美的照片瀑布流布局
- **暗房模式** - 沉浸式浏览照片，暗色背景突出主体
- **时间线视图** - 按时间顺序浏览照片
- **收藏功能** - 访客可收藏喜欢的照片
- **响应式设计** - 完美适配桌面端和移动端

## 技术栈

### 前端
- Vue 3 (Composition API)
- Vite (构建工具)
- Pinia (状态管理)
- Vue Router (路由)
- Axios (HTTP 请求)

### 后端
- Express (Node.js Web 框架)
- MySQL (数据库)
- JWT (用户认证)
- Multer (文件上传)
- Sharp (图片处理)
- Bcrypt (密码加密)

## 项目结构

```
Shimmer/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 请求
│   │   ├── router/       # 路由配置
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── views/        # 页面组件
│   │   ├── App.vue       # 根组件
│   │   └── main.js       # 入口文件
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/       # 配置文件
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由
│   │   └── app.js        # 应用入口
│   ├── database/         # 数据库脚本
│   │   ├── schema.sql    # 建表脚本
│   │   └── seed.sql      # 初始化数据
│   └── package.json
│
└── README.md
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yuanyyyyyyyyy/Shimmmer.git
cd Shimmmer
```

### 2. 配置数据库

确保已安装 MySQL 8.x，执行数据库初始化脚本：

```bash
mysql -u root -p < server/database/schema.sql
mysql -u root -p < server/database/seed.sql
```

### 3. 配置后端

在 `server/` 目录下创建 `.env` 文件：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=shimmer
JWT_SECRET=your_jwt_secret
PORT=3000
```

### 4. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 5. 启动服务

```bash
# 启动后端 (端口 3000)
cd server
npm run dev

# 启动前端 (端口 5173)
cd client
npm run dev
```

访问 http://localhost:5173 即可打开应用。

## 功能预览

| 页面 | 描述 |
|------|------|
| 首页 | 瀑布流展示所有公开照片 |
| 暗房 | 沉浸式暗色背景照片浏览 |
| 时间线 | 按拍摄日期时间顺序展示 |
| 收藏 | 显示用户收藏的照片 |
| 登录 | 管理员登录入口 |
| 管理 | 照片管理（增删改） |

## 默认账户

初始化数据中的默认管理员账户：

- 用户名：`admin`
- 密码：`admin123`

**注意**：首次登录后请及时修改密码！

## API 接口

### 认证
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/logout` - 登出

### 照片
- `GET /api/photos` - 获取照片列表
- `GET /api/photos/:id` - 获取照片详情
- `POST /api/photos` - 上传照片（需认证）
- `PUT /api/photos/:id` - 更新照片（需认证）
- `DELETE /api/photos/:id` - 删除照片（需认证）

### 收藏
- `GET /api/favorites` - 获取收藏列表
- `POST /api/favorites` - 添加收藏
- `DELETE /api/favorites/:photoId` - 取消收藏

## 开发说明

- 前端开发服务器默认端口：5173
- 后端 API 默认端口：3000
- 上传的图片保存在 `server/uploads/` 目录

## 许可证

MIT License
