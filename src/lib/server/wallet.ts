import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { uid } from "@/lib/utils";
import { mapTransfer } from "./map-rows";
import type { DirectoryPerson, WalletSnapshot } from "@/lib/types";

const STARTER_CENTS = 5000;

async function ensureWallet(userId: string, starter = STARTER_CENTS) {
  const sql = await getSql();
  const existing = await sql`select user_id from wallets where user_id = ${userId} limit 1`;
  if (existing.length === 0) {
    await sql`
      insert into wallets (user_id, balance_cents) values (${userId}, ${starter})
    `;
  }
}

export const getWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WalletSnapshot> => {
    await ensureWallet(context.userId);
    const sql = await getSql();
    const rows = await sql<{ balance_cents: number }>`
      select balance_cents from wallets where user_id = ${context.userId} limit 1
    `;
    const transfers = await sql`
      select * from transfers
      where from_user_id = ${context.userId} or to_user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    return {
      balanceCents: Number(rows[0]?.balance_cents ?? 0),
      transfers: transfers.map(mapTransfer),
    };
  });

export const listDirectory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DirectoryPerson[]> => {
    const sql = await getSql();
    const helpers = await sql<{ user_id: string; name: string }>`
      select user_id, name from helpers
      where user_id is not null
      order by created_at desc
      limit 40
    `;
    const requesters = await sql<{ user_id: string; name: string }>`
      select requester_id as user_id, requester_name as name from incidents
      where requester_id is not null
      order by created_at desc
      limit 40
    `;
    const seen = new Set<string>();
    const out: DirectoryPerson[] = [];
    for (const row of [...helpers, ...requesters]) {
      if (!row.user_id || row.user_id === context.userId || seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      out.push({ userId: row.user_id, name: row.name || "Helper" });
    }
    return out.slice(0, 24);
  });

export const sendAid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    amountCents: number;
    toIncidentId?: string | null;
    toUserId?: string | null;
    memo?: string;
    fromName: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const amount = Math.round(data.amountCents);
    if (!Number.isFinite(amount) || amount < 100) {
      throw new Error("Minimum send is $1.00.");
    }
    if (!data.toIncidentId && !data.toUserId) {
      throw new Error("Choose someone to receive the aid.");
    }
    await ensureWallet(context.userId);
    const sql = await getSql();
    const bal = await sql<{ balance_cents: number }>`
      select balance_cents from wallets where user_id = ${context.userId} limit 1
    `;
    const current = Number(bal[0]?.balance_cents ?? 0);
    if (current < amount) throw new Error("Not enough aid credit.");

    let recipientId: string | null = data.toUserId ?? null;
    if (data.toIncidentId && !recipientId) {
      const inc = await sql<{ requester_id: string | null }>`
        select requester_id from incidents where id = ${data.toIncidentId} limit 1
      `;
      recipientId = inc[0]?.requester_id ?? null;
    }

    await sql`
      update wallets
      set balance_cents = balance_cents - ${amount}, updated_at = now()
      where user_id = ${context.userId}
    `;

    if (recipientId && recipientId !== context.userId) {
      await ensureWallet(recipientId, 0);
      await sql`
        update wallets
        set balance_cents = balance_cents + ${amount}, updated_at = now()
        where user_id = ${recipientId}
      `;
    }

    if (data.toIncidentId) {
      await sql`
        update incidents
        set aid_cents = aid_cents + ${amount}, updated_at = now()
        where id = ${data.toIncidentId}
      `;
      await sql`
        insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
        values (
          ${uid()}, ${data.toIncidentId}, ${context.userId}, ${data.fromName},
          ${"aid"}, ${`Aid of $${(amount / 100).toFixed(2)} sent.`}
        )
      `;
    }

    await sql`
      insert into transfers (
        id, from_user_id, from_name, to_user_id, to_incident_id, amount_cents, memo
      ) values (
        ${uid()}, ${context.userId}, ${data.fromName}, ${recipientId},
        ${data.toIncidentId ?? null}, ${amount}, ${data.memo?.trim() || null}
      )
    `;

    const next = await sql<{ balance_cents: number }>`
      select balance_cents from wallets where user_id = ${context.userId} limit 1
    `;
    return { ok: true as const, balanceCents: Number(next[0]?.balance_cents ?? 0) };
  });
