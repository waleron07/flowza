# План разработки admin frontend (TDD)

## 1. Цель admin части

`apps/admin` — это административный интерфейс SaaS-приложения Flowza.

Админка должна решать следующие задачи:

- вход сотрудников в систему;
- отображение профиля текущего пользователя;
- управление staff-пользователями;
- управление ролями и доступами на уровне UI;
- в дальнейшем: управление меню, заказами, категориями, настройками tenant.

Разработка admin части ведется по **TDD-подходу**:

1. сначала описывается пользовательский сценарий тестами;
2. затем реализуется минимальный UI и логика;
3. после прохождения тестов выполняется рефакторинг.

## 2. Текущий статус backend, от которого зависит admin

### Актуализация auth-контракта (синхронизация с backend)

- поле `firstName` в auth-потоке заменено на `login`;
- поле `lastName` удалено и не используется;
- `login` обязателен для всех пользователей;
- `email` обязателен для всех пользователей;
- форма входа в admin должна отправлять:
  - `identifier`
  - `password`
- поле `identifier` поддерживает:
  - `email`
  - `phone`
  - `login`
- все UI-места, где выводился `firstName`, нужно перевести на `login`.
- в `apps/admin` не будет и не планируется публичная форма регистрации;
- доступ в админку только через `login` сотрудников (staff);
- создание staff-аккаунтов выполняется только авторизованными ролями через `POST /users/staff`, а не через экран регистрации.

Публичная регистрация клиента, CAPTCHA (**Cloudflare Turnstile**), код подтверждения email и настройка **SMTP** относятся к **`apps/web` + `apps/backend`** и в админке не дублируются. Локальный SMTP-сценарий для клиентской регистрации уже подтвержден на backend, но для `apps/admin` этот flow по-прежнему не используется напрямую (см. `apps/backend/planDeveloping.md`).

### Синхронизация с backend (2026-04-12)

- Клиентский контракт регистрации/resend может возвращать **`emailSentViaSmtp`** — в `apps/admin` не используется; актуально для веб-магазина.
- Auth staff: без изменений (`login` / `identifier`, `GET /auth/me`, проверка роли).
- Клиентская email-верификация и SMTP на backend для локальной разработки уже работают; админка остаётся сфокусированной на staff-auth и tenant/staff CRUD.
- Для admin-management слоя уже доступны и используются: `GET /tenants/manageable` и `GET /tenants/:tenantId/management`.
- Backend уже отдает organization showcase-поля, категории и карточки товаров в management view, поэтому admin может редактировать не только базовые реквизиты организации, но и главную страницу/каталог.
- Backend уже поддерживает расширенный staff order workflow (очередь, смена статусов, комментарии, timeline), поэтому `apps/admin` может строить экран управления заказами поверх реальных контрактов без промежуточных mock-API.

### Синхронизация с backend/OpenAPI (2026-04-29)

- Default `VITE_API_URL` fallback в `shared/api/http.ts` обновлен на `http://localhost:3000`, как в текущем backend `main.ts` и `apps/swagger/openapi.json`.
- Текст health-check в dashboard обновлен на `http://localhost:3000`.
- Auth-типы синхронизированы с backend response:
  - `AuthUser.primaryTenantId`;
  - `AuthUser.organizationIds`;
  - `tenantId` больше не используется как auth-поле.
- Staff create-flow синхронизирован с `CreateStaffUserDto` backend:
  - payload использует `primaryTenantId`;
  - payload использует `organizationIds`;
  - UI superAdmin-поля временно принимает список organization IDs через запятую до полноценного multi-select.
- Добавлен контрактный order API слой для уже реализованных backend endpoints:
  - `GET /orders/queue`;
  - `GET /orders/tenant`;
  - `GET /orders/:orderId/comments`;
  - `GET /orders/:orderId/timeline`;
  - `PATCH /orders/:orderId/status`;
  - `PATCH /orders/:orderId/comment`;
  - `PATCH /orders/:orderId/payment-status`;
  - `PATCH /orders/:orderId/action`.
- Проверено: `pnpm --filter admin typecheck`.

На backend уже реализовано и доступно для admin части:

