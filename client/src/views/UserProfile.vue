<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { users } from '../api'

const route = useRoute()
const user = ref(null)
const photos = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)

const hasMore = computed(() => page.value < totalPages.value)
const isOwnProfile = computed(() => {
  // 这个可以在其他地方判断
  return false
})

const fetchUser = async () => {
  try {
    const res = await users.getProfile(route.params.id)
    user.value = res.user
  } catch (e) {
    console.error('获取用户信息失败', e)
  }
}

const fetchPhotos = async (reset = false) => {
  if (loading.value) return

  if (reset) {
    page.value = 1
    photos.value = []
  }

  loading.value = true
  try {
    const res = await users.getUserPhotos(route.params.id, {
      page: page.value,
      limit: 12
    })
    if (reset) {
      photos.value = res.photos
    } else {
      photos.value.push(...res.photos)
    }
    totalPages.value = res.pagination.totalPages
  } catch (e) {
    console.error('获取照片失败', e)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (hasMore.value) {
    page.value++
    fetchPhotos()
  }
}

const getPhotoStyle = (photo) => {
  const aspectRatio = photo.width && photo.height
    ? photo.width / photo.height
    : 1
  return { aspectRatio: aspectRatio.toFixed(2) }
}

onMounted(async () => {
  await fetchUser()
  await fetchPhotos(true)
})
</script>

<template>
  <div class="user-profile">
    <div class="container">
      <div v-if="user" class="profile-header">
        <div class="avatar">
          <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" />
          <span v-else class="avatar-placeholder">
            {{ (user.nickname || user.username).charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="profile-info">
          <h1>{{ user.nickname || user.username }}</h1>
          <p class="username">@{{ user.username }}</p>
          <p v-if="user.bio" class="bio">{{ user.bio }}</p>
          <div class="stats">
            <span class="stat">
              <strong>{{ user.photoCount || 0 }}</strong> 照片
            </span>
            <span class="stat">
              加入于 {{ new Date(user.created_at).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="loading">加载中...</div>

      <div class="divider"></div>

      <div v-if="loading && photos.length === 0" class="loading">
        加载中...
      </div>

      <div v-else-if="photos.length === 0" class="empty">
        <p>还没有公开照片</p>
      </div>

      <div v-else class="photo-grid">
        <div
          v-for="photo in photos"
          :key="photo.id"
          class="photo-card"
        >
          <router-link :to="`/photo/${photo.id}`" class="photo-link">
            <div class="photo-wrapper" :style="getPhotoStyle(photo)">
              <img
                :src="photo.thumbnail_url || photo.url"
                :alt="photo.title"
                loading="lazy"
              />
            </div>
            <div class="photo-info">
              <h3>{{ photo.title || '无标题' }}</h3>
              <p class="date">{{ photo.shot_date || '未知日期' }}</p>
            </div>
          </router-link>
        </div>
      </div>

      <div v-if="hasMore" class="load-more">
        <button @click="loadMore" :disabled="loading">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-profile {
  padding: 40px 0;
}

.profile-header {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 32px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary-color);
  color: #fff;
  font-size: 3rem;
  font-weight: bold;
}

.profile-info h1 {
  font-size: 1.8rem;
  margin-bottom: 4px;
}

.username {
  color: #999;
  margin-bottom: 12px;
}

.bio {
  margin-bottom: 16px;
  line-height: 1.6;
}

.stats {
  display: flex;
  gap: 24px;
  color: #666;
}

.stat strong {
  color: #333;
  margin-right: 4px;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 32px 0;
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.photo-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.photo-link {
  text-decoration: none;
  color: inherit;
}

.photo-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
}

.photo-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-info {
  padding: 16px;
}

.photo-info h3 {
  font-size: 1rem;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-info .date {
  font-size: 0.85rem;
  color: #999;
}

.load-more {
  text-align: center;
  margin-top: 40px;
}

.load-more button {
  padding: 12px 32px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more button:hover:not(:disabled) {
  background: #eee;
}

.load-more button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stats {
    justify-content: center;
  }
}
</style>
