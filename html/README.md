# HTML-версия интерфейса (без сборки)

Полная standalone-версия рабочего пространства: **все страницы и все опции**,
как в Next.js-приложении (`src/app/dashboard.tsx`, `src/components/reputation-hub.tsx`,
`src/components/widget-drawer.tsx`, `public/widget.js`), но одним обычным HTML —
без Node, без сборки, без базы данных.

## Как открыть

1. Дважды кликнуть `index.html` (работает прямо с диска), **или**
2. раздать папку любым статическим сервером:
   ```bash
   python3 -m http.server 4173 --bind 0.0.0.0 --directory html
   # → http://localhost:4173
   ```

Файлы:

| Файл        | Что внутри                                                        |
| ----------- | ----------------------------------------------------------------- |
| `index.html`| Каркас: шапка, боковое меню, контейнеры страницы и панелей        |
| `styles.css`| Стили (`globals.css` + `reputation.css` + утилиты из dashboard.tsx)|
| `app.js`    | Данные-демо, состояние, все страницы, панели и обработчики        |

## Страницы

Overview · All reviews · Publication queue · Moderation · Review authors ·
Domains and channels · Team · **Business reputation** · Invitations and reminders ·
Analytics · Widgets & Embed SDK · Settings.

Панели: предпросмотр виджета (Feed / Form / Badge / All-in-one / After submission),
действия по отзыву, редактор текста напоминания, добавление отзыва.

## Что учтено из последних правок

- **«No neutral ratings» убран** — в Business reputation → Reviews осталась только
  подсказка, если у уровня нет ни одной звезды.
- **В напоминаниях колонка называется «Time»** (было «Number»), подпись — «The time and
  unit set the delay…».
- **Разрешённые домены виджета** — Business reputation → Protection & Settings →
  «Widget domains»: основной домен + список дополнительных (`*.example.com` — все
  поддомены). Список показывается на странице Widgets, в Domains and channels и в
  панели предпросмотра.
- **Стандартное «спасибо» по уровням после отправки** — в песочнице виджета после
  Submit форма заменяется экраном благодарности: для позитива — приглашение в Google,
  для нейтрала/негатива — кнопки «Email customer support» / «Chat with support».
  Тот же экран доступен в панели предпросмотра на вкладке «After submission».

Данные демо хранятся в памяти вкладки: перезагрузка страницы возвращает исходное состояние.

## Проверка

```bash
node scripts/check-html-prototype.cjs   # 44 проверки через jsdom
```
