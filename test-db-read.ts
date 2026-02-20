const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const res = await pool.query('SELECT * FROM places ORDER BY created_at DESC LIMIT 1');
  console.log("RAW DB ROW:", res.rows[0]);
  process.exit(0);
}
main().catch(console.error);
