import { GLOFAS_API, OVERPASS_ENDPOINTS } from './config.js';

export async function fetchGlofasForecast(lat, lon) {
  const url = `${GLOFAS_API}?latitude=${lat}&longitude=${lon}&daily=river_discharge&past_days=92&forecast_days=7`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function queryOverpass(ql) {
  let lastErr = null;
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, */*',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: 'data=' + encodeURIComponent(ql)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Overpass API unavailable');
}

export function extractOverpassPolylines(overpassJson) {
  const lines = [];
  for (const el of (overpassJson.elements || [])) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || 'Unnamed River';
    if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 1) {
      lines.push({ name, coords: el.geometry.map(pt => [pt.lat, pt.lon]), tags });
    } else if (el.type === 'relation' && Array.isArray(el.members)) {
      for (const m of el.members) {
        if (m.type === 'way' && Array.isArray(m.geometry) && m.geometry.length > 1) {
          lines.push({ name, coords: m.geometry.map(pt => [pt.lat, pt.lon]), tags });
        }
      }
    }
  }
  return lines;
}

export function parseNwdpCsv(text, filename) {
  const rows = [];
  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cols = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < rawLine.length; i++) {
      const ch = rawLine[i];
      if (ch === '"') {
        if (quoted && rawLine[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cols.push(field.trim()); field = '';
      } else field += ch;
    }
    cols.push(field.trim());
    rows.push(cols);
  }
  if (rows.length < 2) throw new Error('CSV has no data rows');

  const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
  const findHeader = patterns => headers.findIndex(h => patterns.some(p => p.test(h)));
  const idxStation = findHeader([/^station$/i, /^station[_ ]?name$/i, /^site[_ ]?name$/i]);
  const idxDistrict = findHeader([/^district$/i, /^district[_ ]?name$/i]);
  const idxRiver = findHeader([/^river$/i, /^river[_ ]?name$/i, /^stream$/i]);
  const idxLat = findHeader([/^lat(?:itude)?$/i, /latitude/i]);
  const idxLon = findHeader([/^lon(?:gitude)?$/i, /longitude/i]);
  const idxTime = findHeader([/timestamp/i, /^date$/i, /^time$/i, /observation.*date/i, /date.*time/i]);
  const excluded = new Set([idxStation, idxDistrict, idxRiver, idxLat, idxLon, idxTime]);
  let idxVal = -1;
  for (let i = 0; i < headers.length; i++) {
    if (!excluded.has(i) && /(discharge|river.*level|water.*level|flow|value|reading)/i.test(headers[i])) { idxVal = i; break; }
  }
  if (idxVal < 0) {
    for (let i = headers.length - 1; i >= 0; i--) {
      if (!excluded.has(i)) { idxVal = i; break; }
    }
  }

  if (idxStation < 0 || idxLat < 0 || idxLon < 0 || idxVal < 0) {
    throw new Error('Could not find NWDP Station, Latitude, Longitude, and value columns.');
  }

  const gateIndices = headers.map((h, i) => ({ h, i })).filter(({ h }) => /gate[- ]?\d.*(?:discharge|flow)/i.test(h)).map(({ i }) => i);
  const unitMatch = headers[idxVal].match(/\(([^)]+)\)/);
  const unit = unitMatch ? unitMatch[1] : (/level/i.test(headers[idxVal]) ? 'm' : 'm³/s');
  const byStation = {};

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const st = (cols[idxStation] || '').trim();
    const lat = parseFloat((cols[idxLat] || '').replace(/[^0-9.-]/g, ''));
    const lon = parseFloat((cols[idxLon] || '').replace(/[^0-9.-]/g, ''));
    const val = gateIndices.length
      ? gateIndices.reduce((sum, i) => {
          const gate = parseFloat((cols[i] || '').replace(/[,\s]/g, ''));
          return sum + (Number.isFinite(gate) && gate >= 0 ? gate : 0);
        }, 0)
      : parseFloat((cols[idxVal] || '').replace(/[,\s]/g, ''));
    if (!st || isNaN(lat) || isNaN(lon) || isNaN(val) || val < 0) continue;

    const rawTime = idxTime >= 0 ? (cols[idxTime] || '').trim() : '';
    let ym = 'All';
    let dateStr = rawTime.slice(0, 10);
    const dmy = rawTime.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    const ymd = rawTime.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (dmy) { const [, dd, mm, yyyy] = dmy; ym = `${yyyy}-${mm.padStart(2, '0')}`; dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`; }
    else if (ymd) { const [, yyyy, mm, dd] = ymd; ym = `${yyyy}-${mm.padStart(2, '0')}`; dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`; }

    if (!byStation[st]) {
      byStation[st] = {
        station: st,
        district: idxDistrict >= 0 ? (cols[idxDistrict] || 'West Bengal').trim() : 'West Bengal',
        river: idxRiver >= 0 ? (cols[idxRiver] || '-').trim() : '-',
        lat, lon, unit, source: `NWDP CSV (${filename})`, vals: [], dates: [], months: {}
      };
    }
    const rec = byStation[st];
    rec.vals.push(val);
    rec.dates.push(dateStr);
    if (!rec.months[ym]) rec.months[ym] = { sum: 0, max: -Infinity, n: 0 };
    rec.months[ym].sum += val;
    rec.months[ym].max = Math.max(rec.months[ym].max, val);
    rec.months[ym].n += 1;
  }

  if (!Object.keys(byStation).length) throw new Error('No valid NWDP rows found after removing NaN and negative values.');

  return Object.values(byStation).map(rec => {
    const sorted = [...rec.vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    let peak = -Infinity;
    let peakIdx = 0;
    rec.vals.forEach((v, idx) => { if (v > peak) { peak = v; peakIdx = idx; } });
    const sortedDates = rec.dates.filter(Boolean).sort();
    const monthly = Object.keys(rec.months).sort().filter(ym => ym !== 'All').map(ym => ({
      ym,
      mean: Number((rec.months[ym].sum / rec.months[ym].n).toFixed(1)),
      max: Number(rec.months[ym].max.toFixed(1)),
      n: rec.months[ym].n
    }));
    return {
      station: rec.station, district: rec.district, river: rec.river,
      lat: rec.lat, lon: rec.lon, unit: rec.unit, source: rec.source,
      valid_rows: rec.vals.length,
      date_start: sortedDates[0] || '—', date_end: sortedDates[sortedDates.length - 1] || '—',
      median_m3s: Number(median.toFixed(2)), peak_m3s: Number(peak.toFixed(2)),
      peak_date: rec.dates[peakIdx] || '—', monthly
    };
  });
}

export function percentile(values, p) {
  const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (!valid.length) return null;
  const index = (valid.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return valid[lower];
  return valid[lower] + (valid[upper] - valid[lower]) * (index - lower);
}
