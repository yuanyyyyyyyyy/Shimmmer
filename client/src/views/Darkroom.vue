<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { photos } from '../api'

const router = useRouter()
const photo = ref(null)
const loading = ref(true)
const lightPos = ref({ x: 50, y: 50 })
const stayDuration = ref(0)
const lightOn = ref(false)
const showInfo = ref(false)
const containerRef = ref(null)
const trails = ref([])
const photoList = ref([])  // 照片列表
const showPhotoSelector = ref(false)  // 是否显示照片选择器
const containerStyle = ref({})  // 容器样式，根据照片尺寸自适应
const chargeProgress = ref(0)  // 长按蓄力进度
const exploreProgress = ref(0)  // 探索进度

let stayTimer = null
let particleTimer = null
let shapeTimer = null
let colorTimer = null
let chargeTimer = null
let lastMousePos = { x: 50, y: 50 }

const simpleShapes = [
  { name: '圆形', clipPath: 'circle(50% at 50% 50%)' },
  { name: '星星', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { name: '爱心', clipPath: 'polygon(50% 10%, 65% 0%, 80% 15%, 80% 35%, 65% 50%, 50% 70%, 35% 50%, 20% 35%, 20% 15%, 35% 0%)' },
  { name: '菱形', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { name: '六边形', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  { name: '水滴', clipPath: 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 80%, 50% 100%, 35% 80%, 0% 50%, 35% 35%)' },
  { name: '花朵', clipPath: 'polygon(50% 0%, 55% 25%, 75% 15%, 65% 40%, 90% 50%, 65% 60%, 75% 85%, 55% 75%, 50% 100%, 45% 75%, 25% 85%, 35% 60%, 10% 50%, 35% 40%, 25% 15%, 45% 25%)' },
  { name: '月亮', clipPath: 'polygon(50% 0%, 70% 10%, 80% 30%, 70% 50%, 80% 70%, 60% 90%, 50% 100%, 40% 90%, 20% 70%, 30% 50%, 20% 30%, 30% 10%)' },
  { name: '书本', clipPath: 'polygon(10% 10%, 15% 10%, 15% 90%, 10% 90%, 5% 85%, 5% 15%, 85% 15%, 90% 20%, 90% 80%, 85% 85%, 15% 85%, 10% 85%)' },
  { name: '相机', clipPath: 'polygon(20% 20%, 35% 15%, 70% 15%, 85% 20%, 85% 55%, 80% 60%, 70% 55%, 55% 70%, 50% 60%, 45% 70%, 30% 55%, 20% 60%, 15% 50%, 15% 25%)' },
  { name: '灯泡', clipPath: 'polygon(35% 0%, 65% 0%, 70% 20%, 85% 30%, 70% 50%, 80% 70%, 60% 65%, 50% 100%, 40% 65%, 20% 70%, 30% 50%, 15% 30%, 30% 20%)' },
  { name: '蝴蝶', clipPath: 'polygon(50% 25%, 70% 5%, 90% 25%, 75% 50%, 90% 75%, 50% 100%, 10% 75%, 25% 50%, 10% 25%, 30% 5%)' },
]

// 随机光晕颜色 - 更多样
const glowColors = [
  { name: '纯白', color: '255,255,255' },
  { name: '暖黄', color: '255,240,180' },
  { name: '淡粉', color: '255,200,220' },
  { name: '浅蓝', color: '200,220,255' },
  { name: '薄荷', color: '180,255,220' },
  { name: '薰衣草', color: '220,200,255' },
  { name: '蜜桃', color: '255,210,190' },
  { name: '天空', color: '180,220,255' },
  { name: '晨光', color: '255,230,200' },
  { name: '暮光', color: '255,190,220' },
]

// 特殊效果
const specialEffects = [
  { name: '彩虹', rainbow: true },
  { name: '魔法', sparkly: true },
  { name: '金色', golden: true },
]

const currentShape = ref(simpleShapes[0])
const currentEffect = ref(null)
const currentColor = ref(glowColors[0])
const particles = ref([])
const sparkles = ref([])
const ripples = ref([])

// 随机浮现速度 (0.5-3 之间的任意值)
const revealSpeed = ref(1.5)

// 随机旋转速度 (10s - 60s)
const glowRotateDuration = ref(30)

// 加载照片列表
const loadPhotoList = async () => {
  try {
    const res = await photos.list({ page: 1, pageSize: 50, sort: 'created' })
    // 确保返回的是数组
    photoList.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    console.error('loadPhotoList error:', e)
    // 如果失败，尝试使用 getRandomDiary 获取的照片
    try {
      const randomRes = await photos.getRandomDiary()
      if (randomRes.photo) {
        photoList.value = [randomRes.photo]
      }
    } catch (e2) {}
  }
}

// 选择指定照片
const selectPhoto = (selectedPhoto) => {
  photo.value = selectedPhoto
  stayDuration.value = 0
  lightOn.value = false
  showPhotoSelector.value = false
  updateContainerSize()
}

// 根据照片尺寸更新容器大小 - 方案A：固定容器 + 照片自适应
const updateContainerSize = () => {
  // 固定容器尺寸：屏幕的80%宽/70%高
  const maxW = window.innerWidth * 0.8
  const maxH = window.innerHeight * 0.7

  containerStyle.value = {
    width: maxW + 'px',
    height: maxH + 'px'
  }
}

const loadDiary = async () => {
  loading.value = true
  stayDuration.value = 0
  lightOn.value = false

  // 随机选择形状
  currentShape.value = simpleShapes[Math.floor(Math.random() * simpleShapes.length)]
  
  // 随机浮现速度 (0.5-3)，更平滑的随机
  revealSpeed.value = Math.random() * 2.5 + 0.5
  
  // 随机特殊效果 (25%概率)
  if (Math.random() < 0.25) {
    currentEffect.value = specialEffects[Math.floor(Math.random() * specialEffects.length)]
  } else {
    currentEffect.value = null
  }
  
  // 随机光晕颜色
  currentColor.value = glowColors[Math.floor(Math.random() * glowColors.length)]
  
  // 随机旋转速度 (10-60秒)
  glowRotateDuration.value = Math.floor(Math.random() * 50) + 10
  
  particles.value = []
  sparkles.value = []
  ripples.value = []
  trails.value = []
  exploreProgress.value = 0

  try {
    const res = await photos.getRandomDiary()
    photo.value = res.photo
    updateContainerSize()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 动态光晕参数
const lightConfig = computed(() => {
  const baseRadius = 20
  const maxRadius = 400
  const radius = Math.min(maxRadius, baseRadius + stayDuration.value * revealSpeed.value)
  
  const baseOpacity = 0.3
  const maxOpacity = 0.95
  const opacity = Math.min(maxOpacity, baseOpacity + stayDuration.value * 0.02)
  
  return { radius, opacity }
})

// 鼠标移动处理
const handleMouseMove = (e) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const newPos = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  }
  
  // 计算移动速度
  const dx = newPos.x - lastMousePos.x
  const dy = newPos.y - lastMousePos.y
  const speed = Math.sqrt(dx * dx + dy * dy)
  
  // 快速移动时生成拖尾，降低概率从40%到15%
  if (speed > 1.5 && Math.random() < 0.15) {
    const trail = {
      id: Date.now() + Math.random(),
      x: newPos.x,
      y: newPos.y,
      size: Math.random() * 15 + 10,
      opacity: 0.6,
      color: currentColor.value.color,
      duration: Math.random() * 300 + 200
    }
    trails.value.push(trail)
    setTimeout(() => {
      trails.value = trails.value.filter(t => t.id !== trail.id)
    }, trail.duration)
  }
  
  // 限制拖尾数量
  if (trails.value.length > 20) {
    trails.value = trails.value.slice(-20)
  }
  
  lastMousePos = newPos
  lightPos.value = newPos

  // 降低涟漪生成概率，从8%降到2%
  if (Math.random() < 0.02) {
    spawnRipple(lightPos.value.x, lightPos.value.y)
  }
}

// 生成涟漪
const spawnRipple = (x, y) => {
  const color = currentColor.value.color
  const ripple = {
    id: Date.now() + Math.random(),
    x, y,
    size: 0,
    opacity: 0.7,
    color
  }
  ripples.value.push(ripple)
  
  const animate = setInterval(() => {
    ripple.size += 10
    ripple.opacity -= 0.025
    if (ripple.opacity <= 0) {
      clearInterval(animate)
      ripples.value = ripples.value.filter(r => r.id !== ripple.id)
    }
  }, 30)
}

// 开始计时
const handleMouseEnter = () => {
  if (lightOn.value) return
  
  // 30%概率换形状
  if (Math.random() < 0.3) {
    currentShape.value = simpleShapes[Math.floor(Math.random() * simpleShapes.length)]
  }
  
  // 重新随机速度 (0.5-3)，更平滑的随机
  revealSpeed.value = Math.random() * 2.5 + 0.5
  
  // 20%概率特殊效果
  if (Math.random() < 0.2) {
    currentEffect.value = specialEffects[Math.floor(Math.random() * specialEffects.length)]
  }
  
  stayTimer = setInterval(() => {
    stayDuration.value++
    if (currentEffect.value?.sparkly && Math.random() < 0.15) {
      spawnSparkle()
    }
  }, 50)
}

// 生成闪烁星光 - 从鼠标位置向外扩散
const spawnSparkle = () => {
  const { x, y } = lightPos.value
  const color = currentColor.value.color
  const angle = Math.random() * Math.PI * 2
  const distance = Math.random() * 100 + 30
  
  const sparkle = {
    id: Date.now() + Math.random(),
    x: x + Math.cos(angle) * distance / 10,
    y: y + Math.sin(angle) * distance / 8,
    startX: x,
    startY: y,
    endX: x + Math.cos(angle) * distance,
    endY: y + Math.sin(angle) * distance,
    size: Math.random() * 6 + 2,
    duration: Math.random() * 1000 + 500,
    color,
  }
  sparkles.value.push(sparkle)
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => s.id !== sparkle.id)
  }, sparkle.duration)
}

