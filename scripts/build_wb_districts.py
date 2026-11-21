import json
from pathlib import Path

ALIASES = {
    'Darjiling': 'Darjeeling', 'Haora': 'Howrah', 'Hugli': 'Hooghly',
    'Koch Bihar': 'Cooch Behar', 'Maldah': 'Malda', 'Puruliya': 'Purulia',
    'Barddhaman': 'Purba Bardhaman', 'Paschim Barddhaman': 'Paschim Bardhaman',
    'North Twenty Four Parganas': 'North 24 Parganas',
    'South Twenty Four Parganas': 'South 24 Parganas'
}

SOURCE_NAMES = set(ALIASES) | {
    'Alipurduar', 'Bankura', 'Birbhum', 'Dakshin Dinajpur', 'Jalpaiguri',
    'Jhargram', 'Kalimpong', 'Kolkata', 'Murshidabad', 'Nadia',
    'Uttar Dinajpur', 'Paschim Medinipur', 'Purba Medinipur'
}

source = Path('data/boundaries/india_districts.geojson')
out = Path('data/boundaries/wb_districts.geojson')

with source.open(encoding='utf-8') as file:
    india = json.load(file)

features = []
for feature in india.get('features', []):
    source_name = feature.get('properties', {}).get('shapeName', '')
    if source_name in SOURCE_NAMES:
        feature['properties']['district'] = ALIASES.get(source_name, source_name)
        features.append(feature)

if len(features) != 23:
    raise SystemExit(f'Expected 23 West Bengal district polygons, found {len(features)}')

out.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False), encoding='utf-8')
print(f'Created {out} with {len(features)} districts')
