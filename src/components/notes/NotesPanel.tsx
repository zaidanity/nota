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
import { useMemo, type CSSProperties } from 'react'
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
  tagLeaf,
} from '@/lib/utils'
import { viewSubtitle, viewTitle, type ViewFilter } from '@/lib/views'

interface NotesPanelProps {
  notes: NoteRecord[]
  allNotes: NoteRecord[]
  view: ViewFilter
  search: string
  onSearchChange: (value: string) => void
  sort: SortMode
  onSortChange: (sort: SortMode) => void
  selectedUuid: string | null
  onSelectNote: (uuid: string) => void
  onSelectTag: (tag: string | null) => void
  onCreateNote: () => void
  onOpenNav: () => void
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

const NOTE_HUES = [8, 24, 42, 152, 172, 198, 262, 330]

function noteHue(uuid: string): number {
  let hash = 0
  for (let index = 0; index < uuid.length; index += 1) {
    hash = (hash * 31 + uuid.charCodeAt(index)) >>> 0
  }
  return NOTE_HUES[hash % NOTE_HUES.length] ?? 8
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
  const hue = noteHue(note.uuid)
  const style = { '--note': `hsl(${hue} 68% 52%)` } as CSSProperties

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        style={style}
        className={cn(
          'relative block w-full overflow-hidden rounded-xl border p-3.5 pl-4 text-left shadow-soft transition-all duration-150',
          selected
            ? 'border-border-strong bg-surface shadow-float'
            : 'border-border/70 bg-surface/70 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface hover:shadow-float',
        )}
      >
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: 'var(--note)' }}
        />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: 'var(--note)' }}
              />
              {note.isPinned && !note.isTrashed ? (
                <Pin className="size-3 shrink-0 fill-current text-accent" />
              ) : null}
              {isArchived ? <Archive className="size-3 shrink-0 text-subtle" /> : null}
              <h3
                className={cn(
                  'truncate text-[13.5px] font-semibold tracking-[-0.01em]',
                  selected ? 'text-foreground' : 'text-foreground/90',
                )}
              >
                {title}
              </h3>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-[1.55] text-muted-foreground">
              {preview}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-subtle">
            {formatRelativeDate(timeSource)}
          </span>
        </div>

        {note.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-md bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground"
              >
                #{tagLeaf(tag)}
              </span>
            ))}
            {note.tags.length > 3 ? (
              <span className="px-0.5 py-0.5 text-[9.5px] text-subtle">
                +{note.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>

      <div className="absolute right-1.5 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Lainnya">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
  allNotes,
  view,
  search,
  onSearchChange,
  sort,
  onSortChange,
  selectedUuid,
  onSelectNote,
  onSelectTag,
  onCreateNote,
  onOpenNav,
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

  const tagChips = useMemo(() => {
    const set = new Set<string>()
    for (const note of allNotes) {
      if (note.isTrashed) continue
      for (const tag of note.tags) set.add(tag)
    }
    return [...set].sort((a, b) => a.localeCompare(b)).slice(0, 16)
  }, [allNotes])

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
      <header className="shrink-0 border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNav}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <BrandMark className="size-7 lg:hidden" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="truncate font-display text-[19px] font-semibold tracking-[-0.01em] text-foreground">
                {viewTitle(view)}
              </h2>
              <span className="shrink-0 text-[10.5px] tabular-nums text-subtle">{countLabel}</span>
            </div>
            <p className="hidden truncate text-[11px] text-subtle lg:block">{viewSubtitle(view)}</p>
          </div>
          <Button variant="secondary" size="icon" onClick={onCreateNote} aria-label="Catatan baru">
            <FilePlus2 className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Urutkan: ${SORT_LABELS[sort]}`}>
                <ArrowUpDown className="size-4" />
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

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari catatan, tag, atau isi…"
            className="h-9 rounded-lg pr-8 pl-8 text-[12.5px]"
            aria-label="Cari catatan"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-subtle hover:text-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {tagChips.length > 0 ? (
          <div className="scrollbar-thin mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {tagChips.map((tag) => {
              const active = view.type === 'tag' && view.tag === tag
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(active ? null : tag)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors',
                    active
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  #{tagLeaf(tag)}
                </button>
              )
            })}
          </div>
        ) : null}

        {view.type === 'trash' && notes.length > 0 ? (
          <Button variant="danger-soft" size="sm" className="mt-3 w-full" onClick={onEmptyTrash}>
            <Trash2 className="size-3.5" />
            Kosongkan sampah
          </Button>
        ) : null}
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-subtle shadow-soft">
              {isSearching ? <Search className="size-4" /> : <FilePlus2 className="size-4" />}
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {isSearching ? 'Tidak ada hasil' : 'Belum ada catatan'}
            </p>
            <p className="mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-muted-foreground">
              {isSearching
                ? 'Coba kata kunci lain atau hapus filter pencarian.'
                : view.type === 'trash'
                  ? 'Sampah masih bersih.'
                  : 'Mulai dengan satu gagasan kecil. Nota menyimpannya di perangkatmu.'}
            </p>
            {isSearching ? (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => onSearchChange('')}>
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
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-2 px-1 pb-1.5">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    {group.label}
                  </h3>
                  <span className="text-[9.5px] tabular-nums text-subtle/70">
                    {group.notes.length}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-1.5">
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
