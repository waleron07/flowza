# Работа с Prisma Studio и первым `superAdmin`

## Как открыть Prisma Studio

Откройте терминал в папке `D:\SaaS\flowza\apps\backend` и выполните команду:

```powershell
pnpm exec prisma studio
```

После запуска Prisma покажет локальный адрес, обычно:

```text
http://localhost:5555
```

Откройте этот адрес в браузере.

Если команда запускается из корня монорепы, используйте:

```powershell
pnpm --filter backend exec prisma studio
```

## Как создать первого пользователя `superAdmin`

1. Откройте в Prisma Studio модель `User`.
2. Нажмите `Add record`.
3. Заполните поля пользователя.
4. Сохраните запись.

## Какие поля заполнить у пользователя

- `phone`: например `+79991234567`
- `passwordHash`: сюда нужно вставить bcrypt-хеш пароля, а не сам пароль
- `role`: `superAdmin`
- `login`: например `admin_root`
- `email`: обязательно, например `admin@flowza.local`
- `isActive`: `true`
- `tenantId`: для первого `superAdmin` можно оставить пустым

Пример значений:

- `phone`: `+79991234567`
- `role`: `superAdmin`
- `login`: `admin_root`
- `email`: `admin@flowza.local`
- `isActive`: `true`
- `tenantId`: пусто

## Что делать с полем `id`

Поле `id` заполнять вручную не нужно.

В таблице `User` оно создается автоматически, потому что в Prisma-схеме указано:

```prisma
id Int @id @default(autoincrement())
```

Это означает:

- `id` уникальный идентификатор пользователя
- база данных сама выдаст следующее значение
- при создании записи в Prisma Studio поле `id` нужно оставить пустым

## Как получить `passwordHash`

В поле `passwordHash` нельзя писать обычный пароль, например `admin12345`, потому что backend сравнивает пароль через `bcrypt`.

Чтобы получить хеш, выполните в `D:\SaaS\flowza\apps\backend`:

```powershell
node -e "import('bcrypt').then(b => b.hash('admin12345', 10)).then(console.log)"
```

Команда выведет строку вида:

```text
$2b$10$...
```

Именно эту строку нужно вставить в `passwordHash`.

## Как потом войти в админку

Если пользователь создан так:

- `phone`: `+79991234567`
- пароль для хеша: `admin12345`

то вход в админку выполняется с такими данными:

- `phone`: `+79991234567`
- `password`: `admin12345`

## Рекомендуемый следующий шаг

После первого ручного входа лучше сделать отдельный `seed` для создания первого `superAdmin`, чтобы не заполнять запись вручную каждый раз.

## Как запускать базу данных PostgreSQL

Для проекта используется локальный `PostgreSQL`, установленный в Windows.

Перед запуском backend база данных должна быть запущена.

### Как проверить, что PostgreSQL работает

Вариант 1:

- открыть `pgAdmin 4`
- убедиться, что сервер `PostgreSQL` подключается без ошибок
- убедиться, что база `flowza` видна в списке `Databases`

Вариант 2:

- открыть терминал
- выполнить проверку подключения к порту `5432`

```powershell
Test-NetConnection localhost -Port 5432
```

Если PostgreSQL работает, порт должен быть доступен.

### Если PostgreSQL не запущен

Можно запустить его через службы Windows:

1. Нажать `Win + R`
2. Ввести `services.msc`
3. Найти службу PostgreSQL
4. Нажать `Start`

Также можно запускать и проверять сервер через `pgAdmin 4`.

### Какая база нужна проекту

Для backend используется база:

- `flowza`

Строка подключения должна быть такой:

```env
DATABASE_URL="postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/flowza?schema=public"
```

Она используется в:

- `apps/backend/.env`
- `apps/backend/.env.development`

## Как применить миграции к базе

После запуска PostgreSQL и настройки `DATABASE_URL` нужно применить Prisma-миграции.

Из папки `D:\SaaS\flowza\apps\backend`:

```powershell
pnpm exec prisma migrate dev
```

Если команда запускается из корня монорепы:

```powershell
pnpm --filter backend exec prisma migrate dev
```

После этого Prisma создаст или обновит таблицы в базе `flowza`.

## Как запускать весь проект

Запускать проект нужно из корня монорепы:

```powershell
cd D:\SaaS\flowza
```

### Запуск всех частей сразу

Команда:

```powershell
pnpm dev
```

Она запускает одновременно:

- `backend`
- `admin`
- `web`

### Запуск отдельных частей

Только backend:

```powershell
pnpm dev:backend
```

Только admin:

```powershell
pnpm dev:admin
```

Только web:

```powershell
pnpm dev:web
```

### Если нужно запустить backend и admin без web

Откройте два терминала в корне проекта и выполните:

В первом:

```powershell
pnpm dev:backend
```

Во втором:

```powershell
pnpm dev:admin
```

## Локальные адреса проекта

После запуска используются такие адреса:

- `backend`: `http://localhost:3001`
- `admin`: `http://localhost:5173`
- `web`: `http://localhost:5174`

### Проверка backend

Проверить, что backend работает, можно так:

```powershell
http://localhost:3001/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```
