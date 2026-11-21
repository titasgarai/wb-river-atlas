import { state } from './state.js';

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

async function loadOptionalJson(path) {
  try {
    const res = await fetch(path);
    return res.ok ? res.json() : null;
  } catch (_) {
    return null;
  }
}

export async function loadAllAtlasData() {
  const [
    rivers,
    waterwayIndex,
    osmRiversLite,
    wbStateBoundary,
    wbIntlBorders,
    wbCities,
    landmarksGj,
    cwcTelemetry,
    districts
  ] = await Promise.all([
    loadJson('./data/rivers/major_rivers.json'),
    loadJson('./data/rivers/waterwaymap_912_index.json'),
    loadJson('./data/rivers/wb_osm_rivers_lite.geojson'),
    loadJson('./data/boundaries/wb_state_boundary.geojson'),
    loadJson('./data/boundaries/wb_international_borders.geojson'),
    loadJson('./data/boundaries/wb_populated_places.geojson'),
    loadJson('./data/landmarks/wb_landmarks.geojson'),
    loadJson('./data/telemetry/cwc_telemetry_clean.json'),
    loadOptionalJson('./data/boundaries/wb_districts.geojson')
  ]);

  state.data.rivers = rivers;
  state.data.waterwayIndex = waterwayIndex;
  state.data.osmRiversLite = osmRiversLite;
  state.data.wbStateBoundary = wbStateBoundary;
  state.data.wbIntlBorders = wbIntlBorders;
  state.data.wbCities = wbCities;
  state.data.landmarks = (landmarksGj.features || []).map(f => ({
    ...f.properties,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1]
  }));
  state.cwcStations = [...cwcTelemetry];
  state.data.wbDistricts = districts;
}
