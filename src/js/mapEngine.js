import { WB_CENTER, WB_ZOOM, WB_BBOX, BASEMAP_URLS } from './config.js';
import { state, escapeHtml, showToast } from './state.js';
import { queryOverpass, extractOverpassPolylines } from './apiClients.js';

export let map;
export let basemaps;
export let neBoundaryLayerGroup;
export let districtLayerGroup;
export let osmNetworkLayerGroup;
export let activeRiverPathLayer;
export let riverLayerGroup;
export let landmarkLayerGroup;
export let cwcLayerGroup;
export let customLayerGroup;

let activeRiverRenderer;

let handlers = { onSelectFeature: () => {}, onSelectOsmRiver: () => {}, onSelectDistrict: () => {} };

export function initMap(callbacks) {
  handlers = { ...handlers, ...callbacks };
  map = L.map('map', {
    center: WB_CENTER,
    zoom: WB_ZOOM,
    zoomControl: false,
    preferCanvas: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true,
    touchZoom: true,
    boxZoom: true,
    keyboard: true,
    inertia: true,
    worldCopyJump: true
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  activeRiverRenderer = L.svg({ padding: 1 });
  activeRiverRenderer.addTo(map);

  basemaps = {
    dark: L.layerGroup([
      L.tileLayer(BASEMAP_URLS.darkBase, { maxZoom: 16, attribution: 'Tiles &copy; Esri &mdash; Dark Gray Canvas' }),
      L.tileLayer(BASEMAP_URLS.darkRef, { maxZoom: 16 })
    ]),
    satellite: L.layerGroup([
      L.tileLayer(BASEMAP_URLS.satellite, { maxZoom: 18, attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics' }),
      L.tileLayer(BASEMAP_URLS.darkRef, { maxZoom: 16 })
    ]),
    terrain: L.tileLayer(BASEMAP_URLS.terrain, { maxZoom: 18, attribution: 'Tiles &copy; Esri &mdash; World Topographic Map' })
  };
  basemaps.dark.addTo(map);

  neBoundaryLayerGroup = L.layerGroup().addTo(map);
  districtLayerGroup = L.layerGroup().addTo(map);
  osmNetworkLayerGroup = L.layerGroup().addTo(map);
  activeRiverPathLayer = L.layerGroup().addTo(map);
  riverLayerGroup = L.layerGroup().addTo(map);
  landmarkLayerGroup = L.layerGroup().addTo(map);
  cwcLayerGroup = L.layerGroup().addTo(map);
  customLayerGroup = L.layerGroup().addTo(map);
}

export function switchBasemap(next) {
  if (next === state.basemap) return;
  map.removeLayer(basemaps[state.basemap]);
  basemaps[next].addTo(map);
  state.basemap = next;
}

export function resetView() {
  map.flyTo(WB_CENTER, WB_ZOOM, { duration: 0.6 });
}

export function updatePathCount() {
  const total = osmNetworkLayerGroup.getLayers().length + activeRiverPathLayer.getLayers().length;
  const el = document.getElementById('pathCountLabel');
  if (el) el.textContent = `${total} OSM paths`;
}

export function renderEmbeddedBoundariesAndRivers() {
  neBoundaryLayerGroup.clearLayers();
  if (state.data.wbStateBoundary) {
    const wbLayer = L.geoJSON(state.data.wbStateBoundary, {
      interactive: true,
      style: { color: '#8AB4F8', weight: 2.2, opacity: 0.95, fillColor: '#1A73E8', fillOpacity: 0.045 },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip('<strong>West Bengal</strong><br/>State boundary', { sticky: true, direction: 'top' });
        layer.on('mouseover', () => layer.setStyle({ color: '#FFFFFF', weight: 2.8, fillOpacity: 0.09 }));
        layer.on('mouseout', () => layer.setStyle({ color: '#8AB4F8', weight: 2.2, fillOpacity: 0.045 }));
        layer.on('click', () => {
          const bounds = wbLayer.getBounds?.();
          if (bounds?.isValid()) map.fitBounds(bounds, { padding: [28, 28], animate: true, duration: 0.7 });
        });
      }
    }).addTo(neBoundaryLayerGroup);
  }
  if (state.data.wbIntlBorders) {
    L.geoJSON(state.data.wbIntlBorders, {
      style: { color: '#A1A6AD', weight: 1.2, dashArray: '4 4', opacity: 0.65 }
    }).addTo(neBoundaryLayerGroup);
  }
  if (state.data.wbCities) {
    L.geoJSON(state.data.wbCities, {
      pointToLayer: (feat, latlng) => L.circleMarker(latlng, {
        radius: 3.5, color: '#E8EAED', weight: 1, fillColor: '#000000', fillOpacity: 0.9
      }),
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(`<strong>${escapeHtml(feat.properties?.name || 'City')}</strong> (Natural Earth)`, { direction: 'top' });
      }
    }).addTo(neBoundaryLayerGroup);
  }

  osmNetworkLayerGroup.clearLayers();
  const palette = ['#4FD1C5', '#8AB4F8', '#63B3ED', '#38B2AC', '#90CDF4', '#4299E1'];
  (state.data.osmRiversLite?.features || []).forEach(feat => {
    const rName = feat.properties?.n || 'River';
    let hash = 0;
    for (let i = 0; i < rName.length; i++) hash = ((hash << 5) - hash) + rName.charCodeAt(i);
    const color = palette[Math.abs(hash) % palette.length];
    const lyr = L.geoJSON(feat, {
      interactive: true,
      bubblingMouseEvents: false,
      style: { color, weight: 2.1, opacity: 0.92 }
    });
    lyr.eachLayer(layer => {
      layer.options.interactive = true;
      layer.bindTooltip(`<strong>${escapeHtml(rName)}</strong><br/>Click to inspect this river`, { sticky: true, direction: 'top' });
      layer.on('mouseover', () => layer.setStyle({ weight: 3.8, opacity: 1, color: '#FFFFFF' }));
      layer.on('mouseout', () => layer.setStyle({ weight: 2.1, opacity: 0.92, color }));
      layer.on('click', e => {
        L.DomEvent.stopPropagation(e);
        const latlng = e.latlng || layer.getBounds().getCenter();
        handlers.onSelectOsmRiver(rName, {}, latlng.lat, latlng.lng);
      });
    });
    lyr.addTo(osmNetworkLayerGroup);
  });
  updatePathCount();
}

export function renderMarkers(filteredRivers) {
  riverLayerGroup.clearLayers();
  landmarkLayerGroup.clearLayers();
  cwcLayerGroup.clearLayers();

  filteredRivers.forEach(r => {
    const isSel = state.selectedType === 'river' && state.selectedId === r.id;
    const icon = L.divIcon({
      className: `atlas-map-marker featured-river-marker${isSel ? ' selected' : ''}`,
      html: '<span class="marker-ring"></span><span class="marker-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8c2.2 0 2.2 2 4.5 2S9.8 8 12 8s2.3 2 4.5 2S18.8 8 21 8M3 13c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.3 2 4.5 2 2.3-2 4.5-2M3 18c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.3 2 4.5 2 2.3-2 4.5-2"/></svg></span>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const m = L.marker([r.lat, r.lon], { icon });
    m.bindTooltip(`<strong>${escapeHtml(r.name)}</strong><br/>${r.waterwaymap_length_km} km &middot; ${escapeHtml(r.region)}`, { direction: 'top', offset: [0, -6] });
    m.on('click', () => handlers.onSelectFeature('river', r.id, true));
    m.addTo(riverLayerGroup);
  });

  state.data.landmarks.forEach(lm => {
    const isSel = state.selectedType === 'landmark' && state.selectedId === lm.id;
    const isLinked = state.selectedType === 'river' && state.selectedId === lm.river_id;
    const category = String(lm.category || '').toLowerCase();
    const isGhat = category.includes('ghat');
    const icon = L.divIcon({
      className: `atlas-map-marker barrage-marker${isSel || isLinked ? ' selected' : ''}${isGhat ? ' ghat-marker' : ''}`,
      html: isGhat
        ? '<span class="marker-ring"></span><span class="marker-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 15h12M8 12h8M10 9h4M12 6v10"/></svg></span>'
        : '<span class="marker-ring"></span><span class="marker-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 7v10M12 7v10M16 7v10M5 12h14"/></svg></span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const m = L.marker([lm.lat, lm.lon], { icon });
    m.bindTooltip(`<strong>${escapeHtml(lm.name)}</strong><br/>${escapeHtml(lm.category.toUpperCase())} &middot; ${escapeHtml(lm.district)}`, { direction: 'top', offset: [0, -6] });
    m.on('click', () => handlers.onSelectFeature('landmark', lm.id, true));
    m.addTo(landmarkLayerGroup);
  });

  state.cwcStations.forEach(st => {
    const isSel = state.selectedType === 'cwc' && state.selectedId === st.station;
    const icon = L.divIcon({
      className: `atlas-map-marker gauge-marker${isSel ? ' selected' : ''}`,
      html: '<span class="marker-ring"></span><span class="marker-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg></span>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const m = L.marker([st.lat, st.lon], { icon });
    m.bindTooltip(`<strong>NWDP: ${escapeHtml(st.station)}</strong><br/>${escapeHtml(st.district)} &middot; Peak ${st.peak_m3s} ${escapeHtml(st.unit || 'm³/s')}`, { direction: 'top', offset: [0, -6] });
    m.on('click', () => handlers.onSelectFeature('cwc', st.station, true));
    m.addTo(cwcLayerGroup);
  });

  const cwcLbl = document.getElementById('cwcLayerLabel');
  if (cwcLbl) cwcLbl.textContent = `NWDP (${state.cwcStations.length})`;

  syncLayerVisibility();
}

export function syncLayerVisibility() {
  const sync = (flag, grp) => { if (flag) { if (!map.hasLayer(grp)) grp.addTo(map); } else { map.removeLayer(grp); } };
  sync(state.layers.osmPaths, osmNetworkLayerGroup);
  sync(state.layers.osmPaths, activeRiverPathLayer);
  sync(state.layers.rivers, riverLayerGroup);
  sync(state.layers.landmarks, landmarkLayerGroup);
  sync(state.layers.cwc, cwcLayerGroup);
  sync(state.layers.neBounds, neBoundaryLayerGroup);
  sync(state.layers.districts, districtLayerGroup);
  sync(state.layers.custom, customLayerGroup);
}

export function drawActiveRiverPath(lines) {
  activeRiverPathLayer.clearLayers();
  const bounds = L.latLngBounds([]);
  lines.forEach(item => {
    const pl = L.polyline(item.coords, {
      renderer: activeRiverRenderer,
      color: '#4FD1C5',
      weight: 3.6,
      opacity: 0.98,
      dashArray: '10 14',
      className: 'animated-river-path'
    });
    pl.bindTooltip(`<strong>${escapeHtml(item.name)}</strong><br/>Highlighted River Path`, { sticky: true });
    pl.addTo(activeRiverPathLayer);
    item.coords.forEach(pt => bounds.extend(pt));
  });
  if (state.layers.osmPaths && !map.hasLayer(activeRiverPathLayer)) activeRiverPathLayer.addTo(map);
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 11 });
  updatePathCount();
}

export async function traceRiverPath(riverName, altNames = [], statusTargetId = 'pathStatusText') {
  const statusEl = document.getElementById(statusTargetId);
  const cacheKey = riverName.toLowerCase();
  activeRiverPathLayer.clearLayers();

  if (state.pathCache[cacheKey]) {
    drawActiveRiverPath(state.pathCache[cacheKey]);
    if (statusEl) statusEl.textContent = `Highlighted ${state.pathCache[cacheKey].length} segments for ${riverName} (cached).`;
    return state.pathCache[cacheKey];
  }

  const normalizeRiverName = name => String(name || '')
    .normalize('NFKC')
    .replace(/\s*River$/i, '')
    .replace(/[()\[\],.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const matchTerms = [...new Set([riverName, ...altNames].map(normalizeRiverName).filter(t => t.length >= 3))];

  const embeddedMatches = (state.data.osmRiversLite?.features || []).filter(f => {
    const fn = normalizeRiverName(f.properties?.n);
    return matchTerms.includes(fn);
  });

  if (embeddedMatches.length) {
    const lines = [];
    embeddedMatches.forEach(f => {
      const rName = f.properties?.n || riverName;
      const coordsList = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
      coordsList.forEach(seg => lines.push({ name: rName, coords: seg.map(pt => [pt[1], pt[0]]), tags: {} }));
    });
    state.pathCache[cacheKey] = lines;
    drawActiveRiverPath(lines);
    if (statusEl) statusEl.textContent = `Highlighted ${lines.length} embedded OSM river segments for ${riverName}.`;
    return lines;
  }

  if (statusEl) statusEl.textContent = `Streaming live OSM river path for ${riverName}...`;
  const rx = matchTerms.slice(0, 3).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const ql = `[out:json][timeout:25];(way["waterway"="river"]["name"~"^(${rx})$",i](${WB_BBOX}););out geom;`;
  try {
    const json = await queryOverpass(ql);
    const extracted = extractOverpassPolylines(json);
    const lines = extracted.filter(item => matchTerms.includes(String(item.name || '')
      .normalize('NFKC').replace(/\s*River$/i, '').replace(/[()\[\],.]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()));
    if (!lines.length) {
      if (statusEl) statusEl.textContent = `No OSM river segments matched "${riverName}" in WB bbox.`;
      return null;
    }
    state.pathCache[cacheKey] = lines;
    drawActiveRiverPath(lines);
    if (statusEl) statusEl.textContent = `Traced ${lines.length} live OSM segments for ${riverName}.`;
    return lines;
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Live Overpass unreachable right now. Click Trace Path when online.';
    return null;
  }
}

export async function streamAllRiversInView() {
  const btn = document.getElementById('streamViewBtn');
  const txt = document.getElementById('streamViewText');
  const b = map.getBounds();
  const s = Math.max(21.3, b.getSouth()).toFixed(4);
  const w = Math.max(85.7, b.getWest()).toFixed(4);
  const n = Math.min(27.35, b.getNorth()).toFixed(4);
  const e = Math.min(90.0, b.getEast()).toFixed(4);

  btn.disabled = true;
  txt.textContent = 'Streaming OSM Rivers...';
  const ql = `[out:json][timeout:30];way["waterway"="river"]["name"](${s},${w},${n},${e});out geom;`;
  try {
    const json = await queryOverpass(ql);
    const lines = extractOverpassPolylines(json);
    osmNetworkLayerGroup.clearLayers();
    const palette = ['#4FD1C5', '#8AB4F8', '#63B3ED', '#38B2AC', '#90CDF4', '#4299E1'];
    const names = new Set();
    lines.forEach(item => {
      names.add(item.name);
      let hash = 0;
      for (let i = 0; i < item.name.length; i++) hash = ((hash << 5) - hash) + item.name.charCodeAt(i);
      const pl = L.polyline(item.coords, { color: palette[Math.abs(hash) % palette.length], weight: 2.2, opacity: 0.85 });
      pl.bindTooltip(`<strong>${escapeHtml(item.name)}</strong><br/>Click to inspect &amp; fetch live GloFAS`, { sticky: true });
      pl.on('click', () => {
        const mid = item.coords[Math.floor(item.coords.length / 2)];
        handlers.onSelectOsmRiver(item.name, item.tags, mid[0], mid[1]);
      });
      pl.addTo(osmNetworkLayerGroup);
    });
    updatePathCount();
    showToast(`Streamed ${names.size} named rivers (${lines.length} OSM ways) in view`);
  } catch (err) {
    showToast('Overpass API busy or offline — using embedded 601 river paths');
  } finally {
    btn.disabled = false;
    txt.textContent = 'Stream All Rivers in View (OSM)';
  }
}

export function renderDistrictPolygons() {
  districtLayerGroup.clearLayers();
  const collection = state.data.wbDistricts;
  if (!collection?.features?.length) {
    syncDistrictVisibility();
    return;
  }
  const norm = name => state.districtAliasMap[String(name)] || String(name);
  L.geoJSON(collection, {
    style: feature => {
      const district = feature?.properties?.district || '';
      const selected = norm(district) === state.selectedDistrict;
      return {
        color: selected ? '#8AB4F8' : '#33363B',
        weight: selected ? 2.2 : 1,
        opacity: 0.95,
        fillColor: selected ? '#1A73E8' : '#000000',
        fillOpacity: selected ? 0.16 : 0.04
      };
    },
    onEachFeature: (feature, layer) => {
      const district = feature?.properties?.district || 'District';
      layer.bindTooltip(`<strong>${escapeHtml(district)}</strong>`, { sticky: true, direction: 'top' });
      layer.on('mouseover', () => {
        if (norm(district) !== state.selectedDistrict) layer.setStyle({ color: '#8AB4F8', fillColor: '#1A73E8', fillOpacity: 0.16, weight: 2 });
      });
      layer.on('mouseout', () => {
        if (norm(district) !== state.selectedDistrict) layer.setStyle({ color: '#33363B', fillColor: '#000000', fillOpacity: 0.04, weight: 1 });
      });
      layer.on('click', () => handlers.onSelectDistrict(district));
    }
  }).addTo(districtLayerGroup);
  syncDistrictVisibility();
}

function syncDistrictVisibility() {
  if (!districtLayerGroup || !map) return;
  if (state.layers.districts) {
    if (!map.hasLayer(districtLayerGroup)) districtLayerGroup.addTo(map);
  } else {
    map.removeLayer(districtLayerGroup);
  }
}
