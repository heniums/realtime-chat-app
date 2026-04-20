/**
 * Row-to-domain mappers.
 *
 * The DB uses snake_case; the domain layer (shared/types.ts) uses camelCase.
 * Keep translation in one place so every query module returns
 * already-camelCased objects — handlers never see raw rows.
 */
import { Room, Message, Reaction } from "../../types";

interface UserRow {
  id: string;
  username: string;
}

interface UserWithHashRow extends UserRow {
  password_hash: string;
}

interface RoomRow {
  id: string;
  name: string;
  created_at: Date;
}

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: Date;
}

export type { UserRow, UserWithHashRow, RoomRow, MessageRow };

export function mapUser(row: UserRow): { id: string; username: string } {
  return { id: row.id, username: row.username };
}

export function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    userIds: [], // populated separately by getMembers() when needed
  };
}

export function mapMessage(
  row: MessageRow,
  reactions: Reaction[] = [],
): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    username: row.username,
    text: row.text,
    timestamp: row.created_at,
    reactions,
  };
}
