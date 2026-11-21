import { NWDP_CATALOG } from './config.js';
import { state, escapeHtml } from './state.js';
import { fetchGlofasForecast, percentile } from './apiClients.js';
import { map, renderMarkers, traceRiverPath, renderDistrictPolygons } from './mapEngine.js';

export function getFilteredFeaturedRivers() {
  const q = state.query.trim().toLowerCase();
  return state.data.rivers.filter(r => {
    if (state.region !== 'all' && r.region !== state.region) return false;
    if (state.selectedDistrict) {
      const districts = (r.wb_districts || []).map(normalizeDistrictName);
      if (!districts.includes(state.selectedDistrict)) return false;
    }
    if (!q) return true;
    return [r.name, ...(r.alt_names || []), r.region, r.origin, ...(r.wb_districts || []), ...(r.major_tributaries || [])]
      .join(' ').toLowerCase().includes(q);
  });
}

export function getFilteredAll912() {
  const q = state.query.trim().toLowerCase();
  const activeFilters = state.region !== 'all' || Boolean(state.selectedDistrict);
  let candidates = state.data.waterwayIndex;
  if (activeFilters) {
    const nameSet = new Set();
    for (const r of getFilteredFeaturedRivers()) {
      nameSet.add(String(r.name).toLowerCase());
      for (const alt of (r.alt_names || [])) nameSet.add(String(alt).toLowerCase());
    }
    candidates = candidates.filter(w => nameSet.has(String(w.name).toLowerCase()));
  }
  return candidates.filter(w => !q || String(w.name).toLowerCase().includes(q));
}

export function destroyChart() {
  if (state.scadaChartInstance) {
    state.scadaChartInstance.destroy();
    state.scadaChartInstance = null;
  }
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }
}

export function renderRailList() {
  const list = document.getElementById('railList');
  const regionWrap = document.getElementById('regionFilterWrap');
  let html = '';

  if (state.railTab === 'featured') {
    regionWrap.style.display = 'block';
    const filtered = getFilteredFeaturedRivers();
    document.getElementById('riverCountLabel').textContent = `${filtered.length} rivers`;
    html += filtered.length
      ? filtered.map(r => {
          const active = state.selectedType === 'river' && state.selectedId === r.id ? 'active' : '';
          return `<button class="nav-item ${active}" data-type="river" data-id="${escapeHtml(r.id)}"><div><div class="nav-name">${escapeHtml(r.name)}</div><div class="nav-meta">${escapeHtml((r.wb_districts || []).slice(0, 3).join(', '))}</div></div><span class="nav-badge">${r.waterwaymap_length_km} km</span></button>`;
        }).join('')
      : `<div style="padding:16px 10px; text-align:center; color:var(--muted-ink); font-size:0.84rem;">No rivers match the current filters.</div>`;
  } else {
    const all912 = getFilteredAll912();
    const shown = all912.slice(0, 150);
    html += `<div class="micro-label" style="margin:4px 4px 8px;"><span>WaterwayMap (${all912.length} rivers)</span><span style="color:var(--cyan);">Showing ${shown.length}</span></div>`;
    html += shown.map((w, i) => {
      const active = state.selectedType === 'wwm' && state.selectedId === w.name ? 'active' : '';
      return `<button class="nav-item ${active}" data-type="wwm" data-id="${escapeHtml(w.name)}"><div><div class="nav-name">${i + 1}. ${escapeHtml(w.name)}</div><div class="nav-meta">Click to highlight path</div></div><span class="nav-badge">${w.length_km ?? '—'} km</span></button>`;
    }).join('');
  }
  regionWrap.style.display = state.selectedDistrict ? 'block' : 'none';
  renderDistrictFilterChip();

  html += `<div class="micro-label" style="margin:14px 4px 6px;"><span>NWDP Gauge Stations (${state.cwcStations.length})</span></div>`;
  html += state.cwcStations.map(st => {
    const active = state.selectedType === 'cwc' && state.selectedId === st.station ? 'active' : '';
    return `<button class="nav-item ${active}" data-type="cwc" data-id="${escapeHtml(st.station)}"><div><div class="nav-name">${escapeHtml(st.station)}</div><div class="nav-meta">${escapeHtml(st.district)}</div></div><span class="nav-badge" style="color:${active ? '#fff' : '#81C995'}">${st.peak_m3s} ${escapeHtml(st.unit || 'm³/s')}</span></button>`;
  }).join('');

  list.innerHTML = html;
  list.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectFeature(btn.dataset.type, btn.dataset.id, true);
      document.getElementById('rail').classList.remove('open');
    });
  });
}

