export const WB_CENTER = [24.25, 87.95];
export const WB_ZOOM = 7;
export const WB_BBOX = '21.45,85.82,27.25,89.88';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

export const GLOFAS_API = 'https://flood-api.open-meteo.com/v1/flood';

export const BASEMAP_URLS = {
  darkBase: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  darkRef: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
};

export const NWDP_CATALOG = [
  {
    title: 'CWC River Discharge (Manual - Daily) — WB 2001–2025',
    agency: 'Central Water Commission',
    desc: 'Broadest West Bengal station coverage with populated River, Basin, and Tributary names.',
    url: 'https://nwdp.nwic.gov.in/dataset/river-discharge-manual-dailly-central-water-commission-cwc/resource/f414a75a-f71d-4522-9600-ed9c952fbacd'
  },
  {
    title: 'CWC River Discharge (Manual - Daily) — WB 2026–2030',
    agency: 'Central Water Commission',
    desc: 'Latest daily manual discharge records for West Bengal stations.',
    url: 'https://nwdp.nwic.gov.in/dataset/river-discharge-manual-dailly-central-water-commission-cwc/resource/7dac0aa8-966a-4bd8-b347-2dc85c444931'
  },
  {
    title: 'WB-SW River Water Level (Telemetry - Hourly)',
    agency: 'West Bengal Surface Water',
    desc: 'Hourly river stage (meters) across West Bengal telemetry gauges.',
    url: 'https://nwdp.nwic.gov.in/dataset/river-water-level-telemetry-hourly-west-bengal-surface-water-department'
  },
  {
    title: 'WB-SW Reservoir Water Level (Manual - Daily)',
    agency: 'West Bengal Surface Water',
    desc: 'Daily reservoir levels for West Bengal dams and cross-border Maithon Dam.',
    url: 'https://nwdp.nwic.gov.in/dataset/reservoir-water-level-manual-daily-west-bengal-surface-water-department'
  },
  {
    title: 'WaterwayMap — West Bengal 912 Rivers',
    agency: 'OpenStreetMap / WaterwayMap',
    desc: 'Topological map of West Bengal rivers with per-river geometry.geojson downloads.',
    url: 'https://waterwaymap.org/river/region/IN-West%20Bengal/'
  }
];
