"use client";

import { Fragment, useMemo } from "react";
import { Emoji, EmojiStyle } from "emoji-picker-react";
import { PE_TOKEN_RE, getPremiumEmoji } from "@/lib/premium-emoji";

interface RichTextProps {
  text: string;
  /** Базовый размер шрифта (эмодзи чуть крупнее). */
  fontSize?: number;
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** Преобразует грапему-эмодзи в unified-код для emoji-picker-react. */
function toUnified(grapheme: string): string {
  return Array.from(grapheme)
    .map((ch) => ch.codePointAt(0)!.toString(16).padStart(4, "0"))
    .join("-");
}

type Segment = { type: "text"; value: string } | { type: "emoji"; value: string };

/** Разбивает текст на сегменты текст/эмодзи по грапемам. */
function segment(text: string): Segment[] {
  const out: Segment[] = [];
  let buffer = "";

  const pushText = () => {
    if (buffer) {
      out.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  // Intl.Segmenter корректно делит составные эмодзи (флаги, ZWJ-связки).
  let graphemes: string[];
  try {
    const seg = new Intl.Segmenter("ru", { granularity: "grapheme" });
    graphemes = Array.from(seg.segment(text), (s) => s.segment);
  } catch {
    graphemes = Array.from(text);
  }

  for (const g of graphemes) {
    if (EMOJI_RE.test(g)) {
      pushText();
      out.push({ type: "emoji", value: g });
    } else {
      buffer += g;
    }
  }
  pushText();
  return out;
}

/** Рендерит текст, заменяя эмодзи на картинки Apple (как в Telegram). */
export function RichText({ text, fontSize = 15 }: RichTextProps) {
  const emojiSize = Math.round(fontSize * 1.25);
  const peSize = Math.round(fontSize * 1.45);

  // Сначала вырезаем токены премиум-эмодзи {pe:id}, между ними — обычный текст.
  const parts = useMemo(() => {
    const out: Array<
      | { type: "pe"; id: string }
      | { type: "plain"; value: string }
    > = [];
    let lastIndex = 0;
    PE_TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PE_TOKEN_RE.exec(text)) !== null) {
      if (m.index > lastIndex) {
        out.push({ type: "plain", value: text.slice(lastIndex, m.index) });
      }
      out.push({ type: "pe", id: m[1] });
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) {
      out.push({ type: "plain", value: text.slice(lastIndex) });
    }
    return out;
  }, [text]);

  return (
    <span className="whitespace-pre-wrap break-words" style={{ fontSize }}>
      {parts.map((part, pi) => {
        if (part.type === "pe") {
          const pe = getPremiumEmoji(part.id);
          if (!pe) return <Fragment key={pi}>{`{pe:${part.id}}`}</Fragment>;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pi}
              src={pe.src}
              alt={pe.label}
              width={peSize}
              height={peSize}
              className="mx-px inline-block object-contain align-middle"
              style={{ width: peSize, height: peSize, verticalAlign: "-0.25em" }}
            />
          );
        }
        // Обычный текст: разбиваем на текст/эмодзи как раньше.
        return segment(part.value).map((seg, i) =>
          seg.type === "text" ? (
            <Fragment key={`${pi}-${i}`}>{seg.value}</Fragment>
          ) : (
            <span
              key={`${pi}-${i}`}
              className="inline-block align-middle"
              style={{ verticalAlign: "-0.15em" }}
            >
              <Emoji
                unified={toUnified(seg.value)}
                emojiStyle={EmojiStyle.APPLE}
                size={emojiSize}
              />
            </span>
          )
        );
      })}
    </span>
  );
}
