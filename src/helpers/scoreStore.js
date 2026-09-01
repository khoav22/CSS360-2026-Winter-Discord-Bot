import { getPool } from "./db.js";

// Current-game score only. This is intentionally NOT persisted to MySQL:
// it's reset every time a new /trivia game starts (see resetScores), so
// there's nothing worth sharing across instances or surviving a restart.
const store = new Map(); // guildId -> Map(userId -> points)

// Resets current-game score but not all-time score
export function resetScores(guildId) {
  store.set(guildId, new Map());
}

// Adds points for the current game (in-memory) AND persists the same
// amount to the shared all-time total in MySQL, so every instance pointed
// at the same database sees the update.
export async function addPoints(guildId, userId, points) {
  // Current-game total (in-memory, per process)
  if (!store.has(guildId)) store.set(guildId, new Map());
  const g = store.get(guildId);
  g.set(userId, (g.get(userId) ?? 0) + points);

  // All-time total (shared MySQL database)
  try {
    await getPool().query(
      `INSERT INTO user_scores (guild_id, user_id, all_time_points)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE all_time_points = all_time_points + VALUES(all_time_points)`,
      [guildId, userId, points]
    );
  } catch (err) {
    // Don't let a DB hiccup break the live game - the in-memory current
    // score above already updated. Just log it so it's visible.
    console.error("[scoreStore] Failed to persist all-time points:", err);
  }
}

// Get points of user in current game (in-memory, per instance)
export function getUserPoints(guildId, userId) {
  return store.get(guildId)?.get(userId) ?? 0;
}

// Get points of user from all time (shared MySQL database)
export async function getUserAllTimePoints(guildId, userId) {
  try {
    const [rows] = await getPool().query(
      `SELECT all_time_points FROM user_scores WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId]
    );
    return rows[0]?.all_time_points ?? 0;
  } catch (err) {
    console.error("[scoreStore] Failed to read all-time points:", err);
    return 0;
  }
}

export function getGuildScoresSorted(guildId) {
  const g = store.get(guildId) ?? new Map();
  return [...g.entries()].sort((a, b) => b[1] - a[1]); // [userId, points]
}

export function getTotalScore(guildId) {
  const g = store.get(guildId) ?? new Map();
  let total = 0;
  for (const v of g.values()) total += v;
  return total;
}
