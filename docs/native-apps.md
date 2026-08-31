# Нативные приложения IronLog (Android / iOS)

IronLog уже работает как **PWA** (Service Worker, манифест, установка «На экран Домой»). Этот документ описывает **два независимых пути** к приложению в Store:

1. **Обёртки** — нативная оболочка вокруг веб-версии (TWA, WebView, Capacitor remote URL). UI и офлайн — как у PWA.
2. **Локальные нативные клиенты** — собственный UI и локальная БД на устройстве; сервер опционален (режим «без аккаунта» + синхронизация при входе).

Интеграция с REST API, auth, офлайн-очередь и sync-протокол — в отдельном документе: **[native-integration.md](./native-integration.md)**.

---

## Сравнение подходов

| Подход | Тип | Платформы | Сложность | UI | Офлайн | Store |
|--------|-----|-----------|-----------|-----|--------|-------|
| PWA (уже есть) | Обёртка / web | Android, iOS | — | Веб | SW + IndexedDB | Нет* |
| TWA | Обёртка | Android | Низкая | Веб | Как PWA | Google Play |
| Capacitor / WebView | Обёртка | Android + iOS | Низкая | Веб | Как PWA | Оба Store |
| Flutter WebView | Обёртка | Android + iOS | Средняя | Веб | Как PWA | Оба Store |
| **Kotlin + Jetpack Compose (локальный)** | **Нативный** | Android | Высокая | Нативный | Room / SQLite | Google Play |
| **Swift + SwiftUI (локальный)** | **Нативный** | iOS | Высокая | Нативный | SwiftData | App Store |
| **Flutter (локальный UI + Drift)** | **Нативный** | Android + iOS | Высокая | Нативный | Drift / SQLite | Оба Store |

\* На Android PWA можно опубликовать через **TWA** без переписывания UI.

**Рекомендация:**

- **Быстро в Store, минимум кода** → PWA / TWA / WebView-обёртка (Часть I).
- **Зал без сети, нативный UX, HealthKit, фоновый rest timer** → локальный клиент (Часть II) + [native-integration.md](./native-integration.md).

---

## Общие требования

Перед любым вариантом убедитесь, что production-сборка доступна по **HTTPS**:

```text
https://your-domain.example/     ← фронтенд IronLog
https://your-domain.example/api/   ← прокси на backend (rewrites в next.config)
```

Иконки для store-листингов лежат в репозитории:

```text
frontend/public/icons/
  icon-192.png
  icon-512.png
  icon-maskable-512.png
  apple-touch-icon.png
  icon.svg
```

Перегенерация: `cd frontend && npm run generate-icons`.

---

# Часть I. Обёртки (веб-приложение внутри Store)

Секции 1–8 ниже — варианты, где **UI остаётся веб-версией IronLog**. Обновления экранов деплоятся с сервера; нативный код только открывает URL и (опционально) даёт доступ к камере, push, haptics.

---

## 1. PWA (текущая реализация)

Уже настроено в проекте:

| Файл | Назначение |
|------|------------|
| `frontend/src/app/manifest.ts` | Web App Manifest |
| `frontend/src/app/sw.ts` | Service Worker (Serwist) |
| `frontend/src/app/serwist/[path]/route.ts` | Отдача `/serwist/sw.js` |
| `frontend/src/app/~offline/page.tsx` | Fallback без сети |

**Проверка локально (SW только в production):**

```bash
cd frontend
npm run build
npm start
# http://localhost:3001 → DevTools → Application → Service Workers
```

**Установка на устройство:**

- **Android (Chrome):** меню → «Установить приложение» / «Добавить на главный экран».
- **iOS (Safari):** «Поделиться» → «На экран Домой». Push-уведомления работают с iOS 16.4+ для установленных PWA.

---

## 2. Android: TWA (Trusted Web Activity)

Самый быстрый путь в **Google Play** без Kotlin-кода: полноэкранный Chrome поверх вашего HTTPS-сайта с общим origin и Digital Asset Links.

