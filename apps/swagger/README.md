# Flowza Swagger

Отдельная Swagger-страница для уже готовых backend-эндпоинтов Flowza.

## Запуск

```bash
pnpm --filter swagger dev
```

По умолчанию Swagger UI будет доступен на `http://localhost:5175`.

## Переключение backend URL

По умолчанию Swagger использует `http://localhost:3000`, но URL можно менять прямо в UI.

- введите новый backend URL в верхнем поле;
- нажмите `Применить`;
- значение сохранится в `localStorage` браузера;
- для сброса используйте кнопку `Сбросить`.

Также можно открыть Swagger сразу с нужным сервером через query string:

```text
http://localhost:5175/?server=http://localhost:3002
```

## Что внутри

- `index.html` — статическая страница Swagger UI
- `openapi.json` — спецификация OpenAPI 3.0.3 по текущим backend-controller и DTO

## Базовый backend

Спецификация по умолчанию указывает на `http://localhost:3000`.
