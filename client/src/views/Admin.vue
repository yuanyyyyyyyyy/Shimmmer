<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'
import { photos, upload, tags } from '../api'
import { success, error, confirm } from '../composables/useToast'
import DragDropUpload from '../components/DragDropUpload.vue'
import { extractExif } from '../composables/useExif'

const router = useRouter()
const authStore = useAuthStore()

// 照片列表
const photoList = ref([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)

// 上传状态
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadedPhotos = ref([])

// 标签列表
const allTags = ref([])
const selectedTags = ref([])

// 表单
const showForm = ref(false)
const uploadMode = ref('single') // 'single' | 'batch'
const editingPhoto = ref(null)
const form = ref({
  title: '',
  mood: '',
  shot_date: '',
  location: '',
  url: '',
  thumbnail_url: '',
  width: 0,
  height: 0,
  file_size: 0,
  is_visible: 1,
  latitude: null,
  longitude: null
})

// 检查登录
onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await authStore.fetchUser()
  loadPhotos()
  loadTags()
})

// 加载标签
const loadTags = async () => {
  try {
    const res = await tags.list()
    allTags.value = res.tags
  } catch (e) {
    console.error(e)
  }
}

// 创建新标签
const createTag = async () => {
  const name = prompt('请输入标签名称:')
  if (!name) return
  
  try {
    const res = await tags.create({ name })
    allTags.value.push(res.tag)
    success('标签创建成功')
  } catch (e) {
    error(e.response?.data?.error || '创建失败')
  }
}

// 切换标签
const toggleTag = (tagId) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

// 处理拖拽上传完成
const handleBatchUploaded = (photoData) => {
  uploadedPhotos.value.push(photoData)
}

// 处理拖拽上传中
const handleBatchUploading = (isUploading) => {
  uploading.value = isUploading
}

