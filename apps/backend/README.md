# Flowza Backend

`apps/backend` — серверная часть SaaS-системы Flowza. Backend отвечает за авторизацию, регистрацию клиентов, email-верификацию, multi-tenant модель организаций, каталог, заказы, staff-доступы, audit events и публичную OpenAPI-документацию.

## Что нужно для запуска

Обязательные зависимости:

- `Node.js` и `pnpm` из корня monorepo;
- `PostgreSQL` — основная база данных;
- `Prisma` — схема БД, миграции и typed client;
- `.env` файл для подключения к БД, JWT, SMTP и CAPTCHA;
- доступный порт backend, по умолчанию `3000`.

Опциональные внешние сервисы:

- SMTP-провайдер для отправки email-кодов регистрации;
- Cloudflare Turnstile для production CAPTCHA;
- Prisma Studio для просмотра данных в БД.

Минимальный `.env` для локальной разработки:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/flowza?schema=public"
JWT_SECRET="replace-with-local-secret"
PORT=3000

# CAPTCHA: если TURNSTILE_SECRET_KEY не задан, backend принимает только mock-token.
CAPTCHA_MOCK_VALID_TOKEN="mock-captcha-token"
# TURNSTILE_SECRET_KEY=""

# SMTP: если не заполнить, код подтверждения будет выводиться в backend-логи.
# SMTP_HOST=""
# SMTP_PORT=587
# SMTP_USER=""
# SMTP_PASS=""
# SMTP_FROM=""
# SMTP_SECURE=false
# SMTP_RETRY_COUNT=2
# SMTP_RETRY_DELAY_MS=500
# SMTP_CONNECTION_TIMEOUT_MS=10000
# SMTP_GREETING_TIMEOUT_MS=10000
# SMTP_SOCKET_TIMEOUT_MS=20000

# Auth limits, можно не задавать: есть безопасные fallback-значения.
# AUTH_EMAIL_CODE_TTL_MINUTES=15
# AUTH_RESEND_COOLDOWN_SECONDS=60
# AUTH_MAX_VERIFY_ATTEMPTS=5
# AUTH_REGISTER_RATE_LIMIT=5
# AUTH_REGISTER_RATE_WINDOW_SEC=600
# AUTH_VERIFY_RATE_LIMIT=10
# AUTH_VERIFY_RATE_WINDOW_SEC=300
# AUTH_LOGIN_RATE_LIMIT=10
# AUTH_LOGIN_RATE_WINDOW_SEC=300
```

Файлы окружения читаются через `ConfigModule`: сначала `.env.<NODE_ENV>`, затем `.env`. Для `test` можно использовать отдельный `.env.test`.

## Технологии и почему они используются

- `NestJS` — модульная архитектура, DI-контейнер, guards, pipes, filters и понятная структура для большого backend.
- `TypeScript` — строгие типы для DTO, сервисов, Prisma-ответов и тестов.
- `PostgreSQL` — надежная реляционная БД для SaaS-модели с организациями, пользователями, заказами и связями.
- `Prisma` — единая схема данных, миграции, typed database client и меньше ручного SQL в бизнес-коде.
- `class-validator` и `ValidationPipe` — централизованная проверка входных DTO, whitelist и запрет лишних полей.
- `Passport JWT` и `@nestjs/jwt` — стандартная Bearer JWT авторизация для web/admin клиентов.
- `bcrypt` — хеширование паролей перед записью в БД.
- `Nodemailer` — отправка email-кодов регистрации; при отсутствии SMTP backend логирует код для локальной разработки.
- `Cloudflare Turnstile` — серверная CAPTCHA-проверка регистрации.
- `Swagger/OpenAPI` — документация API на `/docs` и JSON-контракт на `/docs-json`.
- `Jest`, `Supertest` — unit, integration и e2e проверки.

## Авторизация

Auth-сценарий находится в `src/auth` и использует:

- `POST /auth/register` — регистрация клиента с `login`, `email`, `phone`, паролем, согласиями и CAPTCHA;
- `POST /auth/register/verify-email` — подтверждение email одноразовым кодом;
- `POST /auth/register/resend-email-code` — повторная отправка кода;
- `POST /auth/login` — вход по `identifier`, где identifier может быть `email`, `phone` или `login`;
- `GET /auth/me` — восстановление текущей сессии;
- `DELETE /auth/me` — soft-delete аккаунта через `isActive=false`.

JWT payload содержит `userId`, `role`, `primaryTenantId` и `organizationIds`. `JwtStrategy` не только проверяет подпись токена, но и перечитывает пользователя из БД: если аккаунт деактивирован, старый JWT перестает работать сразу.

Плюсы текущей схемы:

- stateless access token удобно использовать из `web` и `admin`;
- деактивация пользователя учитывается на каждом защищенном запросе;
- role-based guards и tenant-aware checks можно держать на backend;
- регистрация защищена CAPTCHA, email-верификацией и rate limiting;
- audit logs фиксируют важные auth/order/staff события.

Минусы и ограничения:

- JWT живет до истечения срока, отдельного refresh-token flow пока нет;
- токен хранится на frontend стороне, поэтому XSS остается важным риском;
- in-memory rate limiter работает только в рамках одного backend-процесса;
- при нескольких инстансах backend лимиты нужно переносить в Redis/БД;
- CAPTCHA policy для production еще нужно окончательно определить.

## Организации и tenant-связи

Главная сущность SaaS-модели — `Tenant`. Организация владеет своими категориями, товарами, корзинами, заказами, промокодами и скидками.

Ключевые связи:

- `Tenant -> Category -> Product` — каталог организации изолирован по `tenantId`;
- `User.primaryTenantId` — основная организация пользователя, если она назначена;
- `UserTenantAccess` — many-to-many связь staff-пользователей с организациями;
- `Cart` имеет уникальность `userId + tenantId`, поэтому корзины не смешиваются между организациями;
- `Order` всегда связан с `tenantId` и хранит snapshot данных заказа;
- `OrderComment` и timeline используются для staff workflow;
- `AuditLog` фиксирует важные события с `userId`, `action`, `entity`, `entityId`.

Роли:

- `superAdmin` — глобальный доступ;
- `admin` — управление доступными организациями;
- `moderator` — управление контентом организации;
- `operator` — обработка заказов;
- `user` — клиентский web-сценарий.

Tenant-изоляция должна проверяться на backend. Frontend может скрывать недоступный UI, но не считается источником прав доступа.

## Архитектура проекта

Основная структура:

```text
src/
  app.module.ts          # корневой Nest module
  app.setup.ts           # CORS, request-id, validation, Swagger, filters
  main.ts                # запуск HTTP-сервера
  common/                # общие guards, filters, decorators, enums
  database/              # PrismaService и DatabaseModule
  auth/                  # регистрация, login, JWT, CAPTCHA, rate limit
  email/                 # SMTP-отправка и email templates
  users/                 # users, staff-management, user persistence
  tenants/               # организации и tenant access
  categories/            # категории каталога
  products/              # товары каталога
  orders/                # checkout, queue, status workflow, comments, timeline
  audit/                 # запись audit events
  health/                # health-check
