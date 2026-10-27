"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function escapeHTML(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function safeURL(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function sanitizeEmailHTML(value: string) {
  if (typeof window === "undefined") return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  for (const node of Array.from(doc.querySelectorAll("script, iframe, object, embed, form, video, audio"))) {
    node.remove();
  }
  for (const node of Array.from(doc.body.querySelectorAll("*"))) {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
      }
      if ((name === "href" || name === "src") && attribute.value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    }
  }
  return doc.body.innerHTML;
}

export function EmailRichEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const [htmlMode, setHTMLMode] = useState(false);
  const [htmlValue, setHTMLValue] = useState(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || editor.innerHTML === value) return;
    editor.innerHTML = value || "";
    setHTMLValue(value);
  }, [value]);

  function emit() {
    const html = sanitizeEmailHTML(editorRef.current?.innerHTML ?? "");
    onChange(html);
    setHTMLValue(html);
  }

  function command(name: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    emit();
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount) rangeRef.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !rangeRef.current || !editorRef.current) return;
    editorRef.current.focus();
    selection.removeAllRanges();
    selection.addRange(rangeRef.current);
  }

  function insertLink() {
    saveSelection();
    const url = window.prompt("Адрес ссылки", "https://");
    const safe = url ? safeURL(url) : "";
    if (!safe) return;
    restoreSelection();
    command("createLink", safe);
  }

  function insertImage() {
    const url = window.prompt("Адрес изображения", "https://");
    const safe = url ? safeURL(url) : "";
    if (!safe) return;
    command("insertImage", safe);
  }

  function toggleHTMLMode() {
    if (!htmlMode) {
      setHTMLValue(sanitizeEmailHTML(editorRef.current?.innerHTML ?? ""));
    } else {
      const next = sanitizeEmailHTML(htmlValue);
      if (editorRef.current) editorRef.current.innerHTML = next;
      onChange(next);
    }
    setHTMLMode((current) => !current);
  }

  const tools = [
    ["Заголовок", Heading2, () => command("formatBlock", "h2")],
    ["Подзаголовок", Heading3, () => command("formatBlock", "h3")],
    ["Жирный", Bold, () => command("bold")],
    ["Курсив", Italic, () => command("italic")],
    ["Подчёркнутый", Underline, () => command("underline")],
    ["Зачёркнутый", Strikethrough, () => command("strikeThrough")],
    ["Маркированный список", List, () => command("insertUnorderedList")],
    ["Нумерованный список", ListOrdered, () => command("insertOrderedList")],
    ["Цитата", Quote, () => command("formatBlock", "blockquote")],
    ["Ссылка", Link2, insertLink],
    ["Изображение", ImagePlus, insertImage],
    ["По левому краю", AlignLeft, () => command("justifyLeft")],
    ["По центру", AlignCenter, () => command("justifyCenter")],
    ["По правому краю", AlignRight, () => command("justifyRight")],
    ["Код", Code2, () => command("formatBlock", "pre")],
    ["Очистить форматирование", Eraser, () => command("removeFormat")],
    ["Отменить", Undo2, () => command("undo")],
    ["Повторить", Redo2, () => command("redo")],
  ] as const;

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {tools.map(([title, Icon, action]) => (
          <button key={title} type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={action} className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-slate-900">
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button type="button" title="HTML-код" onClick={toggleHTMLMode} className={`rounded-md px-2 py-1 text-xs font-medium ${htmlMode ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}>
          HTML
        </button>
      </div>
      {htmlMode ? (
        <textarea value={htmlValue} onChange={(event) => { setHTMLValue(event.target.value); onChange(event.target.value); }} rows={12} className="min-h-[280px] w-full resize-y px-4 py-3 font-mono text-xs leading-5 outline-none" placeholder={placeholder} />
      ) : (
        <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder ?? "Введите текст письма…"} onInput={emit} onBlur={emit} className="min-h-[280px] px-4 py-3 text-sm leading-6 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_pre]:rounded-md [&_pre]:bg-slate-100 [&_pre]:p-3" />
      )}
      <div className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-400">
        Можно редактировать визуально или переключиться в HTML-режим.
      </div>
    </div>
  );
}