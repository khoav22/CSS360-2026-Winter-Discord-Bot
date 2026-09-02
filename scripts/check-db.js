// MySQL database.
// Run with: npm run db:check
require("dotenv/config");
const fs = require("fs");
const mysql = require("mysql2/promise");

function buildSslConfig() {
  if (process.env.DB_SSL !== "true") return undefined;
  if (process.env.DB_CA_CERT_PATH) {
    return { ca: fs.readFileSync(process.env.DB_CA_CERT_PATH, "utf8"), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSslConfig(),
  });

  console.log("\n=== user_scores (all-time points, highest first) ===");
  const [scores] = await conn.query(
    `SELECT s.guild_id, s.user_id, u.username, s.all_time_points, s.updated_at
     FROM user_scores s
     LEFT JOIN discord_users u ON u.user_id = s.user_id
     ORDER BY s.all_time_points DESC`
  );
  console.table(scores);

  console.log("\n=== user_stats ===");
  const [stats] = await conn.query(
    `SELECT s.guild_id, s.user_id, u.username, s.rounds_played, s.rounds_won,
            s.games_played, s.games_won, s.hints_used, s.powerups_used
     FROM user_stats s
     LEFT JOIN discord_users u ON u.user_id = s.user_id`
  );
  console.table(stats);

  await conn.end();
})().catch((err) => {
  console.error("Failed to query the database:", err.message);
  process.exit(1);
});
