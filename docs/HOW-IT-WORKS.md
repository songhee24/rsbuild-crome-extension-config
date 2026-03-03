# Как работает ленивая загрузка в Content Script Chrome Extension

## Часть 1: Classic Script vs ES Module — фундаментальная разница

### Что такое Classic Script

Classic script — это обычный JavaScript, который браузеры выполняют с 1995 года.
Когда ты пишешь:

```html
<script src="app.js"></script>
```

Браузер загружает `app.js` и выполняет его. У этого скрипта:

- **Нет собственного URL-контекста.** Скрипт "не знает", откуда он загружен. Переменная `import.meta` не существует — это SyntaxError.
- **`import()` резолвит пути относительно HTML-страницы.** Если ты на `https://example.com/blog/post.html` и скрипт вызовет `import('./utils.js')`, браузер попытается загрузить `https://example.com/blog/utils.js` — относительно страницы, а не скрипта.
- **Нет `import`/`export`.** Нельзя написать `export function foo()` — это SyntaxError.
- **Переменные попадают в глобальную область.** `var x = 5` создаёт `window.x`.

### Что такое ES Module

ES Module (ESM) — стандарт модулей JavaScript, появившийся в ES2015 (ES6).
В браузере загружается через:

```html
<script type="module" src="app.js"></script>
```

Или через динамический `import()`:

```js
const module = await import('https://example.com/app.js');
```

У ES Module принципиально другое поведение:

- **Есть собственный URL.** Каждый модуль "знает" свой адрес через `import.meta.url`. Если модуль загружен из `https://cdn.com/lib/utils.js`, то `import.meta.url === "https://cdn.com/lib/utils.js"`.
- **`import()` резолвит пути относительно МОДУЛЯ, а не страницы.** Если модуль лежит в `https://cdn.com/lib/utils.js` и вызовет `import('./helpers.js')`, браузер загрузит `https://cdn.com/lib/helpers.js` — относительно модуля, не страницы.
- **Есть `import`/`export`.** `export function foo()` — валидный синтаксис.
- **Изолированная область видимости.** Переменные не утекают в `window`.

### Сравнение на примере

```
Страница:      https://example.com/blog/post.html
Скрипт лежит:  https://cdn.com/scripts/app.js
Скрипт вызывает: import('./chunk.js')

Classic Script:  браузер грузит https://example.com/blog/chunk.js   ← относительно СТРАНИЦЫ
ES Module:       браузер грузит https://cdn.com/scripts/chunk.js    ← относительно МОДУЛЯ
```

Это ключевое отличие. Запомни его — на нём строится всё решение.


## Часть 2: Как Chrome загружает Content Scripts

### Content Script — это Classic Script

