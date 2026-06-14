"use client";

import { use } from "react";
import { ContactPicker } from "@/components/ContactPicker";
import { useChats } from "@/lib/chat-store";
import { useContacts } from "@/lib/contacts-store";
import { useToast } from "@/components/Toast";

export default function AddAdminPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const { getConversation, addAdmins } = useChats();
  const { contacts } = useContacts();
  const { show } = useToast();
  const conv = getConversation(chatId);

  // Администраторов назначаем только из подписчиков/участников чата.
  const members = (conv?.memberIds ?? [])
    .map((id) => contacts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <ContactPicker
      title="Добавить администратора"
      source={members}
      excludeIds={conv?.adminIds ?? []}
      confirmLabel="Назначить"
      emptyText="Сначала добавьте участников — администраторов можно назначить только из них"
      onConfirm={(ids) => {
        if (ids.length) {
          addAdmins(chatId, ids);
          show(`Назначено администраторов: ${ids.length}`);
        }
      }}
    />
  );
}
