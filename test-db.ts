import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { places } from './shared/schema';

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool);
    const result = await db.select().from(places).orderBy(places.createdAt);
    const lastPlaces = result.slice(-3);
    console.log(JSON.stringify(lastPlaces, null, 2));
    process.exit(0);
}
main().catch(console.error);
