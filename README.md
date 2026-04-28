# Flowza

Flowza — monorepo на `pnpm workspaces` с четырьмя приложениями:

- `apps/backend` — API на NestJS + Prisma + PostgreSQL
- `apps/admin` — админ-панель на React + Vite
- `apps/web` — публичный клиент на React + Vite
- `apps/swagger` — отдельный Swagger UI для API

## Что нужно установить

Минимально для локального запуска:

- `Git`
- `Node.js` LTS `20+`
- `pnpm` `10.x`
- `PostgreSQL` `16+` или `Docker Desktop` для запуска Postgres в контейнере

Установка `pnpm`, если он ещё не установлен:

```bash
npm install -g pnpm
```

Проверить версии:

```bash
node -v
pnpm -v
```

## Установка зависимостей

Все зависимости устанавливаются из корня репозитория:

```bash
pnpm install
```

`pnpm-workspace.yaml` подключает workspace-пакеты из `apps/*` и `packages/*`, поэтому запускать отдельный `npm install` внутри `apps/backend`, `apps/admin`, `apps/web` и `apps/swagger` обычно не нужно.

## Подготовка базы данных

Backend использует PostgreSQL через Prisma. Нужна доступная локально база и корректный `DATABASE_URL`.

### Вариант 1: PostgreSQL через Docker

Быстрый вариант через Docker:

```bash
docker run --name flowza-postgres -e POSTGRES_DB=flowza -e POSTGRES_USER=flowza -e POSTGRES_PASSWORD=flowza_dev_password -p 5432:5432 -d postgres:16
```

Проверить, что контейнер поднялся:

```bash
docker ps
```

Пример строки подключения:

```env
DATABASE_URL="postgresql://flowza:flowza_dev_password@localhost:5432/flowza?schema=public"
```

Полезные команды для контейнера:

```bash
docker stop flowza-postgres
docker start flowza-postgres
docker rm -f flowza-postgres
```

### Вариант 2: PostgreSQL как локальный сервис на Windows

Если хотите запускать базу без Docker:

1. Установите `PostgreSQL 16+` с официального сайта.
2. Во время установки запомните пароль пользователя `postgres`.
3. Оставьте порт по умолчанию `5432`.
4. После установки убедитесь, что служба PostgreSQL запущена.

Проверка службы в Windows:

1. Нажмите `Win + R`.
2. Введите `services.msc`.
3. Найдите службу PostgreSQL.
4. Убедитесь, что у неё статус `Running`, либо запустите её вручную.

Дальше нужно создать базу для проекта.

Если `psql` доступен в `PATH`, можно выполнить:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE flowza;"
```

Если хотите отдельного пользователя для проекта:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE USER flowza WITH PASSWORD 'flowza_dev_password';"
psql -U postgres -h localhost -p 5432 -c "ALTER DATABASE flowza OWNER TO flowza;"
```

Тогда строка подключения будет такой:

```env
DATABASE_URL="postgresql://flowza:flowza_dev_password@localhost:5432/flowza?schema=public"
```

Если используете стандартного пользователя `postgres`, то укажите его пароль из установки:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/flowza?schema=public"
```

Проверить, что подключение работает, можно так:

```bash
psql "postgresql://flowza:flowza_dev_password@localhost:5432/flowza"
```

Если `psql` не добавлен в `PATH`, можно использовать `SQL Shell (psql)` или `pgAdmin 4`, которые ставятся вместе с PostgreSQL.

После этого примените миграции и сгенерируйте Prisma Client:

```bash
pnpm --filter backend prisma:migrate
pnpm --filter backend prisma:generate
```

Опционально можно открыть Prisma Studio:

```bash
pnpm --filter backend exec prisma studio --port 5555
```

## Переменные окружения

Backend читает файлы окружения из `apps/backend/.env.development`, `apps/backend/.env.production` и `apps/backend/.env`.

Для локальной разработки проверьте `apps/backend/.env.development` и при необходимости обновите значения как минимум для:

- `PORT` — локальный порт backend, в проекте ожидается `3001`
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — секрет для JWT, если хотите переопределить дефолтный dev-ключ
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — если нужна реальная отправка email
- `TURNSTILE_SECRET_KEY` — если нужна реальная проверка Cloudflare Turnstile
- `CAPTCHA_MOCK_VALID_TOKEN` — dev fallback для капчи

Минимальный пример `apps/backend/.env.development` для локального запуска:

```env
PORT=3001
DATABASE_URL="postgresql://flowza:flowza_dev_password@localhost:5432/flowza?schema=public"
JWT_SECRET=dev_jwt_secret
CAPTCHA_MOCK_VALID_TOKEN=mock-captcha-token
```

Если SMTP не настроен, backend не падает: код подтверждения будет логироваться в консоль сервера.

Дополнительно для frontend можно создать локальные env-файлы:

- `apps/admin/.env.local`
- `apps/web/.env.local`

Полезные переменные:

```env
VITE_API_URL=http://localhost:3001
```

Для `apps/web` при использовании реального Turnstile:

```env
VITE_API_URL=http://localhost:3001
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
VITE_DEBUG_TURNSTILE=0
```

## Как запускать проект

Запуск всех приложений сразу из корня:

```bash
pnpm dev
```

Эта команда поднимает одновременно:

- `backend`
- `admin`
- `web`
- `swagger`

Адреса по умолчанию:

- `http://localhost:3001` — backend
- `http://localhost:5173` — admin
- `http://localhost:5174` — web
- `http://localhost:5175` — swagger

Проверка backend:

```text
http://localhost:3001/health
```

Swagger UI:

```text
http://localhost:5175
```

## Запуск по отдельности

Если нужно запускать сервисы отдельно:

```bash
pnpm dev:backend
pnpm dev:admin
pnpm dev:web
pnpm dev:swagger
```

Есть и комбинированный режим с автооткрытием вкладок браузера:

```bash
pnpm dev:browser
```

## Основные команды

Команды запускаются из корня репозитория.

### Разработка

```bash
pnpm dev
pnpm dev:backend
pnpm dev:admin
pnpm dev:web
pnpm dev:swagger
pnpm dev:browser
```

### Сборка

```bash
pnpm build
pnpm build:backend
pnpm build:admin
pnpm build:web
pnpm build:swagger
```

### Проверка типов и линт

```bash
pnpm typecheck
pnpm lint
```

### Тесты

```bash
pnpm test
pnpm test:backend
pnpm test:admin
pnpm test:watch
```

### Backend: Prisma

```bash
pnpm --filter backend prisma:migrate
pnpm --filter backend prisma:generate
pnpm --filter backend exec prisma studio --port 5555
```

## Рекомендуемый порядок первого запуска

1. Установить `Node.js`, `pnpm` и `PostgreSQL` или `Docker`.
2. Выполнить `pnpm install` в корне репозитория.
3. Поднять PostgreSQL.
4. Проверить `apps/backend/.env.development`.
5. Выполнить `pnpm --filter backend prisma:migrate`.
6. Выполнить `pnpm --filter backend prisma:generate`.
7. Запустить `pnpm dev`.
8. Открыть `http://localhost:5174`, `http://localhost:5173` или `http://localhost:5175`.

## Структура проекта

```text
apps/
	backend/   NestJS API + Prisma
	admin/     React admin panel
	web/       React client app
	swagger/   Swagger UI
packages/
	shared/    shared types and utilities
```
