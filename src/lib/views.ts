import type { NoteRecord } from '@/db/schema'
import { isTagWithin, tagLeaf } from './utils'

export type ViewFilter =
  | { type: 'all' }
  | { type: 'pinned' }
  | { type: 'archive' }
  | { type: 'trash' }
  | { type: 'tag'; tag: string }

export function noteMatchesView(note: NoteRecord, view: ViewFilter): boolean {
  switch (view.type) {
    case 'all':
      return !note.isTrashed && !note.isArchived
    case 'pinned':
      return !note.isTrashed && !note.isArchived && note.isPinned
    case 'archive':
      return !note.isTrashed && note.isArchived
    case 'trash':
      return note.isTrashed
    case 'tag':
      return (
        !note.isTrashed &&
        !note.isArchived &&
        note.tags.some((tag) => isTagWithin(tag, view.tag))
      )
  }
}

export function viewTitle(view: ViewFilter): string {
  switch (view.type) {
    case 'all':
      return 'Semua catatan'
    case 'pinned':
      return 'Disematkan'
    case 'archive':
      return 'Arsip'
    case 'trash':
      return 'Sampah'
    case 'tag':
      return tagLeaf(view.tag)
  }
}

export function viewSubtitle(view: ViewFilter): string {
  switch (view.type) {
    case 'all':
      return 'Ruang kerja tenang untuk semua gagasanmu.'
    case 'pinned':
      return 'Catatan yang ingin selalu dekat.'
    case 'archive':
      return 'Disimpan rapi, tidak mengganggu fokus.'
    case 'trash':
      return 'Catatan di sini belum dihapus permanen.'
    case 'tag':
      return `Semua catatan dengan tag ${view.tag}.`
  }
}

export function viewKey(view: ViewFilter): string {
  return view.type === 'tag' ? `tag:${view.tag}` : view.type
}
