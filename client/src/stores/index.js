import { defineStore } from 'pinia'
import { auth } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null
  }),
  getters: {
    isLoggedIn: state => !!state.token
  },
  actions: {
    async login(username, password) {
      const res = await auth.login(username, password)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('token', res.token)
      return res
    },
    async fetchUser() {
      if (!this.token) return
      try {
        const res = await auth.getMe()
        this.user = res.user
      } catch (e) {
        this.logout()
      }
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
    }
  }
})

// 获取浏览器指纹
export function getFingerprint() {
  let fp = localStorage.getItem('fingerprint')
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substr(2, 16) + Date.now()
    localStorage.setItem('fingerprint', fp)
  }
  return fp
}