// 加载照片
const loadPhotos = async () => {
  loading.value = true
  try {
    const res = await photos.list({ page: page.value, limit: 20, sort: 'created' })
    photoList.value = res.data
    total.value = res.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 文件选择
const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0

  try {
    // 并行执行：上传文件和读取 EXIF
    const [res, exifData] = await Promise.all([
      upload.single(file),
      extractExif(file)
    ])
    
    form.value.url = res.url
    form.value.thumbnail_url = res.thumbnail_url
    form.value.width = res.width
    form.value.height = res.height
    form.value.file_size = res.file_size
    
    // 自动填充 EXIF 数据
    if (exifData.shot_date && !form.value.shot_date) {
      form.value.shot_date = exifData.shot_date
    }

    // 自动填充 GPS 数据
    if (exifData.latitude && exifData.longitude) {
      form.value.latitude = exifData.latitude
      form.value.longitude = exifData.longitude
      console.log('GPS 坐标:', exifData.latitude, exifData.longitude)
    }
  } catch (err) {
    error(err.response?.data?.error || '上传失败')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!form.value.url) {
    error('请先上传图片')
    return
  }

  // 将空字符串转换为 null
  const data = {}
  for (const key in form.value) {
    data[key] = form.value[key] === '' ? null : form.value[key]
  }

  try {
    let photoId
    if (editingPhoto.value) {
      await photos.update(editingPhoto.value.id, data)
      photoId = editingPhoto.value.id
      success('更新成功')
    } else {
      const res = await photos.create(data)
      photoId = res.photo.id
      success('创建成功')
    }
    
    // 保存标签
    if (photoId) {
      await tags.setPhotoTags(photoId, selectedTags.value)
    }
    
    showForm.value = false
    resetForm()
    loadPhotos()
  } catch (err) {
    error(err.response?.data?.error || '操作失败')
  }
}

// 删除
const handleDelete = async (photo) => {
  if (!(await confirm('确定要删除这张照片吗？'))) return

  try {
    await photos.delete(photo.id)
    loadPhotos()
  } catch (err) {
    error(err.response?.data?.error || '删除失败')
  }
}

// 编辑
const handleEdit = async (photo) => {
  editingPhoto.value = photo
  form.value = { ...photo }
  
  // 加载照片的标签
  try {
    const res = await tags.getPhotoTags(photo.id)
    selectedTags.value = res.tags.map(t => t.id)
  } catch (e) {
    selectedTags.value = []
  }
  
  showForm.value = true
}

// 重置表单
const resetForm = () => {
  editingPhoto.value = null
  selectedTags.value = []
  uploadedPhotos.value = []
  form.value = {
    title: '',
    mood: '',
    shot_date: '',
    location: '',
    url: '',
    thumbnail_url: '',
    width: 0,
    height: 0,
    file_size: 0,
    is_visible: 1,
    latitude: null,
    longitude: null
  }
}

// 批量保存
const handleBatchSave = async () => {
  if (uploadedPhotos.value.length === 0) {
    error('请先上传照片')
    return
  }
  
  uploading.value = true
  
  try {
    // 为每张照片创建记录
    for (const photo of uploadedPhotos.value) {
      const data = {
        title: form.value.title || null,
        mood: form.value.mood || null,
        shot_date: form.value.shot_date || null,
        location: form.value.location || null,
        url: photo.url,
        thumbnail_url: photo.thumbnail_url,
        width: photo.width,
        height: photo.height,
        file_size: photo.file_size,
        is_visible: form.value.is_visible
      }
      
      const res = await photos.create(data)
      
      // 保存标签
      if (selectedTags.value.length > 0) {
        await tags.setPhotoTags(res.photo.id, selectedTags.value)
      }
    }
    
    success(`成功创建 ${uploadedPhotos.value.length} 张照片`)
    showForm.value = false
    resetForm()
    loadPhotos()
  } catch (err) {
    error(err.response?.data?.error || '操作失败')
  } finally {
    uploading.value = false
  }
}

// 登出
const handleLogout = () => {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="admin">
    <div class="container">
      <div class="admin-header">
        <h2>照片管理</h2>
        <div class="header-actions">
          <button @click="showForm = true; resetForm()">+ 上传照片</button>
          <button class="logout" @click="handleLogout">登出</button>
        </div>
      </div>

      <!-- 照片列表 -->
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="photo-list">
        <div v-for="photo in photoList" :key="photo.id" class="photo-item">
          <img :src="photo.thumbnail_url || photo.url" />
          <div class="photo-info">
            <h4>{{ photo.title || '无题' }}</h4>
            <p v-if="photo.mood">{{ photo.mood }}</p>
            <span class="meta">{{ photo.shot_date }} · {{ photo.location || '无地点' }}</span>
          </div>
          <div class="photo-actions">
            <span :class="['status', photo.is_visible ? 'visible' : 'hidden']">
              {{ photo.is_visible ? '公开' : '隐藏' }}
            </span>
            <button @click="handleEdit(photo)">编辑</button>
            <button class="delete" @click="handleDelete(photo)">删除</button>
          </div>
        </div>
        <div v-if="photoList.length === 0" class="empty">暂无照片，点击上方按钮上传</div>
      </div>

      <!-- 上传/编辑表单弹窗 -->
      <div v-if="showForm" class="modal" @click.self="showForm = false">
        <div class="modal-content">
          <h3>{{ editingPhoto ? '编辑照片' : '上传照片' }}</h3>
          
          <!-- 批量上传模式切换 -->
          <div v-if="!editingPhoto" class="upload-mode-switch">
            <button 
              type="button"
              :class="{ active: uploadMode === 'single' }"
              @click="uploadMode = 'single'; resetForm()"
            >
              单张上传
            </button>
            <button 
              type="button"
              :class="{ active: uploadMode === 'batch' }"
              @click="uploadMode = 'batch'; resetForm()"
            >
              批量上传
            </button>
          </div>
          
          <!-- 图片上传 -->
          <div v-if="uploadMode === 'batch'" class="upload-area">
            <DragDropUpload
              :max-files="20"
              @uploaded="handleBatchUploaded"
              @uploading="handleBatchUploading"
            />
          </div>
          <div v-else class="upload-area">
            <div v-if="form.url" class="preview">
              <img :src="form.url" />
              <button class="remove" @click="form.url = ''">×</button>
            </div>
            <div v-else class="upload-btn">
              <input type="file" accept="image/*" @change="handleFileSelect" />
              <span v-if="uploading">上传中...</span>
              <span v-else>点击选择图片</span>
            </div>
          </div>

          <!-- 表单 -->
          <form @submit.prevent="uploadMode === 'batch' ? handleBatchSave() : handleSubmit()">
            <div class="form-group">
              <label>标题</label>
              <input v-model="form.title" type="text" placeholder="可选标题" />
            </div>
            <div class="form-group">
              <label>心情/日记</label>
              <textarea v-model="form.mood" placeholder="一句话日记..." rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>拍摄日期</label>
                <input v-model="form.shot_date" type="date" />
              </div>
              <div class="form-group">
                <label>地点</label>
                <input v-model="form.location" type="text" placeholder="拍摄地点" />
              </div>
            </div>
            <div class="form-group">
              <label>
                <input v-model="form.is_visible" type="checkbox" :value="1" />
                公开显示
              </label>
            </div>
            
            <!-- 标签选择 -->
            <div class="form-group">
              <label>标签</label>
              <div class="tags-selector">
                <span 
                  v-for="tag in allTags" 
                  :key="tag.id"
                  class="tag-option"
                  :class="{ selected: selectedTags.includes(tag.id) }"
                  :style="{ 
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#f0f0f0',
                    borderColor: tag.color
                  }"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </span>
                <button type="button" class="add-tag-btn" @click="createTag">+ 新建标签</button>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" @click="showForm = false">取消</button>
              <button type="submit" :disabled="uploading">
                {{ uploading ? '上传中...' : (editingPhoto ? '保存' : (uploadMode === 'batch' && uploadedPhotos.length > 0 ? `保存 ${uploadedPhotos.length} 张` : '创建')) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin { min-height: calc(100vh - 140px); }

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.upload-mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.upload-mode-switch button {
  flex: 1;
  padding: 8px 16px;
  border: 2px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.upload-mode-switch button.active {
  border-color: var(--secondary-color);
  background: var(--secondary-color);
  color: #fff;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions button {
  background: var(--secondary-color);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.header-actions button.logout {
  background: #95a5a6;
}

.photo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.photo-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.photo-item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.photo-info {
  flex: 1;
}

.photo-info h4 { margin-bottom: 4px; }
.photo-info p { color: #666; font-size: 0.9rem; margin-bottom: 4px; }
.photo-info .meta { color: #999; font-size: 0.8rem; }

.photo-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.photo-actions button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.photo-actions button.delete {
  color: #e74c3c;
  border-color: #e74c3c;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.status.visible { background: #d4edda; color: #155724; }
.status.hidden { background: #f8d7da; color: #721c24; }

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 { margin-bottom: 20px; }

.upload-area {
  margin-bottom: 20px;
}

.preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.preview img {
  width: 100%;
  display: block;
}

.preview .remove {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
}

.upload-btn {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  position: relative;
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-btn span { color: #999; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
.form-group input[type="text"],
.form-group input[type="date"],
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.tags-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-option {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  color: #333;
}

.tag-option:hover {
  opacity: 0.8;
}

.tag-option.selected {
  color: #fff;
}

.add-tag-btn {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: #f0f0f0;
  border: 2px dashed #ccc;
  cursor: pointer;
}

.add-tag-btn:hover {
  border-color: #999;
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.form-actions button[type="button"] {
  background: #fff;
  border: 1px solid #ddd;
}

.form-actions button[type="submit"] {
  background: var(--secondary-color);
  color: #fff;
  border: none;
}
</style>
