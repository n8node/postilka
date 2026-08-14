"use client";

import Link from "next/link";
import type { ChannelListItem } from "@/lib/api";
import type { MissionPlanButton, MissionPlanItem } from "@/lib/missions-api";
import { MISSION_ROLE_LABEL } from "@/lib/missions-api";
import type { WorkspaceFile } from "@/lib/files-api";
import { postFormatLabel } from "@/lib/posts-display";

function storedFormat(format: string | undefined) {
  const value = (format || "message").toLowerCase();
  if (value === "wall_post" || value === "feed" || value === "brief") return "message";
  return value;
}

export function formatsForChannels(channels: ChannelListItem[]) {
  if (channels.length === 0) return ["message"];
  const lists = channels.map((ch) => (ch.publish_capabilities?.formats?.length ? ch.publish_capabilities.formats : ["message"]).map(storedFormat));
  const first = lists[0];
  const intersection = first.filter((format) => lists.every((list) => list.includes(format)));
  return intersection.length ? [...new Set(intersection)] : [...new Set(first)];
}

export function channelsForItem(
  item: MissionPlanItem,
  missionChannelIds: string[],
  channels: ChannelListItem[],
) {
  const ids = item.channel_ids?.length ? item.channel_ids : missionChannelIds;
  return channels.filter((ch) => ids.includes(ch.id));
}

export function itemAllowsButtons(format: string, channels: ChannelListItem[]) {
  if (!["message", "rich_message", "article"].includes(format)) return false;
  return channels.length > 0 && channels.every((ch) => ch.publish_capabilities?.inline_buttons);
}

const MEDIA_KIND_LABEL: Record<string, string> = {
  none: "Без медиа",
  photo: "Фото",
  video: "Видео",
  album: "Альбом",
};