Когда в `manifest.json` написано:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["bootstrap.js"]
  }]
}
```

Chrome делает эквивалент:

```
1. Находит файл bootstrap.js в пакете расширения
2. Создаёт "isolated world" — отдельный JavaScript-контекст
3. Выполняет bootstrap.js в этом контексте КАК CLASSIC SCRIPT
```

Chrome **не** делает `<script type="module">`. Он не поддерживает ESM для content scripts
в manifest.json. Это ограничение платформы.

### Isolated World — отдельный мир

Isolated world — это отдельный JavaScript-контекст. Представь два параллельных мира,
которые видят одну и ту же комнату (DOM), но не видят друг друга:

```
┌─────────────────────────────────────────────┐
│  Web Page  (https://example.com)            │
│                                             │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │ Page World   │    │ Extension World   │  │
│  │              │    │ (isolated)        │  │
│  │ window.x = 1 │    │ window.x = ???    │  │
│  │              │    │ (undefined)       │  │
│  │ Свои перемен-│    │ Свои перемен-     │  │
│  │ ные, свой JS │    │ ные, свой JS      │  │
│  └──────┬───────┘    └──────┬────────────┘  │
│         │                   │               │
│         └───────┬───────────┘               │
│                 │                           │
│          ┌──────┴──────┐                    │
│          │  Общий DOM  │                    │
│          └─────────────┘                    │
└─────────────────────────────────────────────┘
```

Оба мира:
- **Видят** один и тот же `document.body`, `document.querySelector` и т.д.
- **НЕ видят** переменные друг друга. `window.myVar` в Page World — это не то же самое, что `window.myVar` в Extension World.


## Часть 3: Почему стандартная загрузка чанков ломается

### Как бандлер обычно грузит чанки в веб-приложении

В обычном веб-приложении Rspack/Webpack грузит чанки через `<script>` тег:

```js
// Упрощённый код Rspack runtime
function loadChunk(chunkId) {
  const script = document.createElement('script');
  script.src = publicPath + 'chunks/feature-panel.js';
  document.head.appendChild(script);
  // Скрипт загрузится и выполнится
}
```

В обычном веб-приложении это работает отлично:

```
1. Rspack runtime создаёт <script src="/chunks/feature-panel.js">
2. Браузер загружает файл
3. Файл выполняется В ТОМ ЖЕ контексте, где Rspack runtime
4. Чанк вызывает webpackJsonpCallback() — регистрирует себя в runtime
5. Всё работает
```

### Почему это ломается в Content Script

В Chrome Extension с isolated world шаг 3 — катастрофа:

```
Extension World (isolated):
  └─ Rspack runtime живёт тут
  └─ webpackJsonpCallback определён тут
  └─ Создаёт <script src="chrome-extension://id/chunks/panel.js">

              │ <script> тег вставляется в DOM
              ▼

Общий DOM:
  └─ <script src="chrome-extension://id/chunks/panel.js">

              │ Браузер выполняет скрипт, но В КАКОМ контексте?
              ▼

Page World (НЕ Extension World!):
  └─ chunks/panel.js выполняется ТУТ
  └─ Вызывает webpackJsonpCallback()
  └─ Но webpackJsonpCallback НЕ СУЩЕСТВУЕТ в Page World!
  └─ ❌ ReferenceError или молчаливый провал
```

**`<script>` тег, вставленный в DOM, ВСЕГДА выполняется в Page World.**
Это не баг — это by design. DOM принадлежит странице, и скрипты в DOM
выполняются в контексте страницы. Isolated world расширения — отдельная песочница,
в которую DOM-скрипты не попадают.

### А что насчёт `import()`?

`import()` (динамический импорт) — ведёт себя иначе:

```
Extension World (isolated):
  └─ Rspack runtime живёт тут
  └─ Вызывает import("chrome-extension://id/chunks/panel.js")

              │ import() выполняется ВНУТРИ Extension World
              ▼

Extension World (тот же!):
  └─ chunks/panel.js загружается и выполняется ТУТ ЖЕ
  └─ Регистрирует себя в Rspack runtime
  └─ ✅ Всё работает
```

**`import()` выполняет загруженный модуль В ТОМ ЖЕ контексте, откуда был вызван.**
Это принципиальное отличие от `<script>` тега. Именно поэтому в конфиге стоит
`chunkLoading: "import"`, а не дефолтный `"jsonp"` (который использует `<script>`).


## Часть 4: Проблема курицы и яйца — и как Bootstrap её решает

### Суть проблемы

Нам нужно:
1. Чтобы Rspack грузил чанки через `import()` — для этого entry должен быть ES module
2. Чтобы `import.meta.url` работал в entry — для этого entry должен быть ES module
3. Чтобы relative `import()` пути резолвились относительно расширения — для этого entry должен быть ES module

Но Chrome загружает content scripts как **classic scripts**. Мы не можем указать в
manifest.json "загрузи это как module" — Chrome этого не поддерживает.

Это проблема курицы и яйца: нам нужен ES module, но Chrome даёт только classic script.

### Как bootstrap.js решает проблему

```js
// bootstrap.js — classic script, 3 строки логики
(async () => {
  try {
    await import(chrome.runtime.getURL("/content.js"));
  } catch (err) {
    console.error("[Extension Bootstrap] Failed to load content module:", err);
  }
})();
```

Разберём по шагам:

**Шаг 1: `chrome.runtime.getURL("/content.js")`**

Эта функция Chrome API возвращает полный URL файла внутри расширения:

```
Вход:  "/content.js"
Выход: "chrome-extension://lckecnjiipbomefcengnbfcakcicgflb/content.js"
```

ID расширения (`lckecnjiipbomefcengnbfcakcicgflb`) уникален и генерируется Chrome.
Мы не можем хардкодить его — он меняется. `chrome.runtime.getURL` решает эту проблему.

**Шаг 2: `import("chrome-extension://lckecnjiipbomefcengnbfcakcicgflb/content.js")`**

Вот где происходит магия. Разберём что делает `import()`:

1. **`import()` можно вызвать из classic script.** Это явно разрешено спецификацией
   ECMAScript. В отличие от `import.meta` (module-only) и `import ... from` (module-only),
   `import()` — это выражение, которое работает везде.

2. **`import()` загружает целевой файл КАК ES MODULE.** Независимо от того,
   откуда вызван `import()`, загруженный файл выполняется в режиме ES module.
   Это значит, что внутри `content.js`:
   - `import.meta.url` работает
   - `import`/`export` работают
   - Область видимости изолирована

3. **`import()` выполняет файл в том же контексте (world).** Поскольку `import()`
   вызван из Extension World (isolated world content script'а), `content.js`
   тоже выполняется в Extension World.

4. **Relative пути внутри загруженного модуля резолвятся относительно его URL.**
   `content.js` загружен из `chrome-extension://...id.../content.js`.
   Значит `import("./chunks/foo.js")` внутри него резолвится в
   `chrome-extension://...id.../chunks/foo.js`. Именно то, что нужно.

**Шаг 3: Что происходит после `import()`**

```
Chrome загружает bootstrap.js (classic script, Extension World)
    │
    │  import("chrome-extension://id/content.js")
    │
    ▼
Chrome загружает content.js (ES MODULE, Extension World)
    │
    │  import.meta.url = "chrome-extension://id/content.js"  ← РАБОТАЕТ
    │  import("./chunks/feature-panel.js")                    ← резолвит правильно
    │
    ▼
Chrome загружает chunks/feature-panel.js (ES MODULE, Extension World)
    │
    │  import.meta.url = "chrome-extension://id/chunks/feature-panel.js"
    │  import("./components/HeavyTable")                      ← резолвит правильно
    │
    ▼
Chrome загружает chunks/component-heavy-table.js (ES MODULE, Extension World)
```

Каждый последующий `import()` наследует свойства:
- Выполнение в Extension World (isolated)
- Собственный `import.meta.url`
- Relative пути резолвятся относительно модуля

**Одна строка кода (`import(chrome.runtime.getURL("/content.js"))`) переключает
весь контекст выполнения с Classic Script на ES Module, сохраняя isolated world.**


## Часть 5: Сравнение — обычное веб-приложение vs наш случай

### Обычное веб-приложение (SPA)

```
index.html
  └─ <script src="/app.js">            ← entry, classic script
       └─ Rspack runtime
       └─ Чанки грузятся через <script> тег
       └─ <script src="/chunks/page.js">  ← создаётся динамически
            └─ Выполняется в том же контексте (нет isolated world)
            └─ Регистрируется в Rspack runtime
            └─ ✅ Работает
```

Почему работает: нет isolated world. Один контекст, один `window`. `<script>` тег
выполняется там же, где живёт runtime.

### Chrome Extension Content Script (наш случай)

```
manifest.json → content_scripts → bootstrap.js
  └─ bootstrap.js (classic script, Extension World)
       └─ import(chrome.runtime.getURL('/content.js'))
            └─ content.js (ES MODULE, Extension World)
                 └─ Rspack runtime
                 └─ Чанки грузятся через import()
                 └─ import('./chunks/page.js')
                      └─ Выполняется в Extension World (тот же контекст!)
                      └─ Регистрируется в Rspack runtime
                      └─ ✅ Работает
```

Ключевые отличия:

| Аспект | Обычное веб-приложение | Chrome Extension |
|--------|----------------------|------------------|
| Entry загружается как | Classic script (`<script>`) | Classic script (manifest) → import() → ES module |
| Чанки грузятся через | `<script>` тег (jsonp) | `import()` |
| Есть isolated world | Нет | Да |
| Relative пути | Относительно HTML-страницы | Относительно модуля (chrome-extension://) |
| publicPath | Статический (`/`, `/assets/`) | Динамический из `import.meta.url` |
| `web_accessible_resources` | Не нужен | Обязателен для каждого чанка |


## Часть 6: web_accessible_resources — контроль доступа

По умолчанию файлы расширения **недоступны** извне. Никто не может загрузить
`chrome-extension://id/secret.js` — ни страница, ни content script.

Когда `content.js` делает `import("./chunks/feature-panel.js")`, это фактически
запрос к `chrome-extension://id/chunks/feature-panel.js`. Chrome проверяет:

```
Запрос к: chrome-extension://id/chunks/feature-panel.js
Откуда:   content script на https://example.com

Chrome проверяет manifest.json → web_accessible_resources:
  "resources": ["content.js", "chunks/feature-panel.js", ...]
  "matches": ["<all_urls>"]

Файл в списке? → Да → Разрешить загрузку
                  Нет → Заблокировать (ошибка в консоли)
```

Поэтому скрипт `generate-manifest.mjs` после каждой сборки сканирует `dist/chunks/`
и автоматически прописывает все чанки в manifest — чтобы ни один не пропал.


## Часть 7: Конфигурация Rsbuild — зачем каждый параметр

### `chunkLoading: "import"`

Говорит Rspack: "когда нужно загрузить чанк, используй `import()`, а не `<script>` тег".

- По умолчанию: `"jsonp"` — создаёт `<script>` тег → ломается в isolated world
- Наша настройка: `"import"` — вызывает `import()` → работает в isolated world

### `chunkFormat: "module"`

Говорит Rspack: "генерируй чанки в формате ES module (с `export`)".

Нужен потому что `import()` ожидает ES module. Если чанк будет в формате
`array-push` (jsonp callback), `import()` его не поймёт.

### `output.module: true`

Говорит Rspack: "генерируй entry тоже как ES module".

Нужен потому что `bootstrap.js` загружает `content.js` через `import()`,
и `content.js` должен быть валидным ES module.

### `experiments.outputModule: true`

Включает поддержку ESM output в Rspack. Без этого флага `chunkFormat: "module"`
и `output.module: true` не работают — это экспериментальная фича.

### `publicPath: "auto"`

Говорит Rspack: "определи publicPath автоматически в runtime из `import.meta.url`".

В скомпилированном коде это превращается в:

```js
let url = import.meta.url;
// "chrome-extension://lckecnjiipbomefcengnbfcakcicgflb/content.js"

publicPath = url.replace(/\/[^\/]+$/, "/");
// "chrome-extension://lckecnjiipbomefcengnbfcakcicgflb/"
```

Без `"auto"` пришлось бы хардкодить путь, что невозможно (ID расширения динамический).

### `filenameHash: false`

По умолчанию бандлеры добавляют хэш к именам: `feature-panel.a3b2c1.js`.
В расширении это создаёт проблему: имена файлов нужно знать заранее для
`web_accessible_resources`. Без хэшей имена стабильны: `feature-panel.js`.

### `splitChunks.chunks: "async"`

Говорит: "разделяй на чанки только код, загружаемый через `import()`
(async/динамический импорт)". Синхронные `import ... from` остаются в entry.

Это гарантирует что `content.js` — самодостаточный файл с Rspack runtime,
а отдельные чанки создаются только для lazy imports.


## Часть 8: Что будет если убрать bootstrap.js?

Без bootstrap, Chrome загрузит `content.js` напрямую как classic script:

```json
{
  "content_scripts": [{
    "js": ["content.js"]   ← загружен как classic script
  }]
}
```

Что произойдёт:

1. `import.meta.url` → **SyntaxError**. `import.meta` — syntax, недопустимый
   в classic scripts. Скрипт не просто вернёт `undefined` — он ОТКАЖЕТСЯ
   ПАРСИТЬСЯ целиком. Ни одна строка кода не выполнится.

2. Даже если бы `import.meta` работал, `import("./chunks/panel.js")` резолвился бы
   в `https://example.com/chunks/panel.js` — файл на сервере example.com,
   которого не существует.

3. Даже если бы пути были правильными, без `web_accessible_resources` Chrome
   заблокировал бы загрузку.

Три уровня защиты, и все три ломаются без bootstrap.


## Итого: минимально необходимые компоненты

```
1. bootstrap.js          — переключает контекст classic → ESM
2. chunkLoading: "import" — чанки через import(), а не <script>
3. chunkFormat: "module"  — чанки в ESM формате
4. publicPath: "auto"     — путь из import.meta.url
5. web_accessible_resources — разрешение на загрузку файлов
```

Убери любой из этих пяти элементов — и всё рассыпается.
Вместе они образуют цепочку, где каждый решает конкретную проблему,
а bootstrap.js — первое звено, без которого остальные четыре бесполезны.
