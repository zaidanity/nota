import {
  Archive,
  ArrowUpDown,
  FilePlus2,
  Menu,
  MoreHorizontal,
  Pin,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import { BrandMark } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { NoteRecord, SortMode } from '@/db/schema'
import {
  cn,
  formatRelativeDate,
  groupLabel,
  noteDisplayTitle,
  pluralize,
  snippet,
  sortNotes,
} from '@/lib/utils'
import { viewSubtitle, viewTitle, type ViewFilter } from '@/lib/views'

interface NotesPanelProps {
  notes: NoteRecord[]
  view: ViewFilter
  search: string
  onSearchChange: (value: string) => void
  sort: SortMode
  onSortChange: (sort: SortMode) => void
  selectedUuid: string | null
  onSelectNote: (uuid: string) => void
  onCreateNote: () => void
  onOpenSidebar: () => void
  onEmptyTrash: () => void
  isSearching: boolean
  onTogglePin: (uuid: string) => void
  onToggleArchive: (uuid: string) => void
  onToggleTrash: (uuid: string) => void
  onDeletePermanently: (uuid: string) => void
}

const SORT_LABELS: Record<SortMode, string> = {
  'updated-desc': 'Terbaru diubah',
  'updated-asc': 'Terlama diubah',
  'created-desc': 'Terbaru dibuat',
  'title-asc': 'Judul A–Z',
}

function NoteCard({
  note,
  selected,
  view,
  onSelect,
  onTogglePin,
  onToggleArchive,
  onToggleTrash,
  onDeletePermanently,
}: {
  note: NoteRecord
  selected: boolean
  view: ViewFilter
  onSelect: () => void
  onTogglePin: () => void
  onToggleArchive: () => void
  onToggleTrash: () => void
  onDeletePermanently: () => void
}) {
  const title = noteDisplayTitle(note)
  const preview = snippet(note.plainText || 'Belum ada isi.', 120)
  const timeSource = view.type === 'trash' ? note.trashedAt ?? note.updatedAt : note.updatedAt
  const isTrashed = note.isTrashed
  const isArchived = note.isArchived && !isTrashed

  return (
    <div className="group relative w-full">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'relative w-full rounded-lg border px-3.5 py-3 text-left transition-all duration-150',
          selected
            ? 'border-border-strong bg-surface shadow-soft'
            : 'border-transparent hover:border-border hover:bg-surface/70',
        )}
      >
        {selected ? (
          <span className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-accent" />
        ) : null}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {note.isPinned && !note.isTrashed ? (
                <Pin className="size-3 shrink-0 fill-current text-accent/80" />
              ) : null}
              {isArchived ? (
                <Archive className="size-3 shrink-0 text-subtle" />
              ) : null}
              <h3
                className={cn(
                  'truncate text-[13.5px] font-medium tracking-[-0.01em]',
                  selected ? 'text-foreground' : 'text-foreground/90',
                )}
              >
                {title}
              </h3>
            </div>
            <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.55] text-muted-foreground">
              {preview}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-subtle">
            {formatRelativeDate(timeSource)}
          </span>
        </div>

        {note.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-[4px] bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 2 ? (
              <span className="px-0.5 py-0.5 text-[9.5px] text-subtle">
                +{note.tags.length - 2}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 translate-y-[2px] opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8"
              aria-label="Lainnya"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isTrashed ? (
              <>
                <DropdownMenuItem onClick={onToggleTrash}>
                  <Archive className="mr-2 size-4" />
                  Pulihkan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDeletePermanently} destructive>
                  <Trash2 className="mr-2 size-4" />
                  Hapus permanen
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className="mr-2 size-4" />
                  {note.isPinned ? 'Lepas semat' : 'Sematkan'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
                  <Archive className="mr-2 size-4" />
                  {isArchived ? 'Buka arsip' : 'Arsipkan'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleTrash}>
                  <Trash2 className="mr-2 size-4" />
                  Pindah ke sampah
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function NotesPanel({
  notes,
  view,
  search,
  onSearchChange,
  sort,
  onSortChange,
  selectedUuid,
  onSelectNote,
  onCreateNote,
  onOpenSidebar,
  onEmptyTrash,
  isSearching,
  onTogglePin,
  onToggleArchive,
  onToggleTrash,
  onDeletePermanently,
}: NotesPanelProps) {
  const sorted = useMemo(() => {
    const result = sortNotes(notes, sort)
    if (view.type === 'trash') {
      result.sort((first, second) => (second.trashedAt ?? 0) - (first.trashedAt ?? 0))
    }
    return result
  }, [notes, sort, view.type])

  const groups = useMemo(() => {
    const map = new Map<string, NoteRecord[]>()
    for (const note of sorted) {
      const canPinGroup =
        note.isPinned && !note.isTrashed && !note.isArchived && view.type !== 'pinned'
      const label =
        view.type === 'pinned'
          ? 'Disematkan'
          : canPinGroup
            ? 'Disematkan'
            : groupLabel(view.type === 'trash' ? note.trashedAt ?? note.updatedAt : note.updatedAt)
      const current = map.get(label)
      if (current) current.push(note)
      else map.set(label, [note])
    }
    return [...map.entries()].map(([label, items]) => ({ label, notes: items }))
  }, [sorted, view.type])

  const countLabel = pluralize(notes.length, 'catatan', 'catatan')

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border/80">
        <div className="flex h-14 items-center gap-2 px-3 lg:h-auto lg:px-5 lg:pb-3 lg:pt-4">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <BrandMark className="size-7 lg:hidden" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground lg:text-[17px]">
                {viewTitle(view)}
              </h2>
              <span className="shrink-0 text-[10.5px] tabular-nums text-subtle">{countLabel}</span>
            </div>
            <p className="hidden truncate text-[11px] text-subtle lg:block">
              {viewSubtitle(view)}
            </p>
          </div>
          <Button
            onClick={onCreateNote}
            size="icon"
            className="lg:hidden"
            aria-label="Catatan baru"
          >
            <FilePlus2 className="size-[18px]" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 px-3 pb-3 lg:px-4 lg:pb-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari catatan, tag, atau isi..."
              className="h-10 bg-surface pl-8 pr-8 text-[12.5px] lg:h-9"
              aria-label="Cari catatan"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-subtle hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-10 bg-surface lg:size-9"
                aria-label={`Urutkan: ${SORT_LABELS[sort]}`}
              >
                <ArrowUpDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Urutkan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => onSortChange(value as SortMode)}
              >
                {(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {view.type === 'trash' && notes.length > 0 ? (
          <div className="px-3 pb-3 lg:px-4">
            <Button
              variant="danger-soft"
              size="sm"
              className="w-full"
              onClick={onEmptyTrash}
            >
              <Trash2 className="size-3.5" />
              Kosongkan sampah
            </Button>
          </div>
        ) : null}
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-subtle">
              {isSearching ? <Search className="size-4" /> : <FilePlus2 className="size-4" />}
            </div>
            <p className="text-[13px] font-medium text-foreground">
              {isSearching ? 'Tidak ada hasil' : 'Belum ada catatan'}
            </p>
            <p className="mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-muted-foreground">
              {isSearching
                ? 'Coba kata kunci lain atau hapus filter pencarian.'
                : view.type === 'trash'
                  ? 'Sampah masih bersih.'
                  : 'Mulai dengan satu gagasan kecil. Nota akan menyimpannya di perangkatmu.'}
            </p>
            {isSearching ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => onSearchChange('')}
              >
                Hapus pencarian
              </Button>
            ) : view.type !== 'trash' ? (
              <Button size="sm" className="mt-3" onClick={onCreateNote}>
                <FilePlus2 className="size-3.5" />
                Catatan baru
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5 px-2.5 py-3 lg:px-3">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-2 px-1.5 pb-1.5">
                  <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    {group.label}
                  </h3>
                  <span className="text-[9.5px] tabular-nums text-subtle/70">
                    {group.notes.length}
                  </span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
                <div className="space-y-0.5">
                  {group.notes.map((note) => (
                    <NoteCard
                      key={note.uuid}
                      note={note}
                      selected={selectedUuid === note.uuid}
                      view={view}
                      onSelect={() => onSelectNote(note.uuid)}
                      onTogglePin={() => onTogglePin(note.uuid)}
                      onToggleArchive={() => onToggleArchive(note.uuid)}
                      onToggleTrash={() => onToggleTrash(note.uuid)}
                      onDeletePermanently={() => onDeletePermanently(note.uuid)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