export function MissionPlanItemCard({
  item,
  index,
  channels,
  files,
  closed,
  onChange,
}: {
  item: MissionPlanItem;
  index: number;
  channels: ChannelListItem[];
  files: WorkspaceFile[];
  closed: boolean;
  onChange: (next: MissionPlanItem) => void;
}) {
  const format = storedFormat(item.format);
  const formats = formatsForChannels(channels);
  const allowButtons = itemAllowsButtons(format, channels);
  const allowPhoto = channels.some((ch) => ch.publish_capabilities?.photo || ch.publish_capabilities?.composer_media);
  const allowVideo = channels.some((ch) => ch.publish_capabilities?.video || ch.publish_capabilities?.composer_media);
  const maxMedia = Math.min(...channels.map((ch) => ch.publish_capabilities?.max_media || 10), 10) || 10;
  const photos = files.filter((f) => f.mime_type.startsWith("image/"));
  const videos = files.filter((f) => f.mime_type.startsWith("video/"));
  const selected = new Set(item.file_ids || []);
  const needsMedia = format === "story" || format === "short_video" || format === "video" || format === "shorts";
  const mediaKind = item.media_kind || (needsMedia ? "video" : selected.size ? "photo" : "none");

  function toggleFile(id: string) {
    const current = item.file_ids || [];
    const has = current.includes(id);
    let next = has ? current.filter((x) => x !== id) : [...current, id];
    const limit = needsMedia || mediaKind !== "album" ? 1 : maxMedia;
    if (!has && next.length > limit) next = next.slice(-limit);
    onChange({ ...item, file_ids: next, media_kind: mediaKind === "none" ? (photos.some((f) => f.id === id) ? "photo" : "video") : mediaKind });
  }

  function setButtons(buttons: MissionPlanButton[]) {
    onChange({ ...item, buttons });
  }

  return (
    <li className="space-y-2 rounded-md border border-border px-2 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{MISSION_ROLE_LABEL[item.role] || item.role}</span>
        <span className="text-muted">{postFormatLabel(format)}</span>
      </div>
      <p className="line-clamp-3 text-muted">{item.text || item.title || "Без текста"}</p>
      {closed ? null : (
        <>
          <label className="block text-[11px] text-muted">
            Вид контента
            <select
              value={formats.includes(format) ? format : formats[0] || "message"}
              onChange={(e) => onChange({ ...item, format: e.target.value, buttons: itemAllowsButtons(e.target.value, channels) ? item.buttons : [] })}
              className="mt-0.5 w-full rounded border border-border bg-bg px-1.5 py-1 text-xs"
            >
              {formats.map((value) => (
                <option key={value} value={value}>
                  {postFormatLabel(value)}
                </option>
              ))}
            </select>
          </label>
          {format === "video" || format === "shorts" ? (
            <input
              value={item.title || ""}
              onChange={(e) => onChange({ ...item, title: e.target.value })}
              placeholder="Название видео"
              className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs"
            />
          ) : null}
          <label className="block text-[11px] text-muted">
            Медиа
            <select
              value={mediaKind}
              onChange={(e) => onChange({ ...item, media_kind: e.target.value, file_ids: e.target.value === "none" ? [] : item.file_ids })}
              className="mt-0.5 w-full rounded border border-border bg-bg px-1.5 py-1 text-xs"
            >
              <option value="none">{MEDIA_KIND_LABEL.none}</option>
              {allowPhoto ? <option value="photo">{MEDIA_KIND_LABEL.photo}</option> : null}
              {allowVideo ? <option value="video">{MEDIA_KIND_LABEL.video}</option> : null}
              {allowPhoto && maxMedia > 1 && !needsMedia ? <option value="album">{MEDIA_KIND_LABEL.album}</option> : null}
            </select>
          </label>
          {mediaKind !== "none" ? (
            <div className="max-h-28 space-y-1 overflow-y-auto rounded border border-border bg-bg p-1">
              {(mediaKind === "video" ? videos : photos).length === 0 ? (
                <p className="text-[11px] text-muted">В файлах нет подходящих материалов.</p>
              ) : (
                (mediaKind === "video" ? videos : photos).map((file) => (
                  <label key={file.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleFile(file.id)}
                    />
                    <span className="truncate">{file.name}</span>
                  </label>
                ))
              )}
            </div>
          ) : null}
          {needsMedia && !(item.file_ids || []).length ? (
            <p className="text-[11px] text-amber-800">Для этого формата нужен файл до утверждения хода.</p>
          ) : null}
          {item.image_prompt ? (
            <p className="text-[11px] text-muted">
              Нужно фото: {item.image_prompt}{" "}
              <Link href="/ai" className="text-accent hover:underline">
                сгенерировать в ИИ
              </Link>
              {" · "}
              <Link href="/files" className="text-accent hover:underline">
                файлы
              </Link>
            </p>
          ) : null}
          {item.video_prompt ? (
            <p className="text-[11px] text-muted">
              Нужно видео: {item.video_prompt}{" "}
              <Link href="/ai" className="text-accent hover:underline">
                сгенерировать в ИИ
              </Link>
            </p>
          ) : null}
          {allowButtons ? (
            <div className="space-y-1">
              <p className="text-[11px] text-muted">Кнопки-ссылки</p>
              {(item.buttons || []).map((btn, btnIdx) => (
                <div key={`${index}-btn-${btnIdx}`} className="flex gap-1">
                  <input
                    value={btn.text}
                    onChange={(e) => {
                      const next = [...(item.buttons || [])];
                      next[btnIdx] = { ...btn, text: e.target.value };
                      setButtons(next);
                    }}
                    placeholder="Текст"
                    className="w-24 rounded border border-border bg-bg px-1 py-0.5"
                  />
                  <input
                    value={btn.url}
                    onChange={(e) => {
                      const next = [...(item.buttons || [])];
                      next[btnIdx] = { ...btn, url: e.target.value };
                      setButtons(next);
                    }}
                    placeholder="https://"
                    className="min-w-0 flex-1 rounded border border-border bg-bg px-1 py-0.5"
                  />
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={() => setButtons((item.buttons || []).filter((_, i) => i !== btnIdx))}
                  >
                    ×
                  </button>
                </div>
              ))}
              {(item.buttons || []).length < 8 ? (
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setButtons([...(item.buttons || []), { text: "", url: "" }])}
                >
                  Добавить кнопку
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-muted">Кнопки недоступны для этого формата или каналов.</p>
          )}
        </>
      )}
    </li>
  );
}
