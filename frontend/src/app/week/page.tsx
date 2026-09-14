import { Suspense } from 'react'

import { WeekPage } from '@/views/week/ui/week-page'
import { TabPageFallback } from '@/shared/ui/tab-page-fallback'

export default function Page() {
  return (
    <Suspense fallback={<TabPageFallback title="Неделя" variant="week" />}>
      <WeekPage />
    </Suspense>
  )
}