// 重置计时
const handleMouseLeave = () => {
  if (stayTimer) {
    clearInterval(stayTimer)
    stayTimer = null
  }
  if (chargeTimer) {
    clearInterval(chargeTimer)
    chargeTimer = null
  }
  chargeProgress.value = 0
  if (lightOn.value) return
  const fadeOut = setInterval(() => {
    stayDuration.value = Math.max(0, stayDuration.value - 8)
    if (stayDuration.value === 0) {
      clearInterval(fadeOut)
    }
  }, 50)
}

// 长按蓄力
const handleMouseDown = (e) => {
  if (lightOn.value) return
  // 阻止双击时触发
  if (e && e.detail > 1) return

  chargeProgress.value = 0
  chargeTimer = setInterval(() => {
    chargeProgress.value += 2
    if (chargeProgress.value >= 100) {
      // 蓄力完成！触发彩虹爆炸
      clearInterval(chargeTimer)
      chargeProgress.value = 100
      triggerChargeEffect()
    }
  }, 30)
}

// 蓄力完成特效
const triggerChargeEffect = () => {
  // 疯狂生成粒子
  for (let j = 0; j < 10; j++) {
    setTimeout(() => spawnParticle(), j * 50)
  }
  // 闪烁光效
  lightPos.value = { ...lightPos.value }
  setTimeout(() => {
    chargeProgress.value = 0
  }, 1500)
}

