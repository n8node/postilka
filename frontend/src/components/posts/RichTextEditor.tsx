"use client";

import {
  Bold,
  Braces,
  Code2,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EMOJI = ["😀", "😂", "🔥", "🚀", "❤️", "👍", "🎉", "✨", "🤝", "📈", "💡", "👀", "🙌", "📌", "✅", "⭐", "🎯", "📷"];

function escapeText(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function safeURL(value: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? "");
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName.toLowerCase();
  if (tag === "ul" || tag === "ol") {
    return Array.from(node.children)
      .map((child, index) => {
        const value = Array.from(child.childNodes).map(serializeNode).join("");
        return `${tag === "ol" ? `${index + 1}.` : "•"} ${value}`;
      })
      .join("\n");
  }
  const children = Array.from(node.childNodes).map(serializeNode).join("");
  if (tag === "br") return "\n";
  if (tag === "b" || tag === "strong") return `<b>${children}</b>`;
  if (tag === "i" || tag === "em") return `<i>${children}</i>`;
  if (tag === "u" || tag === "ins") return `<u>${children}</u>`;
  if (tag === "s" || tag === "strike" || tag === "del") return `<s>${children}</s>`;
  if (tag === "code") return `<code>${children}</code>`;
  if (tag === "pre") return `<pre>${children}</pre>`;
  if (tag === "tg-spoiler" || (tag === "span" && node.classList.contains("tg-spoiler"))) {
    return `<tg-spoiler>${children}</tg-spoiler>`;
  }
  if (tag === "a") {
    const href = safeURL(node.getAttribute("href"));
    return href ? `<a href="${escapeText(href)}">${children}</a>` : children;
  }
  if (tag === "blockquote") {
    return node.hasAttribute("expandable")
      ? `<blockquote expandable>${children}</blockquote>`
      : `<blockquote>${children}</blockquote>`;
  }
  if (tag === "li") return children;
  if (tag === "div" || tag === "p") return `${children}\n`;
  return children;
}

export function toTelegramHTML(element: HTMLElement) {
  return Array.from(element.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Props = {
  html: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function RichTextEditor({ html, onChange, placeholder, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || editor.innerHTML === html) return;
    editor.innerHTML = html;
  }, [html]);

  function emit() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(toTelegramHTML(editor), editor.innerText.replace(/\n{3,}/g, "\n\n").trim());
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    emit();
  }

  function wrapSelection(tag: "tg-spoiler" | "blockquote") {
    editorRef.current?.focus();
    const selection = window.getSelection();
    const selected = selection?.toString() || (tag === "tg-spoiler" ? "скрытый текст" : "раскрываемая цитата");
    const htmlValue =
      tag === "tg-spoiler"
        ? `<tg-spoiler>${escapeText(selected)}</tg-spoiler>`
        : `<blockquote expandable>${escapeText(selected)}</blockquote>`;
    document.execCommand("insertHTML", false, htmlValue);
    emit();
  }

  function inlineCode() {
    editorRef.current?.focus();
    const selected = window.getSelection()?.toString() || "код";
    document.execCommand("insertHTML", false, `<code>${escapeText(selected)}</code>`);
    emit();
  }

  function addLink() {
    const value = window.prompt("Ссылка (https://…)");
    if (!value) return;
    const href = safeURL(value);
    if (!href) {
      window.alert("Укажите корректную HTTP(S)-ссылку");
      return;
    }
    command("createLink", href);
  }

  function insertEmoji(emoji: string) {
    command("insertText", emoji);
    setEmojiOpen(false);
  }

  const tools = [
    { label: "Жирный", icon: Bold, action: () => command("bold") },
    { label: "Курсив", icon: Italic, action: () => command("italic") },
    { label: "Подчёркнутый", icon: Underline, action: () => command("underline") },
    { label: "Зачёркнутый", icon: Strikethrough, action: () => command("strikeThrough") },
    { label: "Ссылка", icon: Link2, action: addLink },
    { label: "Спойлер", icon: Braces, action: () => wrapSelection("tg-spoiler") },
    { label: "Цитата", icon: Quote, action: () => command("formatBlock", "blockquote") },
    { label: "Раскрываемая цитата", icon: Quote, action: () => wrapSelection("blockquote") },
    { label: "Код в строке", icon: Code2, action: inlineCode },
    { label: "Блок кода", icon: Code2, action: () => command("formatBlock", "pre") },
    { label: "Маркированный список", icon: List, action: () => command("insertUnorderedList") },
    { label: "Нумерованный список", icon: ListOrdered, action: () => command("insertOrderedList") },
    { label: "Очистить форматирование", icon: Eraser, action: () => command("removeFormat") },
    { label: "Отменить", icon: Undo2, action: () => command("undo") },
    { label: "Повторить", icon: Redo2, action: () => command("redo") },
  ];

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-white", disabled && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-zinc-50 p-2">
        {tools.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
            disabled={disabled}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-white hover:text-text disabled:cursor-not-allowed"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            title="Эмодзи"
            aria-label="Эмодзи"
            onClick={() => setEmojiOpen((value) => !value)}
            disabled={disabled}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-white hover:text-text"
          >
            <Smile className="h-4 w-4" />
          </button>
          {emojiOpen && (
            <div className="absolute left-0 top-9 z-30 grid w-64 grid-cols-6 gap-1 rounded-lg border border-border bg-white p-2 shadow-lg">
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="rounded p-1 text-lg hover:bg-zinc-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? "Напишите текст публикации…"}
        onInput={emit}
        onBlur={emit}
        className="min-h-40 px-4 py-3 text-[15px] leading-6 outline-none empty:before:pointer-events-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)] [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_pre]:my-2 [&_pre]:rounded [&_pre]:bg-zinc-100 [&_pre]:p-2"
      />
    </div>
  );
}
