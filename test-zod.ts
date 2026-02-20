import { insertPlaceSchema } from './shared/schema';

const res = insertPlaceSchema.safeParse({
  name: "Al Safa",
  location: "",
  description: "",
  latitude: "0",
  longitude: "0",
  mapUrl: "https://maps.app.goo.gl/123"
});
console.log("Empty location:", res.success ? "SUCCESS" : res.error.errors);

const res2 = insertPlaceSchema.safeParse({
  name: "Al Safa",
  location: "Dubai",
  description: "",
  latitude: "",
  longitude: "",
  mapUrl: "https://maps.app.goo.gl/123"
});
console.log("Empty coords:", res2.success ? "SUCCESS" : res2.error.errors);
