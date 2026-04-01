<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { photos } from '../api'
import { getFingerprint } from '../stores'
import { favorites } from '../api'
import { error } from '../composables/useToast'
import Lightbox from '../components/Lightbox.vue'

const route = useRoute()
const router = useRouter()
const photo = ref(null)
const loading = ref(true)
const isFavorited = ref(false)
const fp = getFingerprint()

// Lightbox 状态
const lightboxVisible = ref(false)

const loadPhoto = async () => {
  loading.value = true
  try {
    const res = await photos.get(route.params.id)
    photo.value = res.photo
    // 检查收藏状态
    const favRes = await favorites.check(photo.value.id, fp)
    isFavorited.value = favRes.isFavorited
  } catch (e) {
    error('照片不存在')
    router.push('/')
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  try {
    if (isFavorited.value) {
      await favorites.remove(photo.value.id, fp)
      isFavorited.value = false
    } else {
      await favorites.add(photo.value.id, fp)
      isFavorited.value = true
    }
  } catch (e) {
    error(e.response?.data?.error || '操作失败')
  }
}

const goBack = () => router.back()

onMounted(loadPhoto)
</script>

<template>
  <div class="detail">
    <div class="container">
      <button class="back-btn" @click="goBack">← 返回</button>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="photo" class="photo-detail">
        <div class="photo-wrapper" @click="lightboxVisible = true">
          <img :src="photo.url" :alt="photo.title" />
        </div>
        <div class="photo-info">
          <h2>{{ photo.title || '无题' }}</h2>
          <div class="meta">
            <span v-if="photo.shot_date">📅 {{ photo.shot_date }}</span>
            <span v-if="photo.location">📍 {{ photo.location }}</span>
          </div>
          <p v-if="photo.mood" class="mood">{{ photo.mood }}</p>
          <button class="fav-btn" :class="{ active: isFavorited }" @click="toggleFavorite">
            {{ isFavorited ? '♥ 已收藏' : '♡ 收藏' }}
          </button>
        </div>
      </div>

      <!-- Lightbox -->
      <Lightbox
        v-if="photo"
        :photos="[photo]"
        :start-index="0"
        :visible="lightboxVisible"
        @close="lightboxVisible = false"
      />
    </div>
  </div>
</template>

<style scoped>
.detail {
  min-height: calc(100vh - 140px);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--secondary-color);
  margin-bottom: 20px;
}

.photo-detail {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}

.photo-wrapper {
  background: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.photo-wrapper img {
  width: 100%;
  display: block;
}

.photo-info h2 {
  margin-bottom: 16px;
}

.meta {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.mood {
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: 24px;
}

.fav-btn {
  background: var(--input-bg);
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
}

.fav-btn.active {
  color: var(--secondary-color);
}

.loading {
  text-align: center;
  padding: 40px;
}

@media (max-width: 768px) {
  .photo-detail {
    grid-template-columns: 1fr;
  }
}
</style>
