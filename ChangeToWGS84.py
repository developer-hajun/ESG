import psycopg2
import pandas as pd
from pyproj import Transformer

# 1. 좌표 변환기 설정: EPSG:5181 → EPSG:4326 (WGS84)
transformer = Transformer.from_crs("EPSG:5181", "EPSG:4326", always_xy=True)

# 2. DB 연결 정보
conn = psycopg2.connect(
    dbname='ESG',
    user='postgres',
    password='1234',
    host='localhost',
    port='5432'
)
cursor = conn.cursor()

# 3. business_info 테이블에서 모든 데이터 조회
df = pd.read_sql_query("SELECT id, coord_x, coord_y FROM business_info", conn)

# 4. 좌표 변환 수행
def convert_coords(row):
    x, y = row['coord_x'], row['coord_y']
    if pd.isna(x) or pd.isna(y):
        return pd.Series([None, None])
    lng, lat = transformer.transform(x, y)
    return pd.Series([lng, lat])

df[['new_coord_x', 'new_coord_y']] = df.apply(convert_coords, axis=1)

# 5. DB에 업데이트
for _, row in df.iterrows():
    if pd.notna(row['new_coord_x']) and pd.notna(row['new_coord_y']):
        cursor.execute("""
            UPDATE business_info
            SET coord_x = %s, coord_y = %s
            WHERE id = %s
        """, (row['new_coord_x'], row['new_coord_y'], row['id']))

# 6. 커밋 및 종료
conn.commit()
cursor.close()
conn.close()

print("✅ 모든 좌표가 WGS84로 변환 완료되었습니다.")
