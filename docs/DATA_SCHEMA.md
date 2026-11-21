# Data Schemas

## `data/rivers/major_rivers.json`
Array of curated river objects:
```json
{
  "id": "damodar",
  "name": "Damodar",
  "region": "Western Plateau & Rarh",
  "waterwaymap_length_km": 561,
  "origin": "Chota Nagpur Plateau, Jharkhand",
  "mouth": "Hooghly River",
  "wb_districts": ["Paschim Bardhaman", "Bankura", "Purba Bardhaman", "Hooghly", "Howrah"],
  "major_tributaries": ["Barakar", "Konar"],
  "lat": 23.4754,
  "lon": 87.3023,
  "discharge_point_label": "Durgapur Barrage, Paschim Bardhaman",
  "facts": ["..."]
}
```

## `data/rivers/waterwaymap_912_index.json`
Array of all 912 West Bengal rivers from WaterwayMap:
```json
{
  "rank": 2,
  "name": "Damodar",
  "slug": "Damodar 000566355639",
  "length_km": 561.0,
  "page_url": "https://waterwaymap.org/river/Damodar%20000566355639/",
  "geojson_url": "https://waterwaymap.org/river/Damodar%20000566355639/geometry.geojson"
}
```

## `data/telemetry/cwc_telemetry_clean.json`
Array of cleaned NWDP station summaries (output of `scripts/clean_nwdp_csv.py`):
```json
{
  "station": "Sonapur_1",
  "district": "NORTH DINAJPUR",
  "lat": 26.456111,
  "lon": 88.243333,
  "valid_rows": 17133,
  "date_start": "2024-05-21",
  "date_end": "2025-09-22",
  "median_m3s": 49.67,
  "peak_m3s": 401.48,
  "peak_date": "2025-09-14",
  "monthly": [{ "ym": "2024-07", "mean": 112.4, "max": 328.9, "n": 2104 }]
}
```
