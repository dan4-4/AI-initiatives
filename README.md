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

## Docker

```bash
# .env.local уже должен содержать AI_API_KEY и остальные переменные
docker compose up --build -d
```

Приложение: [http://localhost:3000](http://localhost:3000).  
История (SQLite) и загруженный реестр сохраняются в volume `ai_initiatives_data`.

Проверка: `curl -s http://localhost:3000/api/health`

Без compose:

```bash
docker build -t ai-initiatives .
docker run --rm -p 3000:3000 --env-file .env.local -v ai_data:/app/data ai-initiatives
```

## Конфигурация

| Переменная | Описание |
|---|---|
| `AI_API_KEY` | JWT-токен Нейрошлюза |
| `AI_BASE_URL` | `https://ai.rt.ru/api/1.0` |
| `AI_MODEL` | Например `Qwen/Qwen3-Next-80B-A3B-Instruct-FP8` |
| `AI_CHAT_PATH` | `/lleopold/chatMulti` |
| `REGISTRY_PATH` | Путь к Excel-реестру |

Реестр по умолчанию: `ai-initiatives-2026-08-21.xlsx` (лист «Инициативы»).
История паспортов: SQLite `data/app.db` (в Docker — volume). Загрузка реестра из UI: `data/registry-current.xlsx`.

## Стек

Next.js (App Router), TypeScript, Tailwind CSS, SheetJS (`xlsx`), Нейрошлюз RT.
