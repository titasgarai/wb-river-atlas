# West Bengal River Atlas

[![Live Map](https://img.shields.io/badge/Live-GitHub%20Pages-1A73E8?style=for-the-badge&logo=github)](https://titasgarai.github.io/wb-river-atlas/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111)](#technology)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)

Interactive atlas for exploring rivers, infrastructure, districts, and hydrological telemetry across West Bengal.

**[Open the live atlas](https://titasgarai.github.io/wb-river-atlas/)**

## Explore

| Map content | Included |
|---|---:|
| West Bengal river index | 912 |
| Featured river profiles | 15 |
| OSM river paths | 601 |
| Barrages, dams, and ghats | 7 |
| NWDP telemetry stations | 2 |
| District boundaries | 23 |

### Key capabilities

- Search rivers, tributaries, districts, and gauge stations.
- Switch among 601 OSM river paths or open the 912-river WaterwayMap index.
- Inspect featured river length, districts, tributaries, linked infrastructure, and GloFAS discharge.
- View monthly NWDP telemetry charts and station details.
- Filter map markers and boundaries by region or district.
- Import NWDP telemetry CSV or custom GeoJSON data.
- Switch between dark, satellite, and terrain basemaps.

<details>
<summary><strong>Map layers</strong></summary>

- **OSM River Paths:** Simplified OpenStreetMap waterway geometry.
- **Featured Rivers:** Curated river profiles with hydrological context.
- **Barrages & Ghats:** Infrastructure points linked to their parent rivers.
- **NWDP Gauges:** Cleaned CWC telemetry station summaries.
- **WB Border:** West Bengal and international boundary overlays.
- **Districts:** District polygons for regional filtering.
- **Imported Data:** CSV or GeoJSON content loaded during the session.

</details>

## Run locally

No build step is required.

### Python

```bash
cd wb-river-atlas
python -m http.server 8000
```

### Node.js

```bash
cd wb-river-atlas
npm run dev
```

Open <http://localhost:8000>.

> Run through a local server. ES modules and data files do not work reliably when the HTML is opened directly from `file://`.

## Import your own data

Use **Import Data** in the top bar.

- `.csv` files may be imported as NWDP station telemetry.
- `.geojson` and `.json` files may be imported as custom map layers.

Imported layers remain in the current browser session.

## Technology

- HTML5, modular CSS, and native JavaScript ES Modules
- Leaflet 1.9.4
- Chart.js 4.4.1
- Lucide Icons
- GitHub Actions and GitHub Pages

## Data sources

- [OpenStreetMap](https://www.openstreetmap.org/) and [WaterwayMap](https://waterwaymap.org/river/region/IN-West%20Bengal/) for river geometry
- [National Water Data Portal](https://nwdp.nwic.gov.in/group/water-quantity) for NWDP/CWC telemetry
- [Open-Meteo GloFAS](https://flood-api.open-meteo.com/v1/flood) for discharge forecasts
- [Natural Earth](https://www.naturalearthdata.com/) for boundaries and cultural geography
- Esri ArcGIS for basemap tiles

## Repository structure

```text
index.html
src/
  css/
  js/
data/
  boundaries/
  landmarks/
  rivers/
  telemetry/
scripts/
.github/workflows/deploy-pages.yml
```
