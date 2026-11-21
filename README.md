# West Bengal River Atlas

An interactive, modular hydrological web application for exploring **912 West Bengal rivers**, **601 real curved OpenStreetMap river paths**, **Natural Earth 1:10m boundaries**, **major barrages/dams/ghats**, **NWDP CWC telemetry**, and **live Open-Meteo GloFAS flood discharge forecasts**—styled with the `earth-google` dark cartographic design system.

## Quickstart (Local Dev)

Because the app loads modular ES scripts (`src/js/*.js`) and external GeoJSON/JSON files (`data/**/*.geojson`) via `fetch()`, run it from a local HTTP server (not `file://`):

```bash
# Option 1: Python (zero install)
python3 -m http.server 8000

# Option 2: Node.js
npm run dev
```

Then open **http://localhost:8000** in your browser.

## Project Structure

```text
wb-river-atlas/
├── index.html                        # Semantic HTML shell
├── package.json                      # Local dev scripts
├── README.md                         # Project overview & quickstart
├── CONTEXT.md                        # Hydrological domain & data provenance
├── DESIGN.md                         # earth-google dark design tokens & layout rules
├── docs/
│   ├── PLAN.md                       # Phased roadmap (v1 -> v3)
│   ├── TECHNICAL_ARCHITECTURE.md     # Module graph, rendering & API architecture
│   └── DATA_SCHEMA.md                # JSON, GeoJSON & NWDP CSV schemas
├── src/
│   ├── css/
│   │   ├── tokens.css                # earth-google colors, typography & spacing variables
│   │   ├── layout.css                # Topbar, left rail, map stage, inspector & responsive rules
│   │   └── components.css            # Chips, KPI cards, charts, modals & Leaflet overrides
│   └── js/
│       ├── main.js                   # Entry point & event wiring
│       ├── config.js                 # Basemaps, bounds, API endpoints & NWDP catalog
│       ├── state.js                  # Centralized in-memory state store
│       ├── dataLoader.js             # Parallel fetch loader for data/ assets
│       ├── apiClients.js             # Open-Meteo GloFAS, Overpass API & NWDP CSV parser
│       ├── mapEngine.js              # Leaflet canvas renderer, layers & path highlighting
│       └── uiController.js           # Sidebar, inspector sheets, Chart.js & modals
├── data/
│   ├── rivers/                       # major_rivers.json, waterwaymap_912_index.json, wb_osm_rivers_lite.geojson
│   ├── boundaries/                   # Natural Earth 1:10m WB state, borders, cities, urban areas, ports
│   ├── landmarks/                    # wb_landmarks.geojson (barrages, dams, ghats)
│   └── telemetry/                    # cwc_telemetry_clean.json (cleaned NWDP CWC monthly series)
└── scripts/
    ├── clean_nwdp_csv.py             # Cleans NWDP CWC/WB-SW CSVs into compact JSON
    ├── fetch_osm_rivers.py           # Refreshes WB OSM river polylines via Overpass API
    └── clip_natural_earth.py         # Clips Natural Earth 1:10m shapefiles to West Bengal
```

## Data Sources & Attribution
- **River Network:** [WaterwayMap IN-West Bengal](https://waterwaymap.org/river/region/IN-West%20Bengal/) & OpenStreetMap contributors (ODbL).
- **Hydrological Telemetry:** [National Water Data Portal (NWDP)](https://nwdp.nwic.gov.in/group/water-quantity) — Central Water Commission (CWC) & West Bengal Surface Water Department.
- **Live Flood Forecasts:** [Open-Meteo Global Flood API](https://flood-api.open-meteo.com/v1/flood) (Copernicus GloFAS).
- **Boundaries & Cities:** [Natural Earth 1:10m Cultural Vectors](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/) (Public Domain).
- **Basemaps:** Esri ArcGIS Online MapServer (Dark Gray Canvas, World Imagery, World Topo).
