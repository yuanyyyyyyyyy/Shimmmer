<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { favorites } from '../api'
import { getFingerprint } from '../stores'
import { error } from '../composables/useToast'

const props = defineProps({
  photos: { type: Array, required: true },
  startIndex: { type: Number, default: 0 },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const currentIndex = ref(props.startIndex)
const isLoading = ref(true)
const isFavorited = ref(false)
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const fp = getFingerprint()

const currentPhoto = computed(() => props.photos[currentIndex.value])

// 加载收藏状态
const loadFavoriteStatus = async () => {
  if (!currentPhoto.value) return
  try {
    const res = await favorites.check(currentPhoto.value.id, fp)
    isFavorited.value = res.isFavorited
  } catch (e) {}
}

// 切换收藏
const toggleFavorite = async () => {
  try {
    if (isFavorited.value) {
      await favorites.remove(currentPhoto.value.id, fp)
      isFavorited.value = false
    } else {
      await favorites.add(currentPhoto.value.id, fp)
      isFavorited.value = true
    }
  } catch (e) {
    error(e.response?.data?.error || '操作失败')
  }
}

// 切换上一张
const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.photos.length) % props.photos.length
}

// 切换下一张
const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.photos.length
}

// 键盘事件
const handleKeydown = (e) => {
  if (!props.visible) return
  switch (e.key) {
    case 'Escape':
      emit('close')
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
  }
}

// 滚轮缩放
const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.max(0.5, Math.min(3, scale.value + delta))
}

// 鼠标拖拽
const startDrag = (e) => {
  isDragging.value = true
  dragStart.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y }
}

const onDrag = (e) => {
  if (!isDragging.value) return
  position.value = { x: e.clientX - dragStart.value.x, y: e.clientY - dragStart.value.y }
}

const endDrag = () => {
  isDragging.value = false
}

// 重置缩放和位置
const resetTransform = () => {
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

// 监听照片变化
watch(currentIndex, () => {
  isLoading.value = true
  resetTransform()
  loadFavoriteStatus()
})

// 监听显示状态
watch(() => props.visible, (val) => {
  if (val) {
    currentIndex.value = props.startIndex
    loadFavoriteStatus()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadFavoriteStatus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="lightbox" @click.self="emit('close')">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="lightbox-loading">加载中...</div>

      <!-- 关闭按钮 -->
      <button class="lightbox-close" @click="emit('close')">×</button>

      <!-- 左右切换按钮 -->
      <button class="lightbox-arrow lightbox-prev" @click="prev">‹</button>
      <button class="lightbox-arrow lightbox-next" @click="next">›</button>

      <!-- 图片容器 -->
      <div 
        class="lightbox-image-container"
        @wheel="handleWheel"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
      >
        <img
          :src="currentPhoto?.url"
          :alt="currentPhoto?.title"
          class="lightbox-image"
          :style="{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
          @load="isLoading = false"
        />
      </div>

      <!-- 信息栏 -->
      <div class="lightbox-info">
        <div class="lightbox-info-left">
          <h3>{{ currentPhoto?.title || '无题' }}</h3>
          <p v-if="currentPhoto?.shot_date || currentPhoto?.location">
            <span v-if="currentPhoto?.shot_date">📅 {{ currentPhoto?.shot_date }}</span>
            <span v-if="currentPhoto?.location"> 📍 {{ currentPhoto?.location }}</span>
          </p>
          <p v-if="currentPhoto?.mood" class="mood">{{ currentPhoto?.mood }}</p>
        </div>
        <div class="lightbox-info-right">
          <button 
            class="fav-btn" 
            :class="{ active: isFavorited }"
            @click="toggleFavorite"
          >
            {{ isFavorited ? '♥ 已收藏' : '♡ 收藏' }}
          </button>
        </div>
      </div>

      <!-- 缩放提示 -->
      <div class="lightbox-hint">
        <span>滚轮缩放</span>
        <span>← → 切换</span>
        <span>ESC 关闭</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.lightbox-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 1.2rem;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: #fff;
  font-size: 36px;
  cursor: pointer;
  z-index: 10;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.lightbox-close:hover {
  opacity: 1;
}

.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 48px;
  cursor: pointer;
  padding: 20px;
  z-index: 10;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.lightbox-arrow:hover {
  opacity: 1;
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.lightbox-image {
  max-width: 90%;
  max-height: 80%;
  object-fit: contain;
  transition: transform 0.1s;
  user-select: none;
}

.lightbox-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 40px 20px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  color: #fff;
}

.lightbox-info-left h3 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.lightbox-info-left p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.lightbox-info-left p + p {
  margin-top: 4px;
}

.lightbox-info-left .mood {
  margin-top: 8px;
  font-size: 1rem;
  opacity: 0.9;
}

.fav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  padding: 10px 20px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.fav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.fav-btn.active {
  color: #e74c3c;
}

.lightbox-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .lightbox-arrow {
    font-size: 32px;
    padding: 10px;
  }

  .lightbox-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .lightbox-hint {
    display: none;
  }
}
</style>
