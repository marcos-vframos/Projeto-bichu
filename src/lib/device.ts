export function getOrCreateDeviceKey(): string {
  const STORAGE_KEY = 'bichu_device_key'
  try {
    let key = localStorage.getItem(STORAGE_KEY)
    if (!key) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        key = crypto.randomUUID()
      } else {
        key = 'np_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      }
      localStorage.setItem(STORAGE_KEY, key)
    }
    return key
  } catch {
    return 'np_default_device'
  }
}