- `POST /auth/login`
- `GET /auth/me`
- `DELETE /auth/me`
- `POST /users/staff`
- `GET /tenants`
- `GET /tenants/accessible`
- `GET /tenants/manageable`
- `GET /tenants/:tenantId/management`
- `POST /tenants`
- `PATCH /tenants/:tenantId`
- `DELETE /tenants/:tenantId`
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:categoryId`
- `DELETE /categories/:categoryId`
- `GET /products`
- `POST /products`
- `PATCH /products/:productId`
- `DELETE /products/:productId`
- `POST /orders`
- `GET /orders/my`
- `GET /orders/tenant?tenantId=...`
- `GET /orders/queue?tenantId=...&status=...&paymentMethod=...&paymentStatus=...&search=...`
- `PATCH /orders/:orderId/status`
- `PATCH /orders/:orderId/comment`
- `PATCH /orders/:orderId/payment-status`
- `PATCH /orders/:orderId/action`
- `GET /orders/:orderId/comments`
- `GET /orders/:orderId/timeline?type=ALL|EVENT|COMMENT`

Также уже есть:

- `JWT`-авторизация;
- auth-контракт уже возвращает `primaryTenantId` и `organizationIds`;
- роли:
  - `superAdmin`
  - `admin`
  - `moderator`
  - `operator`
  - `user`
- soft-delete аккаунта через `isActive = false`;
- role-based ограничения на создание сотрудников через `POST /users/staff`.
- единый формат ошибок (`success/statusCode/message/errorCode/details/timestamp/path`);
- correlation header `x-request-id`;
- backend OpenAPI документация через `GET /docs` и `GET /docs-json`.

Это значит, что admin frontend уже можно строить не "в вакууме", а сразу под реальные backend-контракты.

### Кто может входить в админку

В `apps/admin` доступ на вход должен быть только у staff-ролей:

- `superAdmin`
- `admin`
- `moderator`
- `operator`

Роль `user` не должна иметь доступ к админке ни на уровне UX, ни на уровне frontend-роутинга.

Практический вывод:

- успешный `login` в админке не означает просто наличие валидного токена;
- после `GET /auth/me` frontend обязан проверить роль пользователя;
- если роль не входит в staff-набор, пользователь не должен попадать в защищенную часть admin-приложения;
- для роли `user` должен быть отказ во входе в админский интерфейс.

### Зафиксированные продуктовые правила для админки

Ниже фиксируются правила, под которые дальше должен проектироваться весь admin frontend.

#### Привязка ролей к организациям

- `admin`, `moderator` и `operator` могут быть привязаны к нескольким организациям;
- `superAdmin` имеет доступ ко всем организациям платформы;
- admin frontend должен быть готов к переключению активной организации в рамках доступного пользователю списка;
- все экраны админки, связанные с данными организации, должны учитывать текущий выбранный организационный контекст;
- backend уже отдает список доступных организаций для staff через `GET /tenants/accessible`;
- `user` не участвует в staff-модели и не имеет доступа к админке.

#### Управление организациями

- создавать организацию может только `superAdmin`;
- редактировать организацию может только `superAdmin` и `admin`;
- удалять организацию может только `superAdmin`;
- `admin` может редактировать только те организации, к которым он привязан;
- `moderator` и `operator` не могут управлять организациями.

#### Управление staff-пользователями

- `superAdmin` может создавать всех staff-пользователей и выполнять любые административные действия;
- `admin` и `superAdmin` могут создавать `moderator` и `operator`;
- `admin` и `superAdmin` могут редактировать роли `moderator` и `operator`;
- `admin` и `superAdmin` могут удалять `moderator` и `operator`;
- только `superAdmin` может создавать `admin`;
- UI формы staff-пользователя должен опираться на `organizationIds` как основной multi-tenant контракт;
- `moderator` и `operator` не могут управлять staff-пользователями.

#### Права по наполнению организации

- `admin` может наполнять данными свои организации;
- `admin` может создавать, редактировать и удалять категории;
- `admin` может создавать, редактировать и удалять карточки товаров;
- `admin` может управлять всеми разделами, связанными с его организациями;
- `moderator` может создавать, редактировать и удалять категории;
- `moderator` может создавать, редактировать и удалять карточки товаров;
- `operator` может просматривать заказы;
- `operator` может менять статусы заказов;
- `operator` может писать комментарии к заказам;
- `operator` не должен получать UI для управления организациями, staff, категориями и товарами.

## 3. Техническая база admin

Текущий стек `apps/admin`:

- `React + TypeScript`
- `Vite`
- `MUI`
- `React Router`
- `TanStack Query`
- `Zustand`
- `Axios`
- `Formik`
- `Yup`
- `Vitest`
- `Testing Library`

Это достаточно для полноценной TDD-разработки admin части.

### UI и дизайн-система

Для дизайна и всех базовых UI-компонентов в `apps/admin` используется библиотека `MUI`.

Это означает:

- базовые компоненты интерфейса берутся из `@mui/material`;
- диалоги, формы, кнопки, лэйауты и типовые контейнеры строятся на `MUI`;
- кастомный UI создается поверх `MUI`, а не отдельным CSS-фреймворком;
- единый визуальный стиль контролируется через `theme`.

### Подход к стилям

CSS в admin части пишется через `theme` и `sx`-подход `MUI`.

Основные правила:

- не использовать обычные `.css` файлы для прикладных экранов и feature-компонентов, если это можно выразить через `sx`;
- выносить стили компонента в отдельный `styles.ts` файл;
- использовать объект `sx`, связанный с `theme`;
- размеры, отступы, цвета, радиусы и типографику задавать через theme-ориентированный подход;
- компонент и его стили должны быть разделены:
  - компонент отвечает за логику и разметку;
  - `styles.ts` отвечает за объект стилей.

### Рекомендуемый паттерн компонентов

Для admin UI фиксируем следующий стиль реализации:

- компонент строится на `MUI`-компонентах (`Box`, `Button`, `TextField`, `DialogTitle`, `CircularProgress` и т.д.);
- формы могут собираться через `Formik` + `Yup` или другой утвержденный form-слой;
- стили подключаются как `sx`-объект из соседнего `styles.ts`;
- `sx`-объект оформляется в явной и переиспользуемой структуре.

Пример структуры:

```text
CreateTemplateDialog/
  index.tsx
  styles.ts
