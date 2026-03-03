# Rsbuild Chrome Extension Lazy Loading — полный конспект исследования

## Контекст

Задача: реализовать **ленивую загрузку** (code splitting) внутри content script
Chrome Extension (Manifest V3). Нужна возможность подгружать лениво как React-компоненты,
так и обычные TypeScript/JavaScript модули. Без crxjs, без wxt — чистый бандлер.

## Исследование: Vite vs Rsbuild

### Почему Vite не подошёл

Vite (на базе Rollup) имеет принципиальные ограничения для этого кейса:

1. **Нет runtime publicPath.** `renderBuiltUrl` — экспериментальный API с багами.
   Нет аналога `__webpack_public_path__` для подмены base path в рантайме.
2. **`__vitePreload` обёртка.** Vite заменяет `import()` на свою обёртку с preload-логикой,
   которая ломает пути в контексте расширения.
3. **IIFE не поддерживает code splitting.** Rollup не может генерировать чанки
   для IIFE формата, а content scripts — IIFE.
4. **Каждый `import()` нужно оборачивать вручную** в `chrome.runtime.getURL()` с `/* @vite-ignore */`.

### Почему Rsbuild (Rspack) подошёл

Rsbuild основан на Rspack (Rust-based аналог Webpack):

1. **`chunkLoading: "import"`** — встроенная настройка для загрузки чанков через `import()`.
2. **`chunkFormat: "module"`** — чанки генерируются как ES modules.
3. **`publicPath: "auto"`** — автоматическое определение base path из `import.meta.url`.
4. **Webpack-like `splitChunks`** — полный контроль над разделением кода.
5. **Стандартный `React.lazy(() => import('./Component'))`** — работает без хаков.

## Ключевая проблема и решение

### Три проблемы content scripts

**Проблема 1: Isolated World.**
Content script работает в изолированном JavaScript-контексте. У него общий DOM
со страницей, но отдельные глобальные переменные. `<script>` тег, вставленный в DOM,
выполняется в контексте **страницы**, а не расширения. Поэтому стандартный механизм
загрузки чанков (через `<script>` тег) ломается — чанк не видит Rspack runtime.

**Проблема 2: Classic Script.**
Chrome загружает content scripts из manifest.json как **classic scripts** (не ES modules).
В classic script `import.meta.url` — это SyntaxError. Скрипт не просто вернёт undefined —
он ОТКАЖЕТСЯ ПАРСИТЬСЯ целиком.

**Проблема 3: Relative paths.**
В classic script `import('./foo.js')` резолвится относительно **URL страницы**
(например `https://example.com/foo.js`), а не расширения. Чанки не найдутся.

### Решение: двухступенчатая загрузка (bootstrap pattern)

```
bootstrap.js  (classic script, ~150 байт)
     │
     │  import(chrome.runtime.getURL("/content.js"))
     │  ─── абсолютный URL, не нужно знать "где я" ───
     ▼
content.js  (ES module, ~2.4KB, Rspack runtime)
     │
     │  import.meta.url = "chrome-extension://<id>/content.js"  ← РАБОТАЕТ
     │  import("./chunks/feature-panel.js")  ← резолвит правильно
     ▼
chunks/feature-panel.js  (ES module)
     │
     │  import("./component-heavy-table.js")  ← резолвит правильно
     ▼
chunks/component-heavy-table.js  (ES module)
```

**Как это работает:**

1. Chrome загружает `bootstrap.js` как classic script — ОК, в нём нет `import.meta`.
2. `chrome.runtime.getURL("/content.js")` возвращает абсолютный URL: `chrome-extension://<id>/content.js`.
3. `import(абсолютный_URL)` загружает файл и выполняет его **как ES module** в isolated world.
4. Внутри `content.js` теперь `import.meta.url` работает, и все relative `import()` резолвятся
   относительно `chrome-extension://<id>/` — т.е. внутри расширения.
5. Каждый последующий файл, загруженный через `import()`, тоже становится ES module
   и знает свой адрес. Цепочка продолжается.

**Ключевой инсайт:** `import()` можно вызвать из classic script (это разрешено спецификацией),
но загруженный файл выполняется **как ES module**. Одна строка кода переключает контекст
с classic на ESM, сохраняя isolated world.

### Аналогия

- **ES Module = человек, который знает свой домашний адрес.** Когда он говорит "сосед слева",
  все понимают, о ком речь — потому что известен его адрес.
- **Classic Script = человек с завязанными глазами на чужой улице.** Он не знает где он,
  и "сосед слева" резолвится относительно чужого адреса (URL страницы).
- **Bootstrap = друг, который даёт точный адрес.** `chrome.runtime.getURL()` — абсолютный адрес,
  который не требует знания текущего местоположения.

## Архитектура проекта

### Структура файлов

```
├── public/
│   ├── bootstrap.js             # Classic script → import() → переключение на ESM
│   └── manifest.json            # MV3 manifest (шаблон)
├── scripts/
│   ├── generate-manifest.mjs    # Автообновление web_accessible_resources
│   └── postbuild.mjs            # Удаление лишних HTML + запуск generate-manifest
├── src/
│   ├── content/
│   │   └── index.ts             # ESM entry (загружен bootstrap'ом)
│   ├── features/
│   │   ├── panel.tsx            # React UI panel (lazy)
│   │   ├── scraper.ts           # DOM scraper (lazy, plain TS)
│   │   └── components/
│   │       ├── HeavyTable.tsx   # React.lazy sub-component
│   │       └── Settings.tsx     # React.lazy sub-component
│   └── utils/
│       └── heavy-calc.ts        # Вычисления (lazy, plain TS)
├── env.d.ts                     # Типы для __webpack_public_path__
├── rsbuild.config.ts            # Конфигурация сборки
├── tsconfig.json
└── package.json
```

