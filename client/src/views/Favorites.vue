<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { favorites } from '../api'
import { getFingerprint } from '../stores'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const fp = getFingerprint()

const loadFavorites = async () => {
  loading.value = true
  try {
    const res = await favorites.list(fp)
    list.value = res.favorites
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const removeFavorite = async (photoId, e) => {
  e.preventDefault()
  e.stopPropagation()
  try {
    await favorites.remove(photoId, fp)
    list.value = list.value.filter(f => f.photo_id !== photoId)
  } catch (e) {
    alert(e.response?.data?.error || '操作失败')
  }
}

const viewDetail = (id) => router.push(`/photo/${id}`)

onMounted(loadFavorites)
</script>

<template>
  <div class="favorites">
    <div class="container">
      <h2>我的收藏</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="list.length === 0" class="empty">
        <p>暂无收藏</p>
        <p class="hint">点击照片上的 ♥ 收藏</p>
      </div>
      <div v-else class="fav-grid">
        <div 
          v-for="item in list" 
          :key="item.id" 
          class="fav-card"
          @click="viewDetail(item.photo_id)"
        >
          <img :src="item.thumbnail_url || item.url" :alt="item.title" />
          <div class="fav-overlay">
            <button class="remove-btn" @click="removeFavorite(item.photo_id, $event)">✕</button>
            <div v-if="item.mood" class="fav-mood">{{ item.mood }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 24px; }

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.fav-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
}

.fav-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fav-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fav-card:hover .fav-overlay {
  opacity: 1;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
}

.fav-mood {
  color: #fff;
  text-align: center;
  padding: 12px;
}

.loading, .empty {
  text-align: center;
  padding: 60px;
  color: #999;
}

.empty p { margin-bottom: 8px; }
.hint { font-size: 0.9rem; }
</style>
