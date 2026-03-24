<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <h1 class="logo">光影手记</h1>
        <nav class="nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/timeline">时间轴</RouterLink>
          <RouterLink to="/darkroom">暗房</RouterLink>
          <RouterLink to="/favorites">收藏</RouterLink>
          <RouterLink to="/admin" class="admin-link">管理</RouterLink>
        </nav>
      </div>
    </header>
    <main class="main">
      <RouterView />
    </main>
    <footer class="footer">
      <p>© 2024 光影手记 · 用光影记录生活</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --text-color: #333;
  --bg-color: #fafafa;
  --card-bg: #fff;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header {
  background: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.nav {
  display: flex;
  gap: 24px;
}

.nav a {
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  transition: color 0.2s;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--secondary-color);
}

.admin-link {
  opacity: 0.6;
}

.main {
  min-height: calc(100vh - 140px);
  padding: 24px 0;
}

.footer {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 0.9rem;
}
</style>
