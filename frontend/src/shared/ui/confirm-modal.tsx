'use client'

import { ReactNode } from 'react'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  pending?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  confirmVariant = 'primary',
  pending = false,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeDisabled={pending}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending ? 'Подождите…' : confirmLabel}
          </Button>
        </>
      }
    />
  )
}
