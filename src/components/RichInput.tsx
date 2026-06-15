"use client";

import { useEffect, useRef } from "react";
import { PREMIUM_EMOJIS } from "@/lib/premium-emoji";

const PE_SRC: Record<string, string> = Object.fromEntries(
  PREMIUM_EMOJIS.map((e) => [e.id, e.src])
);

const TOKEN_RE = /\{pe:([a-z0-9_-]+)\}/gi;

interface RichInputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  /** Внешняя ссылка на редактируемый элемент (для фокуса). */
  editableRef?: React.RefObject<HTMLDivElement | null>;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Строка с токенами {pe:id} → HTML с инлайн-картинками. */
function toHtml(value: string): string {
  let html = "";
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(value)) !== null) {
    html += escapeHtml(value.slice(last, m.index)).replace(/\n/g, "<br>");
    const src = PE_SRC[m[1]];
    html += src
      ? `<img data-pe="${m[1]}" src="${src}" alt="" contenteditable="false" style="display:inline-block;width:1.4em;height:1.4em;vertical-align:-0.3em;object-fit:contain;margin:0 1px;" />`
      : escapeHtml(m[0]);
    last = m.index + m[0].length;
  }
  html += escapeHtml(value.slice(last)).replace(/\n/g, "<br>");
  return html;
}

/** DOM contenteditable → строка с токенами {pe:id}. */
function serialize(node: HTMLElement): string {
  let out = "";
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
    else if (n.nodeName === "BR") out += "\n";
    else if (n.nodeName === "IMG") {
      const id = (n as HTMLElement).getAttribute("data-pe");
      out += id ? `{pe:${id}}` : "";
    } else if (n.nodeName === "DIV") {
      out += "\n" + serialize(n as HTMLElement);
    } else out += (n as HTMLElement).textContent ?? "";
  });
  return out;
}

function placeCaretEnd(el: HTMLElement) {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    /* ignore */
  }
}

/**
 * Поле ввода с инлайн премиум-эмодзи (как в Telegram). Хранит значение строкой
 * с токенами {pe:id}, но показывает их картинками прямо в поле.
 */
export function RichInput({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className,
  editableRef,
}: RichInputProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>("\u0000"); // заведомо отличается от ""

  // Внешнее изменение value (вставка эмодзи, очистка) → перерисовываем DOM.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastValue.current) {
      el.innerHTML = toHtml(value);
      lastValue.current = value;
      if (document.activeElement === el || value) placeCaretEnd(el);
    }
  }, [value]);

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    let v = serialize(el);
    // Нормализуем «пустоту», чтобы сработал placeholder (:empty).
    if (v === "\n" || v.trim() === "") {
      el.innerHTML = "";
      v = "";
    }
    lastValue.current = v;
    onChange(v);
  };

  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (editableRef) editableRef.current = node;
      }}
      contentEditable
      role="textbox"
      aria-multiline="true"
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={className}
    />
  );
}
