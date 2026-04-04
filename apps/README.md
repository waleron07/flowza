# Приложения Flowza (`apps/`)

Каталог `apps` — часть монорепозитория **Flowza** в корне `D:\SaaS\flowza`. Пакеты подключены через [pnpm workspaces](https://pnpm.io/workspaces) (`pnpm-workspace.yaml`: `apps/*`, `packages/*`).

## Три части продукта

| Пакет         | Назначение                                      | Стек (по проекту)            |
| ------------- | ----------------------------------------------- | ---------------------------- |
| **`backend`** | HTTP API, бизнес-логика, данные                 | NestJS, Prisma, JWT/Passport |
| **`web`**     | Публичный клиент для конечных пользователей     | Vite, React                  |
| **`admin`**   | Внутренняя панель (операции, сотрудники и т.д.) | Vite, React, MUI             |

**Связь:** `web` и `admin` — отдельные фронтенды; оба опираются на **`backend`** как на единый источник API и авторизации. Деплой и масштабирование у каждого приложения могут быть независимыми.

## Общий код

В воркспейсе есть пакет **`packages/shared`** (`@flowza/shared`) для переиспользуемых типов и утилит на TypeScript. Приложения подключают его как зависимость workspace, когда это нужно.

## Зависимости и `node_modules`

У каждого приложения в `apps/<имя>/` может быть свой каталог **`node_modules`**. Это ожидаемо: у каждого пакета свой `package.json` и свой граф зависимостей. В монорепе на **pnpm** одинаковые версии пакетов обычно **не дублируются физически** так, как у классического npm — используется общий store и ссылки, поэтому «три папки `node_modules`» не означают три полные копии всех библиотек.

**Практика:** устанавливать зависимости из **корня репозитория** (`pnpm install`), не смешивать с отдельными `npm install` внутри подпапок без необходимости.

## Команды из корня

Скрипты в корневом `package.json` запускают нужный пакет через фильтры, например:

- `pnpm dev` — параллельно backend, admin и web (см. корневой `package.json`)
- `pnpm dev:backend` / `pnpm dev:admin` / `pnpm dev:web` — по одному приложению
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` — по всем приложениям в `apps/*`, где есть соответствующие скрипты

## Как запускать Prisma

`Prisma` используется в `apps/backend`, поэтому команды лучше запускать из корня монорепозитория через `pnpm --filter backend`.

Перед запуском Prisma нужно:

- убедиться, что локально поднят `PostgreSQL`;
- проверить корректность `DATABASE_URL` в `apps/backend/.env.development`.

### Как локально поднять PostgreSQL

Рекомендуемый вариант (быстро и одинаково у всей команды) — через Docker.

1. Запустить контейнер:
   `docker run --name flowza-postgres -e POSTGRES_DB=flowza -e POSTGRES_USER=flowza -e POSTGRES_PASSWORD=flowza_dev_password -p 5432:5432 -d postgres:16`
2. Проверить, что контейнер поднялся:
   `docker ps`
3. Пример `DATABASE_URL` для `apps/backend/.env.development`:
   `DATABASE_URL="postgresql://flowza:flowza_dev_password@localhost:5432/flowza?schema=public"`
4. Применить миграции:
   `pnpm --filter backend exec prisma migrate dev`

Полезные команды для этого контейнера:

- остановить: `docker stop flowza-postgres`
- запустить снова: `docker start flowza-postgres`
- удалить (с данными внутри контейнера): `docker rm -f flowza-postgres`

Альтернатива без Docker: установить PostgreSQL как системный сервис, создать БД/пользователя и указать корректный `DATABASE_URL` в `apps/backend/.env.development`.

Основные команды:

- применить миграции к локальной БД:
  `pnpm --filter backend exec prisma migrate dev`
- сгенерировать Prisma Client:
  `pnpm --filter backend exec prisma generate`
- открыть Prisma Studio:
  `pnpm --filter backend exec prisma studio --port 5555`

Подробности по отдельным приложениям — в их локальных `README.md` внутри `apps/backend`, `apps/web`, `apps/admin`.
