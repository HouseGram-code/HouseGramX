"use client";

import { use } from "react";
import { ContactPicker } from "@/components/ContactPicker";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

export default function AddSubscriberPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const { getConversation, addMembers } = useChats();
  const { show } = useToast();
  const conv = getConversation(chatId);

  return (
    <ContactPicker
      title="Выберите подписчиков"
      excludeIds={conv?.memberIds ?? []}
      confirmLabel="Добавить"
      onConfirm={(ids) => {
        if (ids.length) {
          addMembers(chatId, ids);
          show(`Добавлено: ${ids.length}`);
        }
      }}
    />
  );
}
