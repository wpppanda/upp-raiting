# HTML-версия интерфейса

Полная standalone-версия рабочего пространства — **те же страницы и те же опции**,
что и в Next.js-приложении, потому что это **не переписанный руками прототип,
а собранные из исходников приложения артефакты**:

```bash
npm run build:html
# html/app.css       ← src/app/globals.css (+ reputation.css) через Tailwind
# html/app.bundle.js ← html/entry.tsx → src/app/dashboard.tsx и все его компоненты
```

Разметка панелей, таблиц, виджета и экранов берётся напрямую из
`src/app/dashboard.tsx`, `src/components/side-panel.tsx`,
`src/components/review-actions.tsx`, `src/components/review-actions-drawer.tsx`,
`src/components/reputation-hub.tsx`, `src/components/widget-drawer.tsx`,
а стили — из `src/app/globals.css`. Поэтому вёрстка не может «разъехаться»
с приложением: она и есть вёрстка приложения.

## Как открыть

1. Дважды кликнуть `index.html` (работает прямо с диска), **или**
2. раздать папку любым статическим сервером:
   ```bash
   python3 -m http.server 4173 --bind 0.0.0.0 --directory html
   # → http://localhost:4173
   ```

| Файл              | Что внутри                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| `index.html`      | Оболочка: тот же `<body class="antialiased min-h-screen">`, что в `layout.tsx`  |
| `app.css`         | Скомпилированный `globals.css` + `reputation.css` + утилиты Tailwind (**генерируется**) |
| `app.bundle.js`   | React + компоненты приложения (**генерируется**)                                |
| `demo-data.js`    | Демо-данные и in-memory замена API-роутов (руками правится только он)           |
| `entry.tsx`       | Точка входа сборки: монтирует `<Dashboard initialData={window.__UPP_DEMO__} />` |
| `fonts/`          | Montserrat (variable, latin, OFL-1.1) — тот же файл, что и в `public/fonts/`    |

`app.css` и `app.bundle.js` закоммичены, чтобы папку можно было открыть без Node;
после правок в `src/` их нужно пересобрать и закоммитить (`npm run check` падает,
если они устарели).

## Страницы и панели

Навигация приложения: Overview · All reviews · Publication queue · Moderation ·
Review authors · Domains and channels · Team · **Business reputation** ·
Invitations and reminders · Analytics and reports · Widgets and embed code ·
Feedback and QR code.

Панели: действия по отзыву (`dialog.side-panel`), предпросмотр виджета
(Review feed / Review form / Rating badge / All-in-one), редактор напоминаний,
добавление отзыва. Данные демо живут в памяти вкладки: перезагрузка возвращает
исходное состояние.

## Проверка

```bash
npm run check:html
# 1) сборка актуальна относительно src/  2) 29 проверок в jsdom
```

Проверка загружает закоммиченный бандл, открывает панель действий и сравнивает её
со статической разметкой самого компонента приложения
(`renderToStaticMarkup(<ReviewActionsDrawer …/>)`) — совпадать должны группы,
строки действий, их подписи, подсказки, классы и состояние `disabled`.
Плюс регрессии: «No neutral ratings» отсутствует, в напоминаниях колонка «Time»,
экран благодарности по уровням показывается после отправки формы.
