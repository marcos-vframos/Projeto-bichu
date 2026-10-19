import { preferenceStorage } from '@/lib/preferences'
import { getOrCreateDeviceKey } from '@/lib/device'
export function logActivity(event: string, durationMs = 0, details: Record<string, string | number> = {}) {
  if (preferenceStorage.getItem('bichu_privacy_analytics') === 'false') return Promise.resolve()
  return fetch('/api/pilot/events', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, durationMs: Math.max(0, Math.min(120000, Math.round(durationMs))), deviceId: getOrCreateDeviceKey(), details }) }).catch(() => {})
}
