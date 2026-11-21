# Technical Architecture

## 1. Frontend Architecture (Zero-Build ES Modules)
The app uses native browser ES Modules (`<script type="module" src="src/js/main.js">`) with zero required build step, while cleanly separating concerns:
- **`config.js`**: Pure constants (ArcGIS tile templates, West Bengal bbox, API URLs, NWDP dataset directory).
- **`state.js`**: Single source of truth for filters, selected entity, layer flags, Overpass path cache, and active Chart.js instance.
- **`dataLoader.js`**: Uses `Promise.all` to fetch all JSON/GeoJSON datasets from `data/` in parallel on boot.
- **`mapEngine.js`**: Owns the Leaflet instance (`preferCanvas: true` for smooth 60fps rendering of 601+ polylines), basemaps, layer groups, path highlighting, and viewport-to-feature flyTo transitions.
- **`apiClients.js`**: Encapsulates external network calls (`flood-api.open-meteo.com`, Overpass mirrors) with graceful fallback handling, plus a streaming browser-side CSV parser for NWDP files.
- **`uiController.js`**: Pure DOM rendering for the left rail, right inspector sheet, Chart.js hydrographs, and modals.

## 2. Performance Strategy for 601–912 Rivers
- **Canvas Vector Rendering:** Leaflet's `preferCanvas: true` renders all 601 `MultiLineString` rivers on a single `<canvas>` layer instead of creating thousands of SVG DOM nodes.
- **Douglas-Peucker Simplification:** `scripts/fetch_osm_rivers.py` simplifies raw 5.54 MB OSM river ways (`0.004°` tolerance, 3-decimal coordinate precision) down to `247 KB` (`wb_osm_rivers_lite.geojson`) for sub-second initial load, while preserving on-demand Overpass streaming for full-resolution local zooming.
- **Virtualized / Capped Rail List:** The 912-river tab renders up to 150 matching rows at a time, filtered instantaneously on keystroke.
