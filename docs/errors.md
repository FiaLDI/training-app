# Известные проблемы и логические дыры

Журнал странного поведения, потенциальных багов и архитектурных рисков.  
Заполняется по мере ревью, тестов и инцидентов. **Не дублирует** пункты roadmap — здесь только конкретика с путями в коде.

Формат записи:

| Поле | Значение |
|------|----------|
| **ID** | `ERR-NNN` |
| **Severity** | `critical` / `high` / `medium` / `low` / `cosmetic` |
| **Статус** | `open` / `confirmed` / `wontfix` / `fixed` |
| **Область** | frontend / backend / sync / auth / … |
| **Найдено** | дата, контекст (тесты, ревью, …) |

---

## Открытые

### ERR-001 — Preferences не изолированы между пользователями

| | |
|---|---|
| **Severity** | medium |
| **Статус** | open |
| **Область** | frontend, изоляция пользователей |
| **Найдено** | 2026-08-28, настройка автотестов `storage-scope` |

**Суть:** Zustand-persist для настроек (`ironlog:preferences`) не входит в `SCOPED_DATA_SUFFIXES` и не сбрасывается в `resetEntityStores()` / `leaveSession()`.

**Файлы:**
- `frontend/src/entities/preferences/model/store.ts` — ключ `ironlog:preferences`
- `frontend/src/shared/lib/storage-scope.ts` — список scoped suffixes
- `frontend/src/features/clear-local-data/model/clear-local-data.ts` — reset без preferences

**Симптом:** User A меняет шаг веса / таймер отдыха → logout → User B видит настройки A (rest timer, шаги кг/повторов).

**Ожидание (roadmap):** user-scoped persist или reset на границе сессии.

**Идея фикса:** перенести preferences в scoped key (`ironlog:scope:cloud:{userId}:preferences`) или сбрасывать store при `enterSessionScope` / `leaveSession`.

---

### ERR-002 — После logout storage scope остаётся на предыдущем аккаунте

| | |
|---|---|
| **Severity** | medium |
| **Статус** | open |
| **Область** | frontend, session boundary |
| **Найдено** | 2026-08-28, ревью `session-boundary` + тесты |

**Суть:** `leaveSession()` сбрасывает только Zustand-сторы, но **не** меняет `currentScope` в `storage-scope.ts`. До следующего `enterSessionScope` любой код, читающий `localData` / `scopedStorageKey`, продолжит ходить в scope прошлого cloud-пользователя.

**Файлы:**
- `frontend/src/entities/session/lib/session-boundary.ts` — `leaveSession()`
- `frontend/src/entities/session/model/store.ts` — `logout()` вызывает `leaveSession()`
- `frontend/src/shared/lib/storage-scope.ts` — module-level `currentScope`

**Сценарий:** logout User A → на `/login` сторонний код (или race до re-render) читает `localData` → данные A. На практике на login-странице мало читателей, но окно существует.

**Идея фикса:** в `leaveSession()` вызывать `setStorageScope('local')` или явный «нейтральный» scope; покрыть e2e: logout → login B.

---

### ERR-003 — `mode: cloud` без `userId` не переключает scope

| | |
|---|---|
| **Severity** | medium |
| **Статус** | open |
| **Область** | frontend, storage-scope |
| **Найдено** | 2026-08-28, ревью `applyStorageScopeFromSession` |

**Суть:** `applyStorageScopeFromSession('cloud', null)` — no-op. Scope остаётся прежним (часто `'local'` после cold start), а UI может считать режим облачным.

**Файлы:**
- `frontend/src/shared/lib/storage-scope.ts` — строки 71–79
- `frontend/src/entities/session/lib/session-boundary.ts` — `syncStorageScopeFromSession`

**Сценарий:** битый persist (`mode: cloud`, `user: null`) после ручного edit localStorage или частичного сбоя → cloud UI + local scope → чтение/запись «чужого» bucket или пустого local.

**Идея фикса:** при `cloud` без `userId` сбрасывать сессию на login; не оставлять `mode: cloud` без user.

