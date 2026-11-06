import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.nota.app',
  appName: 'Nota',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#f7f6f2',
  },
  ios: {
    backgroundColor: '#f7f6f2',
    contentInset: 'automatic',
  },
}

export default config
