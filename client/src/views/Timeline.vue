<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { photos } from '../api'
import Lightbox from '../components/Lightbox.vue'

const router = useRouter()
const stats = ref([])
const loading = ref(true)
const selectedYear = ref(null)
const yearPhotos = ref([])

// Lightbox 状态
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)

const loadStats = async () => {
  loading.value = true
  try {
    const res = await photos.getTimelineStats()
    stats.value = res.stats
    if (stats.value.length > 0) {
      selectYear(stats.value[0].year)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const selectYear = async (year) => {
  selectedYear.value = year
  try {
    const res = await photos.list({ year, limit: 100, sort: 'date' })
    yearPhotos.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const viewPhoto = (id) => router.push(`/photo/${id}`)

// 打开 Lightbox
const openLightbox = (index) => {
  lightboxIndex.value = index
  lightboxVisible.value = true
}

// Lightbox 关闭后跳转详情
const handleLightboxClose = () => {
  const photo = yearPhotos.value[lightboxIndex.value]
  lightboxVisible.value = false
  if (photo) {
    router.push(`/photo/${photo.id}`)
  }
}

onMounted(loadStats)
</script>

<template>
  <div class="timeline">
    <div class="container">
      <h2>时间轴</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else>
        <div class="year-list">
          <button 
            v-for="s in stats" 
            :key="s.year"
            :class="{ active: selectedYear === s.year }"
            @click="selectYear(s.year)"
          >
            {{ s.year }} <span class="count">({{ s.count }})</span>
          </button>
        </div>
        <div v-if="yearPhotos.length > 0" class="photo-timeline">
          <div 
            v-for="(photo, index) in yearPhotos" 
            :key="photo.id" 
            class="timeline-item"
            @click="openLightbox(index)"
          >
            <div class="timeline-date">{{ photo.shot_date }}</div>
            <img :src="photo.thumbnail_url || photo.url" :alt="photo.title" />
            <div class="timeline-content">
              <h3>{{ photo.title || '无题' }}</h3>
              <p v-if="photo.mood">{{ photo.mood }}</p>
              <span v-if="photo.location">📍 {{ photo.location }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">暂无照片</div>
      </template>

      <!-- Lightbox -->
      <Lightbox
        :photos="yearPhotos"
        :start-index="lightboxIndex"
        :visible="lightboxVisible"
        @close="handleLightboxClose"
      />
    </div>
  </div>
</template>

<style scoped>
h2 { margin-bottom: 24px; }

.year-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.year-list button {
  background: #f0f0f0;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
}

.year-list button.active {
  background: var(--secondary-color);
  color: #fff;
}

.count { opacity: 0.7; font-size: 0.85rem; }

.photo-timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 120px 80px 1fr;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.timeline-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.timeline-date {
  font-size: 0.9rem;
  color: #999;
}

.timeline-item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.timeline-content h3 {
  margin-bottom: 4px;
}

.timeline-content p {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.timeline-content span {
  font-size: 0.85rem;
  color: #999;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

@media (max-width: 600px) {
  .timeline-item {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .timeline-item img {
    width: 100%;
    height: auto;
  }
}
</style>
