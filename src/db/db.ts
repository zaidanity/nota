import Dexie, { type Table } from 'dexie'
import { EMPTY_DOC_JSON, type NoteRecord, type SecretRecord, type SettingsRecord } from './schema'

export class NotaDatabase extends Dexie {
  notes!: Table<NoteRecord, number>
  settings!: Table<SettingsRecord, string>
  secrets!: Table<SecretRecord, string>

  constructor() {
    super('nota-db')
    this.version(1).stores({
      notes: '++id, &uuid, title, *tags, updatedAt, createdAt, trashedAt',
      settings: 'key',
      secrets: 'provider',
    })
  }
}

export const db = new NotaDatabase()

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface CreateNoteInput {
  title?: string
  content?: string
  plainText?: string
  tags?: string[]
  isPinned?: boolean
}

export async function createNote(input: CreateNoteInput = {}): Promise<NoteRecord> {
  const now = Date.now()
  const note: NoteRecord = {
    uuid: newUuid(),
    title: input.title ?? '',
    content: input.content ?? EMPTY_DOC_JSON,
    plainText: input.plainText ?? '',
    tags: input.tags ?? [],
    isPinned: input.isPinned ?? false,
    isArchived: false,
    isTrashed: false,
    createdAt: now,
    updatedAt: now,
  }
  const id = await db.notes.add(note)
  return { ...note, id }
}

export type NotePatch = Partial<
  Pick<
    NoteRecord,
    | 'title'
    | 'content'
    | 'plainText'
    | 'tags'
    | 'isPinned'
    | 'isArchived'
    | 'isTrashed'
    | 'trashedAt'
  >
> & {
  touch?: boolean
}

export async function updateNote(uuid: string, patch: NotePatch): Promise<void> {
  const existing = await db.notes.where('uuid').equals(uuid).first()
  if (!existing?.id) return

  const { touch = true, ...fields } = patch
  await db.notes.update(existing.id, {
    ...fields,
    ...(touch ? { updatedAt: Date.now() } : {}),
  })
}

export async function togglePin(uuid: string): Promise<void> {
  const existing = await db.notes.where('uuid').equals(uuid).first()
  if (!existing?.id) return
  await db.notes.update(existing.id, {
    isPinned: !existing.isPinned,
    updatedAt: Date.now(),
  })
}

export async function setArchived(uuid: string, isArchived: boolean): Promise<void> {
  const existing = await db.notes.where('uuid').equals(uuid).first()
  if (!existing?.id) return
  await db.notes.update(existing.id, {
    isArchived,
    isPinned: isArchived ? false : existing.isPinned,
    updatedAt: Date.now(),
  })
}

export async function setTrashed(uuid: string, isTrashed: boolean): Promise<void> {
  const existing = await db.notes.where('uuid').equals(uuid).first()
  if (!existing?.id) return
  await db.notes.update(existing.id, {
    isTrashed,
    isPinned: isTrashed ? false : existing.isPinned,
    trashedAt: isTrashed ? Date.now() : undefined,
    updatedAt: Date.now(),
  })
}

export async function deleteNotePermanently(uuid: string): Promise<void> {
  await db.notes.where('uuid').equals(uuid).delete()
}

export async function emptyTrash(): Promise<number> {
  const trashed = await db.notes.filter((note) => note.isTrashed).toArray()
  const ids = trashed.flatMap((note) => (typeof note.id === 'number' ? [note.id] : []))
  if (ids.length === 0) return 0
  await db.notes.bulkDelete(ids)
  return ids.length
}

export async function duplicateNote(uuid: string): Promise<NoteRecord | null> {
  const source = await db.notes.where('uuid').equals(uuid).first()
  if (!source) return null
  const now = Date.now()
  const copy: NoteRecord = {
    uuid: newUuid(),
    title: source.title.trim() ? `${source.title} (salinan)` : '',
    content: source.content,
    plainText: source.plainText,
    tags: [...source.tags],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    createdAt: now,
    updatedAt: now,
  }
  const id = await db.notes.add(copy)
  return { ...copy, id }
}

export async function getNoteByUuid(uuid: string): Promise<NoteRecord | undefined> {
  return db.notes.where('uuid').equals(uuid).first()
}

export interface ImportNotesResult {
  imported: number
  skipped: number
}

export async function importNotes(notes: NoteRecord[]): Promise<ImportNotesResult> {
  if (notes.length === 0) return { imported: 0, skipped: 0 }

  const existingUuids = new Set((await db.notes.toArray()).map((note) => note.uuid))

  const toAdd: NoteRecord[] = []
  let skipped = 0
  for (const note of notes) {
    if (existingUuids.has(note.uuid)) {
      skipped += 1
      continue
    }
    toAdd.push({
      uuid: note.uuid,
      title: note.title,
      content: note.content,
      plainText: note.plainText,
      tags: note.tags,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      isTrashed: note.isTrashed,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      ...(typeof note.trashedAt === 'number' ? { trashedAt: note.trashedAt } : {}),
    })
    existingUuids.add(note.uuid)
  }

  if (toAdd.length > 0) {
    await db.notes.bulkAdd(toAdd)
  }
  return { imported: toAdd.length, skipped }
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.notes, db.settings, db.secrets, async () => {
    await db.notes.clear()
    await db.settings.clear()
    await db.secrets.clear()
  })
}

export async function getStorageSummary(): Promise<{
  noteCount: number
  trashedCount: number
  archivedCount: number
  usage: number
  quota: number
}> {
  const [allNotes, estimate] = await Promise.all([
    db.notes.toArray(),
    navigator.storage?.estimate?.() ?? Promise.resolve({ usage: 0, quota: 0 }),
  ])
  const noteCount = allNotes.length
  const trashedCount = allNotes.filter((note) => note.isTrashed).length
  const archivedCount = allNotes.filter((note) => note.isArchived && !note.isTrashed).length

  return {
    noteCount,
    trashedCount,
    archivedCount,
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
  }
}
