#!/usr/bin/env python3
import json, os, time, requests
from pathlib import Path
from shapely.geometry import shape, LineString, MultiLineString, GeometryCollection

UA={"User-Agent":"VargaPianoNeveOfflineBuilder/1.0"}
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"major-network.js"
SOURCE=Path(os.environ.get("ROADS_GEOJSONSEQ","/tmp/roads.geojsonseq"))

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

if not SOURCE.exists():
    raise RuntimeError(f"Missing extracted road file: {SOURCE}")

allowed={
 "motorway","motorway_link","trunk","trunk_link","primary","primary_link",
 "secondary","secondary_link","tertiary","tertiary_link","unclassified",
 "residential","living_street","service","road","track"
}
roads=[]
routing_roads=[]
with SOURCE.open("r",encoding="utf-8") as fh:
    for raw in fh:
        raw=raw.strip().lstrip("\x1e")
        if not raw:
            continue
        try:
            feat=json.loads(raw)
        except Exception:
            continue
        props=feat.get("properties") or {}
        hw=props.get("highway")
        if hw not in allowed:
            continue
        # Keep named/official local roads even when OSM marks generic access limits:
        # the municipal antigelo route may legitimately include them. Runtime routing
        # will still respect the access fields below for transfer navigation.
        if hw=="track" and not props.get("name"):
            continue
        geom=feat.get("geometry") or {}
        gtype=geom.get("type")
        coords=geom.get("coordinates") or []
        lines=[]
        if gtype=="LineString":
            lines=[coords]
        elif gtype=="MultiLineString":
            lines=coords
        for line_coords in lines:
            if len(line_coords)<2:
                continue
            line=LineString(line_coords)
            rid=str(props.get("@id") or props.get("id") or f"road-{len(routing_roads)}")
            full_latlon=[[round(lat,7),round(lon,7)] for lon,lat in line.coords]
            if len(full_latlon)>=2:
                routing_roads.append({
                    "id":f"{rid}-routing",
                    "name":props.get("name",""),
                    "ref":props.get("ref",""),
                    "highway":hw,
                    "oneway":props.get("oneway",""),
                    "maxspeed":props.get("maxspeed",""),
                    "access":props.get("access",""),
                    "motor_vehicle":props.get("motor_vehicle",""),
                    "coords":full_latlon
                })
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
                latlon=[[round(lat,7),round(lon,7)] for lon,lat in cs]
                roads.append({
                    "id":f"{rid}-{n}",
                    "name":props.get("name",""),
                    "ref":props.get("ref",""),
                    "highway":hw,
                    "oneway":props.get("oneway",""),
                    "maxspeed":props.get("maxspeed",""),
                    "access":props.get("access",""),
                    "motor_vehicle":props.get("motor_vehicle",""),
                    "coords":latlon
                })

payload={
 "version":3,
 "source":"OpenStreetMap Geofabrik Nord-Est, operational roads clipped to Castel Maggiore relation 43303; transfer routing stored from expanded local extract",
 "boundary":boundary_geom,
 "roads":roads,
 "routingRoads":routing_roads
}
text="// Generated file: offline road network for Castel Maggiore. Do not edit manually.\nwindow.MAJOR_OFFLINE="+json.dumps(payload,separators=(",",":"),ensure_ascii=False)+";\n"
OUT.write_text(text,encoding="utf-8")
print(f"Wrote {OUT}: {len(roads)} operational road parts, {len(routing_roads)} routing road parts, {OUT.stat().st_size} bytes")
