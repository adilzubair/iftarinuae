import { db } from './server/db';
import { places } from './shared/schema';

async function main() {
  const newPlace = await db.insert(places).values({
    name: "Test Location 123",
    location: "Dubai",
    latitude: "25.0",
    longitude: "55.0",
    mapUrl: "https://maps.app.goo.gl/NvCy6qoRZr4squy49?g_st=ic",
    createdBy: "admin",
  }).returning();
  
  console.log("Inserted:", newPlace);
  process.exit(0);
}
main().catch(console.error);