export function selectFeature(type, id, flyTo = false) {
  state.selectedType = type;
  state.selectedId = id;
  document.getElementById('inspector').classList.remove('hidden');
  renderRailList();
  renderMarkers(getFilteredFeaturedRivers());

  if (type === 'river') {
    const r = state.data.rivers.find(x => x.id === id);
    if (!r) return;
    if (flyTo) map.flyTo([r.lat, r.lon], 9, { duration: 0.6 });
    renderRiverInspector(r);
  } else if (type === 'wwm') {
    const w = state.data.waterwayIndex.find(x => x.name === id);
    if (w) renderWwmInspector(w);
  } else if (type === 'cwc') {
    const st = state.cwcStations.find(x => x.station === id);
    if (!st) return;
    if (flyTo) map.flyTo([st.lat, st.lon], 10, { duration: 0.6 });
    renderCwcInspector(st);
  } else if (type === 'landmark') {
    const lm = state.data.landmarks.find(x => x.id === id);
    if (!lm) return;
    if (flyTo) map.flyTo([lm.lat, lm.lon], 11, { duration: 0.6 });
    renderLandmarkInspector(lm);
  }
}

export function selectOsmRiver(name, tags, lat, lon) {
  const normalize = value => String(value || '').normalize('NFKC').replace(/\s*River$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const clicked = normalize(name);
  const featured = state.data.rivers.find(river => {
    const aliases = [river.name, ...(river.alt_names || [])].map(normalize);
    return aliases.includes(clicked);
  });
  if (featured) {
    selectFeature('river', featured.id, true);
    return;
  }
  state.selectedType = 'osm_river';
  state.selectedId = name;
  document.getElementById('inspector').classList.remove('hidden');
  destroyChart();
  document.getElementById('inspTag').textContent = 'West Bengal OSM River Path';
  document.getElementById('inspTitle').textContent = name;
  document.getElementById('inspBody').innerHTML = `
    <div class="chart-card">
      <div class="chart-head">
        <div>
          <div class="micro-label" style="margin:0;">Live GloFAS Discharge (m&sup3;/s)</div>
          <div style="font-size:0.75rem; color:var(--muted-ink);">Sampled at ${lat.toFixed(3)}, ${lon.toFixed(3)}</div>
        </div>
        <button id="refreshGlofasBtn" class="icon-btn" style="width:30px;height:30px;"><i data-lucide="refresh-cw" width="13" height="13"></i></button>
      </div>
      <div class="chart-box"><canvas id="dischargeChart"></canvas></div>
      <div id="glofasStatus" class="chart-status">Fetching 14-day GloFAS discharge...</div>
    </div>
    <p class="legal-note">Explore full upstream topology on <a href="https://waterwaymap.org/river/region/IN-West%20Bengal/" target="_blank" rel="noopener">WaterwayMap IN-West Bengal</a>.</p>
  `;
  lucide.createIcons();
  document.getElementById('refreshGlofasBtn').addEventListener('click', () => loadGlofasChart(lat, lon));
  loadGlofasChart(lat, lon);
}

async function loadGlofasChart(lat, lon) {
  const statusEl = document.getElementById('glofasStatus');
  const canvas = document.getElementById('dischargeChart');
  if (!statusEl || !canvas) return;
  if (canvas.parentElement) canvas.parentElement.style.display = 'block';
  statusEl.textContent = 'Querying Open-Meteo GloFAS Flood API...';
  try {
    const data = await fetchGlofasForecast(lat, lon);
    const times = data?.daily?.time || [];
    const vals = data?.daily?.river_discharge || [];
    const nums = vals.filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    if (!nums.length) {
      if (canvas.parentElement) canvas.parentElement.style.display = 'none';
      statusEl.textContent = 'GloFAS returned no active channel cell at this coordinate.';
      return;
    }
    const historical = vals.slice(0, Math.max(0, vals.length - 7)).filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const forecast = vals.slice(-7).filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const p90 = percentile(historical, 0.90);
    const forecastPeak = forecast.length ? Math.max(...forecast) : null;
    let badge = document.getElementById('monsoonBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'monsoonBadge';
      badge.style.cssText = 'display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;font-size:.68rem;vertical-align:middle;white-space:nowrap';
      document.getElementById('inspTitle')?.append?.(' ');
      document.getElementById('inspTitle')?.parentElement?.appendChild(badge);
    }
    if (p90 !== null && forecastPeak !== null && forecastPeak > p90) {
      const ratio = (forecastPeak / p90).toFixed(2);
      badge.style.background = 'rgba(249,171,0,.14)'; badge.style.color = '#F9AB00'; badge.style.border = '1px solid #F9AB00'; badge.textContent = 'High Flow Watch';
      statusEl.textContent = `14-day peak ${forecastPeak.toFixed(1)} m³/s · p90 ${p90.toFixed(1)} m³/s · ratio ${ratio}×`;
    } else if (p90 !== null && forecastPeak !== null) {
      const ratio = (forecastPeak / p90).toFixed(2);
      badge.style.background = 'rgba(129,201,149,.12)'; badge.style.color = '#81C995'; badge.style.border = '1px solid #81C995'; badge.textContent = 'Normal Flow';
      statusEl.textContent = `14-day peak ${forecastPeak.toFixed(1)} m³/s · p90 ${p90.toFixed(1)} m³/s · ratio ${ratio}×`;
    } else {
      badge.textContent = 'Normal Flow'; badge.style.color = '#81C995'; badge.style.border = '1px solid #81C995';
      statusEl.textContent = `14-day peak: ${Math.max(...nums).toFixed(1)} m³/s · Historical baseline unavailable`;
    }
    destroyChart();
    const recentTimes = times.slice(-14);
    const recentVals = vals.slice(-14);
    state.chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: recentTimes.map(t => t.slice(5)),
        datasets: [{ label: 'Discharge (m³/s)', data: recentVals, borderColor: '#8AB4F8', backgroundColor: 'rgba(26,115,232,0.18)', borderWidth: 2, pointRadius: 2.5, fill: true, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#A1A6AD', font: { size: 10 } }, grid: { color: 'rgba(51,54,59,0.5)' } }, y: { ticks: { color: '#A1A6AD', font: { size: 10 } }, grid: { color: 'rgba(51,54,59,0.5)' } } } }
    });
  } catch (err) {
    if (canvas.parentElement) canvas.parentElement.style.display = 'none';
    statusEl.textContent = 'Live GloFAS API unreachable right now. Click Refresh when online.';
  }
}

function renderRiverInspector(r) {
  destroyChart();
  document.getElementById('inspTag').textContent = r.region;
  document.getElementById('inspTitle').textContent = r.name;
  const linked = state.data.landmarks.filter(lm => lm.river_id === r.id);
  document.getElementById('inspBody').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">WaterwayMap Length</div><div class="kpi-val">${r.waterwaymap_length_km.toLocaleString()} km</div></div>
      <div class="kpi-card"><div class="kpi-label">WB Districts</div><div class="kpi-val">${(r.wb_districts || []).length}</div></div>
    </div>
    <div class="path-bar">
      <div><div class="micro-label" style="margin:0;">Full River Path (OSM)</div><div id="pathStatusText" style="font-size:0.76rem; color:var(--muted-ink);">Matching river course...</div></div>
      <button id="traceRiverBtn" class="pill-btn" style="height:30px; font-size:0.74rem;">Trace Path</button>
    </div>
    <div class="chart-card">
      <div class="chart-head">
        <div><div class="micro-label" style="margin:0;">Live GloFAS Discharge (m&sup3;/s)</div><div style="font-size:0.75rem; color:var(--muted-ink);">${escapeHtml(r.discharge_point_label)}</div></div>
        <button id="refreshGlofasBtn" class="icon-btn" style="width:30px;height:30px;"><i data-lucide="refresh-cw" width="13" height="13"></i></button>
      </div>
      <div class="chart-box"><canvas id="dischargeChart"></canvas></div>
      <div id="glofasStatus" class="chart-status">Fetching 14-day GloFAS discharge...</div>
    </div>
    ${renderScadaComparison(r.name)}
    <div class="info-block">
      <div class="info-row"><span class="info-key">Origin</span><span class="info-val">${escapeHtml(r.origin || '—')}</span></div>
      <div class="info-row"><span class="info-key">Mouth / Outfall</span><span class="info-val">${escapeHtml(r.mouth || '—')}</span></div>
      <div class="info-row"><span class="info-key">West Bengal Districts</span><div class="tag-list">${(r.wb_districts || []).map(d => `<span class="mini-tag">${escapeHtml(d)}</span>`).join('')}</div></div>
      <div class="info-row"><span class="info-key">Major Tributaries</span><div class="tag-list">${(r.major_tributaries || []).map(t => `<span class="mini-tag">${escapeHtml(t)}</span>`).join('') || '<span class="mini-tag">—</span>'}</div></div>
      <div class="info-row"><span class="info-key">Linked Barrages, Dams &amp; Ghats</span><div class="tag-list">${linked.map(lm => `<button class="mini-tag clickable" data-lm="${escapeHtml(lm.id)}">${escapeHtml(lm.name)}</button>`).join('') || '<span style="font-size:0.82rem;color:var(--muted-ink);">None pinned</span>'}</div></div>
    </div>
    ${(r.facts || []).length ? `<div class="info-block"><div class="info-key">Key Hydrological Facts</div><ul class="fact-list">${r.facts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>` : ''}
  `;
  lucide.createIcons();
  document.querySelectorAll('[data-lm]').forEach(btn => btn.addEventListener('click', () => selectFeature('landmark', btn.dataset.lm, true)));
  document.getElementById('refreshGlofasBtn').addEventListener('click', () => loadGlofasChart(r.lat, r.lon));
  document.getElementById('traceRiverBtn').addEventListener('click', () => traceRiverPath(r.name, r.alt_names || []));
  loadGlofasChart(r.lat, r.lon);
  traceRiverPath(r.name, r.alt_names || []);
}

async function renderWwmInspector(w) {
  destroyChart();
  document.getElementById('inspTag').textContent = 'WaterwayMap WB 912 Index';
  document.getElementById('inspTitle').textContent = w.name;
  document.getElementById('inspBody').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">WaterwayMap Length</div><div class="kpi-val">${w.length_km ? w.length_km.toLocaleString() + ' km' : '—'}</div></div>
      <div class="kpi-card"><div class="kpi-label">Rank in WB</div><div class="kpi-val">#${w.rank || '—'}</div></div>
    </div>
    <div class="path-bar">
      <div><div class="micro-label" style="margin:0;">OSM River Path</div><div id="pathStatusText" style="font-size:0.76rem; color:var(--muted-ink);">Searching embedded 601 paths...</div></div>
      <button id="retraceBtn" class="pill-btn" style="height:30px; font-size:0.74rem;">Trace Path</button>
    </div>
    <div class="chart-card">
      <div class="chart-head"><div class="micro-label" style="margin:0;">Live GloFAS Discharge (m&sup3;/s)</div></div>
      <div class="chart-box"><canvas id="dischargeChart"></canvas></div>
      <div id="glofasStatus" class="chart-status">Waiting for river midpoint...</div>
    </div>
    <p class="legal-note">Direct GeoJSON: <a href="${escapeHtml(w.geojson_url)}" target="_blank" rel="noopener">Download WaterwayMap geometry.geojson</a></p>
  `;
  const run = async () => {
    const lines = await traceRiverPath(w.name, []);
    if (lines && lines.length) {
      const seg = lines[Math.floor(lines.length / 2)].coords;
      const mid = seg[Math.floor(seg.length / 2)];
      loadGlofasChart(mid[0], mid[1]);
    }
  };
  document.getElementById('retraceBtn').addEventListener('click', run);
  run();
}

function renderCwcInspector(st) {
  destroyChart();
  const unit = st.unit || 'm³/s';
  document.getElementById('inspTag').textContent = st.source || 'NWDP CWC Telemetry';
  document.getElementById('inspTitle').textContent = st.station;
  document.getElementById('inspBody').innerHTML = `
    <div class="feature-hero">
      <div class="feature-hero-icon gauge"><i data-lucide="activity" width="24" height="24"></i></div>
      <div><div class="feature-hero-name">NWDP Gauge Station</div><div class="feature-hero-meta">${escapeHtml(st.district)} · ${escapeHtml(unit)} telemetry</div></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Median Flow</div><div class="kpi-val">${st.median_m3s} ${escapeHtml(unit)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Observed Peak</div><div class="kpi-val" style="color:var(--action-soft);">${st.peak_m3s} ${escapeHtml(unit)}</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-head"><div class="micro-label" style="margin:0;">Cleaned Monthly Series (${escapeHtml(st.date_start)} – ${escapeHtml(st.date_end)})</div></div>
      <div class="chart-box"><canvas id="cwcChart"></canvas></div>
      <div class="chart-status">Peak on ${escapeHtml(st.peak_date)} &middot; Negative glitches &amp; NaNs removed.</div>
    </div>
    ${renderScadaComparison(st.station)}
    <div class="info-block">
      <div class="info-row"><span class="info-key">District</span><span class="info-val">${escapeHtml(st.district)}, West Bengal</span></div>
      <div class="info-row"><span class="info-key">Coordinates</span><span class="info-val">${st.lat.toFixed(5)}&deg; N, ${st.lon.toFixed(5)}&deg; E</span></div>
      <div class="info-row"><span class="info-key">Valid Readings</span><span class="info-val">${st.valid_rows.toLocaleString()}</span></div>
    </div>
  `;
  lucide.createIcons();
  state.chartInstance = new Chart(document.getElementById('cwcChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: st.monthly.map(m => m.ym),
      datasets: [
        { label: `Mean (${unit})`, data: st.monthly.map(m => m.mean), backgroundColor: 'rgba(52,168,83,0.72)', borderRadius: 4 },
        { label: `Peak (${unit})`, data: st.monthly.map(m => m.max), type: 'line', borderColor: '#8AB4F8', borderWidth: 2, pointRadius: 2.5, tension: 0.25 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#A1A6AD', boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: '#A1A6AD', font: { size: 10 } }, grid: { color: 'rgba(51,54,59,0.5)' } }, y: { ticks: { color: '#A1A6AD', font: { size: 10 } }, grid: { color: 'rgba(51,54,59,0.5)' } } } }
  });
  initScadaComparison(st.station);
}

function renderLandmarkInspector(lm) {
  destroyChart();
  const parent = state.data.rivers.find(r => r.id === lm.river_id);
  document.getElementById('inspTag').textContent = lm.category;
  document.getElementById('inspTitle').textContent = lm.name;
  document.getElementById('inspBody').innerHTML = `
    <div class="feature-hero">
      <div class="feature-hero-icon barrage"><i data-lucide="${String(lm.category).toLowerCase().includes('ghat') ? 'waves' : 'landmark'}" width="24" height="24"></i></div>
      <div><div class="feature-hero-name">${escapeHtml(lm.category)}</div><div class="feature-hero-meta">${escapeHtml(lm.district)} · ${parent ? escapeHtml(parent.name) : 'West Bengal river infrastructure'}</div></div>
    </div>
    <div class="info-block">
      <div class="info-row"><span class="info-key">District</span><span class="info-val">${escapeHtml(lm.district)}</span></div>
      <div class="info-row"><span class="info-key">Coordinates</span><span class="info-val">${lm.lat.toFixed(5)}&deg; N, ${lm.lon.toFixed(5)}&deg; E</span></div>
      <div class="info-row"><span class="info-key">Parent River</span><div class="tag-list">${parent ? `<button id="jumpRiverBtn" class="mini-tag clickable">Inspect ${escapeHtml(parent.name)} &rarr;</button>` : '—'}</div></div>
      <div class="info-row"><span class="info-key">Overview</span><span class="info-val">${escapeHtml(lm.notes)}</span></div>
    </div>
    ${renderScadaComparison(lm.name)}
  `;
  lucide.createIcons();
  const btn = document.getElementById('jumpRiverBtn');
  if (btn && parent) btn.addEventListener('click', () => selectFeature('river', parent.id, true));
  initScadaComparison(lm.name);
}

export function renderNwdpCatalog() {
  document.getElementById('nwdpCatalogList').innerHTML = NWDP_CATALOG.map(item => `
    <div class="source-card">
      <div><div class="source-title">${escapeHtml(item.title)}</div><div class="source-desc">${escapeHtml(item.agency)} &middot; ${escapeHtml(item.desc)}</div></div>
      <a class="pill-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="height:30px;font-size:0.74rem;">Open</a>
    </div>
  `).join('');
}

export function renderDirectory(filter = '') {
  const q = filter.trim().toLowerCase();
  const rows = state.data.waterwayIndex.filter(w => !q || w.name.toLowerCase().includes(q)).slice(0, 200);
  const tbody = document.getElementById('dirTableBody');
  tbody.innerHTML = rows.map(w => `
    <tr data-wwm-name="${escapeHtml(w.name)}">
      <td style="color:var(--muted-ink);">${w.rank}</td>
      <td>${escapeHtml(w.name)}</td>
      <td style="color:var(--action-soft);">${w.length_km ? w.length_km.toLocaleString() : '—'}</td>
      <td><span class="mini-tag clickable">Trace Path</span></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      document.getElementById('dirModal').classList.remove('open');
      state.railTab = 'all912';
      document.getElementById('tabFeatured').classList.remove('active');
      document.getElementById('tabAll912').classList.add('active');
      selectFeature('wwm', tr.dataset.wwmName, true);
    });
  });
}

export function normalizeDistrictName(name) {
  return state.districtAliasMap[name] || name;
}

export function renderDistrictFilterChip() {
  const rail = document.getElementById('regionFilterWrap');
  if (!rail) return;
  let chip = document.getElementById('activeDistrictFilter');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'activeDistrictFilter';
    chip.style.marginTop = '7px';
    rail.appendChild(chip);
  }
  chip.innerHTML = state.selectedDistrict
    ? `<button class="chip active" id="clearDistrictFilter">District: ${escapeHtml(state.selectedDistrict)} &times;</button>`
    : '';
  const clear = document.getElementById('clearDistrictFilter');
  if (clear) clear.addEventListener('click', () => selectDistrict(state.selectedDistrict));
}

export function selectDistrict(district) {
  const normalized = normalizeDistrictName(district);
  state.selectedDistrict = state.selectedDistrict === normalized ? null : normalized;
  if (state.selectedDistrict) {
    state.region = 'all';
    document.querySelectorAll('#regionChips .chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('#regionChips .chip[data-region="all"]');
    if (allChip) allChip.classList.add('active');
    const feature = (state.data.wbDistricts?.features || []).find(f => normalizeDistrictName(f?.properties?.district || '') === state.selectedDistrict);
    if (feature) {
      const bounds = L.geoJSON(feature).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 10, animate: true, duration: 0.7 });
    }
  }
  renderDistrictFilterChip();
  renderRailList();
  renderMarkers(getFilteredFeaturedRivers());
  renderDistrictPolygons();
}

function renderScadaComparison(targetName = '') {
  const scadaNames = ['Durgapur Barrage', 'Durgapur Barrage_2', 'LBMC', 'RBMC', 'Panchet Dam', 'Dishergarh Bridge', 'Barakar'];
  const stations = state.cwcStations.filter(st => scadaNames.some(name => st.station?.toLowerCase().includes(name.toLowerCase())));
  const isTarget = targetName === 'Durgapur Barrage' || targetName === 'damodar' || /durgapur|lbmc|rbmc|panchet|dishergarh|barakar/i.test(targetName);
  if (!isTarget) return '';
  if (!stations.length) {
    return `<div class="chart-card"><div class="micro-label" style="margin:0 0 8px">Damodar-Barakar SCADA Comparison</div><div class="chart-status">No SCADA stations loaded.</div><button id="openScadaImportBtn" class="pill-btn primary" style="margin-top:8px;height:30px;font-size:.74rem">Import NWDP CSV</button></div>`;
  }
  return `<div class="chart-card"><div class="chart-head"><div class="micro-label" style="margin:0">Damodar-Barakar Peak Comparison</div></div><div class="chart-box"><canvas id="scadaChart"></canvas></div></div>`;
}

function initScadaComparison(targetName) {
  if (!/durgapur|lbmc|rbmc|panchet|dishergarh|barakar|damodar/i.test(targetName)) return;
  const canvas = document.getElementById('scadaChart');
  if (!canvas) {
    document.getElementById('openScadaImportBtn')?.addEventListener('click', () => document.getElementById('uploadModal')?.classList.add('open'));
    return;
  }
  const scadaNames = ['Durgapur Barrage', 'Durgapur Barrage_2', 'LBMC', 'RBMC', 'Panchet Dam', 'Dishergarh Bridge', 'Barakar'];
  const stations = state.cwcStations.filter(st => scadaNames.some(name => st.station?.toLowerCase().includes(name.toLowerCase())));
  if (!stations.length) return;
  state.scadaChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: stations.map(st => st.station),
      datasets: [{ label: 'Observed peak', data: stations.map(st => st.peak_m3s || 0), backgroundColor: '#F9AB00', borderColor: '#F9AB00', borderWidth: 1 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { color: '#A1A6AD' }, grid: { color: 'rgba(51,54,59,.5)' } }, y: { ticks: { color: '#E8EAED' }, grid: { display: false } } }
    }
  });
}
