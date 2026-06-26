// Keyless distance/ETA between appointment addresses.
// Geocoding: Photon (OSM) — CORS-friendly, no key, no User-Agent requirement.
// Routing:   OSRM public demo server — CORS-friendly, no key.
// Both results are cached in localStorage so the same address/leg isn't
// re-fetched on every render or app launch.

(function () {
  const GEO_KEY = 'gw-geo-cache-v1';
  const ROUTE_KEY = 'gw-route-cache-v1';
  const emptyMemo = new Set(); // addresses that came back empty this session

  function load(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
  function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }

  // Ranking bias: keeps ambiguous lookups near where the tech is actually
  // working instead of matching a same-named street on another continent.
  let anchor = (function () { try { return JSON.parse(localStorage.getItem('gw-geo-anchor') || 'null'); } catch (e) { return null; } })();
  function setAnchor(c) { if (c) { anchor = c; try { localStorage.setItem('gw-geo-anchor', JSON.stringify(c)); } catch (e) {} } }

  async function photon(q) {
    let url = 'https://photon.komoot.io/api/?limit=1&lang=en&q=' + encodeURIComponent(q);
    if (anchor) url += '&lat=' + anchor.lat + '&lon=' + anchor.lon;
    const res = await fetch(url);
    if (!res.ok) throw new Error('geo ' + res.status);
    const data = await res.json();
    const c = data && data.features && data.features[0] && data.features[0].geometry && data.features[0].geometry.coordinates;
    return c ? { lat: c[1], lon: c[0] } : null;
  }

  // address string -> { lat, lon } | null  (null = geocoder found nothing)
  async function geocode(address) {
    const addr = (address || '').trim();
    if (!addr) return null;
    const cache = load(GEO_KEY);
    if (cache[addr]) return cache[addr];          // only successful hits are cached
    if (emptyMemo.has(addr)) return null;          // empty this session — don't re-hammer
    try {
      let out = await photon(addr);
      // Fallback: drop a leading house number so a street that lacks the exact
      // number in OSM still resolves to a usable street-level point.
      if (!out && /^\s*\d+\s+\S/.test(addr)) out = await photon(addr.replace(/^\s*\d+\s+/, ''));
      if (out) { cache[addr] = out; save(GEO_KEY, cache); setAnchor(out); return out; }
      emptyMemo.add(addr);   // found nothing, but retry on next launch in case it was transient
      return null;
    } catch (e) {
      return undefined; // transient failure (don't memo, allow retry)
    }
  }

  // {lat,lon} a,b -> { meters, seconds } | null
  async function route(a, b) {
    if (!a || !b) return null;
    const k = a.lat.toFixed(4) + ',' + a.lon.toFixed(4) + '|' + b.lat.toFixed(4) + ',' + b.lon.toFixed(4);
    const cache = load(ROUTE_KEY);
    if (Object.prototype.hasOwnProperty.call(cache, k)) return cache[k];
    try {
      const coords = a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat;
      const url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=false';
      const res = await fetch(url);
      if (!res.ok) throw new Error('route ' + res.status);
      const data = await res.json();
      const r = data && data.routes && data.routes[0];
      const out = r ? { meters: r.distance, seconds: r.duration } : null;
      cache[k] = out; save(ROUTE_KEY, cache);
      return out;
    } catch (e) {
      // Fall back to straight-line distance so the tech still sees something.
      const meters = haversine(a, b);
      return { meters, seconds: null, straight: true };
    }
  }

  function haversine(a, b) {
    const R = 6371000, toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  // Resolve a record's coords: prefer stored lat/lon, else geocode its address.
  async function coordsFor(rec) {
    if (rec && typeof rec.lat === 'number' && typeof rec.lon === 'number') return { lat: rec.lat, lon: rec.lon };
    return geocode(rec && rec.customer && rec.customer.address);
  }

  function miles(meters) { return meters / 1609.344; }
  function fmtMiles(meters) {
    const mi = miles(meters);
    return (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + ' mi';
  }
  function fmtMins(seconds) {
    if (seconds == null) return null;
    const m = Math.round(seconds / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }
  // Apple Maps driving directions (default on iPad); opens in-app.
  function directionsUrl(a, b) {
    return 'https://maps.apple.com/?saddr=' + a.lat + ',' + a.lon + '&daddr=' + b.lat + ',' + b.lon + '&dirflg=d';
  }

  // Two same-day service stops realistically aren't more than this apart;
  // a leg beyond it almost always means a mis-geocoded address.
  const IMPLAUSIBLE_M = 250 * 1609.344;

  window.GeoDist = { geocode, route, coordsFor, miles, fmtMiles, fmtMins, directionsUrl, IMPLAUSIBLE_M };
})();