```

Пример использования:

- в компоненте:
  - `Box sx={sx.box}`
  - `Flex sx={sx.mainFlex}`
  - `Button`, `TextField`, `CircularProgress` из `MUI`
- в `styles.ts`:
  - экспорт объекта `sx`
  - хранение всех визуальных настроек в одном месте

Именно такой подход считается целевым для всей admin части.

## 4. Основные принципы admin frontend

- вся бизнес-логика прав доступа проверяется на backend;
- frontend дублирует role-based ограничения только на уровне UX;
- весь прикладной UI строится на `MUI`;
- стилизация прикладных компонентов ведется через `theme` и `sx`;
- для компонентов со своей версткой стили выносятся в `styles.ts`;
- для каждой фичи должны быть:
  - `loading`
  - `error`
  - `empty-state`
- тесты описываются на кириллице;
- страницы и фичи должны строиться модульно;
- admin должен быть готов к multi-tenant модели с несколькими организациями на одного staff-пользователя;
- frontend обязан скрывать недоступные разделы, но финальная проверка прав всегда остается на backend;
- для staff-пользователей должен существовать явный текущий организационный контекст в UI.

## 5. Рекомендуемая структура admin приложения

```text
src/
  app/
    providers/
    router/
      ProtectedRouter/
        Guest/
          router.tsx
        SuperAdmin/
          router.tsx
          toolpad.tsx
        Admin/
          router.tsx
          toolpad.tsx
        Moderator/
          router.tsx
          toolpad.tsx
        Operator/
          router.tsx
          toolpad.tsx
      index.tsx
      utils.tsx
    theme.ts
    layouts/
  pages/
    auth/
    dashboard/
    staff/
    profile/
  features/
    auth/
    staff/
    profile/
  entities/
    user/
  shared/
    api/
    ui/
    hooks/
    lib/
    constants/
    types/
  test/
