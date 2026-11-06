import type { AIRequest } from './types'

export const MAX_CONTEXT_CHARS = 12_000

export interface BuiltPrompt {
  system: string
  prompt: string
  truncated: boolean
}

function trimContext(text: string): { text: string; truncated: boolean } {
  const normalized = text.trim()
  if (normalized.length <= MAX_CONTEXT_CHARS) {
    return { text: normalized, truncated: false }
  }
  return {
    text: `${normalized.slice(0, MAX_CONTEXT_CHARS)}\n\n[...teks dipotong karena batas konteks...]`,
    truncated: true,
  }
}

const SYSTEM_PROMPT = `Kamu adalah editor dan asisten menulis yang tertanam di aplikasi catatan lokal bernama Nota.
Aturan:
- Selalu jawab dalam bahasa yang sama dengan catatan pengguna.
- Kembalikan hanya teks hasil akhir. Tanpa pembuka, penutup, penjelasan proses, atau blok kode pembungkus.
- Pertahankan fakta, nama, angka, dan maksud asli. Jangan mengarang detail baru.
- Gunakan paragraf pendek. Untuk daftar, gunakan tanda hubung sederhana.
- Jika konteks tidak cukup, tulis dengan hati-hati tanpa menambahkan fakta baru.`

export function buildPrompt(request: AIRequest): BuiltPrompt {
  const hasSelection = Boolean(request.selection?.text.trim())
  const rawContext = hasSelection ? request.selection?.text ?? '' : request.noteText
  const { text: context, truncated } = trimContext(rawContext)
  const scope = hasSelection ? 'teks yang dipilih' : 'seluruh catatan'
  const title = request.noteTitle.trim() || 'Tanpa judul'

  const contextBlock = `Judul catatan: ${title}\n\n${context || '(Catatan masih kosong.)'}`

  switch (request.action) {
    case 'paraphrase':
      return {
        system: SYSTEM_PROMPT,
        truncated,
        prompt: `Tulis ulang ${scope} berikut agar lebih jelas, natural, dan enak dibaca. Pertahankan makna dan nada aslinya. Jangan menambah fakta baru.\n\n${contextBlock}`,
      }
    case 'expand':
      return {
        system: SYSTEM_PROMPT,
        truncated,
        prompt: `Kembangkan ${scope} berikut dengan detail yang relevan, lalu lanjutkan gagasannya secara alami. Jangan mengulang teks asli secara mentah dan jangan mengarang fakta spesifik.\n\n${contextBlock}`,
      }
    case 'summarize':
      return {
        system: SYSTEM_PROMPT,
        truncated,
        prompt: `Ringkas ${scope} berikut dalam beberapa paragraf pendek, lalu buat bagian "Tindakan berikutnya" berisi maksimal 5 poin aksi yang konkret. Jika tidak ada tindakan jelas, tulis "Tidak ada tindakan khusus".\n\n${contextBlock}`,
      }
    case 'custom':
      return {
        system: SYSTEM_PROMPT,
        truncated,
        prompt: `Permintaan pengguna:\n${request.customPrompt?.trim() || 'Bantu saya merapikan catatan ini.'}\n\nGunakan ${scope} berikut sebagai konteks:\n\n${contextBlock}`,
      }
  }
}
