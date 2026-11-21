import json
import urllib.parse
import urllib.request

QL = '[out:json][timeout:45];relation["boundary"="administrative"]["admin_level"="6"](21.45,85.82,27.25,89.88);out geom;'
ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

for endpoint in ENDPOINTS:
    try:
        req = urllib.request.Request(
            endpoint,
            data=('data=' + urllib.parse.quote(QL)).encode('utf-8'),
            headers={'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
        )
        data = json.loads(urllib.request.urlopen(req, timeout=75).read().decode('utf-8'))
        features = []
        for element in data.get('elements', []):
            tags = element.get('tags', {})
            name = tags.get('name:en') or tags.get('name')
            if not name:
                continue
            rings = []
            for member in element.get('members', []):
                if member.get('type') == 'way' and member.get('role') in ('outer', '') and member.get('geometry'):
                    ring = [[round(point['lon'], 5), round(point['lat'], 5)] for point in member['geometry']]
                    if len(ring) >= 3:
                        if ring[0] != ring[-1]:
                            ring.append(ring[0])
                        rings.append(ring)
            if not rings:
                continue
            geometry = {'type': 'Polygon', 'coordinates': [rings[0]]} if len(rings) == 1 else {'type': 'MultiPolygon', 'coordinates': [[ring] for ring in rings]}
            features.append({'type': 'Feature', 'properties': {'district': name}, 'geometry': geometry})

        output = {'type': 'FeatureCollection', 'features': features}
        with open('data/boundaries/wb_districts.geojson', 'w', encoding='utf-8') as file:
            json.dump(output, file, ensure_ascii=False)
        print(f'Created wb_districts.geojson with {len(features)} districts')
        break
    except Exception as error:
        print(f'Mirror {endpoint} failed: {error}')
else:
    raise SystemExit('No district polygons available')