### 2.1. Подготовка

1. Установите [Android Studio](https://developer.android.com/studio) и JDK 17+.
2. Установите Bubblewrap (CLI от Google):

```bash
npm install -g @bubblewrap/cli
```

3. Подготовьте URL манифеста: `https://your-domain.example/manifest.webmanifest`.

### 2.2. Инициализация проекта

```bash
mkdir ironlog-android-twa && cd ironlog-android-twa
bubblewrap init --manifest=https://your-domain.example/manifest.webmanifest
```

Мастер запросит:

- **Application ID:** `com.ironlog.app` (уникальный reverse-DNS).
- **App name:** `IronLog`.
- **Host:** `your-domain.example`.
- **Start URL:** `/`.
- Иконки подтянутся из манифеста или укажите `frontend/public/icons/icon-512.png`.

### 2.3. Digital Asset Links

На сервере должен отдаваться файл:

```text
https://your-domain.example/.well-known/assetlinks.json
```

Пример (подставьте SHA-256 отпечаток **release**-ключа):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ironlog.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:..."
      ]
    }
  }
]
```

Отпечаток release-ключа:

```bash
keytool -list -v -keystore android.keystore -alias ironlog
```

### 2.4. Сборка и публикация

```bash
bubblewrap build
# APK/AAB в ./app-release-signed.apk или .aab
```

Загрузите `.aab` в [Google Play Console](https://play.google.com/console). Категория: **Health & Fitness**.

---

## 3. Android: Android Studio + WebView (минимальная оболочка)

Если TWA не подходит (нужны нативные permissions, In-App Updates, кастомный splash), создайте пустой проект с одним `WebView`.

### 3.1. Создание проекта

1. Android Studio → **New Project** → **Empty Activity**.
2. **Name:** IronLog, **Package:** `com.ironlog.app`, **Language:** Kotlin, **Minimum SDK:** API 26.
3. В `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />

<application
    android:usesCleartextTraffic="false"
    ...>
    <activity
        android:name=".MainActivity"
        android:exported="true"
        android:configChanges="orientation|screenSize|keyboardHidden"
        android:windowSoftInputMode="adjustResize">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

### 3.2. MainActivity.kt

```kotlin
package com.ironlog.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val appUrl = "https://your-domain.example/"

        setContent {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        webViewClient = WebViewClient()
                        webChromeClient = WebChromeClient()
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            cacheMode = WebSettings.LOAD_DEFAULT
                            mediaPlaybackRequiresUserGesture = false
                        }
                        loadUrl(appUrl)
                    }
                },
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // TODO: найти WebView и вызвать goBack(), если canGoBack()
        super.onBackPressed()
    }
}
```

> Для production лучше вынести URL в `BuildConfig` / `local.properties` и добавить обработку `onBackPressed` через `remember` + ссылку на WebView.

### 3.3. Иконки

Android Studio → **Image Asset** → импорт `frontend/public/icons/icon-512.png`, тип **Launcher Icons (Adaptive)**.

---

## 4. Android: Jetpack Compose (нативная оболочка)

Тот же WebView можно оформить «по-Compose»: splash, offline-banner, bottom bar для навигации.

### 4.1. Зависимости (`libs.versions.toml` / `build.gradle.kts`)

```kotlin
// app/build.gradle.kts
dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
```

### 4.2. Структура экрана

```text
app/src/main/java/com/ironlog/app/
  MainActivity.kt
  ui/
    IronLogScreen.kt      // Scaffold + WebView + offline Snackbar
    theme/
      Color.kt            // #0b1110, #a3e635 — цвета IronLog
      Theme.kt
```

Пример `IronLogScreen.kt`:

```kotlin
@Composable
fun IronLogScreen(appUrl: String) {
    var isOffline by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        // ConnectivityManager → isOffline
    }

    Scaffold(
        containerColor = Color(0xFF0B1110),
        snackbarHost = {
            if (isOffline) {
                Snackbar { Text("Нет сети — локальные данные доступны") }
            }
        },
    ) { padding ->
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            factory = { ctx ->
                WebView(ctx).apply {
                    // те же settings, что в §3.2
                    loadUrl(appUrl)
                }
            },
        )
    }
}
```

