import { state, escapeHtml, showToast } from './state.js';
import { loadAllAtlasData } from './dataLoader.js';
import { parseNwdpCsv } from './apiClients.js';
import {
  map, initMap, switchBasemap, resetView, updatePathCount,
  renderEmbeddedBoundariesAndRivers, renderDistrictPolygons, renderMarkers, streamAllRiversInView,
  osmNetworkLayerGroup, activeRiverPathLayer, customLayerGroup, syncLayerVisibility
} from './mapEngine.js';
import {
  getFilteredFeaturedRivers, renderRailList, selectFeature, selectOsmRiver,
  renderNwdpCatalog, renderDirectory, selectDistrict
} from './uiController.js';

async function bootstrap() {
  initMap({ onSelectFeature: selectFeature, onSelectOsmRiver: selectOsmRiver, onSelectDistrict: selectDistrict });
  lucide.createIcons();

  try {
    await loadAllAtlasData();
    updateLayerLabels();
    renderEmbeddedBoundariesAndRivers();
    renderDistrictPolygons();
    renderNwdpCatalog();
    renderRailList();
    renderMarkers(getFilteredFeaturedRivers());
    selectFeature('river', 'ganga', false);
  } catch (err) {
    showToast('Run via local server (python3 -m http.server 8000) to load data/ files');
    console.error(err);
  }

  // Rail tabs
  document.querySelectorAll('.rail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.railTab = tab.dataset.tab;
      document.getElementById('tabFeatured').classList.toggle('active', state.railTab === 'featured');
      document.getElementById('tabAll912').classList.toggle('active', state.railTab === 'all912');
      renderRailList();
    });
  });

  // Region chips
  document.querySelectorAll('#regionChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#regionChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.region = chip.dataset.region;
      state.selectedDistrict = null;
      document.getElementById('clearDistrictFilter')?.remove?.();
      renderDistrictPolygons();
      renderRailList();
      renderMarkers(getFilteredFeaturedRivers());
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  searchInput.addEventListener('input', e => {
    state.query = e.target.value;
    searchClear.classList.toggle('visible', state.query.length > 0);
    renderRailList();
    renderMarkers(getFilteredFeaturedRivers());
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.query = '';
    searchClear.classList.remove('visible');
    renderRailList();
    renderMarkers(getFilteredFeaturedRivers());
  });

  // Basemaps
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchBasemap(btn.dataset.basemap);
    });
  });

  // Layer toggles
  function updateLayerLabels() {
    const osmEl = document.getElementById('osmPathsLabel');
    if (osmEl) osmEl.textContent = `OSM River Paths (${state.data.osmRiversLite?.features?.length ?? 0})`;
    const riversEl = document.getElementById('riversLayerLabel');
    if (riversEl) riversEl.textContent = `Featured Rivers (${state.data.rivers.length})`;
    const lmEl = document.getElementById('landmarksLayerLabel');
    if (lmEl) lmEl.textContent = `Barrages & Ghats (${state.data.landmarks.length})`;
    const cwcEl = document.getElementById('cwcLayerLabel');
    if (cwcEl) cwcEl.textContent = `NWDP Gauges (${state.cwcStations.length})`;
    const distEl = document.getElementById('districtLayerLabel');
    if (distEl) distEl.textContent = `Districts (${state.data.wbDistricts?.features?.length ?? 0})`;
    const customEl = document.getElementById('customLayerLabel');
    if (customEl) customEl.textContent = `Imported Data (${state.customFeatureCount})`;
  }
  const bindToggle = (id, key) => document.getElementById(id).addEventListener('change', e => {
    state.layers[key] = e.target.checked;
    syncLayerVisibility();
    updateLayerLabels();
    if (key === 'districts') renderDistrictPolygons();
  });
  bindToggle('toggleOsmPaths', 'osmPaths');
  bindToggle('toggleRivers', 'rivers');
  bindToggle('toggleLandmarks', 'landmarks');
  bindToggle('toggleCwc', 'cwc');
  bindToggle('toggleNeBounds', 'neBounds');
  bindToggle('toggleDistricts', 'districts');
  bindToggle('toggleCustom', 'custom');

  // HUD actions
  document.getElementById('streamViewBtn').addEventListener('click', streamAllRiversInView);
  document.getElementById('clearPathsBtn').addEventListener('click', () => {
    osmNetworkLayerGroup.clearLayers();
    activeRiverPathLayer.clearLayers();
    updatePathCount();
    showToast('Cleared OSM river paths');
  });
  document.getElementById('resetViewBtn').addEventListener('click', resetView);
  document.getElementById('closeInspBtn').addEventListener('click', () => document.getElementById('inspector').classList.add('hidden'));
  document.getElementById('mobileRailBtn').addEventListener('click', () => document.getElementById('rail').classList.toggle('open'));

  // Modals
  const uploadModal = document.getElementById('uploadModal');
  const dirModal = document.getElementById('dirModal');
  const fileInput = document.getElementById('geojsonFileInput');
  const dropzone = document.getElementById('dropzone');
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.classList.add('open'));
  document.getElementById('closeUploadBtn').addEventListener('click', () => uploadModal.classList.remove('open'));
  document.getElementById('doneUploadBtn').addEventListener('click', () => uploadModal.classList.remove('open'));
  dropzone.addEventListener('click', () => fileInput.click());

  const processImportFile = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      if (file.name.toLowerCase().endsWith('.csv')) {
        try {
          const stations = parseNwdpCsv(text, file.name);
          const existing = new Set(state.cwcStations.map(s => s.station));
          stations.forEach(s => { if (!existing.has(s.station)) state.cwcStations.push(s); });
          renderRailList();
          renderMarkers(getFilteredFeaturedRivers());
          document.getElementById('uploadStatus').textContent = `Imported ${stations.length} NWDP stations from "${file.name}".`;
          showToast(`Added ${stations.length} NWDP stations`);
        } catch (err) {
          document.getElementById('uploadStatus').textContent = `CSV parse error: ${err.message}`;
        }
      } else {
        try {
          const gj = JSON.parse(text);
          const layer = L.geoJSON(gj, {
            style: { color: '#8AB4F8', weight: 2.2, opacity: 0.9, fillColor: '#1A73E8', fillOpacity: 0.14 },
            onEachFeature: (feat, lyr) => lyr.bindTooltip(escapeHtml(feat.properties?.name || feat.properties?.District || 'Feature'))
          }).addTo(customLayerGroup);
          const count = gj.features ? gj.features.length : 1;
          state.customFeatureCount += count;
          document.getElementById('customLayerRow').hidden = false;
          document.getElementById('customLayerLabel').textContent = `Imported Data (${state.customFeatureCount})`;
          document.getElementById('uploadStatus').textContent = `Loaded "${file.name}" (${count} features).`;
          if (layer.getBounds && layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [30, 30] });
        } catch (err) {
          document.getElementById('uploadStatus').textContent = 'Invalid GeoJSON file.';
        }
      }
    };
    reader.onerror = () => { document.getElementById('uploadStatus').textContent = 'Could not read the selected file.'; };
    reader.readAsText(file);
  };

  fileInput.addEventListener('change', e => processImportFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, e => {
    e.prevent.preventDefault();
  }));
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, () => dropzone.classList.remove('dragging')));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) processImportFile(file);
  });

  document.getElementById('clearCustomBtn').addEventListener('click', () => {
    customLayerGroup.clearLayers();
    state.customFeatureCount = 0;
    document.getElementById('customLayerRow').hidden = true;
    document.getElementById('customLayerLabel').textContent = 'Imported Data (0)';
    document.getElementById('uploadStatus').textContent = 'Cleared uploaded layer.';
    fileInput.value = '';
  });

  document.getElementById('openDirBtn').addEventListener('click', () => {
    renderDirectory(document.getElementById('dirSearch').value);
    dirModal.classList.add('open');
  });
  document.getElementById('closeDirBtn').addEventListener('click', () => dirModal.classList.remove('open'));
  document.getElementById('dirSearch').addEventListener('input', e => renderDirectory(e.target.value));
  [uploadModal, dirModal].forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
}

document.body.classList.add('atlas-loading');
bootstrap().finally(() => {
  requestAnimationFrame(() => document.body.classList.remove('atlas-loading'));
});
