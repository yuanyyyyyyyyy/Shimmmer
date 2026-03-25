import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Timeline from '../views/Timeline.vue'
import Darkroom from '../views/Darkroom.vue'
import Favorites from '../views/Favorites.vue'
import Login from '../views/Login.vue'
import PhotoDetail from '../views/PhotoDetail.vue'
import Admin from '../views/Admin.vue'
import Review from '../views/Review.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/timeline', name: 'Timeline', component: Timeline },
  { path: '/darkroom', name: 'Darkroom', component: Darkroom },
  { path: '/favorites', name: 'Favorites', component: Favorites },
  { path: '/login', name: 'Login', component: Login },
  { path: '/photo/:id', name: 'PhotoDetail', component: PhotoDetail },
  { path: '/admin', name: 'Admin', component: Admin },
  { path: '/review', name: 'Review', component: Review }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
