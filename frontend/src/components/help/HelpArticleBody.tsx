"use client";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "DIV",
  "H2",
  "H3",
  "H4",
  "UL",
  "OL",
  "LI",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "BLOCKQUOTE",
  "HR",
  "SPAN",
  "A",
  "IMG",
]);

function safeUrl(raw: string, image: boolean) {
  const value = raw.trim();
  if (!value) return "";
  if (
    value.startsWith("/app/api/v1/help/images/") ||
    value.startsWith("/api/v1/help/images/")
  ) {
    return value;
  }
  try {
    const url = new URL(value, "https://postilka.ru");
    if (url.protocol === "http:" || url.protocol === "https:") return value;
    if (!image && value.startsWith("/") && !value.startsWith("//")) return value;
  } catch {
    return "";
  }
  return "";
}

export function sanitizeHelpHtml(html: string) {
  if (typeof window === "undefined" || !html.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "style") {
            el.removeAttribute(attr.name);
            continue;
          }
          if (el.tagName === "A" && name === "href") {
            const href = safeUrl(attr.value, false);
            if (!href) el.removeAttribute("href");
            else {
              el.setAttribute("href", href);
              el.setAttribute("rel", "noopener noreferrer");
            }
          } else if (el.tagName === "IMG" && name === "src") {
            const src = safeUrl(attr.value, true);
            if (!src) el.remove();
            else el.setAttribute("src", src);
          } else if (
            !(el.tagName === "A" && (name === "target" || name === "rel" || name === "title")) &&
            !(el.tagName === "IMG" && (name === "alt" || name === "title"))
          ) {
            if (name !== "href" && name !== "src") el.removeAttribute(attr.name);
          }
        }
        walk(el);
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export function HelpArticleBody({ html }: { html: string }) {
  const safe = sanitizeHelpHtml(html);
  if (!safe) {
    return (
      <p className="text-sm text-zinc-500">
        Текст этой статьи ещё не заполнен.
      </p>
    );
  }
  return (
    <div
      className="help-article-body space-y-3 text-sm leading-6 text-zinc-800 dark:text-zinc-200 [&_a]:text-indigo-600 [&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-zinc-200 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
