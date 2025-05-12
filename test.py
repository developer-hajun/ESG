from pyproj import Transformer

# EPSG:5181 (Korea UTM-K) → WGS84
transformer = Transformer.from_crs("EPSG:5181", "EPSG:4326", always_xy=True)

x = 142076.8211
y = 120647.3111

lng, lat = transformer.transform(x, y)
print(f"✅ 위도: {lat}, 경도: {lng}")
