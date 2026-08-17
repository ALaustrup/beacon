import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import { mapChat } from "./map-rows";
import { ensureSeeded } from "./seed";
import type { ChatMessage } from "@/lib/types";

export const listChat = createServerFn({ method: "GET" })
  .validator((input: { channel?: string; incidentId?: string | null; after?: string | null } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    await ensureSeeded();
    const sql = await getSql();
    if (data.incidentId) {
      const rows = data.after
        ? await sql`
            select * from chat_messages
            where incident_id = ${data.incidentId} and created_at > ${data.after}
            order by created_at asc
            limit 200
          `
        : await sql`
            select * from chat_messages
            where incident_id = ${data.incidentId}
            order by created_at asc
            limit 200
          `;
      return rows.map(mapChat);
    }
    const channel = data.channel ?? "world";
    const rows = data.after
      ? await sql`
          select * from chat_messages
          where channel = ${channel} and incident_id is null and created_at > ${data.after}
          order by created_at asc
          limit 200
        `
      : await sql`
          select * from chat_messages
          where channel = ${channel} and incident_id is null
          order by created_at asc
          limit 200
        `;
    return rows.map(mapChat);
  });

export const postChat = createServerFn({ method: "POST" })
  .validator((input: {
    channel?: string;
    incidentId?: string | null;
    authorId?: string | null;
    authorName: string;
    lang: string;
    body: string;
  }) => input)
  .handler(async ({ data }): Promise<ChatMessage> => {
    const body = data.body.trim();
    if (!body) throw new Error("Write a message first.");
    const id = uid();
    const sql = await getSql();
    await sql`
      insert into chat_messages (
        id, channel, incident_id, author_id, author_name, lang, body
      ) values (
        ${id}, ${data.channel ?? "world"}, ${data.incidentId ?? null},
        ${data.authorId ?? null}, ${data.authorName.trim() || "Guest"},
        ${data.lang || "en"}, ${body}
      )
    `;
    const rows = await sql`select * from chat_messages where id = ${id} limit 1`;
    return mapChat(rows[0]!);
  });
