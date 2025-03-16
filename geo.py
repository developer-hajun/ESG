# import 라이브러리
import googlemaps
from tqdm import tqdm
import pandas as pd
import random

# 임의의 상호명 및 지점명 리스트 생성
names = ["Shake House", "Burger Spot", "Fast Dine", "Quick Bite", "Yummy Shack"]
branches = ["강남점", "홍대점", "명동점", "부산점", "대전점", "광주점", "인천점", "제주점", "수원점", "울산점"]

# 임의의 국내 주소 생성
all_addresses = [
    f"서울특별시 강남구 테헤란로 {i}길" for i in range(1, 30)
] + [
    f"부산광역시 해운대구 센텀남대로 {i}번길" for i in range(1, 30)
] + [
    f"대구광역시 수성구 달구벌대로 {i}길" for i in range(1, 30)
] + [
    f"광주광역시 서구 상무대로 {i}길" for i in range(1, 30)
]

# 랜덤하게 100개의 주소 선택
addresses = random.sample(all_addresses, 100)

# 데이터프레임 생성
data = {
    "name": [random.choice(names) for _ in range(100)],
    "branch": [random.choice(branches) for _ in range(100)],
    "addr": addresses,
}

df_shake = pd.DataFrame(data)
pd.set_option('display.max_rows', None)  # 모든 행 출력
print(df_shake)
# 데이터 확인

#예제 데이터 : df_shake
#컬럼 정보 : name, branch, addr

# API키 입력
mykey = "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc"
maps = googlemaps.Client(key=mykey)  # my key값 입력

# 위도,경도 변환하는 함수 생성
def trans_geo(addr):
    try:
        geo_location = maps.geocode(addr)[0].get('geometry')
        lat = geo_location['location']['lat']
        lng =  geo_location['location']['lng']
        return [lat,lng]
    except:
        return [0,0]

# 실행
for idx, addr in enumerate(df_shake.addr):
    print(idx,addr)
    df_shake.loc[idx,'latitude'] = trans_geo(addr)[0]
    df_shake.loc[idx,'longitude'] = trans_geo(addr)[1]
    print(df_shake.loc[idx,'latitude'],df_shake.loc[idx,'longitude'])