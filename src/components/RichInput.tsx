"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { PREMIUM_EMOJIS } from "@/lib/premium-emoji";

const PE_SRC: Record<string, string> = Object.fromEntries(
  PREMIUM_EMOJIS.map((e) => [e.id, e.src])
);

const TOKEN_RE = /\{pe:([a-z0-9_-]+)\}/gi;

export interface RichInputHandle {
  focus: () => void;
  /** Вставляет фрагмент (обычный эмодзи или токен {pe:id}) в позицию курсора. */
  insert: (fragment: string) => void;
}

interface RichInputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  className?: string;
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

/**
 * Поле ввода с инлайн премиум-эмодзи (как в Telegram). Значение — строка с
 * токенами {pe:id}, но в поле они показываются картинками.
 */
export const RichInput = forwardRef<RichInputHandle, RichInputProps>(
  function RichInput({ value, onChange, onKeyDown, placeholder, className }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const lastValue = useRef<string>("\u0000");
    // Запоминаем позицию курсора, чтобы вставлять эмодзи туда даже после
    // того, как фокус ушёл на панель выбора эмодзи.
    const savedRange = useRef<Range | null>(null);

    const saveCaret = () => {
      const node = el.current;
      const sel = window.getSelection();
      if (node && sel && sel.rangeCount && node.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    };

    const emit = () => {
      const node = el.current;
      if (!node) return;
      let v = serialize(node);
      if (v === "\n" || v.trim() === "") {
        node.innerHTML = "";
        v = "";
      }
      lastValue.current = v;
      onChange(v);
    };

    // Внешнее изменение value (очистка после отправки и т.п.) → перерисовка.
    useEffect(() => {
      const node = el.current;
      if (!node) return;
      if (value !== lastValue.current) {
        node.innerHTML = toHtml(value);
        lastValue.current = value;
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus: () => el.current?.focus(),
      insert: (fragment: string) => {
        const node = el.current;
        if (!node) return;
        node.focus();
        const sel = window.getSelection();
        let range: Range;
        // Приоритет — сохранённая позиция курсора (до клика по панели).
        if (
          savedRange.current &&
          node.contains(savedRange.current.startContainer)
        ) {
          range = savedRange.current;
        } else if (sel && sel.rangeCount && node.contains(sel.anchorNode)) {
          range = sel.getRangeAt(0);
        } else {
          range = document.createRange();
          range.selectNodeContents(node);
          range.collapse(false);
        }
        range.deleteContents();
        const temp = document.createElement("div");
        temp.innerHTML = toHtml(fragment);
        const frag = document.createDocumentFragment();
        let lastNode: ChildNode | null = null;
        while (temp.firstChild) {
          lastNode = temp.firstChild;
          frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        if (lastNode) {
          const after = document.createRange();
          after.setStartAfter(lastNode);
          after.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(after);
          savedRange.current = after.cloneRange();
        }
        emit();
      },
    }));

    return (
      <div
        ref={el}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={saveCaret}
        onMouseUp={saveCaret}
        onBlur={saveCaret}
        onKeyDown={onKeyDown}
        className={className}
      />
    );
  }
);
