# План выкладки Flowza на прод (RU)

Проект: `D:\SaaS\flowza` (monorepo, backend + web + admin)  
Домен: `flowza-dd.ru` (регистратор: [REG.RU](https://www.reg.ru/))  
Сервер: [Timeweb Cloud](https://timeweb.cloud/services/cloud-servers), тариф `Cloud MSK 30`  
Конфигурация: `1 vCPU (3.3 ГГц)`, `2 GB RAM`, `30 GB NVMe`, `1 Гбит/с`

## 0) Что нужно скачать и настроить заранее

### На локальном ПК (Windows)

1. Установить:
   - `Git`
   - `Node.js LTS` (рекомендуется 20+)
   - `pnpm` (`npm i -g pnpm`)
   - `Docker Desktop` (опционально, для локальной проверки)
   - SSH-клиент (обычно уже есть в Windows)
2. Проверить, что проект собирается локально:
   - `pnpm install`
   - `pnpm build`
   - `pnpm test` (минимум backend тесты)
3. Подготовить production-переменные окружения:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGINS`
   - API URL для `web` и `admin`

### Статус на текущем ПК (проверено)

- [x] `Git` установлен (`git version 2.32.0.windows.1`)
- [x] `Node.js` установлен (`v25.2.1`)
- [x] `npm` установлен (`11.6.4`)
- [x] `pnpm` установлен (`10.25.0`)
- [x] `OpenSSH client` установлен (`OpenSSH_for_Windows_9.5p1`)
- [x] `Docker Desktop` установлен (`Docker version 29.3.1, build c2be9cc`)
- [x] `Docker Compose` установлен (`Docker Compose version v5.1.0`)
- [~] `WSL` обновлен (`wsl --update` выполнен)
- [x] Проверка `docker run hello-world` выполнена (`Hello from Docker!`)

### Что еще нужно установить/доделать

1. Подготовить production `.env` (секреты и URL).
2. Проверить локальную сборку проекта:
   - `pnpm install`
   - `pnpm build`
   - `pnpm test`

### На сервере (после покупки VPS)

1. Создать Ubuntu-сервер (`Ubuntu 24.04 LTS`).
2. Добавить SSH-ключ в Timeweb и запретить вход по паролю.
3. Открыть порты:
   - `22` (SSH)
   - `80` (HTTP)
   - `443` (HTTPS)

## 1) Выбор мощности и ожидания

Для старта на 1 клиента тариф `Cloud MSK 30` обычно достаточен.  
Если начнутся тормоза (рост API запросов, тяжелые операции Prisma, много одновременных сессий), вертикально масштабировать до 2 vCPU / 4 GB.

## 2) Покупка домена и DNS (REG.RU)

Выбран домен: `flowza-dd.ru`.

Создать DNS-записи типа `A` на IP вашего сервера:

- `api.flowza-dd.ru` -> `<SERVER_PUBLIC_IP>`
- `app.flowza-dd.ru` -> `<SERVER_PUBLIC_IP>`
- `admin.flowza-dd.ru` -> `<SERVER_PUBLIC_IP>`

Опционально:

- `flowza-dd.ru` -> `<SERVER_PUBLIC_IP>` (редирект на `app.flowza-dd.ru`)

## 3) Схема доменов

- `api.flowza-dd.ru` -> `backend` (NestJS API)
- `app.flowza-dd.ru` -> `web` (клиент)
- `admin.flowza-dd.ru` -> `admin` (внутренняя панель)

## 4) Базовая настройка Ubuntu-сервера

Под root или sudo-пользователем:

1. Обновить систему:
   - `apt update && apt upgrade -y`
2. Установить базовые утилиты:
   - `apt install -y curl git ufw`
3. Настроить firewall:
   - `ufw allow OpenSSH`
   - `ufw allow 80`
   - `ufw allow 443`
   - `ufw enable`
4. Создать отдельного пользователя для деплоя (например `deploy`), выдать sudo.

## 5) Установка Docker + Docker Compose

1. Установить Docker Engine и плагин Compose.
2. Добавить пользователя `deploy` в группу docker.
3. Проверить:
   - `docker --version`
   - `docker compose version`

## 6) Поставить и настроить Nginx

1. Установить:
   - `apt install -y nginx`
2. Включить автозапуск:
   - `systemctl enable nginx`
   - `systemctl start nginx`
3. Подготовить reverse proxy:
   - `api.flowza-dd.ru` -> контейнер backend (например `localhost:3000`)
   - `app.flowza-dd.ru` -> контейнер web (например `localhost:4173`)
   - `admin.flowza-dd.ru` -> контейнер admin (например `localhost:4174`)
4. Проверить конфиг:
   - `nginx -t`
   - `systemctl reload nginx`

## 7) SSL сертификаты (Let's Encrypt)

1. Установить certbot:
   - `apt install -y certbot python3-certbot-nginx`
2. Выпустить сертификаты:
   - `certbot --nginx -d api.flowza-dd.ru -d app.flowza-dd.ru -d admin.flowza-dd.ru`
3. Проверить автообновление сертификатов:
   - `systemctl status certbot.timer`

## 8) Деплой проекта из GitHub

1. На сервере:
   - `git clone <URL_ВАШЕГО_REPO> /opt/flowza`
   - `cd /opt/flowza`
2. Создать production `.env` файлы для:
   - `apps/backend`
   - `apps/web`
   - `apps/admin`
3. Поднять через Docker Compose:
   - `docker compose -f docker-compose.prod.yml up -d --build`
4. Проверить:
   - `docker compose ps`
   - `docker compose logs -f backend`

## 9) CI/CD (минимум)

Через GitHub Actions:

1. На push в `main` запускать:
   - `pnpm install`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
2. После успешной сборки:
   - SSH на сервер
   - `git pull`
   - `docker compose -f docker-compose.prod.yml up -d --build`

## 10) Бэкапы и мониторинг

1. База:
   - ежедневный `pg_dump`
   - хранение копий минимум 7-14 дней
2. Мониторинг:
   - uptime-check (`api/app/admin`)
   - уведомления в Telegram
3. Логи:
   - ротация логов Docker/Nginx

## 11) Чеклист запуска (Go-Live)

- DNS записи применились (`nslookup` показывает IP сервера)
- Все 3 домена открываются по HTTPS
- Логин/регистрация работает в `web`
- `admin` доступен только нужным пользователям
- API отвечает без CORS-ошибок
- Бэкапы создаются автоматически

## Полезные ссылки

- Домен и DNS: [REG.RU](https://www.reg.ru/)
- Облачный сервер: [Timeweb Cloud Servers](https://timeweb.cloud/services/cloud-servers)