// 开灯/关灯
const toggleLight = () => {
  lightOn.value = !lightOn.value
  if (lightOn.value) {
    stayDuration.value = 100
  }
}

const toggleInfo = () => {
  showInfo.value = !showInfo.value
}

const nextDiary = () => {
  stayDuration.value = 0
  loadDiary()
}

const viewDetail = () => {
  if (photo.value) router.push(`/photo/${photo.value.id}`)
}

const spawnParticle = () => {
  if (!containerRef.value || stayDuration.value < 30) return
  const { x, y } = lightPos.value
  const color = currentColor.value.color
  // 从鼠标位置向外随机偏移
  const angle = Math.random() * Math.PI * 2
  const distance = Math.random() * 80 + 20
  const particle = {
    id: Date.now() + Math.random(),
    x: x + Math.cos(angle) * distance / 10,
    y: y + Math.sin(angle) * distance / 8,
    size: Math.random() * 4 + 1,
    opacity: 0.8,
    duration: Math.random() * 1500 + 800,
    color,
    // 动画相关
    startX: x,
    startY: y,
    endX: x + Math.cos(angle) * distance,
    endY: y + Math.sin(angle) * distance,
  }
  particles.value.push(particle)
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id !== particle.id)
  }, particle.duration)
}

onMounted(() => {
  loadDiary()
  loadPhotoList()
  // 降低粒子生成频率，从400ms改为1500ms
  particleTimer = setInterval(() => {
    if (Math.random() > 0.7) spawnParticle()
  }, 1500)

  // 形状变换从1.5秒改为5秒
  shapeTimer = setInterval(() => {
    const newShape = simpleShapes[Math.floor(Math.random() * simpleShapes.length)]
    currentShape.value = newShape
  }, 5000)

  // 颜色变换从800ms改为3000ms，减少视觉频繁变化
  colorTimer = setInterval(() => {
    currentColor.value = glowColors[Math.floor(Math.random() * glowColors.length)]
  }, 3000)
  
})

onUnmounted(() => {
  if (stayTimer) clearInterval(stayTimer)
  if (particleTimer) clearInterval(particleTimer)
  if (shapeTimer) clearInterval(shapeTimer)
  if (colorTimer) clearInterval(colorTimer)
})

