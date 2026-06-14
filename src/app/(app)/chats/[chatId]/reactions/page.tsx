"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { Switch } from "@/components/Switch";
import { useChats } from "@/lib/chat-store";

const ALLOWED =
  "👍 ❤️ 🔥 🎉 😍 💪 💩 🔟 😂 😮 😢 😡 👎 🤬 🙃 😎 🤩 😴 😇 🥰 🤝 🐶 🦄 ⛄ 🎄 🤖 👏 🙏 🖤 🍑 ❗ 🚀 👀 💋".split(
    " "
  );

function reactionsLabel(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} реакция`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20))
    return `${n} реакции`;
  return `${n} реакций`;
}

export default function ChannelReactionsPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, updateChannel } = useChats();
  const conv = getConversation(chatId);

  // Управлять реакциями может только владелец группы.
  useEffect(() => {
    if (conv && !conv.isOwner) router.replace(`/chats/${chatId}/group`);
  }, [conv, chatId, router]);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;
  if (!conv.isOwner) return null;

  const enabled = conv.reactionsEnabled ?? true;
  const count = conv.reactionsCount ?? 8;

  return (
    <SubScreen title="Реакции">
      <div className="pt-4">
        <Group>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] text-foreground">Реакции</span>
            <Switch
              checked={enabled}
              onChange={(v) => updateChannel(chatId, { reactionsEnabled: v })}
            />
          </div>
        </Group>
      </div>

      {enabled && (
        <>
          <SectionTitle>Количество реакций</SectionTitle>
          <Group>
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-[13px] text-muted">
                <span>1</span>
                <span className="text-[15px] font-semibold text-foreground">
                  {reactionsLabel(count)}
                </span>
                <span>8</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={count}
                onChange={(e) =>
                  updateChannel(chatId, {
                    reactionsCount: Number(e.target.value),
                  })
                }
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-separator accent-accent"
              />
            </div>
          </Group>

          <SectionTitle>Разрешённые реакции</SectionTitle>
          <Group>
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5 text-2xl">
                {ALLOWED.map((e, i) => (
                  <span key={i} className="leading-none">
                    {e}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-[15px] text-muted"
              >
                Редактировать реакции…
              </button>
            </div>
          </Group>
          <GroupHint>
            Подписчики смогут ставить выбранные реакции на посты канала.
          </GroupHint>
        </>
      )}
    </SubScreen>
  );
}
