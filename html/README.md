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

Навигация приложения: Overview · All reviews · Publication queue ·
**Install the widget** · Moderation · Review authors · Domains and channels ·
Team · **Business reputation** · Invitations and reminders · Analytics and
reports · Widgets and embed code · Feedback and QR code.

Страница **Install the widget** (сразу после Publication queue) — пошаговая
инструкция по установке виджета: разрешённые домены, выбор блока, код вставки с
кнопкой копирования, проверка результата, разбор ошибок и публичный API.

Панели: действия по отзыву (`dialog.side-panel`), предпросмотр виджета
(Review feed / Review form / Rating badge / All-in-one), редактор напоминаний,
добавление отзыва.

**Business reputation → Review form** — настройка формы: разрешение фото
(`Allow photos in reviews`), количество фото на отзыв и максимальный размер,
анонимность, обязательный текст, минимальная длина. Кнопка **Widget preview**
стоит рядом с `Save changes` в нижней панели и на странице Settings.

**Отзывы с фото и от имени сотрудника.** В форме (и в песочнице, и в виджете)
можно прикрепить фото: картинка сжимается в браузере до лимита проекта и
сохраняется вместе с отзывом, показывается в панели отзыва и в ленте виджета.
Модалка **Add review** спрашивает, кто автор — клиент или сотрудник, — и всегда
пишет, кто добавил отзыв (`Added by`); такие отзывы помечаются в списке.

Данные демо живут в памяти вкладки: перезагрузка возвращает исходное состояние.

## Проверка

```bash
npm run check
# 22 (домены) + 30 (фото) + 23 (репутация) + 47 (HTML-версия) проверок
```

Проверка загружает закоммиченный бандл, открывает панель действий и сравнивает её
со статической разметкой самого компонента приложения
(`renderToStaticMarkup(<ReviewActionsDrawer …/>)`) — совпадать должны группы,
строки действий, их подписи, подсказки, классы и состояние `disabled`.
Плюс новые возможности: фото в панели отзыва, отзыв от сотрудника с `Added by`,
настройка формы (включая разрешение фото), кнопка Widget preview рядом с
`Save changes`, страница установки виджета — и регрессии: «No neutral ratings»
отсутствует, в напоминаниях колонка «Time», экран благодарности по уровням
показывается после отправки формы.
