import { Ghost } from 'lucide-react'
import { FeedbackCard } from '../components/ui/FeedbackCard'
import { navigate } from '../lib/router'

export function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <h1 className="sr-only">Page not found</h1>
      <FeedbackCard
        tone="error"
        icon={Ghost}
        title="This page ghosted us"
        body="That link does not lead anywhere. Head back to the hub and start again."
        actionLabel="Back to the hub"
        headingLevel="h2"
        onAction={() => navigate('/')}
      />
    </div>
  )
}
