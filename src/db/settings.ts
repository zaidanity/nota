import { useLiveQuery } from 'dexie-react-hooks'
import type { AIConfig } from '@/ai/types'
import { db } from './db'
import { createDefaultSettings, normalizeSettings, type AppSettings } from './schema'

const SETTINGS_KEY = 'app'

export async function getSettings(): Promise<AppSettings> {
  const record = await db.settings.get(SETTINGS_KEY)
  return normalizeSettings(record?.value)
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next: AppSettings = {
    ...current,
    ...patch,
    ai: patch.ai ? { ...current.ai, ...patch.ai } : current.ai,
  }
  await db.settings.put({ key: SETTINGS_KEY, value: next })
  return next
}

export async function saveAIConfig(patch: Partial<AIConfig>): Promise<AppSettings> {
  const current = await getSettings()
  return saveSettings({
    ai: {
      ...current.ai,
      ...patch,
      models: patch.models ? { ...current.ai.models, ...patch.models } : current.ai.models,
    },
  })
}

export function useAppSettings(): AppSettings {
  return useLiveQuery(() => getSettings(), [], createDefaultSettings()) ?? createDefaultSettings()
}