### 4.3. Путь к полностью нативному UI

Полная перепись экранов (тренировка, таймер отдыха, stats) на Compose — отдельный многомесячный проект. API IronLog уже REST (`/api/trainings`, `/api/exercises`, …); клиенту понадобятся:

- Retrofit / Ktor + kotlinx.serialization
- Room или DataStore для офлайн-очереди (аналог текущего `localData` + sync)
- WorkManager для фоновой синхронизации

Документировать контракт API удобно через OpenAPI бэкенда (Swagger уже в NestJS-модулях).

---

## 5. Flutter (кроссплатформа)

Подходит, если нужны **один код** для Android и iOS с доступом к камере, Health Connect, push через Firebase.

### 5.1. Создание проекта

```bash
flutter create ironlog_mobile
cd ironlog_mobile
```

`pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.10.0
  connectivity_plus: ^6.1.0
  flutter_native_splash: ^2.4.3
```

### 5.2. WebView-оболочка

`lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const appUrl = 'https://your-domain.example/';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IronLogApp());
}

class IronLogApp extends StatelessWidget {
  const IronLogApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IronLog',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF0B1110),
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFFA3E635),
          surface: const Color(0xFF0B1110),
        ),
      ),
      home: const IronLogWebView(),
    );
  }
}

class IronLogWebView extends StatefulWidget {
  const IronLogWebView({super.key});

  @override
  State<IronLogWebView> createState() => _IronLogWebViewState();
}

class _IronLogWebViewState extends State<IronLogWebView> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0B1110))
      ..loadRequest(Uri.parse(appUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        }
      },
      child: Scaffold(
        body: SafeArea(child: WebViewWidget(controller: _controller)),
      ),
    );
  }
}
```

### 5.3. Иконки и splash

```bash
# Положите icon-512.png в assets/
flutter pub run flutter_native_splash:create
flutter pub run flutter_launcher_icons
```

Конфиг `flutter_launcher_icons` → `image_path: "../frontend/public/icons/icon-512.png"`.

### 5.4. Сборка

```bash
flutter build appbundle   # Android → .aab для Play Console
flutter build ipa         # iOS → Xcode Archive (нужен Mac + Apple Developer)
```

---

## 6. iOS: Xcode + WKWebView (Swift)

Минимальная оболочка для **App Store**, когда PWA «На экран Домой» недостаточно.

### 6.1. Создание проекта

1. Xcode → **File → New → Project → App**.
2. **Product Name:** IronLog, **Interface:** SwiftUI, **Language:** Swift.
3. **Bundle Identifier:** `com.ironlog.app`.
4. **Signing & Capabilities:** Team + Automatic Signing (Apple Developer Program, $99/год).

### 6.2. Info.plist

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

Только HTTPS — как у production IronLog.

### 6.3. WebView (SwiftUI)

`IronLogWebView.swift`:

```swift
import SwiftUI
import WebKit

struct IronLogWebView: UIViewRepresentable {
    let url = URL(string: "https://your-domain.example/")!

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.04, green: 0.07, blue: 0.06, alpha: 1)
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        IronLogWebView()
            .ignoresSafeArea()
    }
}
```

### 6.4. Иконки

Xcode → **Assets.xcassets → AppIcon** → перетащите `apple-touch-icon.png` (180×180) и набор 1024×1024 для App Store Connect.

App Store Connect → **My Apps → +** → метаданные, скриншоты (6.7", 6.5", iPad при необходимости).

---

## 7. iOS: SwiftUI (полностью нативный клиент)

Аналог Jetpack Compose на iOS:

