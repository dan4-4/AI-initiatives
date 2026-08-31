# ИИ Оценка ИИ инициатив

Веб-сервис для оценки идей: форма ввода → поиск похожих инициатив в Excel-реестре → анализ через LLM → паспорт инициативы. Успешные паспорта сохраняются в локальную историю.

## Быстрый старт

```bash
cp .env.example .env.local
# заполните AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_CHAT_PATH

npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Конфигурация

| Переменная | Описание |
|---|---|
| `AI_API_KEY` | JWT-токен Нейрошлюза |
| `AI_BASE_URL` | `https://ai.rt.ru/api/1.0` |
| `AI_MODEL` | Например `Qwen/Qwen3-Next-80B-A3B-Instruct-FP8` |
| `AI_CHAT_PATH` | `/lleopold/chatMulti` |
| `REGISTRY_PATH` | Путь к Excel-реестру |

Реестр по умолчанию: `ai-initiatives-2026-08-21.xlsx` (лист «Инициативы»).
История паспортов: `data/passport-history.json` (локально, не коммитится).

## Стек

Next.js (App Router), TypeScript, Tailwind CSS, SheetJS (`xlsx`), Нейрошлюз RT.
