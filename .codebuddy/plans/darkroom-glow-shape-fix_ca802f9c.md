---
name: darkroom-glow-shape-fix
overview: 修复暗房光晕效果：恢复圆形遮罩挖洞显示照片，同时让光晕发光层使用随机形状（clip-path），实现光晕形状变换的效果。
todos:
  - id: fix-mask-glow
    content: 重写 Darkroom.vue 的 maskStyle 和 glowStyle，遮罩恢复圆形挖洞，发光层用 clip-path 变形状并定位到鼠标位置
    status: completed
  - id: clean-styles
    content: 清理未使用的 shapes 数组，更新 diary-glow CSS 样式支持旋转动画和混合模式
    status: completed
    dependencies:
      - fix-mask-glow
---

## 用户需求

修复暗房页面光晕效果，核心要求是：**光晕本身的发光边缘变成各种随机形状**，而不是让照片或遮罩变形。

## 当前问题

- `maskStyle`（遮罩层）错误地使用了 `clip-path`，导致遮罩被裁剪成各种形状，照片显示异常
- `glowStyle`（发光层）只是简单的圆形径向渐变，没有形状变化
- 代码中有重复的 `shapes` 和 `simpleShapes` 两个形状列表，`shapes` 未被使用

## 期望效果

1. 遮罩层：用圆形 radial-gradient 挖洞显示照片（不变形）
2. 发光层：边缘发光变成随机形状（星星、爱心、水滴、花朵等），用 clip-path 裁剪
3. 发光层以鼠标位置为中心旋转/缩放，增加动态感
4. 保留所有现有功能：开灯/关灯、显示/隐藏信息、粒子、涟漪、星光、特殊效果、随机速度

## 修改范围

仅修改 `d:\Improve\Project\Mine\Shimmer\client\src\views\Darkroom.vue`

## 技术方案

### 核心修改逻辑

**遮罩层 (diary-mask)** — 恢复为简单的圆形挖洞：

- `radial-gradient(circle ${radius}px at ${x}% ${y}%, transparent 0%, rgba(0,0,0,0.98) 100%)`
- 不使用 clip-path，保证照片正常圆形光晕显示

**发光层 (diary-glow)** — 用 clip-path 变成随机形状：

- 在发光渐变上叠加 `clip-path` 裁剪成星星、爱心等形状
- 发光层是一个以鼠标为中心的方形区域（如 400px x 400px），用 `clip-path` 裁剪
- `transform: translate(-50%, -50%)` 让形状中心对齐鼠标
- 用 `mix-blend-mode: screen` 或 `plus-lighter` 实现柔光叠加
- 发光层缓慢旋转（CSS animation），让形状动起来

**清理代码**：

- 删除未使用的 `shapes` 数组（第18-27行），只保留 `simpleShapes`
- 删除第266-269行遮罩层上的 clip-path 和 transform

### 关键实现细节

**发光层定位方式**：

```
position: absolute;
left: ${x}%;
top: ${y}%;
width: ${radius * 2.5}px;
height: ${radius * 2.5}px;
transform: translate(-50%, -50%);
clip-path: currentShape.clipPath;
```

**渐变从边缘向中心淡出**（因为是发光效果，形状边缘亮、中心透明）：

```
background: radial-gradient(circle 60% at 50% 50%, transparent 0%, ${color}${opacity} 50%, transparent 80%)
```

**旋转动画**：用 CSS `@keyframes glow-rotate` 缓慢旋转 360 度（30s 周期），让形状发光看起来在缓慢转动