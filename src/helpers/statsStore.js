// All stats here are lifetime running totals (never reset in the old
// in-memory version either), so they move to the shared MySQL database
// wholesale - every instance pointed at the same database reads/writes
// the same numbers.
import { getPool } from "./db.js";

async function incrementStat(column, guildId, userId) {
  try {
    // `column` is always one of the fixed literals passed by the
    // functions below (never user input), so it's safe to interpolate
    // into the query text here.
    await getPool().query(
      `INSERT INTO user_stats (guild_id, user_id, ${column})
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE ${column} = ${column} + 1`,
      [guildId, userId]
    );
  } catch (err) {
    console.error(`[statsStore] Failed to increment ${column}:`, err);
  }
}

async function getStat(column, guildId, userId) {
  try {
    const [rows] = await getPool().query(
      `SELECT ${column} FROM user_stats WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId]
    );
    return rows[0]?.[column] ?? 0;
  } catch (err) {
    console.error(`[statsStore] Failed to read ${column}:`, err);
    return 0;
  }
}

// Function to add to the rounds played stat for one user
export function addRoundPlayed(guildId, userId) {
  return incrementStat("rounds_played", guildId, userId);
}

// Function to add to the rounds won stat for one user
export function addRoundWon(guildId, userId) {
  return incrementStat("rounds_won", guildId, userId);
}

// Function to add to the games played stat for one user
export function addGamePlayed(guildId, userId) {
  return incrementStat("games_played", guildId, userId);
}

// Function to add to the games won stat for one user
export function addGameWon(guildId, userId) {
  return incrementStat("games_won", guildId, userId);
}

// Function to add to the hints used stat for one user
export function addHintUsed(guildId, userId) {
  return incrementStat("hints_used", guildId, userId);
}

// Function to add to the powerups used stat for one user
export function addPowerupUsed(guildId, userId) {
  return incrementStat("powerups_used", guildId, userId);
}

// Functions to get the given stat for one user
export function getRoundsPlayed(guildId, userId) {
  return getStat("rounds_played", guildId, userId);
}

export function getRoundsWon(guildId, userId) {
  return getStat("rounds_won", guildId, userId);
}

export function getGamesPlayed(guildId, userId) {
  return getStat("games_played", guildId, userId);
}

export function getGamesWon(guildId, userId) {
  return getStat("games_won", guildId, userId);
}

export function getHintsUsed(guildId, userId) {
  return getStat("hints_used", guildId, userId);
}

export function getPowerupsUsed(guildId, userId) {
  return getStat("powerups_used", guildId, userId);
}
