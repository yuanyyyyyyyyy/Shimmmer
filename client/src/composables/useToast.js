// Toast 类型配置
const TOAST_TYPES = {
  success: { icon: '✓', class: 'toast-success' },
  error: { icon: '✗', class: 'toast-error' },
  warning: { icon: '⚠', class: 'toast-warning' },
  info: { icon: 'ℹ', class: 'toast-info' }
}

// 创建 Toast 容器（如果不存在）
function ensureContainer() {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

// 创建单个 Toast 元素
function createToast(message, type = 'info', duration = 3000) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info
  const toast = document.createElement('div')
  toast.className = `toast ${config.class}`
  toast.innerHTML = `
    <span class="toast-icon">${config.icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `
  return toast
}

// 显示 Toast
function showToast(message, type = 'info', duration = 3000) {
  const container = ensureContainer()
  const toast = createToast(message, type, duration)
  container.appendChild(toast)

  // 触发进入动画
  requestAnimationFrame(() => toast.classList.add('toast-show'))

  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove('toast-show')
      toast.addEventListener('transitionend', () => toast.remove())
    }, duration)
  }

  return toast
}

// 便捷方法
export function success(message, duration) {
  return showToast(message, 'success', duration)
}

export function error(message, duration) {
  return showToast(message, 'error', duration)
}

export function warning(message, duration) {
  return showToast(message, 'warning', duration)
}

export function info(message, duration) {
  return showToast(message, 'info', duration)
}

// Promise 化的 confirm
export function confirm(message) {
  return new Promise((resolve) => {
    const container = ensureContainer()
    const modal = document.createElement('div')
    modal.className = 'toast-modal-overlay'
    modal.innerHTML = `
      <div class="toast-modal">
        <div class="toast-modal-message">${message}</div>
        <div class="toast-modal-buttons">
          <button class="toast-modal-btn toast-modal-cancel">取消</button>
          <button class="toast-modal-btn toast-modal-confirm">确认</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    // 动画
    requestAnimationFrame(() => modal.classList.add('toast-modal-show'))

    const cleanup = (result) => {
      modal.classList.remove('toast-modal-show')
      modal.addEventListener('transitionend', () => modal.remove())
      resolve(result)
    }

    modal.querySelector('.toast-modal-cancel').addEventListener('click', () => cleanup(false))
    modal.querySelector('.toast-modal-confirm').addEventListener('click', () => cleanup(true))
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cleanup(false)
    })
  })
}

// 添加全局样式
const style = document.createElement('style')
style.textContent = `
  #toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 360px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: translateX(120%);
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
  }

  .toast.toast-show {
    transform: translateX(0);
    opacity: 1;
  }

  .toast-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 14px;
    font-weight: bold;
    color: #fff;
  }

  .toast-success .toast-icon { background: #10b981; }
  .toast-error .toast-icon { background: #ef4444; }
  .toast-warning .toast-icon { background: #f59e0b; }
  .toast-info .toast-icon { background: #3b82f6; }

  .toast-message {
    flex: 1;
    font-size: 14px;
    color: #333;
    line-height: 1.4;
  }

  .toast-close {
    flex-shrink: 0;
    background: none;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .toast-close:hover { color: #333; }

  /* Modal */
  .toast-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .toast-modal-overlay.toast-modal-show {
    opacity: 1;
  }

  .toast-modal {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    max-width: 320px;
    width: 90%;
    transform: scale(0.9);
    transition: transform 0.2s ease;
  }

  .toast-modal-overlay.toast-modal-show .toast-modal {
    transform: scale(1);
  }

  .toast-modal-message {
    font-size: 16px;
    color: #333;
    margin-bottom: 20px;
    text-align: center;
  }

  .toast-modal-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .toast-modal-btn {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toast-modal-cancel {
    background: #f1f1f1;
    color: #666;
  }

  .toast-modal-cancel:hover { background: #e5e5e5; }

  .toast-modal-confirm {
    background: #3b82f6;
    color: #fff;
  }

  .toast-modal-confirm:hover { background: #2563eb; }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .toast, .toast-modal {
      background: #1f2937;
    }
    .toast-message, .toast-modal-message {
      color: #e5e5e5;
    }
    .toast-close { color: #888; }
    .toast-close:hover { color: #fff; }
    .toast-modal-cancel { background: #374151; color: #ccc; }
    .toast-modal-cancel:hover { background: #4b5563; }
  }
`
document.head.appendChild(style)

export default {
  success,
  error,
  warning,
  info,
  confirm
}
