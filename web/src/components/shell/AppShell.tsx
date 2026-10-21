import type { ReactNode } from 'react'
import { QrScannerModal } from '../qr/QrScannerModal'
import { DesktopTopPillBar } from '../nav/DesktopTopPillBar'
import { MobileBottomDock } from '../nav/MobileBottomDock'
import { MobileStatusHeader } from '../nav/MobileStatusHeader'
import { ShellProvider, useShell } from './ShellProvider'

type AppShellProps = {
  children: ReactNode
}

function ShellChrome({ children }: AppShellProps) {
  const { scannerOpen, closeScanner } = useShell()

  return (
    <div className="min-h-dvh bg-brand-canvas text-brand-ink">
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

      {scannerOpen ? <QrScannerModal onClose={closeScanner} /> : null}
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
