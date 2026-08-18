const PALETTE = [
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
];

export function channelCalendarColor(channelId: string, index = 0) {
  let hash = index;
  for (let i = 0; i < channelId.length; i++) {
    hash = (hash + channelId.charCodeAt(i) * (i + 1)) % PALETTE.length;
  }
  return PALETTE[hash]!;
}
