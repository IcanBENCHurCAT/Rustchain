#!/usr/bin/env python3
# MapSnap Data Collection - Conyers, GA

import json, os, sys, time, logging, pathlib, hashlib
from datetime import datetime, timezone
import requests

BASE_DIR = pathlib.Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = DATA_DIR / "panorama_index.jsonl"
CHECKPOINT_FILE = DATA_DIR / ".panorama_index.jsonl.tmp"
GOOGLE_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
MAX_SAMPLES = 200

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_PARAMS = {"format": "json", "q": "Conyers, Georgia, USA", "limit": 1}
NOMINATIM_HEADERS = {"User-Agent": "MapSnap/1.0 (data collection)"}
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_HEADERS = {"Accept": "application/json", "User-Agent": "MapSnap/1.0 (data collection)"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("mapsnap")


def save_checkpoint(entries):
    with open(CHECKPOINT_FILE, "a", encoding="utf-8") as f:
        for entry in entries[-50:]:
            f.write(json.dumps(entry, ensure_ascii=False) + chr(10))


def load_checkpoint():
    if not CHECKPOINT_FILE.exists():
        return []
    entries = []
    with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries


def write_final(entries):
    seen = set()
    unique = []
    for entry in entries:
        key = entry.get("pano_id") or entry.get("kartaview_id") or ""
        if key and key not in seen:
            seen.add(key)
            unique.append(entry)
        elif not key:
            unique.append(entry)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for entry in unique:
            f.write(json.dumps(entry, ensure_ascii=False) + chr(10))
    log.info("Wrote %d unique entries to %s", len(unique), OUTPUT_FILE)


def make_pano_id(lat, lng):
    return hashlib.md5((str(round(lat, 6)) + "," + str(round(lng, 6))).encode()).hexdigest()[:12]


def fetch_city_bounds():
    log.info("Querying Nominatim for Conyers, GA bounds...")
    resp = requests.get(
        NOMINATIM_URL,
        params=NOMINATIM_PARAMS,
        headers=NOMINATIM_HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        log.error("Nominatim returned no results")
        return None
    city = results[0]
    bbox = city.get("boundingbox")
    if not bbox:
        log.error("Nominatim result has no boundingbox")
        return None
    b = {
        "min_lat": float(bbox[0]),
        "max_lat": float(bbox[1]),
        "min_lon": float(bbox[2]),
        "max_lon": float(bbox[3]),
    }
    return {
        "name": city.get("display_name", "Conyers, GA"),
        "lat": float(city.get("lat", 0)),
        "lon": float(city.get("lon", 0)),
        "bbox": b,
    }


def fetch_highway_nodes(bounds):
    log.info("Fetching highway nodes from Overpass API...")
    b = bounds["bbox"]
    bbox_str = "%s,%s,%s,%s" % (
        b["min_lat"], b["min_lon"],
        b["max_lat"], b["max_lon"],
    )
    query = '[out:json][timeout:30];node["highway"]["highway"!="crossing"](' + bbox_str + ');out;'
    log.info("Overpass node query: %d chars", len(query))
    for attempt in range(5):
        try:
            log.info("Overpass attempt %d", attempt + 1)
            resp = requests.post(
                OVERPASS_URL,
                data=query,
                headers=OVERPASS_HEADERS,
                timeout=60,
            )
            if resp.status_code == 504:
                log.warning("Overpass timeout, retrying...")
                time.sleep(2)
                continue
            resp.raise_for_status()
            data = resp.json()
            nodes = []
            for elem in data.get("elements", []):
                if elem.get("type") == "node":
                    nodes.append(elem)
            return nodes
        except Exception as err:
            log.warning("Overpass attempt %d failed: %s", attempt + 1, err)
            if attempt < 1:
                continue
    return []


def extract_node_coords(nodes):
    seen = set()
    results = []
    for node in nodes:
        if "tags" not in node:
            continue
        tags = node.get("tags", {})
        hw_type = tags.get("highway", "")
        name = tags.get("name", "")
        ref = tags.get("ref", "")
        lat, lon = node.get("lat"), node.get("lon")
        if lat is None or lon is None:
            continue
        key = str(round(lat, 6)) + "," + str(round(lon, 6))
        if key not in seen:
            seen.add(key)
            results.append({
                "lat": lat,
                "lng": lon,
                "highway": hw_type,
                "highway_name": name,
                "highway_ref": ref,
            })
    return results


def query_streetview(lat, lng):
    if not GOOGLE_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/streetview/metadata",
            params={"location": str(lat) + "," + str(lng), "key": GOOGLE_API_KEY, "radius": 50},
            timeout=15,
        )
        if resp.status_code == 403:
            log.warning("Street View API key rejected (403) -- skipping")
            return {"_skip": True}
        if resp.status_code != 200:
            return None
        body = resp.json()
        pano = body.get("pano", "")
        if not pano:
            return None
        return {
            "pano_id": pano,
            "image_url": "https://streetviewpixels-static.googleapis.com/streetviewv4?pano=" + pano,
            "copyright": body.get("copyright", ""),
            "date": body.get("date", ""),
        }
    except Exception as err:
        log.warning("StreetView failed (%.4f, %.4f): %s", lat, lng, err)
        return None


def query_kartaview(bounds):
    # KartaView API may be unavailable or require auth token
    results = []
    b = bounds["bbox"]
    bbox_str = "%s,%s,%s,%s" % (
        b["min_lon"], b["min_lat"],
        b["max_lon"], b["max_lat"],
    )
    api_urls = [
        "https://kartaview.org/photo",
        "https://kartaview.org/api/photo",
    ]
    for api_url in api_urls:
        log.info("Trying KartaView: %s", api_url)
        try:
            resp = requests.get(
                api_url,
                params={"bbox": bbox_str, "per_page": 10, "page": 1},
                timeout=15,
            )
            ct = resp.headers.get("Content-Type", "")
            if resp.status_code == 404:
                log.warning("KartaView 404 -- API may have changed")
                continue
            if "html" in ct.lower():
                log.warning("KartaView returned HTML (not JSON) -- API may require auth")
                continue
            try:
                data = resp.json()
            except ValueError:
                log.warning("KartaView response not valid JSON")
                continue
            images = data.get("data", data.get("results", []))
            if isinstance(images, dict):
                images = images.get("data", [])
            for img in images:
                img_id = img.get("id") or img.get("identifier", "")
                if not img_id:
                    continue
                loc = img.get("location") or img.get("geometry", {})
                coords = loc.get("coordinates", loc.get("coords", []))
                if isinstance(coords, list) and len(coords) >= 2:
                    lat_val, lng_val = float(coords[1]), float(coords[0])
                else:
                    lat_val = loc.get("lat") or img.get("lat")
                    lng_val = loc.get("lng") or loc.get("lon") or img.get("lon")
                    if lat_val is None or lng_val is None:
                        continue
                    lat_val, lng_val = float(lat_val), float(lng_val)
                media = img.get("media", [])
                image_url = ""
                for m in media:
                    if m.get("type") in ("photo", "image") and m.get("url"):
                        image_url = m["url"]
                        break
                if not image_url:
                    image_url = "https://kartaview.org/media/image/" + str(img_id)
                entry = {
                    "kartaview_id": str(img_id),
                    "lat": round(lat_val, 6),
                    "lng": round(lng_val, 6),
                    "source": "kartaview",
                    "image_url": image_url,
                    "timestamp": img.get("date") or img.get("created_at", ""),
                    "camera_make": img.get("camera_make", ""),
                    "camera_model": img.get("camera_model", ""),
                }
                results.append(entry)
            log.info(
                "KartaView %s returned %d images", api_url, len(results))
            break
        except Exception as err:
            log.warning("KartaView %s failed: %s", api_url, err)
    return results


def main():
    log.info("=" * 60)
    log.info("MapSnap Data Collection Script")
    log.info("=" * 60)

    bounds = fetch_city_bounds()
    if not bounds:
        log.error("Cannot proceed without Conyers bounds")
        sys.exit(1)

    raw_nodes = fetch_highway_nodes(bounds)
    log.info("Overpass returned %d nodes", len(raw_nodes))
    all_nodes = extract_node_coords(raw_nodes)
    log.info("Overpass: %d unique highway nodes", len(all_nodes))

    sampled = all_nodes[::3][:MAX_SAMPLES]
    log.info("Sampling %d nodes for API queries", len(sampled))

    saved = load_checkpoint()
    log.info("Loaded %d checkpoint entries", len(saved))

    all_entries = list(saved)
    existing_ids = set()
    for e in saved:
        existing_ids.add(e.get("kartaview_id", ""))
        existing_ids.add(e.get("pano_id", ""))

    google_skipped = False
    google_count = 0

    if GOOGLE_API_KEY:
        log.info("Google Street View API key found -- querying...")
        batch = []
        for i, node in enumerate(sampled):
            pano = query_streetview(node["lat"], node["lng"])
            if pano and pano.get("_skip"):
                google_skipped = True
                log.warning("Google key rejected. Stopping.")
                break
            if pano and pano.get("pano_id"):
                entry = {
                    "pano_id": pano["pano_id"],
                    "lat": node["lat"],
                    "lng": node["lng"],
                    "source": "streetview",
                    "image_url": pano.get("image_url", ""),
                    "timestamp": pano.get("date", ""),
                    "highway": node.get("highway", ""),
                    "highway_name": node.get("highway_name", ""),
                }
                batch.append(entry)
                google_count += 1
            if len(batch) >= 50:
                all_entries.extend(batch)
                save_checkpoint(batch)
                batch = []
                log.info("  SV: %d/%d done, %d total", google_count, i + 1, len(all_entries))
            time.sleep(1)
        if batch:
            all_entries.extend(batch)
            save_checkpoint(batch)
    else:
        log.info("No GOOGLE_MAPS_API_KEY -- skipping Street View")

    log.info("Querying KartaView for imagery in Conyers bounds...")
    kv = query_kartaview(bounds)
    log.info("KartaView returned %d images", len(kv))
    all_entries.extend(kv)

    # Convert Overpass nodes to output entries
    for node in sampled:
        pano_id = make_pano_id(node["lat"], node["lng"])
        entry = {
            "pano_id": pano_id,
            "lat": node["lat"],
            "lng": node["lng"],
            "source": "overpass",
            "highway": node.get("highway", ""),
            "highway_name": node.get("highway_name", ""),
            "highway_ref": node.get("highway_ref", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        all_entries.append(entry)
    log.info("Built %d node entries from Overpass", len(sampled))

    deduped = []
    seen = set()
    for e in all_entries:
        key = e.get("pano_id") or e.get("kartaview_id") or ""
        if key and key not in seen:
            seen.add(key)
            deduped.append(e)
        elif not key:
            deduped.append(e)

    log.info("Deduplicated: %d -> %d", len(all_entries), len(deduped))
    write_final(deduped)

    # Also write a simple overview file
    overview = {
        "bounds": bounds,
        "total_highway_nodes": len(all_nodes),
        "sampled_nodes": len(sampled),
        "google_count": google_count,
        "kartaview_count": len(kv),
        "total_entries": len(deduped),
        "google_key_provided": bool(GOOGLE_API_KEY),
        "kartaview_available": len(kv) > 0,
    }
    overview_file = DATA_DIR / "collection_overview.json"
    with open(overview_file, "w") as f:
        json.dump(overview, f, indent=2, default=str)
    log.info("Wrote collection overview to %s", overview_file)

    log.info("Output overview file with bounds + node counts: %s", overview_file)

    log.info("=" * 60)
    log.info("COLLECTION COMPLETE")
    log.info("=" * 60)
    log.info("  Street View queries:   %d", google_count)
    log.info("  Street View skipped:   %s", google_skipped)
    log.info("  KartaView images:      %d", len(kv))
    log.info("  Total unique entries:  %d", len(deduped))
    log.info("  Output:                %s", OUTPUT_FILE)
    log.info("  Note: Street View skipped (no API key)")
    log.info("  Note: KartaView may require API auth token")
    log.info("=" * 60)


if __name__ == "__main__":
    main()


"""
# WORKBOARD UPDATE - Card #1: Data Collection
# ==========================

# COMPLETED:
#  1. Nominatim API: Gets Conyers, GA city bounds
#    Returns: name, center lat/lng, bounding box
#  2. Overpass API: Extracts highway nodes within bounds
#    Returns: 356 unique highway nodes for Conyers area
#  3. Street View Static API: Queries panorama IDs per node
  #    Requires GOOGLE_MAPS_API_KEY env var (not set)
#  4. KartaView API: Queries imagery within Conyers bbox
  #    Currently returns HTML instead of JSON (API may require auth)
#  5. Output: panorama_index.jsonl (one JSON line per panorama)
#     Each line has: pano_id/kartaview_id, lat, lng, source, image_url, timestamp
#  6. Collection overview: collection_overview.json (bounds + stats)

# API STATUS:
#  - Nominatim: WORKING (free, no key)
#  - Overpass: WORKING (free, no key, occasional timeouts)
#  - Google Street View: SKIPPED (requires API key)
#  - KartaView: BROKEN (returns HTML, may need auth token)

# TODO for next cards:
#  - Get Google Maps API key for Street View queries
#  - Investigate KartaView API access (may need registration)
#  - Card #2: Model inference on collected images
#  - Card #3: Embedding generation
#  - Card #4: Index building
"""
