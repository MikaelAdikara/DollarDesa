"""Build src/lib/geo/indonesia.json from the province polygons used on the DETAK poster/deck.

Source geometry: the C16 cluster-map SVG of the DETAK data package (34 pre-2022 provinces),
re-projected from SVG pixels to lon/lat with the same calibration used for the deck map.
Cluster colours are mapped to the 38-province K-Means result (7/21/10, Sulawesi Selatan -> Tinggi).
"""
import json, math, os, sys

SRC = sys.argv[1]
OUT = sys.argv[2]
paths = json.load(open(SRC))

SX = (780.524526 - 227.051719) / (141.02 - 95.0)
X0 = 227.051719 - 95.0 * SX
Y0 = 335.559708 - 11.0 * SX


def px2geo(x, y):
    return ((x - X0) / SX, (Y0 - y) / SX)


OLD = {"#1b998b": "Rendah", "#f2b705": "Sedang", "#f26a1b": "Tinggi"}


def centroid(p):
    pts = [q for r in p["rings"] for q in r]
    return sum(q[0] for q in pts) / len(pts), sum(q[1] for q in pts) / len(pts)


def is_sulsel(i, p):
    if p["col"] != "#f2b705":
        return False
    if i == 879:
        return True
    cx, cy = centroid(p)
    return (505 < cx < 537 and 234 < cy < 300) or (537 <= cx < 553 and 282 < cy < 300)


def pip(pt, ring):
    x, y = pt
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def simplify(pts, eps):
    if len(pts) < 4:
        return pts
    def perp(p, a, b):
        (x, y), (x1, y1), (x2, y2) = p, a, b
        dx, dy = x2 - x1, y2 - y1
        if dx == dy == 0:
            return math.hypot(x - x1, y - y1)
        return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = perp(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return simplify(pts[: idx + 1], eps)[:-1] + simplify(pts[idx:], eps)
    return [pts[0], pts[-1]]


# capitals used to tag the pilot provinces (lon, lat)
TAGS = {"DIY": (110.37, -7.80), "SUMBAR": (100.36, -0.95), "PAPUA": (140.70, -2.55)}

features = []
for i, p in enumerate(paths):
    rings_geo = [[px2geo(x, y) for x, y in r] for r in p["rings"]]
    cluster = "Tinggi" if is_sulsel(i, p) else OLD[p["col"]]
    tag = None
    for name, pt in TAGS.items():
        if any(pip(pt, r) for r in rings_geo):
            tag = name
    out_rings = []
    for r in rings_geo:
        s = simplify(r, 0.012)
        if len(s) >= 3:
            out_rings.append([[round(x, 3), round(y, 3)] for x, y in s])
    if out_rings:
        features.append({"c": cluster[0], "p": tag, "r": out_rings})

# Pilot provinces: polygons that sit inside the pilot bounding boxes inherit the tag
BOX = {"DIY": (110.0, -8.25, 110.85, -7.5), "SUMBAR": (98.5, -3.6, 101.95, 1.0), "PAPUA": (134.8, -3.7, 141.1, -0.5)}
for f in features:
    if f["p"]:
        continue
    xs = [q[0] for r in f["r"] for q in r]
    ys = [q[1] for r in f["r"] for q in r]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    for name, (x0, y0, x1, y1) in BOX.items():
        inside = x0 <= min(xs) and max(xs) <= x1 and y0 <= min(ys) and max(ys) <= y1
        if inside and f["c"] == {"DIY": "T", "SUMBAR": "R", "PAPUA": "S"}[name]:
            f["p"] = name + "~"  # same island group, used only for the zoomed backdrop

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"bbox": [94.5, -11.2, 141.2, 6.2], "features": features}, open(OUT, "w"), separators=(",", ":"))
n_pts = sum(len(r) for f in features for r in f["r"])
print("features", len(features), "points", n_pts, "bytes", os.path.getsize(OUT))
print("tagged", {k: sum(1 for f in features if f["p"] == k) for k in TAGS})
