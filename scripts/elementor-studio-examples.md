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

Ограниченный набор примеров:

```text
[postilka_studio_examples limit="6" ids="ID_1,ID_2,ID_3" show_categories="0"]
```

- `page_size` — сколько карточек подгружать за раз (1–48, по умолчанию 18). Дальше — при прокрутке.
- `limit` — общий максимум карточек для этого экземпляра шорткода. `0` — без общего ограничения.
- `ids` — необязательный список ID опубликованных примеров через запятую. Порядок ID сохраняется; можно использовать разные списки в нескольких шорткодах на одной странице.
- `category` — `all`, `product_shot`, `motion`, `ugc`, `ads`, `posters`, `marketplace`.
- `show_categories="0"` — скрыть вкладки категорий над примерами; по умолчанию вкладки показываются (`show_categories="1"`).
- `link="0"` — только просмотр, без перехода в студию.

Клик по карточке открывает `/app/ai?template={id}`.
