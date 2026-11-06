import { Capacitor } from '@capacitor/core'

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatformLabel(): string {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'iOS'
  if (platform === 'android') return 'Android'
  return 'Web'
}
