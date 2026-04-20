import pool from "..";
import { Message } from "../../types";
import { MessageRow, mapMessage } from "./mappers";
import { getReactionsForMessages } from "./reactions";

interface CreateMessageInput {
  roomId: string;
  userId: string;
  username: string;
  text: string;
}

/**
 * Persist a new message. Returns the full Message (reactions: []).
 * Throws on FK violation if roomId or userId don't exist.
 */
export async function createMessage(
  input: CreateMessageInput,
): Promise<Message> {
  const result = await pool.query<MessageRow>(
    `INSERT INTO messages (room_id, user_id, username, text)
     VALUES ($1, $2, $3, $4)
     RETURNING id, room_id, user_id, username, text, created_at`,
    [input.roomId, input.userId, input.username, input.text],
  );
  return mapMessage(result.rows[0]);
}

interface GetMessagesOptions {
  /** Max messages to return. Default 50. */
  limit?: number;
  /**
   * Cursor for pagination. When provided, returns messages older than the
   * one with this ID. Used by the client to load earlier history.
   */
  before?: string;
}

/**
 * Get messages for a room with their aggregated reactions.
 * Returns newest-first (DESC) up to `limit`. Client reverses for display.
 */
export async function getMessagesByRoom(
  roomId: string,
  options: GetMessagesOptions = {},
): Promise<Message[]> {
  const limit = Math.min(options.limit ?? 50, 200);

  let rows: MessageRow[];
  if (options.before) {
    // Get the created_at of the cursor message, then fetch older
    const cursorResult = await pool.query<{ created_at: Date }>(
      "SELECT created_at FROM messages WHERE id = $1 AND room_id = $2",
      [options.before, roomId],
    );
    if (cursorResult.rows.length === 0) return [];
    const cursorTime = cursorResult.rows[0].created_at;

    const result = await pool.query<MessageRow>(
      `SELECT id, room_id, user_id, username, text, created_at
       FROM messages
       WHERE room_id = $1 AND created_at < $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [roomId, cursorTime, limit],
    );
    rows = result.rows;
  } else {
    const result = await pool.query<MessageRow>(
      `SELECT id, room_id, user_id, username, text, created_at
       FROM messages
       WHERE room_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [roomId, limit],
    );
    rows = result.rows;
  }

  if (rows.length === 0) return [];

  // Batch-fetch reactions for all returned messages
  const messageIds = rows.map((r) => r.id);
  const reactionsByMessage = await getReactionsForMessages(messageIds);

  return rows.map((row) => mapMessage(row, reactionsByMessage.get(row.id) ?? []));
}

/**
 * Find a single message by ID (without reactions — use getReactionsForMessage
 * if needed). Returns null if not found.
 */
export async function findMessageById(id: string): Promise<Message | null> {
  const result = await pool.query<MessageRow>(
    `SELECT id, room_id, user_id, username, text, created_at
     FROM messages WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapMessage(result.rows[0]);
}
