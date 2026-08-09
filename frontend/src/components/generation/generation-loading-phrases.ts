const QUEUE_PHRASES = [
  "Стоим в очереди за красотой…",
  "Немного терпения — скоро магия.",
  "Ваш кадр почти на подходе.",
  "Художник затаил дыхание.",
  "Пиксели выстраиваются в строй.",
  "Ещё чуть-чуть — и «вау».",
  "Очередь движется, обещаем.",
  "Готовим холст под вашу идею.",
] as const;

const PROCESS_PHRASES = [
  "Взмахиваем волшебной палочкой…",
  "Смешиваем цвета и настроение.",
  "Нейросеть рисует ваш сюжет.",
  "Добавляем щепотку света.",
  "Шлифуем детали…",
  "Почти готово — не моргайте.",
  "Собираем картинку по кусочкам.",
  "Фантазия превращается в JPEG.",
  "Коты в серверной уже одобрили.",
  "Пиксели не спят — работают.",
  "Это не баг, это арт в процессе.",
  "Загружаем вдохновение…",
  "Рисуем быстрее, чем вы думаете.",
  "Секретный соус нейросети наливается.",
  "Ещё один взмах — и готово.",
  "Красота не терпит спешки (но спешит).",
  "Последние штрихи…",
  "Полируем результат.",
  "Упаковываем шедевр.",
  "Сейчас будет то, ради чего жали кнопку.",
  "Генерируем ваш кадр…",
  "Делаем картинку под ваш запрос.",
] as const;

const PREPARING_PHRASES = [
  "Готовим запрос…",
  "Загружаем вашу идею…",
  "Настраиваем палитру…",
  "Скоро начнём рисовать…",
] as const;

const ALL_ACTIVE_PHRASES = [
  ...PREPARING_PHRASES,
  ...QUEUE_PHRASES,
  ...PROCESS_PHRASES,
] as const;

export function phrasesForStatus(status: string): readonly string[] {
  switch (status) {
    case "preparing":
      return PREPARING_PHRASES;
    case "waiting":
    case "queuing":
      return QUEUE_PHRASES;
    case "generating":
      return PROCESS_PHRASES;
    default:
      return ALL_ACTIVE_PHRASES;
  }
}

export function pickRandomPhrase(
  pool: readonly string[],
  exclude?: string,
): string {
  if (pool.length === 0) return "Обработка…";
  if (pool.length === 1) return pool[0];
  let next = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (next === exclude && guard < 12) {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  }
  return next;
}
