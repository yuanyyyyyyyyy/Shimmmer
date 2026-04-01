<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { tags } from './api'

const router = useRouter()
const searchQuery = ref('')
const popularTags = ref([])
const showTags = ref(false)
const isDarkMode = ref(false)

// 加载热门标签
const loadPopularTags = async () => {
  try {
    const res = await tags.getPopular(8)
    popularTags.value = res.tags
  } catch (e) {}
}

// 搜索
const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (query) {
    router.push({ path: '/', query: { search: query } })
    showTags.value = false
  }
}

// 按标签筛选
const filterByTag = (tagId) => {
  router.push({ path: '/', query: { tag: tagId } })
  showTags.value = false
}

// 清除筛选
const clearFilters = () => {
  searchQuery.value = ''
  router.push({ path: '/' })
}

// 切换深色模式
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value)
  document.documentElement.classList.toggle('dark', isDarkMode.value)
}

// 初始化
onMounted(() => {
  // 读取深色模式设置
  const saved = localStorage.getItem('darkMode')
  if (saved === 'true') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
  loadPopularTags()
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <RouterLink to="/" class="logo">光影手记</RouterLink>
        <div class="header-center">
          <!-- 搜索框 -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索照片..."
              @keyup.enter="handleSearch"
              @focus="showTags = true"
            />
            <button @click="handleSearch">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </div>
          <!-- 热门标签 -->
          <div v-if="showTags && popularTags.length > 0" class="tags-dropdown">
            <div class="tags-label">热门标签</div>
            <div class="tags-list">
              <span 
                v-for="tag in popularTags" 
                :key="tag.id" 
                class="tag-item"
                :style="{ backgroundColor: tag.color }"
                @click="filterByTag(tag.id)"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>
        </div>
        <nav class="nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/timeline">时间轴</RouterLink>
          <RouterLink to="/darkroom">暗房</RouterLink>
          <RouterLink to="/map">地图</RouterLink>
          <RouterLink to="/favorites">收藏</RouterLink>
          <RouterLink to="/review">回顾</RouterLink>
          <button class="dark-toggle" @click="toggleDarkMode" :title="isDarkMode ? '切换亮色模式' : '切换深色模式'">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <RouterLink to="/admin" class="admin-link">管理</RouterLink>
        </nav>
      </div>
    </header>
    <main class="main">
      <RouterView />
    </main>
    <footer class="footer">
      <p>© 光影手记 · 用光影记录生活</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --text-color: #333;
  --text-secondary: #666;
  --text-tertiary: #999;
  --bg-color: #fafafa;
  --card-bg: #fff;
}

:root.dark {
  --primary-color: #e0e0e0;
  --secondary-color: #64b5f6;
  --text-color: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-tertiary: #888;
  --bg-color: #1a1a1a;
  --card-bg: #2d2d2d;
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

.header-center {
  position: relative;
  flex: 1;
  max-width: 400px;
  margin: 0 24px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 20px;
  padding: 4px 12px;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  font-size: 14px;
  outline: none;
}

.search-box button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  opacity: 0.5;
}

.tags-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 12px;
  margin-top: 8px;
}

.tags-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.logo {
  font-size: 1.5rem;
  color: var(--primary-color);
  text-decoration: none;
}

.nav {
  display: flex;
  align-items: center;
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

.dark-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.dark-toggle:hover {
  background: var(--hover-bg);
}

.main {
  min-height: calc(100vh - 140px);
  padding: 24px 0;
}

.footer {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}
</style>
