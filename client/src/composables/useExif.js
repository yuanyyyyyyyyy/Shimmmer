import { ref } from 'vue'

// 使用纯 JavaScript 解析 EXIF（简化版）
function readExifData(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = function(e) {
      const arrayBuffer = e.target.result
      
      try {
        // 解析 EXIF 数据
        const exif = parseExif(arrayBuffer)
        resolve(exif)
      } catch (err) {
        console.warn('EXIF 解析失败:', err)
        resolve(null)
      }
    }
    
    reader.onerror = function() {
      resolve(null)
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// 简化版 EXIF 解析
function parseExif(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const result = {}
  
  // 检查 JPEG 文件头
  if (view.getUint16(0) !== 0xFFD8) {
    return null
  }
  
  let offset = 2
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset)
    
    // APP1 标记 (EXIF)
    if (marker === 0xFFE1) {
      const length = view.getUint16(offset + 2)
      const exifData = parseExifSegment(view, offset + 4, length - 2)
      Object.assign(result, exifData)
      break
    }
    
    if ((marker & 0xFF00) !== 0xFF00) break
    
    offset += 2 + view.getUint16(offset + 2)
  }
  
  return result
}

// 解析 EXIF 段
function parseExifSegment(view, start, length) {
  const result = {}
  
  // 检查 "Exif" 标识
  const exifHeader = String.fromCharCode(
    view.getUint8(start),
    view.getUint8(start + 1),
    view.getUint8(start + 2),
    view.getUint8(start + 3)
  )
  
  if (exifHeader !== 'Exif') {
    return result
  }
  
  const tiffStart = start + 6
  
  // 字节序标记
  const littleEndian = view.getUint16(tiffStart) === 0x4949
  
  // TIFF 偏移
  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian)
  const ifdStart = tiffStart + ifdOffset
  
  // 解析 IFD0
  parseIFD(view, ifdStart, littleEndian, tiffStart, result)
  
  return result
}

// 解析 IFD
function parseIFD(view, ifdStart, littleEndian, tiffStart, result) {
  try {
    const entries = view.getUint16(ifdStart, littleEndian)
    
    for (let i = 0; i < entries; i++) {
      const entryOffset = ifdStart + 2 + i * 12
      const tag = view.getUint16(entryOffset, littleEndian)
      const type = view.getUint16(entryOffset + 2, littleEndian)
      const count = view.getUint32(entryOffset + 4, littleEndian)
      
      // 解析常用标签
      switch (tag) {
        case 0x0132: // DateTimeOriginal
          const dateStr = readString(view, entryOffset + 8, 20, littleEndian)
          if (dateStr) {
            const parsed = parseExifDate(dateStr)
            if (parsed) result.shot_date = parsed
          }
          break
          
        case 0x0131: // Software
          // 跳过
          break
          
        case 0x8825: // GPS IFD
          const gpsOffset = view.getUint32(entryOffset + 8, littleEndian)
          if (gpsOffset > 0) {
            const gpsData = parseGPS(view, tiffStart + gpsOffset, littleEndian)
            if (gpsData) {
              Object.assign(result, gpsData)
            }
          }
          break
      }
    }
  } catch (err) {
    // 忽略解析错误
  }
}

// 解析 GPS 数据
function parseGPS(view, gpsStart, littleEndian) {
  const result = {}
  
  try {
    const entries = view.getUint16(gpsStart, littleEndian)
    
    let latRef = null
    let lat = null
    let lonRef = null
    let lon = null
    
    for (let i = 0; i < entries; i++) {
      const entryOffset = gpsStart + 2 + i * 12
      const tag = view.getUint16(entryOffset, littleEndian)
      
      switch (tag) {
        case 0x0001: // GPSLatitudeRef
          latRef = String.fromCharCode(view.getUint8(entryOffset + 8))
          break
        case 0x0002: // GPSLatitude
          lat = readRational(view, entryOffset + 8, littleEndian)
          break
        case 0x0003: // GPSLongitudeRef
          lonRef = String.fromCharCode(view.getUint8(entryOffset + 8))
          break
        case 0x0004: // GPSLongitude
          lon = readRational(view, entryOffset + 8, littleEndian)
          break
      }
    }
    
    if (lat && lon && latRef && lonRef) {
      result.latitude = convertDMSToDD(lat, latRef)
      result.longitude = convertDMSToDD(lon, lonRef)
    }
  } catch (err) {
    // 忽略
  }
  
  return result
}

// 读取字符串
function readString(view, offset, maxLen, littleEndian) {
  try {
    let str = ''
    for (let i = 0; i < maxLen; i++) {
      const char = view.getUint8(offset + i)
      if (char === 0) break
      str += String.fromCharCode(char)
    }
    return str.trim()
  } catch {
    return ''
  }
}

// 读取有理数
function readRational(view, offset, littleEndian) {
  const num = view.getUint32(offset, littleEndian)
  const den = view.getUint32(offset + 4, littleEndian)
  return den !== 0 ? num / den : 0
}

// 解析 EXIF 日期格式 (YYYY:MM:DD HH:MM:SS)
function parseExifDate(dateStr) {
  const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return null
}

// 将度分秒转换为十进制
function convertDMSToDD(dms, ref) {
  const dd = dms[0] + dms[1] / 60 + dms[2] / 3600
  return ref === 'S' || ref === 'W' ? -dd : dd
}

// 从文件读取 EXIF
export function extractExif(file) {
  return new Promise(async (resolve) => {
    const exifData = await readExifData(file)
    
    const result = {
      shot_date: null,
      location: null
    }
    
    if (exifData) {
      if (exifData.shot_date) {
        result.shot_date = exifData.shot_date
      }
      
      // 如果有 GPS 数据
      if (exifData.latitude && exifData.longitude) {
        // 可选：可以调用逆地理编码 API 获取地名
        // 这里先存储坐标
        result.latitude = exifData.latitude
        result.longitude = exifData.longitude
      }
    }
    
    resolve(result)
  })
}

export default {
  extractExif
}
