"""Fetch & simplify West Bengal OSM river paths via Overpass API."""
import json, urllib.parse, urllib.request
from shapely.geometry import LineString

QL = '[out:json][timeout:45];way["waterway"="river"]["name"](21.45,85.82,27.25,89.88);out geom;'
ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

def main(out_path='data/rivers/wb_osm_rivers_lite.geojson'):
    for ep in ENDPOINTS:
        try:
            req = urllib.request.Request(
                ep,
                data=('data=' + urllib.parse.quote(QL)).encode('utf-8'),
                headers={'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
            )
            data = json.loads(urllib.request.urlopen(req, timeout=60).read().decode('utf-8'))
            by_name = {}
            for el in data.get('elements', []):
                coords = [[pt['lon'], pt['lat']] for pt in el.get('geometry', [])]
                if len(coords) < 2:
                    continue
                name = el.get('tags', {}).get('name', 'Unnamed')
                ls = LineString(coords).simplify(0.004, preserve_topology=False)
                if not ls.is_empty and len(ls.coords) >= 2:
                    by_name.setdefault(name, []).append([[round(x, 3), round(y, 3)] for x, y in ls.coords])
            feats = [{'type': 'Feature', 'properties': {'n': n}, 'geometry': {'type': 'MultiLineString', 'coordinates': s}} for n, s in sorted(by_name.items())]
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump({'type': 'FeatureCollection', 'features': feats}, f, separators=(',', ':'), ensure_ascii=False)
            print(f'Saved {len(feats)} rivers to {out_path}')
            return
        except Exception as e:
            print(f'Mirror {ep} failed: {e}')

if __name__ == '__main__':
    main()
