import { lazy, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { InstallNudgeModal } from '../pwa/InstallNudgeModal'
import { FeedbackModal } from '../feedback/FeedbackModal'
import { DesktopTopPillBar } from '../nav/DesktopTopPillBar'
import { MobileBottomDock } from '../nav/MobileBottomDock'
import { MobileStatusHeader } from '../nav/MobileStatusHeader'
import { sweepExpiredShareHandoffOnce } from '../../lib/shareHandoff'
import { RoomShellSync } from './RoomShellSync'
import { ShellProvider, useShell } from './ShellProvider'

/**
 * The camera modal carries `jsqr`, which is only needed once someone opens the
 * scanner. Splitting it keeps the first load light; the chunk downloads on the
 * first tap and is cached by the service worker afterwards.
 */
const QrScannerModal = lazy(() =>
  import('../qr/QrScannerModal').then((m) => ({ default: m.QrScannerModal })),
)

type AppShellProps = {
  children: ReactNode
}

function ShellChrome({ children }: AppShellProps) {
  const {
    scannerOpen,
    scannerMode,
    closeScanner,
    feedbackOpen,
    closeFeedback,
  } = useShell()

  // One boot sweep per page life, on every route. The helper owns the module
  // level flag, so StrictMode and a remount can never sweep twice, and a page
  // that booted on a share claim URL never sweeps at all.
  useEffect(() => {
    sweepExpiredShareHandoffOnce()
  }, [])

  return (
    <div className="min-h-dvh bg-brand-canvas text-brand-ink">
      <RoomShellSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-brand-ink focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <header>
        <DesktopTopPillBar />
        <MobileStatusHeader />
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] px-4 pb-44 pt-6 md:px-6 md:pb-16 md:pt-8"
      >
        {children}
      </main>

      <MobileBottomDock />

      <InstallNudgeModal />

      <FeedbackModal isOpen={feedbackOpen} onClose={closeFeedback} />

      {scannerOpen ? (
        <Suspense fallback={null}>
          <QrScannerModal mode={scannerMode} onClose={closeScanner} />
        </Suspense>
      ) : null}
    </div>
  )
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ShellProvider>
      <ShellChrome>{children}</ShellChrome>
    </ShellProvider>
  )
}