| Слой | Технология |
|------|------------|
| UI | SwiftUI |
| Сеть | URLSession / Alamofire |
| Локальное хранилище | SwiftData / Core Data |
| Фон | BackgroundTasks + push (APNs) |
| Health | HealthKit (Фаза 4 roadmap) |

Экран тренировки (`TrainingSessionPage`) придётся воспроизвести нативно: stepper упражнений, форма подхода, rest timer с `UNUserNotificationCenter` вместо Web Notification API.

**Стартовая структура Xcode:**

```text
IronLog/
  App/IronLogApp.swift
  Features/
    Training/TrainingSessionView.swift
    Auth/LoginView.swift
  Core/
    API/IronLogClient.swift
    Models/Training.swift
  Resources/Assets.xcassets
```

---

## 8. Capacitor (альтернатива Flutter / ручным WebView)

Официальный гибрид от Ionic — удобен, если хотите оставить деплой веб-версии центральным, но добавить нативные плагины (камера, filesystem, push).

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init IronLog com.ironlog.app --web-dir=.next/standalone/...
```

> Для Next.js `standalone` нужно скопировать статику в `webDir` или указать production URL в `server.url` (live reload / remote web app mode):

```json
// capacitor.config.ts
{
  "appId": "com.ironlog.app",
  "appName": "IronLog",
  "server": {
    "url": "https://your-domain.example",
    "cleartext": false
  }
}
```

```bash
npx cap add android
npx cap add ios
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

Плагины: `@capacitor/push-notifications`, `@capacitor/haptics` (вибрация rest timer), `@capacitor-community/http` для обхода CORS при локальном API.

---

## 9. Чеклист перед публикацией в Store

### Общее

- [ ] Production URL по HTTPS, валидный TLS-сертификат
- [ ] Service Worker и manifest отдаются без ошибок (Lighthouse PWA audit ≥ 90)
- [ ] Политика конфиденциальности (URL в карточке приложения)
- [ ] Скриншоты: экран тренировки, неделя, stats, settings

### Google Play