test/
  e2e/
  integration/
prisma/
  schema.prisma
  migrations/
```

Поток запроса:

1. `main.ts` создает Nest app.
2. `configureApp` включает CORS, `x-request-id`, access logs, глобальную валидацию и unified error filter.
3. Controller принимает HTTP-запрос и валидирует DTO.
4. Service выполняет бизнес-логику и вызывает Prisma через доменные сервисы.
5. Guards/strategies проверяют JWT, роли и tenant-доступы.
6. Ошибки возвращаются в едином формате: `success`, `statusCode`, `message`, `errorCode`, `details`, `timestamp`, `path`.

## Как запускать

Из корня monorepo:

```bash
pnpm install
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
pnpm --filter backend start:dev
```

Backend будет доступен на `http://localhost:3000`.

Полезные команды:

```bash
pnpm --filter backend start:debug
pnpm --filter backend build
pnpm --filter backend start:prod
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend test:integration
pnpm --filter backend test:e2e
pnpm --filter backend test:cov
pnpm --filter backend exec prisma studio --port 5555
```

Swagger:

- UI: `http://localhost:3000/docs`;
- JSON: `http://localhost:3000/docs-json`;
- health-check: `http://localhost:3000/health`.

## Как дебажить backend

Для runtime debugging:

```bash
pnpm --filter backend start:debug
```

После запуска подключить debugger IDE к Node inspect port `9229`.

Для тестов:

```bash
pnpm --filter backend test:debug
```

Практический порядок диагностики:

- проверить `DATABASE_URL` и доступность PostgreSQL;
- выполнить `pnpm --filter backend prisma:generate`;
- проверить миграции через `pnpm --filter backend prisma:migrate`;
- открыть Prisma Studio и убедиться, что нужные записи есть;
- смотреть access logs: в каждом ответе есть `x-request-id`;
- при ошибках API проверять unified error response и `errorCode`;
- для auth проверять `JWT_SECRET`, наличие пользователя, `isActive`, `emailVerifiedAt`;
- для регистрации проверять CAPTCHA token, SMTP env и backend logs;
- для CORS проверять origin frontend-приложения.

## Проблемные места проекта

- `AuthRateLimiterService` хранит лимиты в памяти процесса. Для production и горизонтального масштабирования нужен Redis/DB-backed limiter.
- JWT без refresh-token flow: нужно отдельно решить срок жизни access token, logout во всех устройствах и ротацию токенов.
- CAPTCHA policy пока не финализирована: нужно определить production-ключи, окружения, fallback и сценарии отказа Cloudflare.
- SMTP является внешней точкой отказа: сейчас есть retry и понятные ошибки, но нужны мониторинг доставки и production alerting.
- Часть order/catalog сущностей уже заложена в БД шире, чем реализованный UI; важно не считать все поля законченным продуктовым сценарием.
- Swagger сейчас синхронизирован вручную в `apps/swagger`; при росте API лучше автоматизировать экспорт `/docs-json`.
- Tenant-изоляция критична: новые endpoint'ы нельзя добавлять без явной проверки роли и доступа к организации.
- Build warnings frontend по размеру chunks не относятся к backend, но влияют на общий production readiness монорепы.
