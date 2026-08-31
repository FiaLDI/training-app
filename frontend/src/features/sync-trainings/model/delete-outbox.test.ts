import { setStorageScope } from '@/shared/lib/storage-scope'

import { deleteOutbox } from './delete-outbox'

describe('deleteOutbox', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
    deleteOutbox.clear()
  })

  it('stores training and template group deletes', () => {
    deleteOutbox.enqueue('training-group', 'g1')
    deleteOutbox.enqueue('template-group', 'g2')

    expect(deleteOutbox.list()).toEqual([
      { entity: 'training-group', id: 'g1' },
      { entity: 'template-group', id: 'g2' },
    ])
  })

  it('dedupes the same entity id', () => {
    deleteOutbox.enqueue('training-group', 'g1')
    deleteOutbox.enqueue('training-group', 'g1')

    expect(deleteOutbox.list()).toEqual([{ entity: 'training-group', id: 'g1' }])
  })
})
