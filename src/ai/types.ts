export const AI_PROVIDER_IDS = ['openai', 'anthropic', 'google', 'groq'] as const

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number]

export type AIActionId = 'paraphrase' | 'expand' | 'summarize' | 'custom'

export interface ModelOption {
  id: string
  label: string
  hint?: string
}

export interface ProviderDefinition {
  id: AIProviderId
  name: string
  mark: string
  description: string
  keyPlaceholder: string
  keyDocsUrl: string
  models: ModelOption[]
}

export interface SelectionSnapshot {
  from: number
  to: number
  text: string
}

export interface AIRequest {
  action: AIActionId
  provider: AIProviderId
  model: string
  noteTitle: string
  noteText: string
  selection: SelectionSnapshot | null
  customPrompt?: string
}

export interface AIActionDefinition {
  id: AIActionId
  label: string
  description: string
}

export interface AIConfig {
  lastProvider: AIProviderId
  models: Partial<Record<AIProviderId, string>>
}

export const AI_ACTIONS: AIActionDefinition[] = [
  {
    id: 'paraphrase',
    label: 'Parafrase & naturalisasi',
    description: 'Tulis ulang agar lebih jelas dan mengalir.',
  },
  {
    id: 'expand',
    label: 'Kembangkan & lanjutkan',
    description: 'Tambahkan detail dan lanjutkan gagasan.',
  },
  {
    id: 'summarize',
    label: 'Ringkas & poin aksi',
    description: 'Ambil inti dan daftar tindakan berikutnya.',
  },
  {
    id: 'custom',
    label: 'Prompt khusus',
    description: 'Minta apa saja sesuai kebutuhanmu.',
  },
]

export const PROVIDERS: Record<AIProviderId, ProviderDefinition> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    mark: 'O',
    description: 'Model GPT terbaru melalui API resmi OpenAI.',
    keyPlaceholder: 'sk-...',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', hint: 'Seimbang' },
      { id: 'gpt-5.6', label: 'GPT-5.6', hint: 'Kualitas tinggi' },
      { id: 'gpt-5.6-mini', label: 'GPT-5.6 Mini', hint: 'Cepat' },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    mark: 'A',
    description: 'Claude dengan kualitas tulisan yang matang.',
    keyPlaceholder: 'sk-ant-...',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Cepat' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Seimbang' },
      { id: 'claude-opus-5-1', label: 'Claude Opus 5.1', hint: 'Maksimal' },
    ],
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    mark: 'G',
    description: 'Gemini dengan konteks panjang dan respons cepat.',
    keyPlaceholder: 'AIza...',
    keyDocsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', hint: 'Cepat' },
      { id: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro', hint: 'Seimbang' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Stabil' },
    ],
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    mark: 'G',
    description: 'Inferensi sangat cepat untuk model open-weight.',
    keyPlaceholder: 'gsk_...',
    keyDocsUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', hint: 'Kualitas' },
      { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', hint: 'Cepat' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', hint: 'Serbaguna' },
    ],
  },
}

export function getProvider(id: AIProviderId): ProviderDefinition {
  return PROVIDERS[id]
}

export function getDefaultModel(id: AIProviderId): string {
  return PROVIDERS[id].models[0]?.id ?? ''
}

export function isAIProviderId(value: unknown): value is AIProviderId {
  return typeof value === 'string' && AI_PROVIDER_IDS.includes(value as AIProviderId)
}
