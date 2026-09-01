# Shared MySQL database

All-time scores and lifetime stats (rounds/games played and won, hints used,
powerups used) are stored in one shared MySQL database. Every teammate's
bot instance - Will's, David's, Khoa's, anyone's - reads and writes the
same database, so the leaderboard and stats stay consistent no matter
whose machine happens to be running the bot for a given Discord server.

The **current-game score** (the running total shown mid-game, reset by
`/reset-scores` and at the start of every `/trivia` game) is *not* in
MySQL - it stays in memory per-instance, since it's ephemeral by design.

## What's in the database

Two tables, created automatically the first time any instance starts up
(`initDb()` in `src/app.js`, schema also documented in `sql/schema.sql`):

- **user_scores** - `guild_id`, `user_id`, `all_time_points`
- **user_stats** - `guild_id`, `user_id`, `rounds_played`, `rounds_won`,
  `games_played`, `games_won`, `hints_used`, `powerups_used`
- **discord_users** - `user_id`, `username` - a lookup table so raw user
  IDs can be shown with a readable Discord username. It's populated
  automatically whenever someone answers a trivia question, uses a hint,
  or runs a slash command (see `src/helpers/usersStore.js`) - not
  required for scoring to work, purely so the data is readable later.
  Since it just tracks "last known username," it can go briefly stale if
  someone changes their Discord username.

`user_scores` and `user_stats` are keyed on `(guild_id, user_id)`;
`discord_users` is keyed on `user_id` alone (a username isn't
guild-specific).

## Setting up your `.env`

Copy `.env.example` to `.env` and fill in:

```
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_SSL=true
```

**Everyone on the team must use the exact same `DB_HOST`/`DB_USER`/
`DB_PASSWORD`/`DB_NAME` values** - that's what makes it one shared
database instead of everyone having their own separate copy. Get these
values from whoever set up the database, or see "Provisioning the
database" below if none exists yet.

If your host's TLS certificate isn't in Node's trusted root store (common
for managed free-tier hosts - you'll see a "self-signed certificate"
error otherwise), you can optionally point `DB_CA_CERT_PATH` at a
downloaded CA certificate file for stricter verification. Not required to
get things running.

## Provisioning the database (if one doesn't exist yet)

We're using [Aiven](https://aiven.io/)'s always-free MySQL tier (no
credit card, 1 GB storage/RAM). To set one up:

1. Sign up at aiven.io.
2. Create a new service, type **MySQL**, plan **Free**, any region.
3. Once it's running, open the service page and click **Quick connect**
   (or the Overview tab) to get the host, port, user, and password.
4. Share those exact values with the team so everyone's `.env` matches.

## Checking what's actually saved

Aiven's console doesn't have a built-in table browser - it only gives you
connection details, so you need to connect with something to see the data.

**Easiest: use the script already in this project.**
```
npm run db:check
```
Connects using your `.env` and prints the `user_scores` and `user_stats`
tables to the terminal, joined against `discord_users` so you see a
`username` column instead of just a raw ID. See `scripts/check-db.js`.

**Or use a GUI client** like [DBeaver](https://dbeaver.io/) (free) or
[TablePlus](https://tableplus.com/): create a new MySQL connection using
the same host/port/user/password/database from your `.env`, enable SSL,
connect, and browse to `user_scores` / `user_stats` under Tables.

## Where this lives in the code

- `src/helpers/db.js` - connection pool + schema creation (`initDb()`)
- `src/helpers/scoreStore.js` - current-game score (in-memory) +
  all-time points (MySQL)
- `src/helpers/statsStore.js` - lifetime stats (MySQL)
- `src/helpers/usersStore.js` - records the `discord_users` username lookup
- `sql/schema.sql` - the same schema in plain SQL, for reference
- `scripts/check-db.js` - the `npm run db:check` script above
- `src/app.js` - calls `initDb()` before the bot logs in

Database writes are wrapped in try/catch and just log on failure, so a
brief database hiccup won't crash an in-progress trivia round - it'll
just fail to save that particular update.
