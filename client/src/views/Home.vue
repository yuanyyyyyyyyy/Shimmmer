<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { photos } from '../api'
import { getFingerprint } from '../stores'
import { favorites } from '../api'

const router = useRouter()
const photoList = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = computed(() => photoList.value.length < total.value)
const favoriteIds = ref(new Set())

const fp = getFingerprint()

// 加载照片
const loadPhotos = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await photos.list({ 
      page: reset ? 1 : page.value, 
      limit: 12,
      sort: 'random'
    })
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
    alert(e.response?.data?.error || '操作失败')
  }
}

// 加载更多
const loadMore = () => {
  page.value++
  loadPhotos()
}

// 查看详情
const viewDetail = (id) => {
  router.push(`/photo/${id}`)
}

onMounted(() => loadPhotos(true))
</script>

<template>
  <div class="home">
    <div class="container">
      <div class="photo-grid">
        <div 
          v-for="photo in photoList" 
          :key="photo.id" 
          class="photo-card"
          @click="viewDetail(photo.id)"
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
    </div>
  </div>
</template>

<style scoped>
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
  background: #eee;
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
  color: #999;
}

.load-more button {
  background: var(--secondary-color);
  color: #fff;
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
