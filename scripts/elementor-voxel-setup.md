# Elementor: 3D hero

## Установка

1. Пересобрать nginx после обновления сцены: `make prod-nginx` (или полный `make prod`).
2. В WordPress → Плагины активировать **Postilka Voxel Hero**.
3. Пересобрать образ wordpress один раз, чтобы плагин попал в контейнер: `docker compose ... up --build -d wordpress`.

## Elementor

1. На главной странице добавьте секцию Hero (Full Width).
2. Вставьте виджет **Shortcode** с текстом:

```
[postilka_voxel_hero]
```

3. Опционально подписи кнопок:

```
[postilka_voxel_hero expand_label="Начать путешествие" collapse_label="Вернуться на сайт"]
```

4. Остальной контент страницы — обычными виджетами Elementor ниже hero.

## Полноэкранный тур без WP

`https://postilka.ru/experience/` — standalone-версия (как исходный voxel-scene).

## Сборка assets

```bash
cd marketing/voxel-scene
npm ci
npm run build
git add dist/
```

Стабильные имена для embed: `/experience/assets/embed.js` и `embed.css`.
