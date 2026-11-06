import { generateText } from 'ai'
import { createLanguageModel } from './providers'
import { PROVIDERS, type AIProviderId, type ModelOption } from './types'

interface OpenAIModelsResponse {
  data?: Array<{ id?: string }>
}

interface AnthropicModelsResponse {
  data?: Array<{ id?: string; display_name?: string }>
}

interface GoogleModelsResponse {
  models?: Array<{
    name?: string
    displayName?: string
    supportedGenerationMethods?: string[]
  }>
}

interface GroqModelsResponse {
  data?: Array<{ id?: string }>
}

const CHAT_MODEL_EXCLUSIONS =
  /(embedding|embed|tts|whisper|dall-e|image|moderation|transcrib|realtime|audio|speech|guard)/i

function labelize(id: string): string {
  return id
    .replace(/^models\//, '')
    .replace(/^openai\//, '')
    .replace(/^meta-llama\//, '')
    .replace(/^qwen\//, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function dedupeAndSort(models: ModelOption[]): ModelOption[] {
  const seen = new Set<string>()
  const result: ModelOption[] = []
  for (const model of models) {
    if (!model.id || seen.has(model.id)) continue
    seen.add(model.id)
    result.push(model)
  }
  return result.sort((first, second) => first.label.localeCompare(second.label))
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      let detail = ''
      try {
        const body = (await response.json()) as {
          error?: { message?: string } | string
          message?: string
        }
        if (typeof body.error === 'string') detail = body.error
        else if (body.error?.message) detail = body.error.message
        else if (body.message) detail = body.message
      } catch {
        // Ignore non-JSON error bodies.
      }
      throw new Error(
        detail
          ? `Provider menolak permintaan (${response.status}): ${detail}`
          : `Provider menolak permintaan (${response.status}).`,
      )
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Permintaan ke provider habis waktu. Coba lagi.')
    }
    if (error instanceof TypeError) {
      throw new Error(
        'Tidak bisa menghubungi provider. Periksa koneksi, API key, dan pengaturan CORS.',
      )
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function listProviderModels(
  provider: AIProviderId,
  apiKey: string,
): Promise<ModelOption[]> {
  switch (provider) {
    case 'openai': {
      const response = await fetchJson<OpenAIModelsResponse>('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return dedupeAndSort(
        (response.data ?? [])
          .map((model) => model.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0 && !CHAT_MODEL_EXCLUSIONS.test(id))
          .map((id) => ({ id, label: labelize(id) })),
      )
    }
    case 'anthropic': {
      const response = await fetchJson<AnthropicModelsResponse>(
        'https://api.anthropic.com/v1/models?limit=100',
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        },
      )
      return dedupeAndSort(
        (response.data ?? []).flatMap((model) =>
          model.id ? [{ id: model.id, label: model.display_name ?? labelize(model.id) }] : [],
        ),
      )
    }
    case 'google': {
      const response = await fetchJson<GoogleModelsResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
        {},
      )
      return dedupeAndSort(
        (response.models ?? []).flatMap((model) => {
          if (!model.name) return []
          if (!model.supportedGenerationMethods?.includes('generateContent')) return []
          const id = model.name.replace(/^models\//, '')
          return [{ id, label: model.displayName ?? labelize(id) }]
        }),
      )
    }
    case 'groq': {
      const response = await fetchJson<GroqModelsResponse>(
        'https://api.groq.com/openai/v1/models',
        { headers: { Authorization: `Bearer ${apiKey}` } },
      )
      return dedupeAndSort(
        (response.data ?? [])
          .map((model) => model.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0 && !CHAT_MODEL_EXCLUSIONS.test(id))
          .map((id) => ({ id, label: labelize(id) })),
      )
    }
  }
}

export function getFallbackModels(provider: AIProviderId): ModelOption[] {
  return PROVIDERS[provider].models
}

export interface ConnectionTestResult {
  models: ModelOption[]
  latencyMs: number
}

export async function testProviderConnection(
  provider: AIProviderId,
  apiKey: string,
  modelId: string,
): Promise<ConnectionTestResult> {
  const startedAt = performance.now()
  const models = await listProviderModels(provider, apiKey)
  const model = await createLanguageModel(provider, apiKey, modelId)
  await generateText({
    model,
    prompt: 'Balas hanya dengan kata OK.',
    maxOutputTokens: 16,
    abortSignal: AbortSignal.timeout(30_000),
  })
  return {
    models,
    latencyMs: Math.round(performance.now() - startedAt),
  }
}

