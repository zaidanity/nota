import type { JSONContent } from '@tiptap/core'
import { z } from 'zod'
import {
  AI_PROVIDER_IDS,
  getDefaultModel,
  isAIProviderId,
  type AIConfig,
  type AIProviderId,
} from '@/ai/types'

export type ThemeMode = 'light' | 'dark' | 'system'
export type SortMode = 'updated-desc' | 'updated-asc' | 'created-desc' | 'title-asc'
export type EditorTextSize = 'sm' | 'md' | 'lg'

export interface NoteRecord {
  id?: number
  uuid: string
  title: string
  content: string
  plainText: string
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  isTrashed: boolean
  createdAt: number
  updatedAt: number
  trashedAt?: number
}

export interface SettingsRecord {
  key: string
  value: unknown
}

export interface SecretRecord {
  provider: AIProviderId
  ciphertext: string
  iv: string
  hint: string
  updatedAt: number
}

export interface AppSettings {
  theme: ThemeMode
  sort: SortMode
  editorTextSize: EditorTextSize
  lastNoteUuid: string | null
  ai: AIConfig
}

export const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export const EMPTY_DOC_JSON = JSON.stringify(EMPTY_DOC)

export function createDefaultAIConfig(): AIConfig {
  const models: Partial<Record<AIProviderId, string>> = {}
  for (const provider of AI_PROVIDER_IDS) {
    models[provider] = getDefaultModel(provider)
  }
  return {
    lastProvider: 'openai',
    models,
  }
}

export function createDefaultSettings(): AppSettings {
  return {
    theme: 'system',
    sort: 'updated-desc',
    editorTextSize: 'md',
    lastNoteUuid: null,
    ai: createDefaultAIConfig(),
  }
}

export function parseNoteContent(content: string): JSONContent {
  try {
    const parsed: unknown = JSON.parse(content)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      (parsed as { type?: unknown }).type === 'doc'
    ) {
      return parsed as JSONContent
    }
  } catch {
    // Fall through to an empty document.
  }
  return EMPTY_DOC
}

export function normalizeSettings(value: unknown): AppSettings {
  const base = createDefaultSettings()
  if (!value || typeof value !== 'object') return base

  const record = value as Record<string, unknown>
  const aiValue =
    record.ai && typeof record.ai === 'object' ? (record.ai as Record<string, unknown>) : null
  const lastProvider = aiValue?.lastProvider
  const rawModels =
    aiValue?.models && typeof aiValue.models === 'object'
      ? (aiValue.models as Record<string, unknown>)
      : {}

  const models: Partial<Record<AIProviderId, string>> = {}
  for (const provider of AI_PROVIDER_IDS) {
    const candidate = rawModels[provider]
    models[provider] =
      typeof candidate === 'string' && candidate.trim()
        ? candidate.trim()
        : getDefaultModel(provider)
  }

  return {
    theme:
      record.theme === 'light' || record.theme === 'dark' || record.theme === 'system'
        ? record.theme
        : base.theme,
    sort:
      record.sort === 'updated-desc' ||
      record.sort === 'updated-asc' ||
      record.sort === 'created-desc' ||
      record.sort === 'title-asc'
        ? record.sort
        : base.sort,
    editorTextSize:
      record.editorTextSize === 'sm' ||
      record.editorTextSize === 'md' ||
      record.editorTextSize === 'lg'
        ? record.editorTextSize
        : base.editorTextSize,
    lastNoteUuid: typeof record.lastNoteUuid === 'string' ? record.lastNoteUuid : null,
    ai: {
      lastProvider: isAIProviderId(lastProvider) ? lastProvider : base.ai.lastProvider,
      models,
    },
  }
}

export const noteBackupSchema = z.object({
  uuid: z.string().min(1),
  title: z.string().default(''),
  content: z.string().default(EMPTY_DOC_JSON),
  plainText: z.string().default(''),
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  isTrashed: z.boolean().default(false),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
  trashedAt: z.number().optional(),
})

export const backupSettingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    sort: z.enum(['updated-desc', 'updated-asc', 'created-desc', 'title-asc']).optional(),
    editorTextSize: z.enum(['sm', 'md', 'lg']).optional(),
  })
  .optional()

export const backupFileSchema = z.object({
  app: z.literal('nota'),
  version: z.literal(1),
  exportedAt: z.string(),
  notes: z.array(noteBackupSchema),
  settings: backupSettingsSchema,
})

export type BackupFile = z.infer<typeof backupFileSchema>
export type NoteBackup = z.infer<typeof noteBackupSchema>
