import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import html2pdf from 'html2pdf.js'
import { useEffect, useRef, useState } from 'react'
import { parseNoteContent } from '@/db/schema'
import { useAppSettings } from '@/db/settings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sparkles, Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, Image as ImageIcon, Bold, Italic, Underline as UnderlineIcon, Strikethrough, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorShellProps {
  title: string
  content: string
  tags: string[]
  onUpdate: (content: string, plainText: string, tags: string[]) => void
  onEsc: () => void
  onOpenAI: () => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function EditorShell({
  title,
  content,
  tags,
  onUpdate,
  onEsc,
  onOpenAI,
}: EditorShellProps) {
  const settings = useAppSettings()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const isDirtyRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const editor = useEditor({
    editorProps: {
      attributes: {
        class: 'tiptap',
        'data-size': settings.editorTextSize,
      },
    },
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({
        placeholder: 'Mulai menulis...',
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'tiptap',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'tiptap',
        },
      }),
      TextAlign.configure({
        types: ['paragraph', 'heading'],
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'tiptap',
        },
      }),
      CharacterCount.configure({
        limit: 100_000,
      }),
      Underline.configure({
        HTMLAttributes: {
          class: 'tiptap',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'tiptap',
          loading: 'lazy',
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: 'tiptap',
          target: '_blank',
        },
      }),
    ],
    content: null,
    onCreate: ({ editor }) => {
      const parsed = parseNoteContent(content)
      if (parsed.content && parsed.content.length > 0) {
        editor.commands.setContent(parsed)
      }
      isDirtyRef.current = false
    },
    onUpdate: ({ editor }) => {
      if (!isDirtyRef.current) {
        isDirtyRef.current = true
      }
      const json = editor.getJSON()
      const text = editor.getText()
      onUpdate(JSON.stringify(json), text, tags)
    },
    onFocus: () => {
      isDirtyRef.current = true
    },
    onBlur: () => {
      if (isDirtyRef.current) {
        const json = editor.getJSON()
        const text = editor.getText()
        onUpdate(JSON.stringify(json), text, tags)
        isDirtyRef.current = false
      }
    },
    parseOptions: {
      preserveWhitespace: true,
    },
  })

  useEffect(() => {
    if (editor && !isDirtyRef.current) {
      const parsed = parseNoteContent(content)
      if (parsed.content && parsed.content.length > 0) {
        editor.commands.setContent(parsed)
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) {
      const el = editorRef.current
      if (el) {
        el.setAttribute('data-size', settings.editorTextSize)
      }
    }
  }, [settings.editorTextSize, editor])

  const getSelection = () => {
    if (!editor) return null
    const from = editor.state.selection.from
    const to = editor.state.selection.to
    const text = editor.state.doc.textBetween(from, to, ' ')
    if (!text.trim()) return null
    return { from, to, text }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editorRef.current?.contains(document.activeElement)) {
        onEsc()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onEsc])

  useEffect(() => {
    const handleApplyResult = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text: string; selection: any }
      if (detail.text && editor) {
        if (detail.selection && editor.state.selection) {
          const { from, to } = editor.state.selection
          editor.commands.insertContentAt({ from, to }, detail.text)
        } else {
          editor.commands.insertContentAt(editor.state.selection.to, detail.text)
        }
      }
    }
    window.addEventListener('ai-result-for-editor', handleApplyResult)
    return () => window.removeEventListener('ai-result-for-editor', handleApplyResult)
  }, [editor])

  const setHeading = (level: 1 | 2 | 3 | null) => {
    if (!editor) return
    if (level === null) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level }).run()
    }
  }

  const toggleBulletList = () => {
    if (!editor) return
    editor.chain().focus().toggleBulletList().run()
  }

  const toggleOrderedList = () => {
    if (!editor) return
    editor.chain().focus().toggleOrderedList().run()
  }

  const setTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    if (!editor) return
    editor.chain().focus().setTextAlign(align).run()
  }

  const handleInsertLink = () => {
    if (!editor) return
    const url = prompt('Masukkan URL:')
    if (!url) return
    const trimmedUrl = url.trim()
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${trimmedUrl}">${trimmedUrl}</a>`).run()
    } else {
      editor.chain().focus().setLink({ href: trimmedUrl }).run()
    }
  }

  const handleInsertImageUrl = () => {
    if (!editor || !imageUrl.trim()) return
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
    setImageUrl('')
    setImageDialogOpen(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setImageDialogOpen(false)
  }

  const handleAI = () => {
    const selection = getSelection()
    if (selection) {
      const event = new CustomEvent('ai-selection', { detail: { selection } })
      window.dispatchEvent(event)
    }
    onOpenAI()
  }

  const handleExportPDF = async () => {
    if (!editor) return
    const html = editor.getHTML()
    const safeTitle = escapeHtml(title.trim()) || 'Tanpa Judul'
    const dateLabel = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const tagsHtml = tags.length
      ? `<p class="pdf-tags">${tags.map((t) => '#' + escapeHtml(t)).join('&nbsp;&nbsp;')}</p>`
      : ''

    const container = document.createElement('div')
    container.innerHTML = `
      <div class="pdf-doc">
        <style>
          .pdf-doc { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #201f1c; padding: 8mm 4mm; line-height: 1.7; }
          .pdf-doc h1.pdf-title { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
          .pdf-doc .pdf-date { font-size: 12px; color: #7b756a; margin: 0 0 22px; }
          .pdf-doc .pdf-body { font-size: 14px; }
          .pdf-doc .pdf-body h1 { font-size: 21px; font-weight: 700; margin: 18px 0 8px; line-height: 1.3; }
          .pdf-doc .pdf-body h2 { font-size: 17px; font-weight: 700; margin: 16px 0 6px; line-height: 1.3; }
          .pdf-doc .pdf-body h3 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; line-height: 1.3; }
          .pdf-doc .pdf-body p { margin: 0 0 10px; }
          .pdf-doc .pdf-body ul, .pdf-doc .pdf-body ol { padding-left: 22px; margin: 8px 0; }
          .pdf-doc .pdf-body ul { list-style: disc; }
          .pdf-doc .pdf-body ol { list-style: decimal; }
          .pdf-doc .pdf-body li { margin: 3px 0; }
          .pdf-doc .pdf-body a { color: #4f46e5; text-decoration: underline; }
          .pdf-doc .pdf-body blockquote { border-left: 3px solid #d2cdc2; padding-left: 12px; color: #6f6a60; font-style: italic; margin: 10px 0; }
          .pdf-doc .pdf-body code { background: #f0eee7; padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 13px; }
          .pdf-doc .pdf-body pre { background: #f0eee7; padding: 12px; border-radius: 8px; overflow: auto; }
          .pdf-doc .pdf-body pre code { background: none; padding: 0; }
          .pdf-doc .pdf-body img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
          .pdf-doc .pdf-body hr { border: 0; border-top: 1px solid #e3dfd6; margin: 16px 0; }
          .pdf-doc .pdf-body mark { background: #fde68a; padding: 0 2px; border-radius: 2px; }
          .pdf-doc .pdf-body table { border-collapse: collapse; width: 100%; }
          .pdf-doc .pdf-body td, .pdf-doc .pdf-body th { border: 1px solid #e3dfd6; padding: 6px 8px; }
          .pdf-doc .pdf-tags { margin-top: 26px; font-size: 12px; color: #7b756a; }
          .pdf-doc ul[data-type='taskList'] { list-style: none; padding-left: 0; }
          .pdf-doc ul[data-type='taskList'] li { display: flex; gap: 8px; align-items: flex-start; }
          .pdf-doc ul[data-type='taskList'] li input { margin-top: 4px; }
        </style>
        <h1 class="pdf-title">${safeTitle}</h1>
        <p class="pdf-date">${dateLabel}</p>
        <div class="pdf-body">${html}</div>
        ${tagsHtml}
      </div>
    `

    setIsExporting(true)
    try {
      const fileName =
        (title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'catatan') + '.pdf'
      await html2pdf()
        .set({
          margin: 0,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save()
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Gagal membuat PDF. Coba lagi.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      ref={editorRef}
      className="editor-shell relative flex h-full flex-col min-h-0 w-full overflow-hidden bg-surface"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <Button variant="ghost" size="icon-sm" onClick={() => editor?.chain().focus().toggleBold().run()} className={cn('h-8 w-8', editor?.isActive('bold') && 'bg-surface-2 text-foreground')} title="Bold (Ctrl+B)">
          <Bold className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn('h-8 w-8', editor?.isActive('italic') && 'bg-surface-2 text-foreground')} title="Italic (Ctrl+I)">
          <Italic className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={cn('h-8 w-8', editor?.isActive('underline') && 'bg-surface-2 text-foreground')} title="Underline (Ctrl+U)">
          <UnderlineIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => editor?.chain().focus().toggleStrike().run()} className={cn('h-8 w-8', editor?.isActive('strike') && 'bg-surface-2 text-foreground')} title="Strikethrough">
          <Strikethrough className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon-sm" onClick={() => setHeading(1)} className={cn('h-8 w-8', editor?.isActive('heading', { level: 1 }) && 'bg-surface-2 text-foreground')} title="Heading 1">
          <Heading1 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setHeading(2)} className={cn('h-8 w-8', editor?.isActive('heading', { level: 2 }) && 'bg-surface-2 text-foreground')} title="Heading 2">
          <Heading2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setHeading(3)} className={cn('h-8 w-8', editor?.isActive('heading', { level: 3 }) && 'bg-surface-2 text-foreground')} title="Heading 3">
          <Heading3 className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon-sm" onClick={toggleBulletList} className={cn('h-8 w-8', editor?.isActive('bulletList') && 'bg-surface-2 text-foreground')} title="Bullet List">
          <List className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={toggleOrderedList} className={cn('h-8 w-8', editor?.isActive('orderedList') && 'bg-surface-2 text-foreground')} title="Numbered List">
          <ListOrdered className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon-sm" onClick={() => setTextAlign('left')} className={cn('h-8 w-8', editor?.isActive({ textAlign: 'left' }) && 'bg-surface-2 text-foreground')} title="Rata Kiri">
          <AlignLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setTextAlign('center')} className={cn('h-8 w-8', editor?.isActive({ textAlign: 'center' }) && 'bg-surface-2 text-foreground')} title="Rata Tengah">
          <AlignCenter className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setTextAlign('right')} className={cn('h-8 w-8', editor?.isActive({ textAlign: 'right' }) && 'bg-surface-2 text-foreground')} title="Rata Kanan">
          <AlignRight className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setTextAlign('justify')} className={cn('h-8 w-8', editor?.isActive({ textAlign: 'justify' }) && 'bg-surface-2 text-foreground')} title="Rata Kiri-Kanan">
          <AlignJustify className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="ghost" size="icon-sm" onClick={handleInsertLink} className={cn('h-8 w-8', editor?.isActive('link') && 'bg-surface-2 text-foreground')} title="Insert Link">
          <LinkIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setImageDialogOpen(true)} className="h-8 w-8" title="Insert Image">
          <ImageIcon className="size-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="icon-sm" onClick={handleExportPDF} disabled={isExporting} className="h-8 w-8" title="Export ke PDF">
          <FileDown className="size-4" />
        </Button>
        <Button variant="default" size="icon-sm" onClick={handleAI} className="h-8 w-8 bg-accent hover:bg-accent-hover" title="AI Assistant">
          <Sparkles className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-auto" />

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-accent hover:bg-accent-soft transition-colors text-center"
            >
              <ImageIcon className="size-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload dari komputer</span>
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-muted-foreground">atau</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">URL Gambar</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://contoh.com/gambar.jpg"
                className="w-full h-9 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:border-accent"
                onKeyDown={(e) => e.key === 'Enter' && handleInsertImageUrl()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImageDialogOpen(false)}>Batal</Button>
            <Button onClick={handleInsertImageUrl} disabled={!imageUrl.trim()}>Sisipkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EditorShell