---

### ERR-004 — `isTrainingPendingSync`: «synced» без `contentHash` считается OK

| | |
|---|---|
| **Severity** | medium |
| **Статус** | open (частичный workaround есть) |
| **Область** | frontend, sync |
| **Найдено** | 2026-08-28, тесты `training-sync-meta` |

**Суть:** если `metadata.sync.status === 'synced'`, но `contentHash` отсутствует, функция возвращает **`false`** (не pending) — тренировка выглядит синхронизированной, хотя локальные изменения могли не уехать на сервер.

```78:85:frontend/src/shared/lib/training-sync-meta.ts
export function isTrainingPendingSync(training: Training): boolean {
  const sync = getTrainingSyncMeta(training.metadata)
  if (!sync || sync.status !== 'synced') return true
  if (!sync.contentHash) return false
  // ...
}
```

**Workaround:** одноразовый `healSyncedTrainingsMissingContentHash()` — но он срабатывает не на каждом read и помечается флагом в localStorage.

**Риск:** orphan sets / правки после старых клиентов не попадают в очередь sync до heal.

**Идея фикса:** `if (!sync.contentHash) return true` или always compare hash when local detail exists.

---

### ERR-005 — Sync групп: fallback на 400 может создать частичную группу

| | |
|---|---|
| **Severity** | medium |
| **Статус** | open |
| **Область** | frontend, sync, exercise groups |
| **Найдено** | 2026-08-28, ревью `sync-trainings.ts` |

**Суть:** `upsertTrainingGroup` при **любом** HTTP 400 от `createGroup` повторяет создание только с **первыми двумя** упражнениями, затем догоняет `addExerciseToGroup`. Если 400 был из‑за другой причины (не adjacent, already grouped, ownership), клиент может оставить на сервере урезанный superset вместо circuit/triset.

**Файл:** `frontend/src/features/sync-trainings/model/sync-trainings.ts` — `upsertTrainingGroup`, ~строки 144–170.

**Идея фикса:** разбирать тело ошибки / код; fallback только для известного «already exists»; integration-тест sync групп 3+ упражнений.

---

### ERR-006 — `addExerciseToGroup` ломается на группе без members

| | |
|---|---|
| **Severity** | low |
| **Статус** | open |
| **Область** | backend, exercise groups |
| **Найдено** | 2026-08-28, ревью repository |

**Суть:** для пустого списка members `Math.max(...[])` → `-Infinity`, условие `exercise.exerciseOrder !== maxOrder + 1` почти всегда true → метод возвращает `null`. «Осиротевшая» группа (members удалены вручную / баг sync) не восстанавливается через add.

**Файл:** `backend/src/modules/training/infrastructure/training.typeorm-repository.ts` — `addExerciseToGroup`, ~465–466.

**Идея фикса:** если `members.length === 0`, разрешать add при `exerciseOrder === group.groupOrder` (или удалять пустые группы).

---

### ERR-007 — Idempotent `createGroup` по `id`: чужая группа → попытка INSERT

| | |
|---|---|
| **Severity** | low |
| **Статус** | open |
| **Область** | backend, sync |
| **Найдено** | 2026-08-28, ревью repository |

**Суть:** если `input.id` уже есть в БД, но training **не** принадлежит `userId`, ранний return не срабатывает — код идёт дальше и пытается создать группу с тем же UUID → PK conflict / 500 вместо чистого 403/404.

**Файл:** `backend/src/modules/training/infrastructure/training.typeorm-repository.ts` — `createGroup`, ~393–398.

**Идея фикса:** если `existing` найден и not owned → вернуть null / throw Forbidden; не продолжать create.

---

### ERR-008 — `upsertExercise`: update 400/404 проглатывается

| | |
|---|---|
| **Severity** | low |
| **Статус** | open |
| **Область** | frontend, sync |
| **Найдено** | 2026-08-28, ревью sync whitelist |

