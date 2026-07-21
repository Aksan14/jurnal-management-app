#!/usr/bin/env python3
"""
docker-stats-collector.py
Ambil CPU/RAM per container via `docker stats` lalu push ke Elasticsearch.
"""
import subprocess, json, time, datetime, urllib.request, re, os

ES_HOST = os.getenv("ELASTICSEARCH_HOSTS", "http://elasticsearch:9200")
INDEX   = os.getenv("ES_INDEX", "docker-stats")
INTERVAL = int(os.getenv("INTERVAL", "10"))

def parse_pct(s):
    try: return float(s.strip().replace("%",""))
    except: return 0.0

def parse_mem(s):
    """'256MiB / 512MiB' → (used_mb, limit_mb, pct)"""
    try:
        parts = s.split("/")
        def to_mb(v):
            v = v.strip()
            n = float(re.sub(r'[^\d.]','',v))
            if 'GiB' in v or 'GB' in v: return n * 1024
            if 'MiB' in v or 'MB' in v: return n
            if 'KiB' in v or 'kB' in v: return n / 1024
            return n
        used  = to_mb(parts[0])
        limit = to_mb(parts[1])
        pct   = round(used/limit*100, 2) if limit > 0 else 0
        return used, limit, pct
    except:
        return 0, 0, 0

def collect():
    result = subprocess.run(
        ["docker","stats","--no-stream","--format",
         "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"],
        capture_output=True, text=True
    )
    docs = []
    ts   = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    for line in result.stdout.strip().splitlines():
        parts = line.split("\t")
        if len(parts) < 6: continue
        name, cpu_s, mem_s, net_s, blk_s, pids_s = parts
        mem_used, mem_limit, mem_pct = parse_mem(mem_s)
        docs.append({
            "@timestamp"    : ts,
            "container.name": name,
            "cpu.pct"       : parse_pct(cpu_s),
            "memory.used_mb": round(mem_used, 2),
            "memory.limit_mb": round(mem_limit, 2),
            "memory.pct"    : mem_pct,
            "net_io"        : net_s.strip(),
            "block_io"      : blk_s.strip(),
            "pids"          : int(pids_s.strip()) if pids_s.strip().isdigit() else 0,
            "event.module"  : "docker-stats",
        })
    return docs

def bulk_push(docs):
    if not docs: return
    body = ""
    for d in docs:
        body += json.dumps({"index":{"_index": INDEX}}) + "\n"
        body += json.dumps(d) + "\n"
    req = urllib.request.Request(
        f"{ES_HOST}/_bulk",
        data=body.encode(),
        headers={"Content-Type": "application/x-ndjson"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            resp = json.loads(r.read())
            if resp.get("errors"):
                print(f"[WARN] some docs failed")
            else:
                print(f"[OK] pushed {len(docs)} docs → {INDEX}")
    except Exception as e:
        print(f"[ERR] {e}")

if __name__ == "__main__":
    print(f"[START] docker-stats-collector → {ES_HOST}/{INDEX} every {INTERVAL}s")
    # Tunggu Elasticsearch ready
    time.sleep(15)
    while True:
        try:
            docs = collect()
            bulk_push(docs)
        except Exception as e:
            print(f"[ERR] collect: {e}")
        time.sleep(INTERVAL)
