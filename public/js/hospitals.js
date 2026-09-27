// Cosmos Arogya — nearby hospital/pharmacy/clinic finder (OpenStreetMap, no API key)

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Query OSM Overpass for healthcare places around a point.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius meters
 * @param {string[]} amenities e.g. ['hospital','pharmacy','clinic','doctors']
 */
export async function findNearbyPlaces(lat, lon, radius = 3000, amenities = ["hospital", "pharmacy", "clinic", "doctors"]) {
  const clauses = amenities
    .map((a) => `node["amenity"="${a}"](around:${radius},${lat},${lon});way["amenity"="${a}"](around:${radius},${lat},${lon});`)
    .join("");
  const query = `[out:json][timeout:25];(${clauses});out center tags;`;

  const res = await fetch(OVERPASS_URL, { method: "POST", body: query });
  if (!res.ok) throw new Error("Couldn't reach OpenStreetMap right now. Try again in a moment.");
  const data = await res.json();

  const places = data.elements
    .map((el) => {
      const tags = el.tags || {};
      const placeLat = el.lat ?? el.center?.lat;
      const placeLon = el.lon ?? el.center?.lon;
      if (!placeLat || !placeLon) return null;
      return {
        id: `${el.type}/${el.id}`,
        kind: tags.amenity,
        name: tags.name || `Unnamed ${tags.amenity}`,
        lat: placeLat,
        lon: placeLon,
        distanceKm: distanceKm(lat, lon, placeLat, placeLon),
        speciality: tags["healthcare:speciality"] || tags.healthcare || null,
        emergency: tags.emergency === "yes",
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || null,
        openingHours: tags.opening_hours || null,
        address: [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]]
          .filter(Boolean)
          .join(", ") || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return places;
}

/** Turn a place name/locality typed by the user into coordinates (fallback when geolocation is denied). */
export async function geocodePlace(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Search failed. Try a different place name.");
  const data = await res.json();
  if (!data.length) throw new Error(`Couldn't find "${query}". Try adding a city or district.`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name };
}

/** Great-circle distance in kilometers. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Wraps the browser Geolocation API in a Promise. */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error("Location permission denied — search by area name instead.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
