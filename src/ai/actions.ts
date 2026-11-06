import { APICallError, streamText } from 'ai'
import { getProviderKey } from '@/db/key-vault'
import { buildPrompt } from './prompts'
import { createLanguageModel } from './providers'
import type { AIRequest } from './types'

export interface AIStreamResult {
  text: string
  truncated: boolean
}

function toFriendlyError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new DOMException('Dibatalkan', 'AbortError')
  }
  if (error instanceof APICallError) {
    const status = error.statusCode
    if (status === 401 || status === 403) {
      return new Error('API key ditolak. Periksa kembali key dan izin aksesnya.')
    }
    if (status === 404) {
      return new Error('Model tidak ditemukan. Pilih model lain di Pengaturan.')
    }
    if (status === 429) {
      return new Error('Kuota atau batas laju provider tercapai. Coba lagi beberapa saat.')
    }
    if (status && status >= 500) {
      return new Error('Provider sedang bermasalah. Coba lagi nanti.')
    }
    return new Error(
      status
        ? `Permintaan AI gagal (${status}). Periksa model dan API key.`
        : 'Permintaan AI gagal. Periksa koneksi dan API key.',
    )
  }
  if (error instanceof TypeError) {
    return new Error(
      'Tidak bisa menghubungi provider. Periksa koneksi internet dan pengaturan CORS provider.',
    )
  }
  if (error instanceof Error) {
    return new Error(error.message)
  }
  return new Error('Terjadi kesalahan yang tidak dikenal saat memanggil AI.')
}

export async function streamAIAction(
  request: AIRequest,
  onDelta: (chunk: string) => void,
  signal: AbortSignal,
): Promise<AIStreamResult> {
  if (!request.model.trim()) {
    throw new Error('Pilih model AI terlebih dahulu di Pengaturan.')
  }
  if (request.action === 'custom' && !request.customPrompt?.trim()) {
    throw new Error('Tulis prompt terlebih dahulu.')
  }

  const apiKey = await getProviderKey(request.provider)
  if (!apiKey) {
    throw new Error('API key belum disimpan untuk provider ini.')
  }

  const { system, prompt, truncated } = buildPrompt(request)
  const model = await createLanguageModel(request.provider, apiKey, request.model)

  try {
    const result = streamText({
      model,
      system,
      prompt,
      maxOutputTokens: 2_000,
      abortSignal: signal,
    })

    let text = ''
    for await (const chunk of result.textStream) {
      text += chunk
      onDelta(chunk)
    }

    if (!text.trim()) {
      throw new Error('Model tidak mengembalikan teks. Coba lagi atau pilih model lain.')
    }

    return { text: text.trim(), truncated }
  } catch (error) {
    throw toFriendlyError(error)
  }
}
