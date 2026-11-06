import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createNote, getNoteByUuid, updateNote, emptyTrash, togglePin, setArchived, setTrashed, deleteNotePermanently } from '@/db/db'
import { useTheme } from '@/hooks/useTheme'
import { Rail } from '@/components/layout/Rail'
import { NotesPanel } from '@/components/notes/NotesPanel'
import { EditorShell } from '@/components/editor/EditorShell'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { AIActionDialog } from '@/components/ai/AIActionDialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ChevronLeft, Menu } from 'lucide-react'
import type { NoteRecord, SortMode } from '@/db/schema'
import type { ViewFilter } from '@/lib/views'
import { noteMatchesView } from '@/lib/views'

function App() {
  const themeMode = 'system' as const
  useTheme(themeMode)

  const [view, setView] = useState<ViewFilter>({ type: 'all' })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('updated-desc')
  const [selectedNoteUuid, setSelectedNoteUuid] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiSelection, setAiSelection] = useState<{ from: number; to: number; text: string } | null>(null)

  const allNotes = useLiveQuery(() => db.notes.toArray(), []) ?? []
  const [selectedNote, setSelectedNote] = useState<NoteRecord | null>(null)

  const notes = useMemo(() => {
    let filtered = allNotes.filter((note) => noteMatchesView(note, view))

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(q) ||
          note.plainText.toLowerCase().includes(q) ||
          note.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }

    return filtered
  }, [allNotes, view, search])

  const counts = useMemo(() => {
    let all = 0
    let pinned = 0
    let archived = 0
    let trash = 0
    for (const note of allNotes) {
      if (note.isTrashed) {
        trash += 1
        continue
      }
      if (note.isArchived) {
        archived += 1
        continue
      }
      all += 1
      if (note.isPinned) pinned += 1
    }
    return { all, pinned, archived, trash }
  }, [allNotes])

  useEffect(() => {
    if (selectedNoteUuid) {
      getNoteByUuid(selectedNoteUuid).then((note) => {
        setSelectedNote(note ?? null)
      })
    } else {
      setSelectedNote(null)
    }
  }, [selectedNoteUuid])

  const handleCreateNote = useCallback(async () => {
    const note = await createNote()
    setSelectedNoteUuid(note.uuid)
    setSearch('')
    setNavOpen(false)
  }, [])

  const handleUpdateNote = useCallback(
    async (content: string, plainText: string, tags: string[]) => {
      if (!selectedNoteUuid) return
      await updateNote(selectedNoteUuid, { content, plainText, tags })
    },
    [selectedNoteUuid]
  )

  const handleSelectNote = useCallback((uuid: string) => {
    setSelectedNoteUuid(uuid)
  }, [])

  const handleSelectView = useCallback((nextView: ViewFilter) => {
    setView(nextView)
    setSearch('')
    setNavOpen(false)
  }, [])

  const handleEmptyTrash = useCallback(async () => {
    await emptyTrash()
  }, [])

  const handleTogglePin = useCallback(async (uuid: string) => {
    await togglePin(uuid)
  }, [])

  const handleToggleArchive = useCallback(async (uuid: string) => {
    const note = allNotes.find((n) => n.uuid === uuid)
    if (note) {
      await setArchived(uuid, !note.isArchived)
    }
  }, [allNotes])

  const handleToggleTrash = useCallback(async (uuid: string) => {
    const note = allNotes.find((n) => n.uuid === uuid)
    if (note) {
      await setTrashed(uuid, !note.isTrashed)
      if (!note.isTrashed) {
        setSelectedNoteUuid(null)
      }
    }
  }, [allNotes])

  const handleDeletePermanently = useCallback(async (uuid: string) => {
    await deleteNotePermanently(uuid)
    if (selectedNoteUuid === uuid) {
      setSelectedNoteUuid(null)
    }
  }, [selectedNoteUuid])

  const handleEditorKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateNote()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAiDialogOpen(true)
      }
    },
    [handleCreateNote]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleEditorKeyDown)
    return () => window.removeEventListener('keydown', handleEditorKeyDown)
  }, [handleEditorKeyDown])

  useEffect(() => {
    const handleAISelection = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setAiSelection(detail.selection)
    }
    const handleAIApply = (e: Event) => {
      const detail = (e as CustomEvent).detail
      window.dispatchEvent(new CustomEvent('ai-result-for-editor', { detail }))
      setAiSelection(null)
    }
    window.addEventListener('ai-selection', handleAISelection)
    window.addEventListener('ai-apply-result', handleAIApply)
    return () => {
      window.removeEventListener('ai-selection', handleAISelection)
      window.removeEventListener('ai-apply-result', handleAIApply)
    }
  }, [])

  const rail = (
    <Rail
      view={view}
      counts={counts}
      onSelectView={handleSelectView}
      onOpenSettings={() => {
        setSettingsOpen(true)
        setNavOpen(false)
      }}
      onNavigate={() => setNavOpen(false)}
    />
  )

  return (
    <div className="flex h-full min-h-0 bg-background">
      <div className="hidden lg:block">{rail}</div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-auto border-r border-border bg-sidebar p-0" showClose={false}>
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          {rail}
        </SheetContent>
      </Sheet>

      <section
        className={[
          'min-h-0 w-full flex-col border-r border-border bg-background',
          'lg:flex lg:w-[360px] lg:shrink-0 xl:w-[400px]',
          selectedNoteUuid ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        <NotesPanel
          notes={notes}
          allNotes={allNotes}
          view={view}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          selectedUuid={selectedNoteUuid}
          onSelectNote={handleSelectNote}
          onSelectTag={(tag) => handleSelectView(tag ? { type: 'tag', tag } : { type: 'all' })}
          onCreateNote={handleCreateNote}
          onOpenNav={() => setNavOpen(true)}
          onEmptyTrash={handleEmptyTrash}
          isSearching={search.length > 0}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onToggleTrash={handleToggleTrash}
          onDeletePermanently={handleDeletePermanently}
        />
      </section>

      <main
        className={[
          'min-h-0 flex-1 flex-col',
          selectedNoteUuid ? 'flex' : 'hidden lg:flex',
        ].join(' ')}
      >
        {selectedNoteUuid && (
          <div className="flex items-center border-b border-border px-2 py-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setSelectedNoteUuid(null)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Kembali ke daftar"
            >
              <ChevronLeft className="size-5" />
              <span className="text-sm font-medium">Daftar</span>
            </button>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
              <span className="text-sm font-medium">Menu</span>
            </button>
          </div>
        )}
        {selectedNote ? (
          <EditorShell
            key={selectedNote.uuid}
            content={selectedNote.content}
            title={selectedNote.title}
            tags={selectedNote.tags}
            onUpdate={handleUpdateNote}
            onEsc={() => setSelectedNoteUuid(null)}
            onOpenAI={() => setAiDialogOpen(true)}
          />
        ) : (
          <div className="bg-wash flex flex-1 items-center justify-center bg-background">
            <div className="max-w-xs px-6 text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-soft">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 10h16M4 15h10M4 20h7" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">
                Ruang menulismu
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pilih catatan dari daftar, atau mulai satu yang baru.
              </p>
              <button
                onClick={handleCreateNote}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[0_2px_8px_-3px_rgb(232_88_43/0.6)] transition-colors hover:bg-accent-hover"
              >
                <span className="text-base leading-none">+</span> Catatan baru
              </button>
            </div>
          </div>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AIActionDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        noteTitle={selectedNote?.title ?? ''}
        noteText={selectedNote?.plainText ?? ''}
        selection={aiSelection}
      />
    </div>
  )
}

export default App
