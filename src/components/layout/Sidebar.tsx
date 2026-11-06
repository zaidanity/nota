import {
  Archive,
  ChevronRight,
  FileText,
  HardDrive,
  Hash,
  Pin,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Kbd } from '@/components/ui/kbd'
import type { NoteRecord } from '@/db/schema'
import { buildTagTree, cn, type TagNode } from '@/lib/utils'
import type { ViewFilter } from '@/lib/views'

interface SidebarProps {
  notes: NoteRecord[]
  view: ViewFilter
  onSelectView: (view: ViewFilter) => void
  onNewNote: () => void
  onOpenSettings: () => void
  onNavigate?: () => void
  aiConfigured: boolean
}

interface NavItemProps {
  icon: ReactNode
  label: string
  count?: number
  active: boolean
  onClick: () => void
}

function NavItem({ icon, label, count, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium transition-colors lg:h-9',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
      )}
    >
      <span className={cn('text-subtle transition-colors', active && 'text-accent')}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span
          className={cn(
            'tabular-nums text-[11px]',
            active ? 'text-accent/75' : 'text-subtle',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

function TagTreeItem({
  node,
  depth,
  expanded,
  onToggle,
  activeTag,
  onSelect,
}: {
  node: TagNode
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
  activeTag: string | null
  onSelect: (path: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.path)
  const isActive = activeTag === node.path

  return (
    <div>
      <div
        className={cn(
          'group flex h-9 items-center gap-0.5 rounded-md pr-2 transition-colors',
          isActive ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-surface-2',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-subtle hover:text-foreground"
            aria-label={isOpen ? 'Tutup sub-tag' : 'Buka sub-tag'}
          >
            <ChevronRight
              className={cn('size-3 transition-transform duration-150', isOpen && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center text-subtle">
            <Hash className="size-3" />
          </span>
        )}
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-[12.5px]"
        >
          <span className={cn('truncate', isActive && 'font-medium')}>{node.name}</span>
        </button>
        <span className={cn('tabular-nums text-[10.5px] text-subtle', isActive && 'text-accent/70')}>
          {node.total}
        </span>
      </div>
      {hasChildren && isOpen ? (
        <div>
          {node.children.map((child) => (
            <TagTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              activeTag={activeTag}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar({
  notes,
  view,
  onSelectView,
  onNewNote,
  onOpenSettings,
  onNavigate,
  }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const tags = useMemo(() => buildTagTree(notes), [notes])

  const counts = useMemo(() => {
    let active = 0
    let pinned = 0
    let archived = 0
    let trashed = 0
    for (const note of notes) {
      if (note.isTrashed) {
        trashed += 1
        continue
      }
      if (note.isArchived) {
        archived += 1
        continue
      }
      active += 1
      if (note.isPinned) pinned += 1
    }
    return { active, pinned, archived, trashed }
  }, [notes])

  const selectView = (next: ViewFilter) => {
    onSelectView(next)
    onNavigate?.()
  }

  const toggleTag = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 pb-2 pt-4 lg:px-3.5 lg:pt-4">
        <Brand />
      </div>

      <div className="px-3 pb-3 pt-2 lg:px-3">
        <Button
          onClick={() => {
            onNewNote()
            onNavigate?.()
          }}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" />
            Catatan baru
          </span>
          <span className="hidden items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/75 lg:inline-flex">
            <Kbd className="h-4 min-w-4 border-white/15 bg-white/10 text-white/70">âŒ˜</Kbd>
            <Kbd className="h-4 min-w-4 border-white/15 bg-white/10 text-white/70">N</Kbd>
          </span>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 px-3 pb-4">
          <NavItem
            icon={<FileText className="size-4" />}
            label="Semua catatan"
            count={counts.active}
            active={view.type === 'all'}
            onClick={() => selectView({ type: 'all' })}
          />
          <NavItem
            icon={<Pin className="size-4" />}
            label="Disematkan"
            count={counts.pinned}
            active={view.type === 'pinned'}
            onClick={() => selectView({ type: 'pinned' })}
          />
          <NavItem
            icon={<Archive className="size-4" />}
            label="Arsip"
            count={counts.archived}
            active={view.type === 'archive'}
            onClick={() => selectView({ type: 'archive' })}
          />
          <NavItem
            icon={<Trash2 className="size-4" />}
            label="Sampah"
            count={counts.trashed}
            active={view.type === 'trash'}
            onClick={() => selectView({ type: 'trash' })}
          />

          <div className="pb-1 pt-5">
            <div className="flex items-center justify-between px-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Tag
              </span>
              <span className="text-[10px] text-subtle">{tags.length}</span>
            </div>
          </div>

          {tags.length === 0 ? (
            <p className="px-2.5 py-2 text-[11.5px] leading-relaxed text-subtle">
              Tambahkan tag dari editor untuk merapikan catatan.
            </p>
          ) : (
            <div className="space-y-px">
              {tags.map((tag) => (
                <TagTreeItem
                  key={tag.path}
                  node={tag}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleTag}
                  activeTag={view.type === 'tag' ? view.tag : null}
                  onSelect={(path) => selectView({ type: 'tag', tag: path })}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/80 p-3">
        <div className="mb-2 flex items-center gap-2 px-2 py-1">
          <HardDrive className="size-3.5 text-subtle" />
          <span className="text-[10.5px] text-subtle">Tersimpan lokal di perangkat</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onOpenSettings()
            onNavigate?.()
          }}
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:h-9"
        >
          <Settings2 className="size-4 text-subtle" />
          <span className="flex-1">Pengaturan</span>

        </button>
      </div>
    </div>
  )
}




