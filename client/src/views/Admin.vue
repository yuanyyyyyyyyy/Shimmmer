<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'
import { photos, upload } from '../api'

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

// 表单
const showForm = ref(false)
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
  is_visible: 1
})

// 检查登录
onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await authStore.fetchUser()
  loadPhotos()
})

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
    const res = await upload.single(file)
    form.value.url = res.url
    form.value.thumbnail_url = res.thumbnail_url
    form.value.width = res.width
    form.value.height = res.height
    form.value.file_size = res.file_size
  } catch (err) {
    alert(err.response?.data?.error || '上传失败')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!form.value.url) {
    alert('请先上传图片')
    return
  }

  // 将空字符串转换为 null
  const data = {}
  for (const key in form.value) {
    data[key] = form.value[key] === '' ? null : form.value[key]
  }

  try {
    if (editingPhoto.value) {
      await photos.update(editingPhoto.value.id, data)
      alert('更新成功')
    } else {
      await photos.create(data)
      alert('创建成功')
    }
    showForm.value = false
    resetForm()
    loadPhotos()
  } catch (err) {
    alert(err.response?.data?.error || '操作失败')
  }
}

// 删除
const handleDelete = async (photo) => {
  if (!confirm('确定要删除这张照片吗？')) return

  try {
    await photos.delete(photo.id)
    loadPhotos()
  } catch (err) {
    alert(err.response?.data?.error || '删除失败')
  }
}

// 编辑
const handleEdit = (photo) => {
  editingPhoto.value = photo
  form.value = { ...photo }
  showForm.value = true
}

// 重置表单
const resetForm = () => {
  editingPhoto.value = null
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
    is_visible: 1
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
          
          <!-- 图片上传 -->
          <div class="upload-area">
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
          <form @submit.prevent="handleSubmit">
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
            <div class="form-actions">
              <button type="button" @click="showForm = false">取消</button>
              <button type="submit" :disabled="uploading">
                {{ uploading ? '上传中...' : (editingPhoto ? '保存' : '创建') }}
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