**Суть:** после idempotent create любая 400/404 на `updateExercise` игнорируется. Задумано для stale clients, но маскирует реальные ошибки валидации (в т.ч. если whitelist на сервере ужесточат).

**Файл:** `frontend/src/features/sync-trainings/model/sync-trainings.ts` — ~104–110.

**Идея фикса:** игнорировать только известные коды/сообщения; логировать остальное; тест контракта sync payload.

---

### ERR-009 — Login: rate limit по аккаунту до проверки кода

| | |
|---|---|
| **Severity** | low (UX / security tradeoff) |
| **Статус** | open |
| **Область** | backend, auth |
| **Найдено** | 2026-08-28, unit-тест `LoginUseCase` |

**Суть:** счётчик `rl:auth-login-user:{id}` инкрементируется, как только lookup нашёл пользователя, **до** `verify`. Пять неверных попыток (опечатки) блокируют аккаунт на 15 мин, хотя IP-limit (10/15 min) ещё есть.

**Файл:** `backend/src/modules/auth/core/use-cases/login/login.use-case.ts` — строки 27–37.

**Заметка:** для несуществующего lookup limit не применяется — только IP `@RateLimit` на контроллере. Это ожидаемо при HMAC-lookup, но стоит мониторить.

---

### ERR-010 — Legacy migration только при `setStorageScope('local')`

| | |
|---|---|
| **Severity** | low |
| **Статус** | open |
| **Область** | frontend, migration |
| **Найдено** | 2026-08-28, тесты `storage-scope` |

**Суть:** `migrateLegacyKeysToScope` вызывается только при переходе в `local`, не при первом cloud-login. Старые ключи `ironlog:local:*` не переезжают в `cloud:{userId}` (возможно by design: local ≠ cloud data).

**Риск:** пользователь работал в legacy local → логинится в cloud → старые local-данные остаются в другом bucket, UI «пустой» без явного сообщения.

**Файл:** `frontend/src/shared/lib/storage-scope.ts` — `setStorageScope`, `migrateLegacyKeysToScope`.

---

### ERR-011 — Опечатка в UI: «Супerset»

| | |
|---|---|
| **Severity** | cosmetic |
| **Статус** | open |
| **Область** | frontend, i18n |
| **Найдено** | 2026-08-28, ревью `exercise-group-utils` |

**Суть:** латинская `e` в русской строке: `'Супerset'` вместо «Суперсет».

**Файл:** `frontend/src/entities/session/lib/exercise-group-utils.ts` — `groupTypeLabel`.

---

### ERR-012 — `refreshUser` молча оставляет протухшую cloud-сессию

| | |
|---|---|
| **Severity** | low |
| **Статус** | open |
| **Область** | frontend, auth |
| **Найдено** | 2026-08-28, ревью session store |

**Суть:** при ошибке `authApi.me()` store не очищается — пользователь остаётся в `mode: cloud` с невалидным token до ручного logout.

**Файл:** `frontend/src/entities/session/model/store.ts` — `refreshUser`, ~108–110.

**Идея фикса:** при 401 вызывать `logout()` / redirect на login.

---

## Наблюдения (не баг, но стоит помнить)

- **Дублирование `exercise-group` логики** — одинаковые `groupTypeFromMemberCount` / `areExerciseOrdersContiguous` в backend (`common/core/exercise-group.ts`) и frontend (`exercise-group-utils.ts`). Риск расхождения; тесты пока только по отдельности.
- **Sync whitelist только на PATCH exercise** — групповые поля сознательно исключены из DTO (тест есть). Create exercise path стоит проверить отдельно.
- **Module-level `currentScope`** — в одной вкладке ок; несколько вкладок с разными аккаунтами на одном origin не изолированы (редкий кейс PWA).

---

## Закрытые

*(пока пусто — переносить сюда с датой fix и ссылкой на commit)*

---

## Связанные документы

- `docs/roadmap.md` — пункт про баг кеша после смены пользователя (ERR-001…003 напрямую связаны)
- `docs/arch.md` — rate-limit, auth, Redis
