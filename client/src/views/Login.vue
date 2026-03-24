<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await authStore.login(username.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="container">
      <div class="login-box">
        <h2>管理员登录</h2>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <input 
              v-model="username" 
              type="text" 
              placeholder="用户名" 
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <input 
              v-model="password" 
              type="password" 
              placeholder="密码" 
              :disabled="loading"
            />
          </div>
          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        <p class="hint">默认账号: admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  background: #fff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 360px;
}

h2 {
  text-align: center;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--secondary-color);
}

button {
  width: 100%;
  padding: 14px;
  background: var(--secondary-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 8px;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  text-align: center;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.hint {
  text-align: center;
  margin-top: 20px;
  color: #999;
  font-size: 0.85rem;
}
</style>
