# Rsbuild Chrome Extension — Lazy Loading Config

Референсная конфигурация для **ленивой загрузки (code splitting)** в content script Chrome Extension.
Rsbuild + bootstrap pattern, без crxjs/wxt.

## Архитектура

```
bootstrap.js (classic script, manifest entry, ~150B)
  │
  └─ import(chrome.runtime.getURL('/content.js'))
       │
       content.js (ESM module, Rspack runtime, ~2.4KB)
         │
         ├─ import() → feature-panel.js    ← React UI (lazy)
         │              ├─ React.lazy() → component-heavy-table.js
         │              └─ React.lazy() → component-settings.js
         │
         ├─ import() → feature-scraper.js  ← plain TypeScript (lazy)
         │
         └─ import() → util-heavy-calc.js  ← plain TypeScript (lazy)

         vendor-react.js                   ← react + react-dom (async chunk)
         vendor-lib.js                     ← other npm packages (async chunk)
```

### Двухступенчатая загрузка (ключевое решение)

Content scripts в Chrome загружаются как **classic scripts** (не ESM modules).
Это создаёт две проблемы:

1. `import.meta.url` недоступен — нельзя автоматически определить publicPath
2. Relative `import()` резолвится относительно **URL страницы**, а не расширения

Решение: `bootstrap.js` (classic) загружает `content.js` через
`import(chrome.runtime.getURL('/content.js'))`. После этого `content.js`
выполняется как ESM module, где `import.meta.url` корректно возвращает
`chrome-extension://<id>/content.js` и все relative imports работают.

### Почему Rsbuild, а не Vite?

- `chunkLoading: 'import'` + `chunkFormat: 'module'` — чанки загружаются через
  `import()` в isolated world, а не через `<script>` тег (который выполняется
  в контексте страницы)
- Rspack ecosystem (`webpack-target-webextension`) совместим
- Webpack-like `splitChunks` для точного контроля code splitting

### CSS Modules и Shadow DOM

Файлы `*.module.css` обрабатываются как **CSS Modules**: импорт `import styles from './X.module.css'` даёт объект с хешированными именами классов.

**Проблема Shadow DOM:** стили в `document.head` не применяются к содержимому `attachShadow()`, изоляция обрезает каскад.

**Решение в этом репозитории:**

1. В [`rsbuild.config.ts`](rsbuild.config.ts) включён `output.injectStyles: true` — стили не извлекаются в отдельные `.css` в `dist/chunks/`, а встраиваются в JS и вставляются в runtime через `<style>` (style-loader).

2. В `tools.styleLoader` задана **кастомная `insert`**: каждый `<style>` помечается атрибутом `data-ext`, добавляется в `document.head` и **дублируется** во все зарегистрированные shadow roots (см. `window.__extShadowRoots`).

3. Утилита [`src/utils/shadow-style.ts`](src/utils/shadow-style.ts): после `attachShadow({ mode: "open" })` вызови `registerShadowRoot(shadow)` — root попадает в реестр и получает **клоны** всех уже вставленных `style[data-ext]` из `document.head`. Новые чанки с CSS по мере загрузки снова проходят через `insert` и попадают и в head, и во все зарегистрированные корни.

Итог: **обычная разметка в документе** и **UI внутри shadow** получают одни и те же CSS Module стили без отдельного API для каждого файла.

```mermaid
flowchart TB
    CSSModule["import styles from './X.module.css'"]
    CSSModule --> StyleLoader["style-loader: custom insert()"]
    StyleLoader --> Head["document.head — обычный DOM"]
    StyleLoader --> ShadowRoots["shadow roots — изолированный UI"]
    NewShadow["registerShadowRoot()"] -->|"клонирует style[data-ext] из head"| ShadowRoots
```

### Скрипты пост-обработки (`scripts/`)

Rsbuild — универсальный веб-бандлер, а не специализированный инструмент для
расширений. После сборки нужно привести `dist/` в вид, который примет Chrome:

**`postbuild.mjs`** — оркестратор, запускается автоматически после `rsbuild build`
через цепочку в `package.json` (`rsbuild build && node scripts/postbuild.mjs`):

1. Удаляет `*.html` из `dist/` — Rsbuild генерирует HTML для каждого entry point,
   но content script не имеет собственной страницы, эти файлы не нужны.
2. Вызывает `generate-manifest.mjs`.

**`generate-manifest.mjs`** — обновляет `web_accessible_resources` в
`dist/manifest.json` реальными именами чанков. Chrome Manifest V3 **не
поддерживает glob-паттерны** (`chunks/*.js`) — каждый файл нужно перечислить
явно. Скрипт сканирует `dist/chunks/`, собирает все найденные `.js` / `.css` /
`.wasm` файлы и записывает их в манифест (при `injectStyles: true` в чанках
обычно только `.js`). Без этого шага динамические `import()` чанков
будут заблокированы браузером.

```mermaid
flowchart LR
    A["npm run build"] --> B["rsbuild build"]
    B --> C["postbuild.mjs"]
    C --> D["Удалить *.html из dist/"]
    C --> E["generate-manifest.mjs"]
    E --> F["Сканировать dist/chunks/"]
    F --> G["Записать реальные имена в dist/manifest.json"]
```

## Быстрый старт

```bash
npm install
npm run build
```

### Загрузка в Chrome

1. `chrome://extensions/` → Developer mode ON
2. "Load unpacked" → выбрать папку `dist/`
3. Открыть любую страницу → в Console увидишь `[ContentScript] Module loaded via bootstrap`
4. В console вызвать `__extLoadPanel()` для загрузки React панели

## Добавление нового lazy модуля

1. Создай файл в `src/features/` или `src/utils/`
2. Импортируй через `import()` в `src/content/index.ts`:
   ```ts
   const { myFunction } = await import(
     /* webpackChunkName: "feature-my-thing" */
     "../features/my-thing"
   );
   ```
3. Пересобери: `npm run build`

Для стилей компонента создай рядом `*.module.css` и импортируй как обычно; если
рендер идёт внутри shadow, не забудь `registerShadowRoot(shadow)` до монтирования
React (см. `mountPanel` в `panel.tsx`).

## Структура проекта

```
├── public/
│   ├── bootstrap.js           # Classic script entry (loaded by manifest)
│   └── manifest.json          # Extension manifest template
├── scripts/
│   ├── generate-manifest.mjs  # Auto-update web_accessible_resources
│   └── postbuild.mjs          # Clean HTML + run generate-manifest
├── src/
│   ├── content/
│   │   └── index.ts           # ESM module entry (loaded by bootstrap)
│   ├── features/
│   │   ├── panel.tsx          # React UI panel (lazy), Shadow DOM mount
│   │   ├── panel.module.css   # Panel + tabs + error boundary styles
│   │   ├── scraper.ts         # DOM scraper (lazy, plain TS)
│   │   └── components/
│   │       ├── HeavyTable.tsx       # Sub-component (React.lazy)
│   │       ├── HeavyTable.module.css
│   │       ├── Settings.tsx         # Sub-component (React.lazy)
│   │       └── Settings.module.css
│   └── utils/
│       ├── heavy-calc.ts      # Heavy computations (lazy, plain TS)
│       └── shadow-style.ts    # registerShadowRoot / unregisterShadowRoot
├── env.d.ts
├── rsbuild.config.ts
├── tsconfig.json
└── package.json
```
