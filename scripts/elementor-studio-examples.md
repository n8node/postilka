# Elementor: примеры студии

## Установка

1. Пересобрать backend (публичный каталог `/api/v1/public/ad-studio/templates`).
2. Пересобрать wordpress, чтобы плагин попал в контейнер: `docker compose ... up --build -d wordpress`.
3. В WordPress → Плагины активировать **Postilka Studio Examples**.

## Elementor

Виджет **Shortcode**:

```
[postilka_studio_examples]
```

Опционально:

```
[postilka_studio_examples page_size="18" category="all"]
```

- `page_size` — сколько карточек подгружать за раз (1–48, по умолчанию 18). Дальше — при прокрутке.
- `category` — `all`, `product_shot`, `motion`, `ugc`, `ads`, `posters`, `marketplace`.
- `link="0"` — только просмотр, без перехода в студию.

Клик по карточке открывает `/app/ai?template={id}`.
