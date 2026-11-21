# Product Roadmap — West Bengal River Atlas

## Phase 1: Core Interactive Atlas (Completed)
- Modular `earth-google` dark Leaflet + Canvas renderer.
- Embedded 601 West Bengal OSM river paths + 912-river WaterwayMap index.
- Natural Earth 1:10m West Bengal state boundary, international borders, cities, urban areas, ports.
- 15 featured rivers with origins, mouths, districts, tributaries, and linked barrages/dams/ghats.
- Live Open-Meteo GloFAS 14-day discharge charts + cleaned CWC telemetry (`Sonapur_1`, `Toofanganj`).
- In-browser NWDP CSV + GeoJSON drag-and-drop loader.

## Phase 2: District & Basin Hydrological Layer (Next)
- Integrate 23 West Bengal district polygons (`wb_districts.geojson` from DataMeet) for click-to-filter by district.
- Ingest CWC Manual Daily Discharge (2001–2025 & 2026–2030) and WB-SW Reservoir Water Level CSVs via `scripts/clean_nwdp_csv.py`.
- Add Durgapur Barrage SCADA gate-discharge comparison cards (LBMC, RBMC, Panchet, Dishergarh, Barakar).

## Phase 3: Production Hydrological Intelligence
- Optional lightweight static build (`vite`) or PMTiles vector-tile streaming directly from WaterwayMap R2 buckets for zoom-dependent river width styling.
- Monsoon flood-stage threshold alerts comparing live GloFAS forecasts against historical CWC peak percentiles.
- Export current filtered view as GeoJSON or printable hydrological brief.