```

### Подход к роутингу по ролям

Для `apps/admin` принимается role-based структура роутинга по аналогии со скрином, но с учетом реальных staff-ролей backend:

- `Guest`
- `SuperAdmin`
- `Admin`
- `Moderator`
- `Operator`

Почему именно так:

- так проще добавлять функциональность по ролям без разрастания одного большого роутера;
- легче изолировать навигацию, layout и toolpad-конфигурацию под каждую роль;
- проще явно фиксировать доступные разделы для каждой роли;
- проще тестировать запрет перехода между role-area.

Минимальная логика ветвления:

- `Guest` видит только auth-сценарий;
- `SuperAdmin` получает полный доступ к административным разделам платформы;
- `Admin` получает доступ к управлению только своими организациями, staff-операциям по своим правилам, категориям и товарам;
- `Moderator` получает рабочие экраны категорий и товаров только в рамках доступных ему организаций;
- `Operator` получает самый узкий прикладной набор экранов: заказы, статусы заказов, комментарии;
- `user` не получает ни одной router-ветки в `apps/admin`.

## 6. Что должно быть в MVP admin

### Базовый MVP админки

- login;
- protected routes;
- профиль текущего пользователя;
- logout;
- создание staff-пользователей;
- ограничения UI по ролям.
- role-based router branches для staff-ролей.

### Что пока не входит в первый admin MVP

- управление заказами и операторская очередь;
- dashboard-аналитика;
- audit log;
- управление правами через сложный UI.

### Синхронизация с реализацией (2026-04-12)

- Auth и role-based router уже реализованы: `Guest/SuperAdmin/Admin/Moderator/Operator`, `toolpad`-навигация и UX-ограничения по ролям работают.
- Staff create-flow уже подключен к реальному backend и работает через `organizationIds`, но список/редактирование staff еще остаются следующим шагом.
- Организации в admin уже реализованы как рабочий модуль: профиль организации, главная страница, SEO-поля, категории и карточки товаров.
- В organizations UI уже есть preview storefront, quick activate/deactivate, подтверждения действий и search/filter по категориям и товарам.
- Categories/products management больше не является “будущим направлением” для admin MVP: базовый CRUD-слой уже собран поверх реального backend.
- Основной крупный незакрытый прикладной блок для admin сейчас — заказы и operator workflows.

## 7. Этапы разработки admin

### Этап 0. Каркас admin и тестовой среды

**Оценка:** 1-2 дня

**Статус:** выполнено

#### Что сделать

- подтвердить базовую структуру `apps/admin`;
- настроить `Vitest`;
- настроить `Testing Library`;
- подключить `MUI ThemeProvider`;
- подготовить базовый `AppRouter`;
- подготовить слой API-клиента;
- подготовить providers для:
  - router
  - query client
  - theme.

#### Что уже выполнено

- поднят каркас `React + TypeScript`;
- подключен `MUI`;
- настроен базовый `ThemeProvider`;
- подключен `TanStack Query` provider;
- подключен базовый `Zustand` store;
- подготовлен базовый `AppRouter`;
- подготовлен слой API-клиента;
- подключены тесты через `Vitest`;
- есть стартовый тест рендера;
- проходят:
  - `build`
  - `lint`
  - `test`

#### Результат этапа

Admin frontend готов к разработке боевых фич.

---

### Этап 1. Auth и защищенные маршруты

**Оценка:** 2-4 дня

**Статус:** выполнено

#### Сначала описать тестами

- успешный login сотрудника;
- ошибка при неверных данных;
- сохранение токена после login;
- получение текущего пользователя через `GET /auth/me`;
- недоступность приватных маршрутов без токена;
- logout очищает сессию;
- неактивный пользователь не может работать в админке;
- пользователь с ролью `user` не попадает в admin router;
- `superAdmin` попадает в свой router;
- `admin` попадает в свой router;
- `moderator` попадает в свой router;
- `operator` попадает в свой router.

#### После тестов реализовать

- страницу login;
- форму входа;
- auth store / session store;
- axios interceptor для токена;
- protected routes;
- role-based root router;
- раздельные router-ветки:
  - `Guest`
  - `SuperAdmin`
  - `Admin`
  - `Moderator`
  - `Operator`
- запрос `GET /auth/me`;
- logout;
- базовый admin layout.

#### Что уже выполнено

- реализована страница `login`;
- форма входа собрана на `MUI + Formik + Yup + styles.ts`;
- подключен `POST /auth/login`;
- токен сохраняется в `localStorage`;
- `httpClient` автоматически подставляет `Bearer` токен;
- реализовано восстановление сессии через `GET /auth/me`;
- роль после `GET /auth/me` проверяется на принадлежность к staff-набору;
- роль `user` получает отказ во входе в admin UI;
- root-router переключает приложение между ветками `Guest/SuperAdmin/Admin/Moderator/Operator`;
- для каждой staff-роли создана отдельная router-ветка и свой `toolpad`-конфиг навигации;
- `moderator` и `operator` не получают доступ к разделу `staff`;
- работает `logout`;
- подключен базовый `AdminLayout` с навигацией;
- есть тесты на:
  - рендер login-экрана;
  - ошибки валидации;
  - успешный вход с переходом в защищенную область;
  - отказ для роли `user`;
  - ограниченный router для `moderator`.

#### Что зависит от backend

Используются уже готовые endpoints:

- `POST /auth/login`
- `GET /auth/me`
- `DELETE /auth/me`

#### Результат этапа

Сотрудник может войти в админку, frontend знает его роль и направляет его в соответствующую role-based router-ветку.

---

### Этап 2. Профиль текущего пользователя

**Оценка:** 1 день

#### Сначала описать тестами

- профиль отображает данные текущего пользователя;
- профиль не доступен без токена;
- удаление собственного аккаунта вызывает `DELETE /auth/me`;
- после деактивации пользователь вылогинивается.

#### После тестов реализовать

- страницу профиля;
- отображение `firstName`, `phone`, `role`;
- кнопку удаления аккаунта;
- подтверждение удаления;
- очистку auth state после удаления.

#### Результат этапа

Пользователь может увидеть свой профиль и деактивировать собственный аккаунт.

---

### Этап 3. Управление staff-пользователями

**Оценка:** 2-4 дня

**Статус:** в работе

#### Сначала описать тестами

- `admin` может открыть форму создания `operator` и `moderator`;
- `admin` не может создавать `admin`;
- `superAdmin` может создавать `admin`;
- `user`, `operator`, `moderator` не видят staff UI;
- `admin` видит только доступные ему организации;
- `superAdmin` может назначать сотрудника в одну или несколько организаций;
- успешное создание сотрудника показывает результат;
- ошибка backend отображается в UI.

#### После тестов реализовать

- страницу или раздел staff management;
- форму создания сотрудника;
- поля:
  - `phone`
  - `login`
  - `email`
  - `password`
  - `role`
  - `organizationIds` / выбор организаций
- role-based видимость полей и ролей;
- интеграцию с `POST /users/staff`.

#### Что уже есть на backend

- role-based защита endpoint;
- правила создания:
  - `admin` и `superAdmin` могут создавать `operator`/`moderator`
  - только `superAdmin` может создавать `admin`
  - `user` нельзя создавать через админку
  - `superAdmin` нельзя создавать через админку

#### Что уже выполнено

- добавлена страница `Сотрудники`;
- реализована форма создания staff-пользователя;
- форма собрана на `MUI + Formik + Yup + styles.ts`;
- подключена интеграция с `POST /users/staff`;
- backend уже fully multi-tenant aware для staff-контракта:
  - `organizationIds` используется как основной список организаций
  - `primaryTenantId` приходит в auth-ответах как служебный primary tenant
- добавлены `success/error/loading` состояния через `TanStack Query`;
- реализована role-based логика формы:
  - `admin` может выбирать только `moderator` и `operator`;
  - `superAdmin` может выбирать `admin`, `moderator`, `operator`;
  - форма уже работает с `organizationIds` как основным контрактом multi-tenant назначения;
- добавлены тесты на:
  - role-based доступные роли;
  - отображение организационного контекста для `superAdmin`;
  - успешную отправку формы.

#### Что осталось по этапу

- скрыть staff-раздел для неподходящих ролей;
- запретить переход на staff route при недостаточных правах;
- добавить список сотрудников под формой и обновление списка после создания.
- довести UI выбора `organizationIds` до полноценного multi-select сценария.

#### Результат этапа

Админка получает первый реальный staff-management сценарий.

---

### Этап 4. Role-based UI

**Оценка:** 1-2 дня

#### Сначала описать тестами

- скрытие staff-раздела для неподходящих ролей;
- корректное отображение доступных действий для `admin`;
- корректное отображение доступных действий для `superAdmin`;
- корректное отображение доступных действий для `moderator`;
- корректное отображение доступных действий для `operator`;
- `admin` не видит удаление организации, если это недоступная ему операция;
- `operator` не видит UI категорий и товаров;
- `operator` видит заказы и действия со статусами;
- запрет перехода на staff route при недостаточных правах;
- запрет попадания `moderator` в router-ветку `admin`;
- запрет попадания `operator` в router-ветку `moderator`;
- отсутствие router-ветки для `user`.

#### После тестов реализовать

- role-based nav;
- route guards на frontend;
- conditional rendering кнопок, экранов и форм;
- единый helper для проверки ролей;
- единый helper для проверки доступа к текущей организации;
- отдельные router-конфигурации под каждую staff-роль;
- отдельные toolpad/layout-конфигурации под каждую role-area.

#### Результат этапа

Интерфейс админки соответствует текущей матрице доступов backend.

## 8. Что тестировать в первую очередь

На старте admin frontend самые важные сценарии:

1. login;
2. `GET /auth/me`;
3. protected routes;
4. role-based router branching;
5. logout;
6. удаление собственного аккаунта;
7. создание `operator`/`moderator`/`admin` по правилам ролей.

## 9. Минимальный набор тестов для admin MVP

### Auth

- успешный вход;
- неуспешный вход;
- protected route без токена;
- загрузка текущего пользователя;
- logout;
- `user` не получает доступ в admin;
- `superAdmin`, `admin`, `moderator`, `operator` попадают в свои role-router ветки.

### Profile

- отображение профиля;
- удаление собственного аккаунта;
- очистка сессии после удаления.

### Staff

- успешное создание `operator` админом;
- запрет создания `admin` админом;
- успешное создание `admin` superAdmin;
- отображение выбора организаций для `superAdmin`, когда backend даст контракт;
- скрытие staff UI для неподходящих ролей.

### Router / Roles

- `SuperAdmin` получает свою ветку роутинга;
- `Admin` получает свою ветку роутинга;
- `Moderator` получает свою ветку роутинга;
- `Operator` получает свою ветку роутинга;
- `user` не имеет router-ветки в админке;
- запрещен переход в чужую role-area.

## 10. Следующие шаги после текущего backend статуса

С учетом текущего статуса backend и уже реализованных admin-экранов, оптимальный порядок дальнейшей разработки такой:

1. завершить staff management: список сотрудников, обновление после создания и дальнейший edit/remove сценарий;
2. при необходимости дожать profile/self-delete UX, если он еще не закрыт полностью в UI;
3. собрать orders management screen для `operator`, `admin`, `superAdmin` поверх уже доступного backend order API;
4. добавить UI смены статусов, комментариев, timeline и операционных действий заказа на уже доступных backend-контрактах;
5. затем переходить к dashboard-аналитике, audit log и более сложному permission UI.

## 11. Итог

Admin frontend нужно строить уже не как абстрактную панель, а как UI над конкретными backend-фичами, которые уже реализованы.

То есть сейчас основа admin разработки должна идти вокруг:

- `POST /auth/login`
- `GET /auth/me`
- `DELETE /auth/me`
- `POST /users/staff`
- `GET /tenants`
- `GET /tenants/accessible`
- `GET /tenants/manageable`
- `GET /tenants/:tenantId/management`
- CRUD категорий
- CRUD продуктов
- screens управления организациями и storefront preview
- staff order management (`queue/status/comment/payment-status/action/timeline`)

И вокруг router-архитектуры, где staff-роли получают раздельные ветки интерфейса:

- `SuperAdmin`
- `Admin`
- `Moderator`
- `Operator`

Это даст рабочую первую админку без ожидания следующих backend-этапов.
