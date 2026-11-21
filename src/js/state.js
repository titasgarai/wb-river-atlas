export const state = {
  data: {
    rivers: [],
    landmarks: [],
    waterwayIndex: [],
    osmRiversLite: null,
    wbStateBoundary: null,
    wbIntlBorders: null,
    wbCities: null,
    wbDistricts: null
  },
  cwcStations: [],
  railTab: 'featured',
  region: 'all',
  query: '',
  basemap: 'dark',
  selectedType: 'river',
  selectedId: 'ganga',
  layers: { osmPaths: true, rivers: true, landmarks: true, cwc: true, neBounds: true, districts: true, custom: true },
  customFeatureCount: 0,
  pathCache: {},
  chartInstance: null,
  scadaChartInstance: null,
  selectedDistrict: null,
  districtAliasMap: {
    Darjiling: 'Darjeeling', Haora: 'Howrah', Hugli: 'Hooghly',
    'Koch Bihar': 'Cooch Behar', Maldah: 'Malda', Puruliya: 'Purulia',
    Barddhaman: 'Purba Bardhaman', 'Paschim Barddhaman': 'Paschim Bardhaman',
    'North Twenty Four Parganas': 'North 24 Parganas',
    'South Twenty Four Parganas': 'South 24 Parganas'
  }
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}
