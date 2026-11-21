"""Clean NWDP CWC / WB-SW telemetry CSVs and export monthly station JSON."""
import argparse
import json
import re
from pathlib import Path

import pandas as pd


def find_column(columns, patterns):
    for column in columns:
        name = str(column).strip()
        if any(pattern.search(name) for pattern in patterns):
            return column
    return None


def clean_nwdp_csv(csv_path, out_json):
    df = pd.read_csv(csv_path, low_memory=False)
    columns = list(df.columns)

    station_col = find_column(columns, [re.compile(r'^station(?:_?name)?$', re.I), re.compile(r'^site_?name$', re.I)])
    district_col = find_column(columns, [re.compile(r'^district(?:_?name)?$', re.I)])
    river_col = find_column(columns, [re.compile(r'^river(?:_?name)?$', re.I), re.compile(r'^stream$', re.I)])
    lat_col = find_column(columns, [re.compile(r'^lat(?:itude)?$', re.I), re.compile(r'latitude', re.I)])
    lon_col = find_column(columns, [re.compile(r'^lon(?:gitude)?$', re.I), re.compile(r'longitude', re.I)])
    time_col = find_column(columns, [re.compile(r'timestamp', re.I), re.compile(r'date.*time', re.I), re.compile(r'^date$', re.I), re.compile(r'^time$', re.I)])

    excluded = {station_col, district_col, river_col, lat_col, lon_col, time_col}
    val_col = find_column(columns, [re.compile(r'discharge|river.*level|water.*level|flow|value|reading', re.I)])
    if val_col is None:
        val_col = next((c for c in reversed(columns) if c not in excluded), None)

    missing = [name for name, col in {'Station': station_col, 'Latitude': lat_col, 'Longitude': lon_col, 'timestamp': time_col, 'value': val_col}.items() if col is None]
    if missing:
        raise ValueError('Missing required NWDP columns: ' + ', '.join(missing))

    df['dt'] = pd.to_datetime(df[time_col], errors='coerce', dayfirst=True)
    df['val'] = pd.to_numeric(df[val_col], errors='coerce')
    df['lat_num'] = pd.to_numeric(df[lat_col], errors='coerce')
    df['lon_num'] = pd.to_numeric(df[lon_col], errors='coerce')

    clean = df[
        df['dt'].notna() & df['val'].notna() & df['lat_num'].notna() & df['lon_num'].notna()
        & (df['val'] >= 0)
    ].copy()
    clean['ym'] = clean['dt'].dt.strftime('%Y-%m')

    stations = []
    for st, g in clean.groupby(station_col, dropna=True):
        if not str(st).strip():
            continue
        monthly = g.groupby('ym')['val'].agg(['mean', 'max', 'count']).reset_index()
        stations.append({
            'station': str(st),
            'district': str(g[district_col].iloc[0]) if district_col else 'West Bengal',
            'river': str(g[river_col].iloc[0]) if river_col else '-',
            'lat': round(float(g['lat_num'].iloc[0]), 6),
            'lon': round(float(g['lon_num'].iloc[0]), 6),
            'valid_rows': int(len(g)),
            'date_start': g['dt'].min().strftime('%Y-%m-%d'),
            'date_end': g['dt'].max().strftime('%Y-%m-%d'),
            'median_m3s': round(float(g['val'].median()), 2),
            'peak_m3s': round(float(g['val'].max()), 2),
            'peak_date': g.loc[g['val'].idxmax(), 'dt'].strftime('%Y-%m-%d'),
            'monthly': [{'ym': r['ym'], 'mean': round(float(r['mean']), 1), 'max': round(float(r['max']), 1), 'n': int(r['count'])} for _, r in monthly.iterrows()] 
        })

    output = Path(out_json)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('w', encoding='utf-8') as f:
        json.dump(stations, f, indent=2, ensure_ascii=False)
    print(f'Wrote {len(stations)} cleaned stations to {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Clean NWDP CWC/WB-SW CSV telemetry.')
    parser.add_argument('input_csv')
    parser.add_argument('output_json')
    args = parser.parse_args()
    clean_nwdp_csv(args.input_csv, args.output_json)
