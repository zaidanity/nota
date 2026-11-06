import { useState, useRef, useEffect } from 'react'
import { streamAIAction } from '@/ai/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { hasProviderKey } from '@/db/key-vault'
import type { AIActionId, AIProviderId, SelectionSnapshot } from '@/ai/types'
import { AI_ACTIONS, AI_PROVIDER_IDS, getProvider, getDefaultModel } from '@/ai/types'
import { useAppSettings } from '@/db/settings'

interface AIActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteTitle: string
  noteText: string
  selection: SelectionSnapshot | null
}

export function AIActionDialog({
  open,
  onOpenChange,
  noteTitle,
  noteText,
  selection,
}: AIActionDialogProps) {
  const settings = useAppSettings()
  const [action, setAction] = useState<AIActionId>('paraphrase')
  const [provider, setProvider] = useState<AIProviderId>(settings.ai.lastProvider)
  const [model, setModel] = useState(settings.ai.models[settings.ai.lastProvider] || getDefaultModel(settings.ai.lastProvider))
  const [customPrompt, setCustomPrompt] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<AIProviderId[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const textEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setAction('paraphrase')
      checkAvailableProviders()
      setStreamingText('')
      setIsStreaming(false)
      setError(null)
      setShowCustomPrompt(false)
      abortControllerRef.current?.abort()
    }
  }, [open])

  useEffect(() => {
    if (textEndRef.current) {
      textEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingText])

  const checkAvailableProviders = async () => {
    const available: AIProviderId[] = []
    for (const prov of AI_PROVIDER_IDS) {
      if (await hasProviderKey(prov)) {
        available.push(prov)
      }
    }
    setAvailableProviders(available)
    
    if (available.length > 0) {
      const newProvider: AIProviderId = available.includes(settings.ai.lastProvider) ? settings.ai.lastProvider : (available[0] as AIProviderId)
      const newModel = settings.ai.models[newProvider] ? settings.ai.models[newProvider] : getDefaultModel(newProvider)
      setProvider(newProvider)
      setModel(newModel)
    }
  }

  const handleStream = async () => {
    if (!model.trim()) {
      setError('Pilih model AI terlebih dahulu di Pengaturan.')
      return
    }

    if (action === 'custom' && !customPrompt.trim()) {
      setError('Tulis prompt terlebih dahulu.')
      return
    }

    setIsStreaming(true)
    setError(null)
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      const request = {
        action,
        provider,
        model,
        noteTitle,
        noteText,
        selection,
        customPrompt,
      }

      await streamAIAction(
        request,
        (chunk) => {
          setStreamingText((prev) => prev + chunk)
        },
        abortControllerRef.current.signal,
      )
      setIsStreaming(false)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setIsStreaming(false)
        return
      }
      setError(err.message || 'Terjadi kesalahan saat memproses AI.')
      setIsStreaming(false)
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
  }

  const handleApply = () => {
    const event = new CustomEvent('ai-apply-result', { detail: { text: streamingText, selection } })
    window.dispatchEvent(event)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Assistant</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="space-y-1">
            <Label htmlFor="action">Aksi</Label>
            <select
              id="action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as AIActionId)
                setShowCustomPrompt(e.target.value === 'custom')
              }}
              className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:border-accent"
            >
              {AI_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Provider</Label>
            <div className="flex items-center gap-2 text-sm">
              {availableProviders.length === 0 ? (
                <span className="text-muted-foreground">Belum ada provider dengan API key</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getProvider(provider).name}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {getProvider(provider).models.find((m) => m.id === model)?.label}
                  </span>
                  {availableProviders.length > 1 && (
                    <select
                      value={provider}
                      onChange={(e) => {
                        const newProvider = e.target.value as AIProviderId
                        setProvider(newProvider)
                        setModel(settings.ai.models[newProvider] ? settings.ai.models[newProvider] : getDefaultModel(newProvider))
                      }}
                      className="ml-auto text-xs rounded border border-border bg-surface px-2 py-0.5 focus:outline-none"
                    >
                      {availableProviders.map((p) => (
                        <option key={p} value={p}>
                          {getProvider(p).name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {showCustomPrompt && (
            <div className="space-y-1">
              <Label htmlFor="customPrompt">Prompt Khusus</Label>
              <textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Masukkan prompt khusus..."
                className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          )}

          {selection && (
            <div className="px-3 py-2 text-xs text-muted-foreground bg-surface rounded-md">
              Teks dipilih: "{selection.text.slice(0, 50)}{selection.text.length > 50 ? '...' : ''}"
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-danger bg-danger/5 border border-danger/10 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-2 mt-3">
          <Label>Hasil</Label>
          <div className="min-h-[160px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-surface p-3 text-sm leading-relaxed">
            {streamingText ? (
              <div className="whitespace-pre-wrap">
                {streamingText}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-accent animate-pulse" />
                )}
                <div ref={textEndRef} />
              </div>
            ) : (
              <p className="text-muted-foreground italic">Hasil akan muncul di sini...</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isStreaming ? (
            <Button variant="outline" onClick={handleStop} disabled>
              Berhenti...
            </Button>
          ) : (
            <Button onClick={handleStream} disabled={!model.trim()}>
              Proses
            </Button>
          )}
          <Button onClick={handleApply} disabled={!streamingText}>
            {selection ? 'Ganti' : 'Terapkan'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AIActionDialog
