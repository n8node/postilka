"use client";

import { Bold, Eraser, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = { value: string; onChange: (value: string) => void; placeholder?: string };

function escapeHTML(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function safeURL(value: string) { try { const url = new URL(value.trim()); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : ""; } catch { return ""; } }
function plainTextFromHTML(value: string) {
  if (typeof window === "undefined") return value;
  const doc = new DOMParser().parseFromString(value || "", "text/html");
  const cells = Array.from(doc.querySelectorAll("tr td, tr th"));
  const source = cells.length ? cells.map((cell) => cell.innerHTML).join("\n") : doc.body.innerHTML;
  const textDoc = new DOMParser().parseFromString(source, "text/html");
  return (textDoc.body.innerText || textDoc.body.textContent || "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function sanitizeHTML(value: string) {
  if (typeof window === "undefined") return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  for (const node of Array.from(doc.querySelectorAll("script,iframe,object,embed,form,video,audio"))) node.remove();
  for (const node of Array.from(doc.body.querySelectorAll("*"))) for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || ((name === "href" || name === "src") && attr.value.trim().toLowerCase().startsWith("javascript:"))) node.removeAttribute(attr.name);
  }
  return doc.body.innerHTML;
}
function initialDraft(value: string) { return /<\s*(tr|td|th)\b/i.test(value) ? plainTextFromHTML(value) : value; }

export function EmailRichEditor({ value, onChange, placeholder }: Props) {
  const [htmlMode, setHTMLMode] = useState(false);
  const [draft, setDraft] = useState(() => initialDraft(value));
  const lastValue = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const history = useRef<string[]>([]);
  const future = useRef<string[]>([]);

  useEffect(() => { if (value !== lastValue.current) { const next = initialDraft(value); setDraft(next); lastValue.current = value; } }, [value]);
  function emit(next: string, remember = true) { if (remember && next !== draft) { history.current.push(draft); future.current = []; } setDraft(next); lastValue.current = next; onChange(next); }
  function range() { const area = textareaRef.current; return area ? { start: area.selectionStart, end: area.selectionEnd } : null; }
  function wrap(open: string, close = open) { const selected = range(); if (!selected) return; const text = draft.slice(selected.start, selected.end) || "текст"; emit(`${draft.slice(0, selected.start)}${open}${text}${close}${draft.slice(selected.end)}`); }
  function link() { const selected = range(); const url = safeURL(window.prompt("Адрес ссылки", "https://") || ""); if (!selected || !url) return; const text = draft.slice(selected.start, selected.end) || url; emit(`${draft.slice(0, selected.start)}<a href="${escapeHTML(url)}">${escapeHTML(text)}</a>${draft.slice(selected.end)}`); }
  function undo() { const previous = history.current.pop(); if (!previous) return; future.current.push(draft); emit(previous, false); }
  function redo() { const next = future.current.pop(); if (!next) return; history.current.push(draft); emit(next, false); }
  function toggleHTML() { if (htmlMode) emit(sanitizeHTML(draft), false); setHTMLMode((current) => !current); }
  const tools = [["Заголовок", Heading2, () => wrap("<h2>", "</h2>")], ["Подзаголовок", Heading3, () => wrap("<h3>", "</h3>")], ["Жирный", Bold, () => wrap("<strong>", "</strong>")], ["Курсив", Italic, () => wrap("<em>", "</em>")], ["Подчёркнутый", Underline, () => wrap("<u>", "</u>")], ["Зачёркнутый", Strikethrough, () => wrap("<s>", "</s>")], ["Маркированный список", List, () => wrap("<ul><li>", "</li></ul>")], ["Нумерованный список", ListOrdered, () => wrap("<ol><li>", "</li></ol>")], ["Цитата", Quote, () => wrap("<blockquote>", "</blockquote>")], ["Ссылка", Link2, link], ["Очистить форматирование", Eraser, () => { const selected = range(); if (selected) emit(`${draft.slice(0, selected.start)}${plainTextFromHTML(draft.slice(selected.start, selected.end))}${draft.slice(selected.end)}`); }], ["Отменить", Undo2, undo], ["Повторить", Redo2, redo]] as const;
  return <div className="mt-1 overflow-hidden rounded-md border border-slate-200 bg-white"><div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">{tools.map(([title, Icon, action]) => <button key={title} type="button" title={title} onClick={action} className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-slate-900"><Icon className="h-4 w-4" /></button>)}<button type="button" onClick={toggleHTML} className={`rounded-md px-2 py-1 text-xs font-medium ${htmlMode ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}>HTML</button></div><textarea ref={textareaRef} value={draft} onChange={(event) => emit(event.target.value)} rows={htmlMode ? 12 : 10} className={`min-h-[280px] w-full resize-y px-4 py-3 text-sm leading-6 outline-none ${htmlMode ? "font-mono text-xs" : ""}`} placeholder={placeholder} /><div className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-400">Обычный текст сохраняется без тегов. Форматирование добавляется кнопками или в HTML-режиме.</div></div>;
}