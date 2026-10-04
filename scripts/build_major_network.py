#!/usr/bin/env python3
# trigger-build
import json, time, sys, requests
from pathlib import Path
from shapely.geometry import shape, LineString, MultiLineString, GeometryCollection

UA={"User-Agent":"VargaPianoNeveOfflineBuilder/1.0 (GitHub Actions)"}
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"major-network.js"

def get_json(url, params=None, timeout=90):
    last=None
    for attempt in range(4):
        try:
            r=requests.get(url,params=params,headers=UA,timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last=e
            time.sleep(2+attempt*3)
    raise RuntimeError(f"GET failed {url}: {last}")

boundary_data=get_json("https://nominatim.openstreetmap.org/lookup",{
    "format":"geojson","polygon_geojson":1,"osm_ids":"R43303"
})
features=boundary_data.get("features") or []
if not features:
    raise RuntimeError("Castel Maggiore boundary relation R43303 not found")
boundary_geom=features[0]["geometry"]
boundary=shape(boundary_geom)

query='''[out:json][timeout:120];
relation(43303);
map_to_area->.a;
way(area.a)["highway"];
out tags geom;'''
endpoints=[
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
]
data=None
last=None
for ep in endpoints:
    try:
        r=requests.post(ep,data={"data":query},headers=UA,timeout=150)
        r.raise_for_status()
        data=r.json()
        break
    except Exception as e:
        last=e
if data is None:
    raise RuntimeError(f"Overpass failed: {last}")

allowed={
 "motorway","motorway_link","trunk","trunk_link","primary","primary_link",
 "secondary","secondary_link","tertiary","tertiary_link","unclassified",
 "residential","living_street","service","road"
}
roads=[]
for el in data.get("elements",[]):
    tags=el.get("tags") or {}
    hw=tags.get("highway")
    geom=el.get("geometry") or []
    if hw not in allowed or len(geom)<2:
        continue
    if tags.get("access") in {"no","private"} and tags.get("motor_vehicle") not in {"yes","designated"}:
        continue
    if tags.get("motor_vehicle") in {"no","private"}:
        continue
    line=LineString([(p["lon"],p["lat"]) for p in geom])
    clipped=line.intersection(boundary)
    parts=[]
    if isinstance(clipped,LineString):
        parts=[clipped]
    elif isinstance(clipped,MultiLineString):
        parts=list(clipped.geoms)
    elif isinstance(clipped,GeometryCollection):
        parts=[g for g in clipped.geoms if isinstance(g,LineString)]
    for n,part in enumerate(parts):
        cs=list(part.coords)
        if len(cs)<2:
            continue
        coords=[[round(lat,7),round(lon,7)] for lon,lat in cs]
        roads.append({
            "id":f'{el["id"]}-{n}',
            "osmId":el["id"],
            "name":tags.get("name",""),
            "ref":tags.get("ref",""),
            "highway":hw,
            "oneway":tags.get("oneway",""),
            "maxspeed":tags.get("maxspeed",""),
            "coords":coords
        })

payload={
 "version":1,
 "source":"OpenStreetMap relation 43303 / generated at build time",
 "boundary":boundary_geom,
 "roads":roads
}
text="// Generated file: offline road network for Castel Maggiore. Do not edit manually.\nwindow.MAJOR_OFFLINE="+json.dumps(payload,separators=(",",":"),ensure_ascii=False)+";\n"
OUT.write_text(text,encoding="utf-8")
print(f"Wrote {OUT}: {len(roads)} road parts, {OUT.stat().st_size} bytes")
