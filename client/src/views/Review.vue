<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { photos } from '../api'

const router = useRouter()
const years = ref([])
const selectedYear = ref(null)
const reviewData = ref(null)
const loading = ref(true)

// 加载可选年份
const loadYears = async () => {
  try {
    const res = await photos.getReviewYears()
    years.value = res.years
    if (years.value.length > 0) {
      selectedYear.value = years.value[0]
    }
  } catch (e) {
    console.error(e)
  }
}

// 加载年度回顾数据
const loadReview = async () => {
  if (!selectedYear.value) return
  loading.value = true
  try {
    const res = await photos.getReview(selectedYear.value)
    reviewData.value = res
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 切换年份
const changeYear = (year) => {
  selectedYear.value = year
  loadReview()
}

// 格式化文件大小
const formatSize = (kb) => {
  if (!kb) return '0 KB'
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// 月份名称
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

onMounted(() => {
  loadYears().then(() => {
    if (selectedYear.value) {
      loadReview()
    } else {
      loading.value = false
    }
  })
})
</script>

<template>
  <div class="review">
    <div class="container">
      <div class="header-section">
        <h1>年度回顾</h1>
        <p class="subtitle">用光影记录 {{ selectedYear }} 年的美好瞬间</p>
      </div>

      <!-- 年份选择 -->
      <div v-if="years.length > 0" class="year-selector">
        <button 
          v-for="year in years" 
          :key="year"
          :class="{ active: selectedYear === year }"
          @click="changeYear(year)"
        >
          {{ year }}
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!reviewData || reviewData.totalPhotos === 0" class="empty">
        <p>{{ selectedYear }} 年还没有照片</p>
        <p class="hint">去上传一些照片吧！</p>
      </div>

      <template v-else>
        <!-- 总览卡片 -->
        <div class="overview-cards">
          <div class="overview-card highlight">
            <div class="card-value">{{ reviewData.totalPhotos }}</div>
            <div class="card-label">张照片</div>
          </div>
          <div class="overview-card">
            <div class="card-value">{{ formatSize(reviewData.totalSize) }}</div>
            <div class="card-label">存储空间</div>
          </div>
          <div class="overview-card">
            <div class="card-value">{{ reviewData.photosWithGps }}</div>
            <div class="card-label">带定位</div>
          </div>
        </div>

        <!-- 时间范围 -->
        <div class="date-range" v-if="reviewData.firstPhoto && reviewData.lastPhoto">
          <p>📅 {{ reviewData.firstPhoto }} ~ {{ reviewData.lastPhoto }}</p>
        </div>

        <!-- 月度分布 -->
        <div class="section">
          <h2>月度分布</h2>
          <div class="monthly-chart">
            <div 
              v-for="m in 12" 
              :key="m"
              class="month-bar"
              :style="{ height: (reviewData.monthlyStats.find(x => x.month === m)?.count || 0) / Math.max(...reviewData.monthlyStats.map(x => x.count), 1) * 100 + '%' }"
            >
              <span class="month-label">{{ monthNames[m-1].replace('月', '') }}</span>
              <span class="month-count">{{ reviewData.monthlyStats.find(x => x.month === m)?.count || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 热门标签 -->
        <div class="section" v-if="reviewData.topTags.length > 0">
          <h2>热门标签</h2>
          <div class="tags-cloud">
            <span 
              v-for="tag in reviewData.topTags" 
              :key="tag.id"
              class="tag-item"
              :style="{ backgroundColor: 'oklch(41.462% 0.04699 149.954)' }"
            >
              {{ tag.name }} ({{ tag.count }})
            </span>
          </div>
        </div>

        <!-- 热门地点 -->
        <div class="section" v-if="reviewData.topLocations.length > 0">
          <h2>热门地点</h2>
          <div class="locations-list">
            <div 
              v-for="(loc, idx) in reviewData.topLocations" 
              :key="loc.location"
              class="location-item"
            >
              <span class="rank">{{ idx + 1 }}</span>
              <span class="name">{{ loc.location }}</span>
              <span class="count">{{ loc.count }} 张</span>
            </div>
          </div>
        </div>

        <!-- 照片尺寸统计 -->
        <div class="section">
          <h2>照片尺寸</h2>
          <div class="size-stats">
            <div class="stat-item">
              <span class="stat-value">{{ reviewData.avgWidth }} × {{ reviewData.avgHeight }}</span>
              <span class="stat-label">平均尺寸</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.review {
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

.year-selector {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.year-selector button {
  background: var(--input-bg);
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.year-selector button.active {
  background: oklch(41.462% 0.04699 149.954);
  color: var(--card-bg);
  transform: scale(1.05);
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

.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.overview-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.overview-card.highlight {
  background: linear-gradient(135deg, oklch(41.462% 0.04699 149.954), oklch(41.462% 0.04699 149.954));
  color: var(--card-bg);
}

.card-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.card-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.date-range {
  text-align: center;
  margin-bottom: 32px;
  color: var(--text-secondary);
}

.section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.section h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--input-bg);
}

.monthly-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  gap: 4px;
}

.month-bar {
  flex: 1;
  background: linear-gradient(to top, oklch(41.462% 0.04699 149.954), oklch(41.462% 0.04699 149.954));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.month-label {
  font-size: 10px;
  color: var(--text-tertiary);
  position: absolute;
  bottom: -20px;
}

.month-count {
  font-size: 10px;
  color: var(--card-bg);
  padding: 2px 0;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.9rem;
  color: var(--card-bg);
}

.locations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--input-bg);
  border-radius: 8px;
}

.rank {
  width: 24px;
  height: 24px;
  background: oklch(41.462% 0.04699 149.954);
  color: var(--card-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

.name {
  flex: 1;
  font-weight: 500;
}

.count {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.size-stats {
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.stat-label {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .overview-card.highlight {
    order: -1;
  }
  
  .monthly-chart {
    height: 100px;
  }
}
</style>
