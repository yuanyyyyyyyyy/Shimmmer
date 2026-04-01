<script setup>
import { ref, onMounted } from 'vue'
import { photos } from '../api'

const markers = ref([])
const loading = ref(true)
const selectedPhoto = ref(null)

// 加载地图标记点
const loadMarkers = async () => {
  try {
    const res = await photos.getMapMarkers()
    markers.value = res.markers
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 处理标记点击
const handleMarkerClick = (marker) => {
  selectedPhoto.value = marker
}

onMounted(() => {
  loadMarkers()
})
</script>

<template>
  <div class="map-page">
    <div class="container">
      <div class="header-section">
        <h1>照片地图</h1>
        <p class="subtitle">按地点浏览你的照片</p>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="markers.length === 0" class="empty">
        <p>暂无带定位的照片</p>
        <p class="hint">上传带有 GPS 信息的照片即可在地图上显示</p>
      </div>

      <div v-else class="map-container">
        <!-- 模拟地图展示区域 -->
        <div class="map-placeholder">
          <div class="map-grid">
            <div 
              v-for="marker in markers" 
              :key="marker.id"
              class="map-marker"
              :class="{ selected: selectedPhoto?.id === marker.id }"
              @click="handleMarkerClick(marker)"
            >
              <img :src="marker.thumbnail_url" :alt="marker.title" />
              <div class="marker-info">
                <span class="marker-title">{{ marker.title || '无题' }}</span>
                <span class="marker-date">{{ marker.shot_date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 选中照片详情 -->
        <div v-if="selectedPhoto" class="photo-detail-panel">
          <button class="close-btn" @click="selectedPhoto = null">×</button>
          <img :src="selectedPhoto.thumbnail_url || selectedPhoto.url" :alt="selectedPhoto.title" />
          <div class="detail-info">
            <h3>{{ selectedPhoto.title || '无题' }}</h3>
            <p v-if="selectedPhoto.location">{{ selectedPhoto.location }}</p>
            <p>{{ selectedPhoto.shot_date }}</p>
            <p class="coords">坐标: {{ selectedPhoto.latitude }}, {{ selectedPhoto.longitude }}</p>
          </div>
        </div>

        <div class="stats">
          <span>共 {{ markers.length }} 个标记点</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  min-height: calc(100vh - 140px);
  padding-bottom: 40px;
}

.header-section {
  text-align: center;
  padding: 40px 0 24px;
}

.header-section h1 {
  font-size: 2rem;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.hint {
  margin-top: 8px;
  font-size: 0.9rem;
}

.map-container {
  position: relative;
}

.map-placeholder {
  background: var(--card-bg);
  border-radius: 16px;
  min-height: 500px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.map-placeholder::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(128,128,128,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(128,128,128,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  position: relative;
  z-index: 1;
}

.map-marker {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.map-marker:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px var(--shadow-color);
}

.map-marker.selected {
  box-shadow: 0 0 0 3px var(--secondary-color);
}

.map-marker img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.marker-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 8px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.marker-title {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marker-date {
  font-size: 0.75rem;
  opacity: 0.8;
}

.photo-detail-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 300px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 8px 40px var(--shadow-color);
  overflow: hidden;
  z-index: 100;
}

.photo-detail-panel img {
  width: 100%;
  display: block;
}

.detail-info {
  padding: 16px;
}

.detail-info h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
}

.detail-info p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.coords {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0,0,0,0.5);
  color: var(--card-bg);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats {
  margin-top: 16px;
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .photo-detail-panel {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    margin-top: 16px;
  }
}
</style>