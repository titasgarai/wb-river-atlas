# Domain Context & Data Provenance

## 1. Hydrological Regions of West Bengal
West Bengal's river network spans four distinct hydrological zones:
1. **North Bengal (Himalayan):** Snow- and monsoon-fed braided rivers descending from Sikkim/Bhutan Himalayas (Teesta, Mahananda, Jaldhaka, Torsa). High flash-flood variability.
2. **Gangetic Plain & Delta:** The Ganga enters at Manikchak (Malda), bifurcates near Farakka into the Padma (Bangladesh) and Bhagirathi-Hooghly (West Bengal), fed by distributaries like Jalangi and Ichamati.
3. **Western Plateau & Rarh:** Rain-fed rivers draining the Chota Nagpur Plateau eastward into the Bhagirathi-Hooghly or Bay of Bengal (Damodar, Kangsabati, Subarnarekha, Ajay, Dwarakeshwar, Mayurakshi). Regulated by major DVC and state dams/barrages.
4. **Sundarbans & Tidal Delta:** Estuarine tidal creeks and wide channels (Matla, Bidyadhari) shaped by Bay of Bengal tides rather than upland snowmelt.

## 2. Verified Data Sources & Known Quirks
- **WaterwayMap / OSM (`waterwaymap_912_index.json` + `wb_osm_rivers_lite.geojson`):**
  - Lists 912 longest named rivers in West Bengal (of 1,224 total).
  - Each river has a direct `geometry.geojson` on `waterwaymap.org/river/<slug>/geometry.geojson`.
  - Embedded `wb_osm_rivers_lite.geojson` contains 601 named West Bengal rivers (1,485 OSM ways simplified at `0.004°` tolerance for fast Canvas rendering).
- **NWDP CWC Telemetry (`cwc_telemetry_clean.json`):**
  - Derived from `river_discharge_tele_hr_cwc_wb_1970_2025.csv` (40,734 raw rows).
  - **Quirks handled in `scripts/clean_nwdp_csv.py`:** Actual sampling is 15-minute (not hourly) from May 2024–Dec 2025; `River`/`Basin` columns are blank (`-`); 8.9% rows are `NaN` and 6.2% are negative sensor faults (`-99` sentinels and extreme negatives `< -1,000`). All invalid values are stripped before aggregation.
- **Natural Earth 1:10m Cultural Vectors (`data/boundaries/`):**
  - Provides West Bengal state boundary (`Admin 1`), India-POV international borders (`Admin 0`), 10 major cities, 24 urban polygons, and ports.
  - Note: Natural Earth `Admin 2` is US-only; West Bengal district polygons should be added from an India-specific source (e.g., DataMeet) in Phase 2.
- **Open-Meteo GloFAS Flood API:**
  - Free, keyless 14-day (7 past + 7 forecast) daily discharge (`m³/s`) on a ~5 km global river grid. Coordinates must sit on main channels so the grid does not snap to a dry adjacent cell.
