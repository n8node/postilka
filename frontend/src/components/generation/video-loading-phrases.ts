const VIDEO_QUEUE_PHRASES = [
  "Сцена в очереди на монтаж…",
  "Оператор занят — ваш ход следующий.",
  "Камера уже наводится на кадр.",
  "Холlywood подождёт — мы почти готовы.",
  "Плёнка заряжается, не переключайте канал.",
  "Режиссёр кивает: «ещё секунда».",
  "Свет выставляют под ваш сюжет.",
  "Монтажная ждёт ваш дубль.",
] as const;

const VIDEO_PROCESS_PHRASES = [
  "Снимаем дубль…",
  "Камера едет по рельсам.",
  "Монтажёр склеивает кадры.",
  "Добавляем киношный свет.",
  "Пиксели играют роли.",
  "Хромakey убирает лишнее.",
  "Звук режиссёра: «Мотор!»",
  "Кадр почти в финальном просмотре.",
  "Цветокор подкручивает настроение.",
  "Субтитры «Coming soon» уже не нужны.",
  "Гаффер подстраивает софтбокс.",
  "Это не баг — это artistic choice.",
  "Киноплёнка не терпит спешки (но спешит).",
  "Последний дубль перед «Снято!»",
  "Упаковываем премьеру в MP4.",
  "Сейчас будет тот самый кадр.",
  "Генерируем ваш ролик…",
  "Делаем видео под ваш сценарий.",
] as const;

const VIDEO_PREPARING_PHRASES = [
  "Готовим сцену…",
  "Загружаем раскадровку…",
  "Настраиваем объектив…",
  "Скоро «Мотор!»",
] as const;

const ALL_VIDEO_ACTIVE_PHRASES = [
  ...VIDEO_PREPARING_PHRASES,
  ...VIDEO_QUEUE_PHRASES,
  ...VIDEO_PROCESS_PHRASES,
] as const;

export function videoPhrasesForStatus(status: string): readonly string[] {
  switch (status) {
    case "preparing":
      return VIDEO_PREPARING_PHRASES;
    case "waiting":
    case "queuing":
      return VIDEO_QUEUE_PHRASES;
    case "generating":
      return VIDEO_PROCESS_PHRASES;
    default:
      return ALL_VIDEO_ACTIVE_PHRASES;
  }
}

export { pickRandomPhrase } from "@/components/generation/generation-loading-phrases";