### Сборка → dist/

```
dist/
├── bootstrap.js                 # Копия из public/ (classic script, manifest entry)
├── content.js                   # Скомпилированный ESM entry + Rspack runtime
├── manifest.json                # С автозаполненными web_accessible_resources
└── chunks/
    ├── feature-panel.js         # React panel (lazy chunk)
    ├── feature-scraper.js       # Plain TS scraper (lazy chunk)
    ├── util-heavy-calc.js       # Plain TS utils (lazy chunk)
    ├── component-heavy-table.js # React.lazy sub-component
    ├── component-settings.js    # React.lazy sub-component
    ├── vendor-react.js          # React + ReactDOM (~185KB)
    └── vendor-lib.js            # Прочие npm-пакеты
```

## Конфигурация Rsbuild

### rsbuild.config.ts — ключевые параметры

```typescript
tools: {
  rspack: (config) => {
    config.output.chunkFilename = "chunks/[name].js";  // чанки в подпапку
    config.output.publicPath = "auto";                  // publicPath из import.meta.url
    config.output.module = true;                        // entry как ES module
    config.output.chunkLoading = "import";              // чанки через import(), не <script>
    config.output.chunkFormat = "module";               // чанки в ESM формате
    config.experiments.outputModule = true;              // включить ESM output
  },
},
```

| Параметр | Что делает | Зачем |
|----------|-----------|-------|
| `chunkFilename: "chunks/[name].js"` | Чанки в подпапку chunks/ | Организация, легче прописывать в manifest |
| `publicPath: "auto"` | Base path из import.meta.url | Автоматически получает chrome-extension://\<id\>/ |
| `module: true` | Entry — ES module | bootstrap загружает его через import() |
| `chunkLoading: "import"` | Чанки грузятся через import() | \<script\> тег выполнился бы в контексте страницы |
| `chunkFormat: "module"` | Чанки в формате ESM | import() ожидает ES module |
| `experiments.outputModule` | Включает ESM output | Требуется для chunkFormat: "module" |
| `filenameHash: false` | Без хэшей в именах | Стабильные имена для web_accessible_resources |
| `splitChunks.chunks: "async"` | Разделять только dynamic import | Entry остаётся самодостаточным |

### manifest.json — ключевые секции

```json
{
  "content_scripts": [{
    "js": ["bootstrap.js"],        // ← bootstrap, не content.js!
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": [
      "content.js",                // ← обязателен! bootstrap грузит его через import()
      "chunks/*.js"                // ← все чанки
    ],
    "matches": ["<all_urls>"],
    "use_dynamic_url": false       // true только для Chrome 130+
  }]
}
```

### bootstrap.js

```javascript
(async () => {
  try {
    await import(chrome.runtime.getURL("/content.js"));
  } catch (err) {
    console.error("[Extension Bootstrap] Failed to load content module:", err);
  }
})();
```

### src/content/index.ts — entry point

```typescript
// Загружается как ES module через bootstrap.js
// import.meta.url = chrome-extension://<id>/content.js
// Все relative import() резолвятся в chrome-extension://<id>/...

async function loadPanel(): Promise<void> {
  const { mountPanel } = await import(
    /* webpackChunkName: "feature-panel" */
    "../features/panel"
  );
  mountPanel();
}

async function loadScraper() {
  const { scrapePageData } = await import(
    /* webpackChunkName: "feature-scraper" */
    "../features/scraper"
  );
  return scrapePageData();
}

// ...стандартный dynamic import, никаких хаков
```

## Пять необходимых компонентов

Убери любой — и всё ломается:

1. **bootstrap.js** — переключает контекст classic → ESM
2. **chunkLoading: "import"** — чанки через import(), а не \<script\>
3. **chunkFormat: "module"** — чанки в ESM формате для import()
4. **publicPath: "auto"** — base path из import.meta.url
5. **web_accessible_resources** — разрешение Chrome на загрузку файлов расширения

## Сравнение: обычное веб-приложение vs Chrome Extension

| Аспект | Обычное SPA | Chrome Extension Content Script |
|--------|------------|-------------------------------|
| Entry загружается как | Classic script (\<script\>) | Classic → import() → ES module |
| Чанки грузятся через | \<script\> тег (jsonp) | import() |
| Isolated world | Нет | Да — два JS-контекста |
| Relative пути import() | Относительно HTML | Относительно модуля (chrome-extension://) |
| publicPath | Статический (`/`) | Динамический из import.meta.url |
| web_accessible_resources | Не нужен | Обязателен для каждого чанка |
| React.lazy | Работает из коробки | Работает благодаря bootstrap pattern |
| Plain TS lazy import | Работает из коробки | Работает благодаря bootstrap pattern |

## Скрипты сборки

```bash
npm install        # установка зависимостей
npm run build      # сборка + postbuild (удаление HTML, обновление manifest)
npm run dev        # watch mode (пишет файлы на диск для Chrome)
```

`npm run build` выполняет:
1. `rsbuild build` — компиляция TS/TSX → JS, code splitting
2. `postbuild.mjs` — удаляет лишние HTML файлы от Rsbuild
3. `generate-manifest.mjs` — сканирует dist/chunks/, прописывает файлы в manifest.json

## Проверено

- Chrome 130+ (use_dynamic_url: true поддерживается)
- React 19 + ReactDOM 19
- Rsbuild 1.7.3 / Rspack
- TypeScript 5.8
- Manifest V3
- Два уровня lazy loading: `import()` + `React.lazy()` внутри lazy-модуля
- Lazy loading как React-компонентов, так и plain TypeScript модулей