- [ ] AAB подписан release-ключом (не debug)
- [ ] `assetlinks.json` для TWA (если TWA)
- [ ] Target API level ≥ требований Google (см. [target API timeline](https://developer.android.com/google/play/requirements/target-sdk))
- [ ] Data safety form: какие данные собираются (email, тренировки)

### App Store

- [ ] Apple Developer Program
- [ ] Privacy Nutrition Labels
- [ ] Guideline 4.2: «минимальная функциональность» — чистый WebView без offline может отклонить; IronLog с PWA/SW и локальным режимом обычно проходит
- [ ] TestFlight для внутреннего теста

---

# Часть II. Локальные нативные клиенты

Полноценное приложение **без WebView**: свой UI, локальная БД, работа в зале без сети. Облако — опционально: пользователь может тренироваться локально (аналог «Продолжить без аккаунта» в веб-клиенте) и позже войти по коду для синхронизации.

**Контракт с сервером:** REST API IronLog — см. **[native-integration.md](./native-integration.md)**.

## Архитектура локального клиента

```text
┌─────────────────────────────────────────────────────────┐
│  UI (Compose / SwiftUI / Flutter widgets)               │
├─────────────────────────────────────────────────────────┤
│  Domain / Use Cases                                     │
│    • startTraining, logSet, restTimer, syncPending        │
├─────────────────────────────────────────────────────────┤
│  Local Repository (источник истины на устройстве)       │
│    Room / SwiftData / Drift                             │
├─────────────────────────────────────────────────────────┤
│  Sync Engine (только cloud-режим)                       │
│    • outbox queue, contentHash, retry/backoff           │
├─────────────────────────────────────────────────────────┤
│  API Client (Ktor / URLSession / Dio)                   │
└─────────────────────────────────────────────────────────┘
         │ offline                    │ online
         ▼                            ▼
   SQLite на устройстве         IronLog Backend (/api)
```

### Режимы работы

| Режим | Аналог в веб-клиенте | Сервер | Данные |
|-------|----------------------|--------|--------|
| **Local-only** | «Продолжить без аккаунта» | Не нужен | Только на устройстве |
| **Cloud** | Вход по login-коду | Обязателен для sync | Локально + upload при сети |
| **Cloud + pull** | Первый вход на новом телефоне | GET списков с сервера | Merge в локальную БД |

Scope данных при смене пользователя: как в веб-клиенте (`ironlog:scope:local` vs `ironlog:scope:cloud:{userId}`) — см. [native-integration.md § Scope и изоляция](./native-integration.md#scope-и-изоляция-данных).

### Минимальный набор экранов (MVP)

1. **Login** — код + «Продолжить локально»
2. **Dashboard** — сегодня / продолжить тренировку
3. **Week** — недельный календарь
4. **Training session** — stepper упражнений, форма подхода, rest timer
5. **Exercises** — каталог (системные + свои)
6. **Templates** — планы тренировок
7. **Settings** — sync status, rest timer prefs, logout

Rest timer в нативе: `AlarmManager` + notification channel (Android), `UNUserNotificationCenter` + `BGTask` (iOS) — надёжнее, чем Web Notification API в фоне.

---

## 11. Android: локальный клиент (Jetpack Compose + Room)

### 11.1. Стек

| Слой | Библиотека |
|------|------------|
| UI | Jetpack Compose + Material 3 |
| DI | Hilt |
| Локальная БД | Room (SQLite) |
| Сеть | Ktor Client + kotlinx.serialization |
| Фоновая sync | WorkManager |
| UUID | `java.util.UUID.randomUUID()` — клиент генерирует id до upload |

### 11.2. Структура модуля

```text
ironlog-android/
  app/
  core/
    model/          # Training, TrainingSet, Exercise — зеркало API DTO
    database/       # Room entities + DAOs
    network/        # IronLogApi, AuthInterceptor
    sync/           # SyncWorker, OutboxRepository
  feature/
    auth/
    training/
    exercises/
    settings/
```

### 11.3. Room-схема (упрощённо)

Таблицы зеркалят сущности веб-клиента (`localData`):

- `exercises`, `sources`, `templates`, `template_exercises`
- `trainings`, `training_exercises`, `training_sets`
- `body_measurements`, `sync_outbox` (очередь операций)

Поле `metadata` — JSON-колонка (`TEXT`); внутри для тренировок — блок `sync`:

```json
{
  "sync": {
    "status": "pending",
    "reason": "queued",
    "contentHash": "…"
  }
}
```

Алгоритм upload — повторяет `frontend/src/features/sync-trainings/model/sync-trainings.ts` (см. integration doc).

### 11.4. Пример экрана тренировки (Compose)

```kotlin
@Composable
fun TrainingSessionScreen(
    trainingId: String,
    viewModel: TrainingSessionViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        containerColor = Color(0xFF0B1110),
        bottomBar = {
            if (state.restSecondsLeft != null) {
                RestTimerBar(
                    secondsLeft = state.restSecondsLeft!!,
                    onAdd30 = viewModel::addRestSeconds,
                    onSkip = viewModel::skipRest,
                )
            }
        },
    ) { padding ->
        TrainingStepper(
            modifier = Modifier.padding(padding),
            exercises = state.exercises,
            activeIndex = state.activeExerciseIndex,
            onLogSet = viewModel::logSet,
        )
    }
}
```

ViewModel пишет в Room **сразу**; `SyncWorker` подхватывает pending-тренировки при появлении сети.

### 11.5. Local-only vs Cloud

```kotlin
enum class AppMode { LOCAL, CLOUD }

// При LOCAL — IronLogApi не вызывается, sync worker отключён
// При login(code) — mode = CLOUD, token в EncryptedSharedPreferences
// Outbox: backfill pending из metadata.sync.status != "synced"
```

---

## 12. iOS: локальный клиент (SwiftUI + SwiftData)

### 12.1. Стек

| Слой | Технология |
|------|------------|
| UI | SwiftUI |
| Локальная БД | SwiftData (iOS 17+) или Core Data |
| Сеть | URLSession + Codable |
| Фон | BackgroundTasks + `BGAppRefreshTask` для sync |
| Keychain | JWT `accessToken` |

### 12.2. Структура

```text
IronLog/
  App/
  Core/
    Models/
    Persistence/
    Networking/IronLogClient.swift
    Sync/SyncEngine.swift
  Features/
    Auth/
    Training/
    Exercises/
    Settings/
```

### 12.3. SwiftData-модель (фрагмент)

```swift
@Model
final class TrainingRecord {
    @Attribute(.unique) var id: UUID
    var status: String
    var scheduledAt: Date?
    var metadataJSON: Data  // sync meta внутри

    @Relationship(deleteRule: .cascade)
    var exercises: [TrainingExerciseRecord] = []
}
```

`SyncEngine` — порт логики из `sync-trainings.ts`: idempotent POST с клиентским UUID, затем PATCH exercise/set.

### 12.4. Rest timer (нативно)

```swift
// UNUserNotificationCenter — локальное уведомление через restSeconds
// UIApplication.shared.isIdleTimerDisabled = true — экран не гаснет во время сессии
```

---

## 13. Flutter: локальный клиент (не WebView)

### 13.1. Стек

```yaml
dependencies:
  flutter_riverpod: ^2.6.1
  drift: ^2.22.1
  sqlite3_flutter_libs: ^0.5.28
  dio: ^5.7.0
  uuid: ^4.5.1
  workmanager: ^0.5.2   # Android background sync
```

### 13.2. Отличие от §5 (WebView)

| | §5 WebView | §13 Локальный |
|--|-----------|---------------|
| UI | `webview_flutter` | Свои `Widget` |
| Данные | localStorage сайта | Drift/SQLite |
| Offline | Зависит от PWA | Полный контроль |
| Store review | Риск 4.2 (thin wrapper) | Полноценное приложение |

### 13.3. Repository pattern

```dart
class TrainingRepository {
  TrainingRepository(this._db, this._api, this._mode);

  Future<void> logSet(String exerciseId, TrainingSetInput input) async {
    await _db.into(_db.trainingSets).insert(/* … */);
    if (_mode == AppMode.cloud) {
      await _db.into(_db.syncOutbox).insert(SyncOutboxCompanion(/* upsert set */));
    }
  }
}
```

---

## 14. Локальный клиент: чеклист MVP

- [ ] Local-only режим без регистрации
- [ ] UUID генерируются на клиенте до первого upload
- [ ] Тренировка целиком доступна offline (exercises + sets)
- [ ] Rest timer с нативными уведомлениями
- [ ] Login по коду → cloud mode → фоновая sync
- [ ] Logout / смена пользователя → wipe scoped data
- [ ] Индикатор «ожидает синхронизации» на тренировках
- [ ] Health endpoint / connectivity check перед sync

---

## 15. Связь с roadmap IronLog

| Задача roadmap | Нативный слой |
|----------------|---------------|
| PWA и автономность (Фаза 2) | База для TWA / WebView — **сделано** |
| IndexedDB sync engine (Фаза 3) | **сделано в PWA** (Dexie); натив — Room / SwiftData / Drift |
| HealthKit / Health Connect (Фаза 4) | Только локальный нативный клиент |
| Push rest timer в фоне | AlarmManager / UNUserNotificationCenter |
| Голосовой ввод (Фаза 4) | Native STT (SpeechRecognizer / SFSpeech) |

---

## Быстрый выбор

```text
Нужно только «как приложение на телефоне», UI как на сайте?
  → PWA (уже есть) или TWA для Play Store

Нужны оба Store с минимумом кода, UI = веб?
  → Capacitor remote URL или Flutter WebView (Часть I)

Нужен зал без сети, нативный UX, свой rest timer, HealthKit?
  → Локальный клиент Compose / SwiftUI / Flutter (Часть II)
  → API и sync: docs/native-integration.md
```
