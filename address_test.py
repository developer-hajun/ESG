import requests

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
            print(f"❌ 주소 변환 실패: {data['status']}")
    else:
        print(f"❌ 요청 실패: HTTP {response.status_code}")
    return None, None

# ✅ 예시 사용
api_key = "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc"  # 여기에 본인의 API 키 입력
address = "부산광역시 사하구 낙동대로550번길 37"
lat, lng = get_lat_lng_google(address, api_key)
print("위도:", lat, "경도:", lng)
