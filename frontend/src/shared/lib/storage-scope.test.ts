import {
  applyStorageScopeFromSession,
  clearScopeData,
  SCOPED_DATA_SUFFIXES,
  scopeStorageKey,
  scopedStorageKey,
  setStorageScope,
} from './storage-scope'

describe('storage-scope', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
  })

  it('builds scoped keys per user', () => {
    expect(scopeStorageKey('local', 'trainings')).toBe('ironlog:scope:local:trainings')
    expect(scopeStorageKey('cloud:user-a', 'trainings')).toBe(
      'ironlog:scope:cloud:user-a:trainings',
    )
  })

  it('switches active scope for scopedStorageKey', () => {
    setStorageScope('cloud:user-a')
    expect(scopedStorageKey('exercises')).toBe('ironlog:scope:cloud:user-a:exercises')

    setStorageScope('cloud:user-b')
    expect(scopedStorageKey('exercises')).toBe('ironlog:scope:cloud:user-b:exercises')
  })

  it('maps session mode to storage scope', () => {
    applyStorageScopeFromSession('local', null)
    expect(scopedStorageKey('trainings')).toBe('ironlog:scope:local:trainings')

    applyStorageScopeFromSession('cloud', 'uid-42')
    expect(scopedStorageKey('trainings')).toBe('ironlog:scope:cloud:uid-42:trainings')
  })

  it('migrates legacy local keys on first local scope activation', () => {
    localStorage.setItem('ironlog:local:trainings', JSON.stringify([{ id: 't1' }]))
    setStorageScope('local')

    expect(localStorage.getItem('ironlog:scope:local:trainings')).toBe(
      JSON.stringify([{ id: 't1' }]),
    )
    expect(localStorage.getItem('ironlog:local:trainings')).toBeNull()
  })

  it('clears only one scope without touching another account', () => {
    setStorageScope('cloud:user-a')
    localStorage.setItem(scopedStorageKey('trainings'), 'a-data')
    setStorageScope('cloud:user-b')
    localStorage.setItem(scopedStorageKey('trainings'), 'b-data')

    clearScopeData('cloud:user-a')

    expect(localStorage.getItem(scopeStorageKey('cloud:user-a', 'trainings'))).toBeNull()
    expect(localStorage.getItem(scopeStorageKey('cloud:user-b', 'trainings'))).toBe('b-data')
  })

  it('clears all scoped data suffixes for a scope', () => {
    for (const suffix of SCOPED_DATA_SUFFIXES) {
      localStorage.setItem(scopeStorageKey('local', suffix), suffix)
    }
    clearScopeData('local')
    for (const suffix of SCOPED_DATA_SUFFIXES) {
      expect(localStorage.getItem(scopeStorageKey('local', suffix))).toBeNull()
    }
  })
})
