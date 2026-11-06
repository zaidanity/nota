import type { LanguageModel } from 'ai'
import type { AIProviderId } from './types'

const ANTHROPIC_BROWSER_HEADER = {
  'anthropic-dangerous-direct-browser-access': 'true',
}

export async function createLanguageModel(
  provider: AIProviderId,
  apiKey: string,
  modelId: string,
): Promise<LanguageModel> {
  switch (provider) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI({ apiKey })(modelId)
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      return createAnthropic({
        apiKey,
        headers: ANTHROPIC_BROWSER_HEADER,
      })(modelId)
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      return createGoogleGenerativeAI({ apiKey })(modelId)
    }
    case 'groq': {
      const { createGroq } = await import('@ai-sdk/groq')
      return createGroq({ apiKey })(modelId)
    }
  }
}

export function getProviderEndpoint(provider: AIProviderId): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/responses'
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages'
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/models'
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions'
  }
}
