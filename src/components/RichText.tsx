"use client";

import { Fragment, useMemo } from "react";
import { Emoji, EmojiStyle } from "emoji-picker-react";

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
  const segments = useMemo(() => segment(text), [text]);
  const emojiSize = Math.round(fontSize * 1.25);

  return (
    <span className="whitespace-pre-wrap break-words" style={{ fontSize }}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <Fragment key={i}>{seg.value}</Fragment>
        ) : (
          <span
            key={i}
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
      )}
    </span>
  );
}
