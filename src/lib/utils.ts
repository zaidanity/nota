import { format, formatDistanceToNow, isToday, isYesterday, subDays } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { NoteRecord, SortMode } from '@/db/schema'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: localeId,
  })
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'd MMM yyyy', { locale: localeId })
}

export function formatTime(timestamp: number): string {
  return format(new Date(timestamp), 'HH:mm')
}

export function groupLabel(timestamp: number): string {
  if (isToday(timestamp)) return 'Hari ini'
  if (isYesterday(timestamp)) return 'Kemarin'
  if (timestamp > subDays(Date.now(), 7).getTime()) return '7 hari terakhir'
  return 'Lebih lama'
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)
  return matches?.length ?? 0
}

export function snippet(text: string, maxLength = 110): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}…`
}

export function noteDisplayTitle(note: Pick<NoteRecord, 'title' | 'plainText'>): string {
  const title = note.title.trim()
  if (title) return title
  const firstLine = note.plainText
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  return firstLine || 'Tanpa judul'
}

export function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/^#+/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, '-')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
}

export function tagLeaf(tag: string): string {
  const segments = tag.split('/')
  return segments[segments.length - 1] ?? tag
}

export function tagAncestors(tag: string): string[] {
  const segments = tag.split('/')
  const ancestors: string[] = []
  for (let index = 1; index < segments.length; index += 1) {
    ancestors.push(segments.slice(0, index).join('/'))
  }
  return ancestors
}

export function isTagWithin(tag: string, parent: string): boolean {
  return tag === parent || tag.startsWith(`${parent}/`)
}

export interface TagNode {
  name: string
  path: string
  count: number
  total: number
  children: TagNode[]
}

export function buildTagTree(notes: NoteRecord[]): TagNode[] {
  const nodes = new Map<string, TagNode>()

  const ensureNode = (path: string): TagNode => {
    const existing = nodes.get(path)
    if (existing) return existing
    const segments = path.split('/')
    const node: TagNode = {
      name: segments[segments.length - 1] ?? path,
      path,
      count: 0,
      total: 0,
      children: [],
    }
    nodes.set(path, node)
    return node
  }

  const seenByNote = new Set<string>()
  for (const note of notes) {
    if (note.isTrashed) continue
    for (const tag of note.tags) {
      const uniqueKey = `${note.uuid}:${tag}`
      if (seenByNote.has(uniqueKey)) continue
      seenByNote.add(uniqueKey)

      const segments = tag.split('/')
      for (let index = 1; index <= segments.length; index += 1) {
        const path = segments.slice(0, index).join('/')
        ensureNode(path).total += 1
      }
      ensureNode(tag).count += 1
    }
  }

  for (const node of nodes.values()) {
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    if (!parentPath) continue
    const parent = ensureNode(parentPath)
    if (!parent.children.some((child) => child.path === node.path)) {
      parent.children.push(node)
    }
  }

  const sortNodes = (items: TagNode[]): TagNode[] => {
    items.sort((first, second) => first.name.localeCompare(second.name))
    for (const item of items) sortNodes(item.children)
    return items
  }

  return sortNodes([...nodes.values()].filter((node) => !node.path.includes('/')))
}

export function sortNotes(notes: NoteRecord[], sort: SortMode): NoteRecord[] {
  const copy = [...notes]
  copy.sort((first, second) => {
    if (first.isPinned !== second.isPinned) return first.isPinned ? -1 : 1
    switch (sort) {
      case 'updated-desc':
        return second.updatedAt - first.updatedAt
      case 'updated-asc':
        return first.updatedAt - second.updatedAt
      case 'created-desc':
        return second.createdAt - first.createdAt
      case 'title-asc':
        return noteDisplayTitle(first).localeCompare(noteDisplayTitle(second), 'id')
    }
  })
  return copy
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file.'))
    reader.readAsText(file)
  })
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('Gagal membaca file.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file.'))
    reader.readAsArrayBuffer(file)
  })
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}
