// Best-effort cache of Discord usernames, keyed by user ID.
//
// user_scores/user_stats only store the numeric Discord user ID (that's
// all that's needed to actually run the game), which isn't readable on
// its own when you look at the raw data. This table records the username
// that goes with each ID, so admin/debugging views - like `npm run
// db:check` - can show a real name instead of just a snowflake number.
//
// It's populated opportunistically wherever we already have both a
// user ID and their current username handy (answering a trivia question,
// running a slash command, etc.) - it's not required for scoring or
// stats to work, purely a convenience for reading the data later.
import { getPool } from "./db.js";

export async function recordUsername(userId, username) {
  if (!userId || !username) return;
  try {
    await getPool().query(
      `INSERT INTO discord_users (user_id, username)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username)`,
      [userId, username]
    );
  } catch (err) {
    console.error("[usersStore] Failed to record username:", err);
  }
}
