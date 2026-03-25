<script setup>
import { ref, computed } from 'vue'
import { upload } from '../api'
import { success, error } from '../composables/useToast'

const props = defineProps({
  multiple: { type: Boolean, default: true },
  maxFiles: { type: Number, default: 10 }
})

const emit = defineEmits(['uploaded', 'uploading'])

const isDragging = ref(false)
const fileInput = ref(null)
const uploading = ref(false)
const uploadQueue = ref([])

// 待上传的文件列表
const pendingFiles = ref([])

// 是否正在上传
const isUploading = computed(() => uploading.value || uploadQueue.value.some(f => f.status === 'uploading'))

// 处理拖拽进入
const handleDragEnter = (e) => {
  e.preventDefault()
  isDragging.value = true
}

// 处理拖拽离开
const handleDragLeave = (e) => {
  e.preventDefault()
  isDragging.value = false
}

// 处理拖拽放置
const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  addFiles(files)
}

// 处理文件选择
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  addFiles(files)
  e.target.value = ''
}

// 添加文件到队列
const addFiles = (files) => {
  const remaining = props.maxFiles - pendingFiles.value.length
  const filesToAdd = files.slice(0, remaining)
  
  for (const file of filesToAdd) {
    const preview = URL.createObjectURL(file)
    pendingFiles.value.push({
      id: Date.now() + Math.random(),
      file,
      preview,
      name: file.name,
      size: file.size,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      url: '',
      error: ''
    })
  }
}

// 移除文件
const removeFile = (id) => {
  const index = pendingFiles.value.findIndex(f => f.id === id)
  if (index > -1) {
    const file = pendingFiles.value[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
    pendingFiles.value.splice(index, 1)
  }
}

// 上传单个文件
const uploadFile = async (fileObj) => {
  fileObj.status = 'uploading'
  fileObj.progress = 0
  
  try {
    // 模拟进度
    const progressInterval = setInterval(() => {
      if (fileObj.progress < 90) {
        fileObj.progress += 10
      }
    }, 100)
    
    const res = await upload.single(fileObj.file)
    
    clearInterval(progressInterval)
    fileObj.progress = 100
    fileObj.status = 'success'
    fileObj.url = res.url
    fileObj.thumbnail_url = res.thumbnail_url
    fileObj.width = res.width
    fileObj.height = res.height
    fileObj.file_size = res.file_size
    
    emit('uploaded', res)
    
    return res
  } catch (err) {
    fileObj.status = 'error'
    fileObj.error = err.response?.data?.error || '上传失败'
    return null
  }
}

// 上传所有文件
const uploadAll = async () => {
  if (isUploading.value || pendingFiles.value.length === 0) return
  
  uploading.value = true
  emit('uploading', true)
  
  const results = []
  
  for (const fileObj of pendingFiles.value) {
    if (fileObj.status === 'pending') {
      const res = await uploadFile(fileObj)
      if (res) {
        results.push(res)
      }
    }
  }
  
  uploading.value = false
  emit('uploading', false)
  
  if (results.length > 0) {
    success(`上传成功 ${results.length} 张照片`)
  }
}

// 清除已上传的文件
const clearUploaded = () => {
  pendingFiles.value = pendingFiles.value.filter(f => f.status !== 'success')
}

// 清除全部
const clearAll = () => {
  for (const fileObj of pendingFiles.value) {
    if (fileObj.preview) {
      URL.revokeObjectURL(fileObj.preview)
    }
  }
  pendingFiles.value = []
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 打开文件选择
const triggerInput = () => {
  fileInput.value?.click()
}
</script>

<template>
  <div class="drag-drop-upload">
    <!-- 拖拽区域 -->
    <div 
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-files': pendingFiles.length > 0 }"
      @dragenter="handleDragEnter"
      @dragover="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerInput"
    >
      <input 
        ref="fileInput"
        type="file"
        accept="image/*"
        :multiple="multiple"
        @change="handleFileSelect"
      />
      <div v-if="pendingFiles.length === 0" class="drop-hint">
        <span class="drop-icon">📁</span>
        <p>拖拽图片到这里 或 点击选择</p>
        <p class="drop-hint-sub">最多 {{ maxFiles }} 张图片</p>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <div v-if="pendingFiles.length > 0" class="file-list">
      <div 
        v-for="fileObj in pendingFiles" 
        :key="fileObj.id"
        class="file-item"
        :class="fileObj.status"
      >
        <img :src="fileObj.preview" class="file-preview" />
        <div class="file-info">
          <p class="file-name">{{ fileObj.name }}</p>
          <p class="file-size">{{ formatSize(fileObj.size) }}</p>
          <div v-if="fileObj.status === 'uploading'" class="progress-bar">
            <div class="progress-fill" :style="{ width: fileObj.progress + '%' }"></div>
          </div>
          <p v-if="fileObj.status === 'error'" class="file-error">{{ fileObj.error }}</p>
        </div>
        <button 
          v-if="fileObj.status !== 'uploading'"
          class="remove-btn" 
          @click.stop="removeFile(fileObj.id)"
        >×</button>
        <span v-if="fileObj.status === 'success'" class="success-icon">✓</span>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div v-if="pendingFiles.length > 0" class="action-buttons">
      <button 
        type="button" 
        class="clear-btn" 
        @click="clearAll"
        :disabled="isUploading"
      >
        清除全部
      </button>
      <button 
        type="button" 
        class="upload-btn" 
        @click="uploadAll"
        :disabled="isUploading"
      >
        {{ isUploading ? '上传中...' : `上传 ${pendingFiles.filter(f => f.status === 'pending').length} 张` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.drag-drop-upload {
  width: 100%;
}

.drop-zone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover {
  border-color: var(--secondary-color);
  background: #f9f9f9;
}

.drop-zone.dragging {
  border-color: var(--secondary-color);
  background: #eef6ff;
}

.drop-zone input {
  display: none;
}

.drop-hint {
  color: #999;
}

.drop-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.drop-hint p {
  margin: 0;
}

.drop-hint-sub {
  font-size: 0.85rem;
  margin-top: 8px;
}

.file-list {
  margin-top: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
}

.file-item.success {
  background: #f0fff4;
}

.file-item.error {
  background: #fff5f5;
}

.file-preview {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.file-error {
  font-size: 12px;
  color: #e74c3c;
  margin: 4px 0 0;
}

.progress-bar {
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--secondary-color);
  transition: width 0.1s;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #e0e0e0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: #666;
}

.remove-btn:hover {
  background: #d0d0d0;
}

.success-icon {
  color: #10b981;
  font-size: 20px;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.clear-btn, .upload-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn {
  background: #f0f0f0;
  color: #666;
}

.clear-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.upload-btn {
  background: var(--secondary-color);
  color: #fff;
}

.upload-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.upload-btn:disabled, .clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
