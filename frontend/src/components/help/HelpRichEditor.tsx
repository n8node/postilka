"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
} from "lucide-react";
import { uploadAdminHelpImage } from "@/lib/api";
import { sanitizeHelpHtml } from "@/components/help/HelpArticleBody";

type HelpRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

export function HelpRichEditor({ value, onChange }: HelpRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const emit = () => {
    const html = sanitizeHelpHtml(ref.current?.innerHTML || "");
    onChange(html);
  };

  const command = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const addLink = () => {
    const href = window.prompt("Адрес ссылки", "https://");
    if (!href) return;
    command("createLink", href);
  };

  const addImageUrl = () => {
    const src = window.prompt("Адрес изображения (https://…)");
    if (!src) return;
    command("insertImage", src);
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAdminHelpImage(file);
      command("insertImage", uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить изображение");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton title="Заголовок" onClick={() => command("formatBlock", "h2")}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Подзаголовок" onClick={() => command("formatBlock", "h3")}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Жирный" onClick={() => command("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Курсив" onClick={() => command("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Подчёркнутый" onClick={() => command("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Список" onClick={() => command("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Нумерованный список" onClick={() => command("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Цитата" onClick={() => command("formatBlock", "blockquote")}>
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Ссылка" onClick={addLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Картинка по ссылке" onClick={addImageUrl}>
          <ImagePlus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "Файл с диска"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            void onPickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="min-h-[280px] px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none [&_a]:text-indigo-600 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-lg"
      />
      {error ? <p className="border-t border-red-100 px-3 py-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-600 hover:bg-white"
    >
      {children}
    </button>
  );
}
