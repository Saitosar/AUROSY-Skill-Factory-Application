# AUROSY Skill Factory — документация веб-UI

Документы в этой папке описывают **архитектуру фронтенда**, **design system** и **справочные материалы** для платформы **AUROSY Skill Factory**: авторинг скиллов, движений и сценариев поведения роботов (Unitree G1 в текущем стеке).

## Где лежит код

| Ресурс | Расположение |
|--------|--------------|
| Веб-приложение (Vite, React) | [`web/frontend/`](../../web/frontend/) |
| Документы в этой папке | [`docs/g1-control-ui/`](./) |

Бэкенд — отдельный репозиторий. Ссылки на документы и пути в том репозитории собраны в [backend_references.md](backend_references.md). Контракт HTTP/WebSocket — в OpenAPI у запущенного сервера (`/docs`).

## Документы в этой папке

| Файл | Описание |
|------|----------|
| [01_frontend_architecture.md](01_frontend_architecture.md) | Слои приложения, фиче-модули, потоки данных, границы с бэкендом |
| [02_design_system.md](02_design_system.md) | Принципы UX, токены, компоненты, доступность |
| [FAQ.md](FAQ.md) | Частые вопросы для пользователей; дублируется в UI на `/help` (ru/en) |
| [backend_references.md](backend_references.md) | Типичные пути к документам и коду в репозитории бэкенда |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Указатель на чеклист развёртывания ([`../deployment/README.md`](../deployment/README.md)) |

## Маршруты приложения

| Путь | Экран |
|------|-------|
| `/` | Главная (dashboard, статус API, шорткаты) |
| `/authoring` | Авторинг (keyframes, motion, scenario) |
| `/pose` | Pose Studio (2D-схема, WASM 3D, Camera Live Track) |
| `/scenarios` | Сценарии (mid-level действия, оценка длительности) |
| `/pipeline` | Конвейер (preprocess, playback, train) |
| `/jobs`, `/jobs/:jobId` | Задачи Phase 5 (очередь train) |
| `/packages` | Пакеты (Skill Bundle) |
| `/telemetry` | Редирект на `/pose` (старые закладки) |

## Phase 3: Camera Live Track

- Live Track работает прямо в `/pose`: камера браузера отправляет JPEG кадры в motion-capture сервис (`WS /ws/capture`).
- Полученные landmarks ретаргетятся через backend API `POST /api/pipeline/retarget`.
- Результат применяется в текущем состоянии `PoseStudio` и сразу отображается на MuJoCo G1 preview.
- Для настройки endpoint capture-сервиса используйте `VITE_MOTION_CAPTURE_WS_URL` (см. `web/frontend/README.md`).
| `/help` | Справка (FAQ ru/en) |
| `/settings` | Настройки (язык, API base, версия) |

## Train modes

В разделе `/pipeline` и в API очереди `/jobs` backend поддерживает `mode`:
- `smoke` — быстрый контрактный smoke run
- `train` — PPO/BC train
- `amp` — AMP RL training pipeline

## Внешние источники движений

### Unitree RL Gym

Готовые траектории ходьбы из [unitree_rl_gym](https://github.com/unitreerobotics/unitree_rl_gym) можно использовать в UI:

1. **Keyframes для Authoring:** Скопируйте `keyframes.json` и `motion.json` из `AUROSY_creators_factory_platform/packages/skill_foundry/external_artifacts/unitree_rl_gym/` в ваш workspace или загрузите через `/authoring`.

2. **Reference для Pipeline:** Используйте `reference_trajectory.json` как входной файл для Pipeline → Train.

**Ограничение:** Траектория содержит только движения ног (12 DOF из 29). Руки и торс зафиксированы в нейтральной позе.

Подробности: см. документацию в репозитории платформы `docs/skill_foundry/04_cortex_pipeline.md`.

## Архив

Исторические документы (планы реализации, бриф для Figma, бэклоги) перенесены в [`docs/archive/g1-control-ui/`](../archive/g1-control-ui/).
