"""Clip Natural Earth 1:10m Cultural shapefiles to West Bengal GeoJSON layers."""
from pathlib import Path
import geopandas as gpd
from shapely.geometry import box

WB_BBOX = gpd.GeoDataFrame(geometry=[box(85.5, 21.2, 90.2, 27.5)], crs='EPSG:4326')

def clip_all(raw_dir='raw_ne', out_dir='data/boundaries'):
    raw, out = Path(raw_dir), Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    adm1 = gpd.read_file(f'zip://{raw / "ne_10m_admin_1_states_provinces.zip"}')
    wb = adm1[adm1['name'].str.contains('West Bengal', case=False, na=False)][['name', 'admin', 'iso_3166_2', 'geometry']]
    wb.to_file(out / 'wb_state_boundary.geojson', driver='GeoJSON')

    bdr = gpd.read_file(f'zip://{raw / "ne_10m_admin_0_boundary_lines_land.zip"}')
    gpd.clip(bdr[['FEATURECLA', 'NAME', 'ADM0_LEFT', 'ADM0_RIGHT', 'geometry']], WB_BBOX).to_file(out / 'wb_international_borders.geojson', driver='GeoJSON')

    pop = gpd.read_file(f'zip://{raw / "ne_10m_populated_places_simple.zip"}')
    pop_wb = pop[(pop['adm0name'] == 'India') & (pop['adm1name'].str.contains('West Bengal', case=False, na=False))]
    pop_wb[['name', 'adm1name', 'pop_max', 'latitude', 'longitude', 'geometry']].to_file(out / 'wb_populated_places.geojson', driver='GeoJSON')
    print('Clipped Natural Earth layers into', out)

if __name__ == '__main__':
    clip_all()
