// Shared MySQL connection for all-time scores and stats.
//
// Every teammate's bot instance (Will's, David's, Khoa's, ...) reads these
// env vars and connects to the SAME remote MySQL database, so all-time
// points/stats are shared no matter whose machine is currently running the
// bot for a given Discord server. Set these in your local .env (never
// committed - see .env.example):
//
//   DB_HOST=<shared db host>
//   DB_PORT=3306
//   DB_USER=<shared db user>
//   DB_PASSWORD=<shared db password>
//   DB_NAME=<shared db name>
//   DB_SSL=true                    // set to "true" for most managed/free-tier hosts
//   DB_CA_CERT_PATH=./certs/ca.pem // optional: verify the server cert against this CA
//
// The current in-progress game score (reset every /trivia game) stays in
// an in-memory Map in scoreStore.js - only all-time scores and stats are
// persisted here.
import fs from "node:fs";
import mysql from "mysql2/promise";

let pool = null;

// Managed MySQL hosts (Aiven, PlanetScale-style, etc.) almost always require
// TLS, but their certificate is usually signed by a CA that isn't in
// Node's default trusted root store, which makes a plain
// `{ rejectUnauthorized: true }` fail with "self-signed certificate in
// certificate chain". If you download your host's CA certificate and point
// DB_CA_CERT_PATH at it, we verify against that CA properly. Without it,
// we still encrypt the connection but skip verifying the server's
// certificate chain - fine for a class project, not what you'd want for
// something handling real secrets.
function buildSslConfig() {
  if (process.env.DB_SSL !== "true") return undefined;

  if (process.env.DB_CA_CERT_PATH) {
    return {
      ca: fs.readFileSync(process.env.DB_CA_CERT_PATH, "utf8"),
      rejectUnauthorized: true,
    };
  }

  return { rejectUnauthorized: false };
}

export function getPool() {
  if (!pool) {
    if (!process.env.DB_HOST) {
      throw new Error(
        "Missing DB_HOST (and friends) in your .env - see .env.example for the MySQL variables this bot needs."
      );
    }

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      ssl: buildSslConfig(),
    });
  }
  return pool;
}

// Idempotent - safe for every instance to run on startup. Whoever starts
// the bot first creates the shared tables; everyone after that just
// no-ops against the existing ones.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS discord_users (
    user_id VARCHAR(32) NOT NULL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS user_scores (
    guild_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    all_time_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS user_stats (
    guild_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    rounds_played INT NOT NULL DEFAULT 0,
    rounds_won INT NOT NULL DEFAULT 0,
    games_played INT NOT NULL DEFAULT 0,
    games_won INT NOT NULL DEFAULT 0,
    hints_used INT NOT NULL DEFAULT 0,
    powerups_used INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  ) ENGINE=InnoDB`,
];

export async function initDb() {
  const p = getPool();
  for (const statement of SCHEMA_STATEMENTS) {
    await p.query(statement);
  }
  console.log("[db] Connected to shared MySQL database and verified schema.");
}
