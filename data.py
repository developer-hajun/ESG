import pandas as pd
import psycopg2

# CSV 파일 로드
df = pd.read_csv("C:/Users/HeeWoong/heewoong/ESG/data.csv", encoding='EUC-KR')

# 컬럼명 영어로 변경
df.columns = ['service_name', 'operation_status', 'full_road_address', 'road_zip_code',
              'business_name', 'coord_x', 'coord_y']

# DB 연결
conn = psycopg2.connect(
    dbname='ESG',
    user='postgres',
    password='1234',
    host='localhost',
    port='5432'
)
cur = conn.cursor()

# INSERT 실행
for _, row in df.iterrows():
    cur.execute("""
        INSERT INTO public.business_info
        (service_name, operation_status, full_road_address, road_zip_code,
         business_name, coord_x, coord_y)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, tuple(row))

conn.commit()
cur.close()
conn.close()
