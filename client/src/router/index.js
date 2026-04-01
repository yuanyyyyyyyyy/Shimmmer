import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Timeline from '../views/Timeline.vue'
import Darkroom from '../views/Darkroom.vue'
import Map from '../views/Map.vue'
import Favorites from '../views/Favorites.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import PhotoDetail from '../views/PhotoDetail.vue'
import Admin from '../views/Admin.vue'
import Review from '../views/Review.vue'
import UserProfile from '../views/UserProfile.vue'
import { useAuthStore } from '../stores'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/timeline', name: 'Timeline', component: Timeline },
  { path: '/darkroom', name: 'Darkroom', component: Darkroom },
  { path: '/map', name: 'Map', component: Map },
  { path: '/favorites', name: 'Favorites', component: Favorites },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/photo/:id', name: 'PhotoDetail', component: PhotoDetail },
  { path: '/admin', name: 'Admin', component: Admin, meta: { requiresAdmin: true } },
  { path: '/review', name: 'Review', component: Review },
  { path: '/user/:id', name: 'UserProfile', component: UserProfile }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果有 token 但没有用户信息，先获取用户信息
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchUser()
    } catch (e) {
      // token 失效，清除登录状态
      authStore.logout()
    }
  }

  // 需要管理员权限的页面
  if (to.meta.requiresAdmin) {
    if (!authStore.isLoggedIn) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
    if (!authStore.isAdmin) {
      return next({ name: 'Home' })
    }
  }

  // 需要登录的页面
  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
  }

  next()
})

export default router
