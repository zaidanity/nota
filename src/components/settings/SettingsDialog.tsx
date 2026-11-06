import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { saveProviderKey, removeProviderKey } from '@/db/key-vault'
import { saveSettings, useAppSettings } from '@/db/settings'
import type { AIProviderId } from '@/ai/types'
import { AI_PROVIDER_IDS, getProvider } from '@/ai/types'
import { useTheme } from '@/hooks/useTheme'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const theme = useTheme('system')
  const settings = useAppSettings()
  const [activeTab, setActiveTab] = useState('display')
  const [saveStatus, setSaveStatus] = useState<Record<AIProviderId, 'idle' | 'saving' | 'success' | 'error'>>({
    openai: 'idle',
    anthropic: 'idle',
    google: 'idle',
    groq: 'idle',
  })

  const handleSaveKey = async (provider: AIProviderId, key: string) => {
    setSaveStatus((prev) => ({ ...prev, [provider]: 'saving' }))
    try {
      await saveProviderKey(provider, key)
      setSaveStatus((prev) => ({ ...prev, [provider]: 'success' }))
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [provider]: 'idle' }))
      }, 2000)
    } catch (error) {
      setSaveStatus((prev) => ({ ...prev, [provider]: 'error' }))
    }
  }

  const handleRemoveKey = async (provider: AIProviderId) => {
    await removeProviderKey(provider)
  }

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    theme.setTheme(value)
  }

  const handleSortChange = (value: string) => {
    saveSettings({ sort: value as any })
  }

  const handleTextSizeChange = (value: string) => {
    saveSettings({ editorTextSize: value as any })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan</DialogTitle>
          <DialogDescription>Preferences aplikasi Nota</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="display">Tampilan</TabsTrigger>
            <TabsTrigger value="behavior">Perilaku</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-foreground">Tema</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      theme.theme === 'light' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-surface-2'
                    }`}
                  >
                    Terang
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      theme.theme === 'dark' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-surface-2'
                    }`}
                  >
                    Gelap
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('system')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      theme.theme === 'system' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-surface-2'
                    }`}
                  >
                    Sistem
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editorTextSize">Ukuran Teks Editor</Label>
              <Select value={settings.editorTextSize} onValueChange={handleTextSizeChange}>
                <SelectTrigger id="editorTextSize">
                  <SelectValue placeholder="Pilih ukuran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Kecil (15px)</SelectItem>
                  <SelectItem value="md">Normal (16px)</SelectItem>
                  <SelectItem value="lg">Besar (17.5px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sort">Urutan Catatan</Label>
              <Select value={settings.sort} onValueChange={handleSortChange}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Pilih urutan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated-desc">Terbaru diubah</SelectItem>
                  <SelectItem value="updated-asc">Terlama diubah</SelectItem>
                  <SelectItem value="created-desc">Terbaru dibuat</SelectItem>
                  <SelectItem value="title-asc">Judul A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-3 mt-4">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Hubungkan API key milikmu sendiri. Key disimpan terenkripsi di perangkat dan
              hanya dipakai saat kamu meminta bantuan AI.
            </p>
            {AI_PROVIDER_IDS.map((provider) => (
              <ProviderKeySection
                key={provider}
                provider={provider}
                saveStatus={saveStatus[provider]}
                onSave={(key) => handleSaveKey(provider, key)}
                onRemove={() => handleRemoveKey(provider)}
              />
            ))}
          </TabsContent>
        </Tabs>

        <Separator />

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ProviderKeySectionProps {
  provider: AIProviderId
  saveStatus: 'idle' | 'saving' | 'success' | 'error'
  onSave: (key: string) => void
  onRemove: () => void
}

function ProviderKeySection({ provider, saveStatus, onSave, onRemove }: ProviderKeySectionProps) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const providerDef = getProvider(provider)
  const hasKey = false

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent/10 text-accent font-semibold text-sm">
            {providerDef.mark}
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">{providerDef.name}</h4>
            <p className="text-xs text-muted-foreground">{providerDef.description}</p>
          </div>
        </div>
        {hasKey ? (
          <Button variant="outline" size="sm" onClick={onRemove}>
            Hapus
          </Button>
        ) : null}
      </div>

      {hasKey ? (
        <div className="flex items-center gap-2 text-xs text-success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>API key tersimpan</span>
          <span className="text-subtle">••••{providerDef.keyPlaceholder.slice(-4)}</span>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(key)
          }}
          className="space-y-2"
        >
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={providerDef.keyPlaceholder}
              className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 sm:h-9"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showKey ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <a
              href={providerDef.keyDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline"
            >
              Dapatkan API key
            </a>
            <Button type="submit" size="sm" disabled={saveStatus === 'saving' || !key.trim()}>
              {saveStatus === 'saving' ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default SettingsDialog