// 遮罩样式 - 使用CSS变量优化性能
const maskStyle = computed(() => {
  if (lightOn.value) return { background: 'transparent' }

  return {
    '--mask-radius': lightConfig.value.radius + 'px',
    '--mask-x': lightPos.value.x + '%',
    '--mask-y': lightPos.value.y + '%',
    '--mask-color': currentColor.value.color
  }
})


</script>

<template>
  <div class="darkroom">
    <div class="container">
      <h2>暗房</h2>
      <p class="tip">
        移动鼠标探索光影 ·
        <span v-if="exploreProgress > 0" class="progress">
          探索: {{ exploreProgress }}%
        </span>
      </p>
      
      <div v-if="loading" class="loading">冲洗中...</div>
      <div v-else-if="!photo" class="empty">暂无日记</div>
      <div
        v-else
        ref="containerRef"
        class="diary-container"
        :style="containerStyle"
        @mousemove="handleMouseMove"
        @mousedown="handleMouseDown"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @dblclick="loadDiary"
      >
        <!-- 照片层 - 完整显示 -->
        <img
          v-if="photo.url"
          :src="photo.url"
          class="diary-photo"
          alt="diary"
        />
        
        <!-- 噪点效果层 -->
        <div class="noise-overlay"></div>
        
        <!-- 遮罩层 - 形状挖洞 -->
        <div 
          class="diary-mask"
          :style="maskStyle"
        ></div>
        
        <!-- 长按蓄力指示器 -->
        <div
          v-if="chargeProgress > 0"
          class="charge-indicator"
          :style="{
            left: lightPos.x + '%',
            top: lightPos.y + '%',
            width: (20 + chargeProgress * 0.5) + 'px',
            height: (20 + chargeProgress * 0.5) + 'px',
            opacity: chargeProgress / 100 * 0.6
          }"
        ></div>
        
        <!-- 涟漪效果 - 从鼠标位置向外扩散 -->
        <div class="ripples">
          <div 
            v-for="r in ripples" 
            :key="r.id"
            class="ripple"
            :style="{
              left: r.x + '%',
              top: r.y + '%',
              width: r.size + 'px',
              height: r.size + 'px',
              opacity: r.opacity,
              borderColor: `rgba(${r.color}, ${r.opacity})`,
              boxShadow: `0 0 ${r.size/3}px rgba(${r.color}, ${r.opacity * 0.5})`
            }"
          ></div>
        </div>
        
        <!-- 拖尾效果 -->
        <div class="trails">
          <div 
            v-for="t in trails" 
            :key="t.id"
            class="trail"
            :style="{
              left: t.x + '%',
              top: t.y + '%',
              width: t.size + 'px',
              height: t.size + 'px',
              background: `radial-gradient(circle, rgba(${t.color}, ${t.opacity}) 0%, transparent 70%)`,
              animationDuration: t.duration + 'ms'
            }"
          ></div>
        </div>
        
        <!-- 闪烁星光 -->
        <!-- 星光效果 - 从鼠标位置向外扩散 -->
        <div class="sparkles">
          <div 
            v-for="s in sparkles" 
            :key="s.id"
            class="sparkle"
            :style="{
              left: s.x + '%',
              top: s.y + '%',
              width: s.size + 'px',
              height: s.size + 'px',
              animationDuration: s.duration + 'ms',
              background: `radial-gradient(circle, rgba(${s.color},0.9) 0%, rgba(${s.color},0) 70%)`,
              '--sparkle-end-x': (s.endX - s.x) + '%',
              '--sparkle-end-y': (s.endY - s.y) + '%',
            }"
          ></div>
        </div>
        
        <!-- 粒子效果 - 从鼠标位置向外扩散 -->
        <div class="particles">
          <div 
            v-for="p in particles" 
            :key="p.id"
            class="particle"
            :style="{
              left: p.x + '%',
              top: p.y + '%',
              width: p.size + 'px',
              height: p.size + 'px',
              opacity: p.opacity,
              background: `rgba(${p.color}, 0.8)`,
              animationDuration: p.duration + 'ms',
              '--particle-end-x': (p.endX - p.x) + '%',
              '--particle-end-y': (p.endY - p.y) + '%',
            }"
          ></div>
        </div>
        
        <!-- 文字内容 -->
        <div class="diary-content" :class="{ visible: showInfo || lightOn }">
          <h3>{{ photo.title || '光影日记' }}</h3>
          <p class="date">{{ photo.shot_date }}</p>
          <p v-if="photo.mood" class="mood">"{{ photo.mood }}"</p>
          <p v-if="photo.location" class="location">📍 {{ photo.location }}</p>
        </div>

        <!-- 控制按钮 -->
        <div class="controls">
          <button @click="toggleLight">{{ lightOn ? '关灯' : '开灯' }}</button>
          <button @click="toggleInfo">{{ showInfo ? '隐藏信息' : '显示信息' }}</button>
          <button @click="showPhotoSelector = true">选择照片</button>
          <button @click="nextDiary">下一张</button>
          <button @click="viewDetail">查看详情</button>
        </div>
      </div>
    </div>

    <!-- 照片选择器弹窗 -->
    <div v-if="showPhotoSelector" class="photo-selector-overlay" @click.self="showPhotoSelector = false">
      <div class="photo-selector">
        <h3>选择照片</h3>
        <div class="photo-grid">
          <div
            v-for="p in photoList"
            :key="p.id"
            class="photo-thumb"
            :class="{ active: photo?.id === p.id }"
            :style="{ backgroundImage: `url(${p.thumbnail_url || p.url})` }"
            @click="selectPhoto(p)"
          ></div>
        </div>
        <button class="close-btn" @click="showPhotoSelector = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.darkroom { min-height: calc(100vh - 140px); }

