# Copilot Instructions — West Bengal River Atlas

## Stack & Architecture
- Vanilla HTML5 + modular CSS (`src/css/tokens.css`, `layout.css`, `components.css`) + native ES Modules (`src/js/*.js`) with zero required build step.
- Map engine: Leaflet 1.9.4 with `preferCanvas: true` (required for smooth 60fps rendering of 601+ river polylines).
- Charts: Chart.js 4.4.1 (always place `<canvas>` inside a fixed-height container and set `maintainAspectRatio: false`).
- Icons: Lucide Icons 0.460.0.
- Local dev server: `python3 -m http.server 8000` or `npm run dev` (`npx serve . -l 8000`).

## Design System (`earth-google`)
- Strict dark cartographic theme using surface layering and `1px solid #33363B` hairlines.
- `--action: #1A73E8`; `--action-soft: #8AB4F8`; `--canvas: #000000`; `--surface: #000000`; `--surface-raised: #1F1F1F`; `--surface-alt: #26282C`; `--border: #33363B`; `--ink: #E8EAED`; `--muted-ink: #A1A6AD`.
- UI font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- Attribution/legal: `Times, "Times New Roman", serif` at `0.74rem`.

## Data Directory Contract (`data/`)
- `data/rivers/major_rivers.json`: featured rivers with id, name, alt_names, region, length, origin, mouth, districts, tributaries, coordinates, discharge label, and facts.
- `data/rivers/waterwaymap_912_index.json`: 912 indexed rivers with rank, name, slug, length_km, page_url, and geojson_url.
- `data/rivers/wb_osm_rivers_lite.geojson`: 601 simplified WB OSM `MultiLineString` paths with `properties.n` names.
- `data/boundaries/`: Natural Earth 1:10m clipped WB boundaries, borders, cities, urban areas, ports, and optional districts.
- `data/landmarks/wb_landmarks.geojson`: verified barrages, dams, and ghats linked by `river_id`.
- `data/telemetry/cwc_telemetry_clean.json`: cleaned NWDP CWC monthly summaries.

## External API & Data Hygiene Rules
- Basemaps use keyless ArcGIS MapServer tiles in `{z}/{y}/{x}` order.
- Open-Meteo GloFAS requests require `try/catch` and a clean offline fallback.
- Overpass API accepts `application/json` and must try mirror fallbacks.
- NWDP cleaning drops `NaN`, values `< 0`, `-99`, and extreme sensor faults before median/peak/monthly calculations.
- Never use `alert()`, `confirm()`, or `prompt()`; use in-page modals and toast notifications.

## Implementation Standards
- Keep native ES modules dependency-light and retain the zero-build local server workflow.
- Load local data with `Promise.all` and never block the UI on optional remote APIs.
- Destroy an existing Chart.js instance before re-instantiating it.
- Keep canvas containers at a fixed height and set `maintainAspectRatio: false`.
- Preserve the dark Leaflet controls and mobile responsive breakpoints at 1060px and 840px.
