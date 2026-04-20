import pool from "..";
import { Room } from "../../types";
import { RoomRow, mapRoom } from "./mappers";

/**
 * Create a new room. Returns the created room (without members).
 * Throws on UNIQUE violation if `name` is taken.
 */
export async function createRoom(name: string): Promise<Room> {
  const result = await pool.query<RoomRow>(
    "INSERT INTO rooms (name) VALUES ($1) RETURNING id, name, created_at",
    [name],
  );
  return mapRoom(result.rows[0]);
}

export async function findRoomById(id: string): Promise<Room | null> {
  const result = await pool.query<RoomRow>(
    "SELECT id, name, created_at FROM rooms WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapRoom(result.rows[0]);
}

export async function findRoomByName(name: string): Promise<Room | null> {
  const result = await pool.query<RoomRow>(
    "SELECT id, name, created_at FROM rooms WHERE name = $1",
    [name],
  );
  if (result.rows.length === 0) return null;
  return mapRoom(result.rows[0]);
}

/**
 * List all rooms with their current member count.
 * Returned rooms have `userIds: []` — use `getMembers(roomId)` if full
 * member IDs are needed.
 */
export async function listRooms(): Promise<Room[]> {
  const result = await pool.query<RoomRow>(
    "SELECT id, name, created_at FROM rooms ORDER BY created_at ASC",
  );
  return result.rows.map(mapRoom);
}

/**
 * Delete a room by ID. Cascades to room_members, messages, and reactions.
 * Returns true if a row was deleted.
 */
export async function deleteRoom(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM rooms WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Add a user to a room. Idempotent — ON CONFLICT DO NOTHING means
 * repeated joins are safe.
 */
export async function addMember(
  roomId: string,
  userId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO room_members (room_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, room_id) DO NOTHING`,
    [roomId, userId],
  );
}

/**
 * Remove a user from a room. Returns true if membership existed.
 */
export async function removeMember(
  roomId: string,
  userId: string,
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM room_members WHERE room_id = $1 AND user_id = $2",
    [roomId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Return all user IDs currently in the given room.
 */
export async function getMembers(roomId: string): Promise<string[]> {
  const result = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM room_members WHERE room_id = $1",
    [roomId],
  );
  return result.rows.map((r) => r.user_id);
}

/**
 * Return all rooms a user is a member of.
 */
export async function getUserRooms(userId: string): Promise<Room[]> {
  const result = await pool.query<RoomRow>(
    `SELECT r.id, r.name, r.created_at
     FROM rooms r
     INNER JOIN room_members rm ON rm.room_id = r.id
     WHERE rm.user_id = $1
     ORDER BY rm.joined_at ASC`,
    [userId],
  );
  return result.rows.map(mapRoom);
}

/**
 * Count members in a room. Useful for emitting room deletion
 * when the last member leaves.
 */
export async function countMembers(roomId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM room_members WHERE room_id = $1",
    [roomId],
  );
  return parseInt(result.rows[0].count, 10);
}
