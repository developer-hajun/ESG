import requests
import psycopg2

def get_lat_lng_google(address, api_key):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": api_key
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        else:
            print(f"❌ 주소 변환 실패: {address} - {data['status']}")
    else:
        print(f"❌ 요청 실패: {address} - HTTP {response.status_code}")
    return None, None

# ✅ PostgreSQL 설정
db_config = {
    'dbname': 'ESG',
    'user': 'postgres',
    'password': '1234',
    'host': 'localhost',
    'port': '5432'
}

api_key = "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc"  # <-- 본인의 Google API Key 입력

try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()

    # ❶ full_road_address를 포함한 데이터 조회
    cursor.execute("SELECT id, full_road_address FROM business_info WHERE id >=14831")
    rows = cursor.fetchall()

    for row in rows:
        record_id, address = row
        if address:
            lat, lng = get_lat_lng_google(address, api_key)
            if lat is not None and lng is not None:
                # ❷ coord_x, coord_y 업데이트
                cursor.execute(
                    "UPDATE business_info SET coord_y = %s, coord_x = %s WHERE id = %s",
                    (lat, lng, record_id)
                )
                print(f"✅ 업데이트 완료: {record_id} - ({lat}, {lng})")
            else:
                print(f"⚠️ 위경도 조회 실패: {address}")
    
    conn.commit()

except Exception as e:
    print("❌ 에러 발생:", e)

finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
