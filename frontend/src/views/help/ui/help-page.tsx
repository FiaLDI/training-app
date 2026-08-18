'use client'

import { AdminFeedbackInbox } from '@/features/moderate-feedback/ui/admin-feedback-inbox'
import { SendFeedbackSection } from '@/features/send-feedback/ui/send-feedback-section'
import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { PageHeader } from '@/shared/ui/page-header'

export function HelpPage() {
  const user = useSessionStore((s) => s.user)
  const admin = isAdmin(user)

  return (
    <div>
      <PageHeader
        title="Помощь"
        description="Сообщите об ошибке или предложите идею — это поможет улучшить IronLog."
      />
      <div className="space-y-6">
        <SendFeedbackSection showHistory={!admin} />
        {admin ? <AdminFeedbackInbox /> : null}
      </div>
    </div>
  )
}
