<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { photos } from '../api'
import { getFingerprint } from '../stores'
import { useAuthStore } from '../stores'
import { favorites } from '../api'
import { error } from '../composables/useToast'
import Lightbox from '../components/Lightbox.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const photoList = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = computed(() => photoList.value.length < total.value)
const favoriteIds = ref(new Set())

// 当前筛选状态
const currentSearch = ref('')
const currentTag = ref(null)

// 视图切换和排序
const viewMode = ref('public') // 'public' | 'my'
const sortOption = ref('random')
const sortOptions = [
  { value: 'random', label: '随机排列' },
  { value: 'taken_date_desc', label: '拍摄日期（新→旧）' },
  { value: 'taken_date_asc', label: '拍摄日期（旧→新）' },
  { value: 'created_desc', label: '上传日期（新→旧）' },
  { value: 'created_asc', label: '上传日期（旧→新）' }
]

// Lightbox 状态
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)

const fp = getFingerprint()

// 切换视图模式
const switchView = (mode) => {
  if (mode === viewMode.value) return
  viewMode.value = mode
  loadPhotos(true)
}

// 切换排序
const changeSort = () => {
  loadPhotos(true)
}

// 加载照片
const loadPhotos = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  
  // 获取搜索参数
  const search = route.query.search || ''
  const tag = route.query.tag || ''
  
  currentSearch.value = search
  currentTag.value = tag
  
  try {
    const params = { 
      page: reset ? 1 : page.value, 
      limit: 12,
      sort: sortOption.value
    }
    
    if (search) {
      params.search = search
    }
    if (tag) {
      params.tag = tag
    }
    
    // 如果是"我的照片"模式且已登录
    if (viewMode.value === 'my' && authStore.isLoggedIn) {
      params.user_id = authStore.user.id
      params.visibility = 'all' // 显示包括私有的所有照片
    }
    
    const res = await photos.list(params)
    if (reset) {
      photoList.value = res.data
      page.value = 1
    } else {
      photoList.value = [...photoList.value, ...res.data]
    }
    total.value = res.total
    // 检查收藏状态
    checkFavorites(res.data)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 检查收藏状态
const checkFavorites = async (list) => {
  for (const p of list) {
    try {
      const res = await favorites.check(p.id, fp)
      if (res.isFavorited) favoriteIds.value.add(p.id)
    } catch (e) {}
  }
}

// 切换收藏
const toggleFavorite = async (photo, e) => {
  e.preventDefault()
  e.stopPropagation()
  try {
    if (favoriteIds.value.has(photo.id)) {
      await favorites.remove(photo.id, fp)
      favoriteIds.value.delete(photo.id)
    } else {
      await favorites.add(photo.id, fp)
      favoriteIds.value.add(photo.id)
    }
    favoriteIds.value = new Set(favoriteIds.value)
  } catch (e) {
    error(e.response?.data?.error || '操作失败')
  }
}

// 加载更多
const loadMore = () => {
  page.value++
  loadPhotos()
}

// 查看详情 - 打开 Lightbox
const viewDetail = (index) => {
  lightboxIndex.value = index
  lightboxVisible.value = true
}

// Lightbox 关闭时跳转详情
const handleLightboxClose = () => {
  const photo = photoList.value[lightboxIndex.value]
  lightboxVisible.value = false
  if (photo) {
    router.push(`/photo/${photo.id}`)
  }
}

// 清除筛选
const clearFilters = () => {
  router.push({ path: '/' })
}

// 监听路由参数变化
watch(() => route.query, () => {
  loadPhotos(true)
}, { immediate: true })
</script>

<template>
  <div class="home">
    <div class="container">
      <!-- 视图切换和排序 -->
      <div class="view-controls">
        <!-- 视图切换标签（仅登录后显示） -->
        <div v-if="authStore.isLoggedIn" class="view-tabs">
          <button 
            :class="{ active: viewMode === 'public' }"
            @click="switchView('public')"
          >
            全部公开
          </button>
          <button 
            :class="{ active: viewMode === 'my' }"
            @click="switchView('my')"
          >
            我的照片
          </button>
        </div>
        
        <!-- 排序选择 -->
        <div class="sort-control">
          <label>排序：</label>
          <select v-model="sortOption" @change="changeSort">
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- 当前筛选状态 -->
      <div v-if="currentSearch || currentTag" class="filter-status">
        <span v-if="currentSearch">搜索: "{{ currentSearch }}"</span>
        <span v-if="currentTag">标签筛选中</span>
        <button @click="clearFilters">清除筛选</button>
      </div>
      
      <div class="photo-grid">
        <div 
          v-for="(photo, index) in photoList" 
          :key="photo.id" 
          class="photo-card"
          @click="viewDetail(index)"
        >
          <img 
            :src="photo.thumbnail_url || photo.url" 
            :alt="photo.title"
            loading="lazy"
          />
          <div class="photo-overlay">
            <button 
              class="favorite-btn" 
              :class="{ active: favoriteIds.has(photo.id) }"
              @click="toggleFavorite(photo, $event)"
            >
              {{ favoriteIds.has(photo.id) ? '♥' : '♡' }}
            </button>
            <!-- 标签显示 -->
            <div v-if="photo.tags && photo.tags.length" class="photo-tags">
              <span 
                v-for="tag in photo.tags.slice(0, 3)" 
                :key="tag.id" 
                class="tag"
                :style="{ backgroundColor: tag.color }"
              >
                {{ tag.name }}
              </span>
            </div>
            <div v-if="photo.mood" class="photo-mood">{{ photo.mood }}</div>
            <div v-if="photo.location" class="photo-location">{{ photo.location }}</div>
          </div>
        </div>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="hasMore" class="load-more">
        <button @click="loadMore">加载更多</button>
      </div>
      <div v-else-if="photoList.length === 0" class="empty">
        暂无照片
      </div>

      <!-- Lightbox -->
      <Lightbox
        :photos="photoList"
        :start-index="lightboxIndex"
        :visible="lightboxVisible"
        @close="handleLightboxClose"
      />
    </div>
  </div>
</template>

<style scoped>
/* 视图控制和排序 */
.view-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.view-tabs {
  display: flex;
  gap: 8px;
}

.view-tabs button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: var(--card-bg);
  color: var(--text-color);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.view-tabs button:hover {
  background: var(--hover-bg);
}

.view-tabs button.active {
  background: var(--secondary-color);
  color: #fff;
  border-color: var(--secondary-color);
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-control label {
  font-size: 14px;
  color: var(--text-secondary);
}

.sort-control select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  outline: none;
}

.sort-control select:focus {
  border-color: var(--secondary-color);
}

.filter-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--input-bg, #f5f5f5);
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.filter-status span {
  color: var(--text-color);
  opacity: 0.7;
}

.filter-status button {
  background: var(--hover-bg, #e0e0e0);
  border: none;
  padding: 4px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  margin-left: auto;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.photo-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
  background: var(--card-bg);
}

.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.photo-card:hover img {
  transform: scale(1.05);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
}

.photo-card:hover .photo-overlay {
  opacity: 1;
}

.favorite-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
}

.favorite-btn:hover {
  transform: scale(1.1);
}

.favorite-btn.active {
  color: #e74c3c;
}

.photo-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.photo-tags .tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  color: #fff;
}

.photo-mood {
  color: #fff;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.photo-location {
  color: rgba(255,255,255,0.8);
  font-size: 0.8rem;
}

.loading, .load-more, .empty {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
}

.load-more button {
  background: var(--secondary-color);
  color: var(--card-bg);
  border: none;
  padding: 12px 32px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
}

.load-more button:hover {
  opacity: 0.9;
}
</style>
