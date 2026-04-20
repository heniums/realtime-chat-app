import pool from "..";
import { Reaction } from "../../types";

/**
 * Add a reaction from a user to a message. Idempotent via UNIQUE constraint —
 * ON CONFLICT DO NOTHING makes repeated calls a no-op.
 *
 * Returns the updated reactions array for the message (aggregated by emoji).
 */
export async function addReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<Reaction[]> {
  await pool.query(
    `INSERT INTO reactions (message_id, emoji, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, emoji, user_id) DO NOTHING`,
    [messageId, emoji, userId],
  );
  return getReactionsForMessage(messageId);
}

/**
 * Remove a user's reaction from a message. Returns the updated reactions
 * array. Silent no-op if the reaction didn't exist.
 */
export async function removeReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<Reaction[]> {
  await pool.query(
    `DELETE FROM reactions
     WHERE message_id = $1 AND emoji = $2 AND user_id = $3`,
    [messageId, emoji, userId],
  );
  return getReactionsForMessage(messageId);
}

/**
 * Aggregate all reactions for a single message, grouped by emoji.
 * Returns emojis in insertion order (first reactor first).
 */
export async function getReactionsForMessage(
  messageId: string,
): Promise<Reaction[]> {
  const result = await pool.query<{ emoji: string; user_ids: string[] }>(
    `SELECT emoji, array_agg(user_id ORDER BY id) AS user_ids
     FROM reactions
     WHERE message_id = $1
     GROUP BY emoji
     ORDER BY MIN(id)`,
    [messageId],
  );
  return result.rows.map((row) => ({
    emoji: row.emoji,
    userIds: row.user_ids,
  }));
}

/**
 * Batch-fetch aggregated reactions for many messages in a single query.
 * Returns a Map<messageId, Reaction[]>. Messages with no reactions are
 * absent from the map (caller should default to []).
 *
 * Used by getMessagesByRoom so message pagination stays O(1) queries.
 */
export async function getReactionsForMessages(
  messageIds: string[],
): Promise<Map<string, Reaction[]>> {
  const map = new Map<string, Reaction[]>();
  if (messageIds.length === 0) return map;

  const result = await pool.query<{
    message_id: string;
    emoji: string;
    user_ids: string[];
  }>(
    `SELECT message_id, emoji, array_agg(user_id ORDER BY id) AS user_ids
     FROM reactions
     WHERE message_id = ANY($1::uuid[])
     GROUP BY message_id, emoji
     ORDER BY message_id, MIN(id)`,
    [messageIds],
  );

  for (const row of result.rows) {
    const existing = map.get(row.message_id) ?? [];
    existing.push({ emoji: row.emoji, userIds: row.user_ids });
    map.set(row.message_id, existing);
  }

  return map;
}
