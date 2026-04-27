# nosql_template


## Предварительная проверка заданий

<a href=" ./../../../actions/workflows/1_helloworld.yml" >![1. Согласована и сформулирована тема курсовой]( ./../../actions/workflows/1_helloworld.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/2_usecase.yml" >![2. Usecase]( ./../../actions/workflows/2_usecase.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/3_data_model.yml" >![3. Модель данных]( ./../../actions/workflows/3_data_model.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/4_prototype_store_and_view.yml" >![4. Прототип хранение и представление]( ./../../actions/workflows/4_prototype_store_and_view.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/5_prototype_analysis.yml" >![5. Прототип анализ]( ./../../actions/workflows/5_prototype_analysis.yml/badge.svg)</a> 

<a href=" ./../../../actions/workflows/6_report.yml" >![6. Пояснительная записка]( ./../../actions/workflows/6_report.yml/badge.svg)</a>

<a href=" ./../../../actions/workflows/7_app_is_ready.yml" >![7. App is ready]( ./../../actions/workflows/7_app_is_ready.yml/badge.svg)</a>

# Bot Arena Prototype

Прототип приложения для хранения и представления данных платформы запуска пользовательских ботов для бесконечных крестиков-ноликов.

## Стек

- React + Vite - веб-интерфейс
- Python - backend
- FastAPI - REST API
- MongoDB - хранение ботов, версий, матчей, событий и логов
- Docker Compose - запуск приложения

## Запуск

```bash
docker compose build --no-cache
docker compose up
```

После запуска интерфейс доступен по адресу:

```text
http://localhost:3000
```

API доступно по адресу:

```text
http://localhost:8000/api/health
```

## Отладочные пользователи

| Роль | Email | Пароль |
|---|---|---|
| Администратор | admin@arena.local | admin123 |
| Модератор | moderator@arena.local | moderator123 |
| Пользователь | user@arena.local | user123 |

## Реализованные сценарии

- Вход в систему через email и пароль.
- Просмотр списка ботов.
- Многокритериальная фильтрация ботов по отдельным полям: ID, название, язык, версия, статус, тег, владелец.
- Загрузка нового бота с метаданными и файлом.
- Просмотр карточки бота: свойства, описание, файл, статистика, связанные матчи, настройки запуска.
- Просмотр списка матчей с фильтрами.
- Просмотр карточки матча, истории статусов, replay-поля, ходов и комментариев.
- Просмотр списка логов с фильтрами.
- Просмотр лога матча с поиском по тексту и подсветкой уровней.

## Коллекции MongoDB

В прототипе используются коллекции из модели данных:

- `users` - отладочные пользователи;
- `bots` - карточки пользовательских ботов;
- `bot_versions` - сохранённые версии решений;
- `bot_stats` - агрегированная статистика по ботам;
- `matches` - карточки запусков матчей;
- `match_events` - поток событий матча: ходы и логи.
