import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createNote, getNoteByUuid, updateNote, emptyTrash, togglePin, setArchived, setTrashed, deleteNotePermanently } from '@/db/db'
import { useTheme } from '@/hooks/useTheme'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotesPanel } from '@/components/notes/NotesPanel'
import { EditorShell } from '@/components/editor/EditorShell'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { AIActionDialog } from '@/components/ai/AIActionDialog'
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
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

  const aiConfigured = useMemo(() => {
    return true
  }, [])

  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

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
    closeSidebarOnMobile()
  }, [closeSidebarOnMobile])

  const handleUpdateNote = useCallback(
    async (content: string, plainText: string, tags: string[]) => {
      if (!selectedNoteUuid) return
      await updateNote(selectedNoteUuid, { content, plainText, tags })
    },
    [selectedNoteUuid]
  )

  const handleSelectNote = useCallback((uuid: string) => {
    setSelectedNoteUuid(uuid)
    closeSidebarOnMobile()
  }, [closeSidebarOnMobile])

  const handleSelectView = useCallback((nextView: ViewFilter) => {
    setView(nextView)
    setSearch('')
    closeSidebarOnMobile()
  }, [closeSidebarOnMobile])

  const handleEmptyTrash = useCallback(async () => {
    await emptyTrash()
  }, [])

  const handleTogglePin = useCallback(async (uuid: string) => {
    await togglePin(uuid)
  }, [])

  const handleToggleArchive = useCallback(async (uuid: string) => {
    const note = allNotes.find(n => n.uuid === uuid)
    if (note) {
      await setArchived(uuid, !note.isArchived)
    }
  }, [allNotes])

  const handleToggleTrash = useCallback(async (uuid: string) => {
    const note = allNotes.find(n => n.uuid === uuid)
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
      if (e.key === 'Escape') {
        setSidebarOpen(false)
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

  return (
    <div className="flex h-full min-h-0 bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 shrink-0 overflow-hidden bg-sidebar transition-all duration-200 ease-out',
          'lg:static lg:z-auto',
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0',
        ].join(' ')}
      >
        <div className="h-full w-64">
          <Sidebar
            notes={allNotes}
            view={view}
            onSelectView={handleSelectView}
            onNewNote={handleCreateNote}
            onOpenSettings={() => {
              setSettingsOpen(true)
              closeSidebarOnMobile()
            }}
            onNavigate={() => closeSidebarOnMobile()}
            aiConfigured={aiConfigured}
          />
        </div>
      </aside>

      <div
        className={[
          'min-h-0 w-full flex-col border-r border-border/80',
          'lg:flex lg:w-80 lg:shrink-0 xl:w-84',
          selectedNoteUuid ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        <NotesPanel
          notes={notes}
          view={view}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          selectedUuid={selectedNoteUuid}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onOpenSidebar={() => setSidebarOpen((open) => !open)}
          onEmptyTrash={handleEmptyTrash}
          isSearching={search.length > 0}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onToggleTrash={handleToggleTrash}
          onDeletePermanently={handleDeletePermanently}
        />
      </div>

      <div
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
              className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Kembali ke daftar"
            >
              <ChevronLeft className="size-5" />
              <span className="text-sm font-medium">Daftar</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
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
          <div className="flex flex-1 items-center justify-center bg-surface">
            <div className="text-center">
              <div className="mb-4 text-4xl"></div>
              <h2 className="text-lg font-medium text-foreground mb-2">Pilih catatan</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pilih catatan dari panel kiri atau buat yang baru
              </p>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
              >
                <span>+</span> Catatan baru
              </button>
            </div>
          </div>
        )}
      </div>

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

