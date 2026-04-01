<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  if (!username.value || !password.value) {
    error.value = '请填写用户名和密码'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码长度至少为6位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.register(username.value, password.value, nickname.value || username.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register">
    <div class="container">
      <div class="register-box">
        <h2>用户注册</h2>
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <input
              v-model="username"
              type="text"
              placeholder="用户名（3-20位字母、数字或下划线）"
              :disabled="loading"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <input
              v-model="nickname"
              type="text"
              placeholder="昵称（选填）"
              :disabled="loading"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <input
              v-model="password"
              type="password"
              placeholder="密码（至少6位）"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="确认密码"
              :disabled="loading"
            />
          </div>
          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>
        <p class="hint">
          已有账号？<router-link to="/login">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-box {
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
  font-size: 0.9rem;
}

.hint a {
  color: var(--secondary-color);
  text-decoration: none;
}

.hint a:hover {
  text-decoration: underline;
}
</style>
