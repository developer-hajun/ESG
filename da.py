from sklearn.cluster import DBSCAN
from geopy.distance import great_circle
import numpy as np
from geopy.distance import geodesic
import pandas as pd
import folium
from folium.plugins import MarkerCluster
from pyproj import Transformer

transformer = Transformer.from_crs("EPSG:5181", "EPSG:4326", always_xy=True)

# 2. 데이터 불러오기
df = pd.read_csv("C:/Users/HeeWoong/heewoong/ESG/data.csv", encoding="cp949")

# 3. 시도 정보 추출
def extract_sido(addr):
    try:
        return addr.split()[0]
    except:
        return None

df['시도'] = df['도로명전체주소'].apply(extract_sido)

# 4. 좌표 숫자형으로 변환
df['좌표정보x'] = pd.to_numeric(df['좌표정보x'], errors='coerce')
df['좌표정보y'] = pd.to_numeric(df['좌표정보y'], errors='coerce')

# 5. 좌표 변환 함수
def convert_coords(row):
    x, y = row['좌표정보x'], row['좌표정보y']
    if pd.isna(x) or pd.isna(y):
        return pd.Series([None, None])
    lon, lat = transformer.transform(x, y)
    return pd.Series([lon, lat])

# 6. WGS84 좌표 컬럼 추가
df[['lon', 'lat']] = df.apply(convert_coords, axis=1)

# 7. 업종 분리
df_warehouse = df[df['개방서비스명'] == '물류창고업체']
df_transport = df[df['개방서비스명'] == '국제물류주선업']
# 1. 유효한 운송업체 좌표만 추출
valid_transport = df_transport.dropna(subset=['lat', 'lon'])
coords = valid_transport[['lat', 'lon']].to_numpy()

# 2. DBSCAN 군집화: 5km 이내를 한 그룹으로
kms_per_radian = 6371.0088
epsilon = 5 / kms_per_radian  # 5km 반경
db = DBSCAN(eps=epsilon, min_samples=5, algorithm='ball_tree', metric='haversine').fit(np.radians(coords))

# 3. 클러스터 레이블 추가
valid_transport['cluster'] = db.labels_

# 4. 클러스터별 중심 계산
cluster_centers = valid_transport.groupby('cluster')[['lat', 'lon']].mean().reset_index()
cluster_centers = cluster_centers[cluster_centers['cluster'] != -1]  # noise 제외

# 5. 클러스터 중심에서 5km 내 창고가 있는지 체크

recommended_points = []
for _, center in cluster_centers.iterrows():
    lat_c, lon_c = center['lat'], center['lon']
    # 반경 5km 이내 창고가 있는지 확인
    nearby_warehouses = df_warehouse.dropna(subset=['lat', 'lon']).apply(
        lambda row: geodesic((lat_c, lon_c), (row['lat'], row['lon'])).km < 3,
        axis=1
    )
    if not nearby_warehouses.any():
        recommended_points.append((lat_c, lon_c))

# 6. 지도 시각화
map_cluster = folium.Map(location=[36.5, 127.8], zoom_start=7)

# 기존 창고 마커
for _, row in df_warehouse.dropna(subset=['lat', 'lon']).iterrows():
    folium.CircleMarker(
        location=[row['lat'], row['lon']],
        radius=3,
        color='gray',
        fill=True,
        fill_opacity=0.5
    ).add_to(map_cluster)

# 추천 위치 마커
for lat, lon in recommended_points:
    folium.Marker(
        location=[lat, lon],
        popup="✅ 추천 입지 (운송 밀집, 창고 없음)",
        icon=folium.Icon(color='green', icon='plus')
    ).add_to(map_cluster)

# 결과 저장
map_cluster.save("전국_추천입지_지도.html")
print("✅ 저장 완료: 전국_추천입지_지도.html")


# 유효한 창고 좌표만 사용
df_warehouse_valid = df_warehouse.dropna(subset=['lat', 'lon'])

# (1) 현재 위치에서 가장 가까운 창고까지 거리 계산
def min_distance_to_existing_warehouse(lat, lon, warehouses):
    return warehouses.apply(lambda row: geodesic((lat, lon), (row['lat'], row['lon'])).km, axis=1).min()

valid_transport['dist_to_current'] = valid_transport.apply(
    lambda row: min_distance_to_existing_warehouse(row['lat'], row['lon'], df_warehouse_valid),
    axis=1
)

# (2) 현재 위치에서 가장 가까운 추천지까지 거리 계산
def nearest_recommended_center(lat, lon, rec_points):
    if not rec_points:  # 추천지가 없으면 무한대 거리
        return float('inf')
    return min([geodesic((lat, lon), (lat_c, lon_c)).km for lat_c, lon_c in rec_points])

valid_transport['dist_to_recommended'] = valid_transport.apply(
    lambda row: nearest_recommended_center(row['lat'], row['lon'], recommended_points),
    axis=1
)
print(f"🚛 분석된 운송업체 수: {len(valid_transport)}개")

# (3) 거리 절감량 → 탄소 절감량 (kg CO₂)
carbon_per_km_per_ton = 0.27  # 기본값, 도로 기준 평균

valid_transport['distance_saved'] = valid_transport['dist_to_current'] - valid_transport['dist_to_recommended']
valid_transport['carbon_saved_kg'] = valid_transport['distance_saved'].clip(lower=0) * carbon_per_km_per_ton

# (4) 총 절감량 출력
total_carbon_saved = valid_transport['carbon_saved_kg'].sum()
print(f"✅ 총 예상 탄소 절감량: {total_carbon_saved:.2f} kg CO₂ (1톤 운송 기준)")

# 필요시 CSV 저장
valid_transport.to_csv("운송업체별_탄소절감량_비교.csv", index=False, encoding="utf-8-sig")