h2 { margin-bottom: 8px; }

.tip {
  color: #999;
  margin-bottom: 24px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.progress {
  color: #4ade80;
  font-weight: bold;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.3);
  vertical-align: middle;
  margin-right: 2px;
  transition: background 0.3s ease;
}

.diary-container {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diary-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 0;
}

.noise-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  animation: noise-anim 0.2s steps(5) infinite;
}

@keyframes noise-anim {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-5%, -5%); }
  40% { transform: translate(5%, 5%); }
  60% { transform: translate(-5%, 5%); }
  80% { transform: translate(5%, -5%); }
  100% { transform: translate(0, 0); }
}

.diary-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  background: radial-gradient(
    circle var(--mask-radius, 20px) at var(--mask-x, 50%) var(--mask-y, 50%),
    rgba(255, 255, 255, 0.25) 0%,
    rgba(var(--mask-color, 255, 255, 255), 0.12) 40%,
    transparent 70%,
    rgba(0, 0, 0, 0.98) 100%
  );
  will-change: background;
  transition: background 0.1s ease-out;
}

.charge-indicator {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  animation: charge-pulse 0.5s ease-in-out infinite;
}

@keyframes charge-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.ripples {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}

.ripple {
  position: absolute;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.trails {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.trail {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: trail-fade ease-out forwards;
}

@keyframes trail-fade {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
}

.sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.sparkle {
  position: absolute;
  border-radius: 50%;
  animation: sparkle-fly ease-out forwards;
}

@keyframes sparkle-fly {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--sparkle-end-x), var(--sparkle-end-y)) scale(0.2);
    opacity: 0;
  }
}

.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}

.particle {
  position: absolute;
  border-radius: 50%;
  animation: particle-fly ease-out forwards;
}

@keyframes particle-fly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translate(var(--particle-end-x), var(--particle-end-y)) scale(0.1);
    opacity: 0;
  }
}

.diary-content {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  pointer-events: none;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.4s ease-out;
  text-shadow: 0 2px 20px rgba(0,0,0,0.9);
}

.diary-content.visible {
  opacity: 1;
  transform: translateY(0);
}

.diary-content h3 {
  font-size: 2.5rem;
  margin-bottom: 16px;
  font-weight: 300;
  letter-spacing: 4px;
}

.diary-content .date {
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 24px;
  font-family: monospace;
}

.diary-content .mood {
  font-size: 1.4rem;
  font-style: italic;
  margin-bottom: 20px;
  opacity: 0.9;
}

.diary-content .location {
  opacity: 0.6;
  font-size: 0.95rem;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 7;
}

.controls button {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  padding: 10px 24px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.controls button:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.05);
}

.loading, .empty {
  text-align: center;
  padding: 80px;
  color: #999;
}

/* 照片选择器 */
.photo-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-selector {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.photo-selector h3 {
  margin: 0 0 16px;
  text-align: center;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.photo-thumb {
  aspect-ratio: 4/3;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  min-height: 100px;
}

.photo-thumb:hover {
  border-color: rgba(255,255,255,0.5);
}

.photo-thumb.active {
  border-color: #4ade80;
}

.photo-selector .close-btn {
  display: block;
  margin: 16px auto 0;
  padding: 8px 24px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.photo-selector .close-btn:hover {
  background: rgba(255,255,255,0.2);
}
</style>
