import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function useInstallPrompt(): {
  canInstall: boolean
  isStandalone: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
} {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(detectStandalone)

  useEffect(() => {
    const handlePrompt = (promptEvent: Event) => {
      promptEvent.preventDefault()
      setEvent(promptEvent as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setEvent(null)
      setIsStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!event) return 'unavailable' as const
    await event.prompt()
    const choice = await event.userChoice
    setEvent(null)
    return choice.outcome
  }, [event])

  return { canInstall: Boolean(event), isStandalone, promptInstall }
}
