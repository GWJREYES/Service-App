// In-app calendar / schedule store for technicians.
// localStorage-backed log of appointments + a tiny pub/sub so any view
// (the Schedule screen, the report success screen) re-renders on change.
// Seeded once with realistic completed jobs so the calendar looks lived-in.

(function () {
  const KEY = 'gw-calendar-v2';
  const TECH = { name: 'Tyler Evans', role: 'Certified Field Inspector', initials: 'TE' };

  const now = new Date();
  function at(dayOffset, h, m) {
    const d = new Date(now); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.getTime();
  }

  function seed() {
    // No fake appointments — the schedule starts empty and fills as real jobs
    // are added/scheduled and completed reports are filed.
    return [];
  }

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    const s = seed();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  let data = load();
  const subs = new Set();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  const emit = () => subs.forEach(fn => fn());

  window.Calendar = {
    TECH,
    all: () => data.slice(),
    add: (rec) => { const id = 'c' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); data = [{ id, ...rec }, ...data]; save(); emit(); return id; },
    update: (id, patch) => { data = data.map(r => r.id === id ? { ...r, ...patch } : r); save(); emit(); },
    remove: (id) => { data = data.filter(r => r.id !== id); save(); emit(); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };

  // React hook
  window.useCalendar = function () {
    const [, force] = React.useState(0);
    React.useEffect(() => window.Calendar.subscribe(() => force(n => n + 1)), []);
    return window.Calendar;
  };
})();
