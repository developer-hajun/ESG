const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ESG',
  password: '1234',
  port: 5432,
});

app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT business_name, full_road_address, service_name, coord_x, coord_y FROM business_info');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/api/find', async (req, res) => {
  const searchTerm = req.query.q;
  if (!searchTerm) return res.status(400).send('검색어를 입력해주세요.');
  try {
    const result = await pool.query(
      'SELECT business_name, coord_x, coord_y FROM business_info WHERE business_name ILIKE $1',
      [`%${searchTerm}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류');
  }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static('public'));
app.use(bodyParser.json());

function euclideanDistance(lat1, lng1, lat2, lng2) {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  return Math.sqrt(dx * dx + dy * dy);
}
async function getRealDistance(lat1, lng1, lat2, lng2) {
  const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?origin=${lng1},${lat1}&destination=${lng2},${lat2}&priority=DISTANCE`, {
    method: 'GET',
    headers: {
      'Authorization': 'KakaoAK d050db88ea871e4352d56b8448f3fcaf'
    }
  });

  const data = await response.json();
  console.log('api결과:', data);
  return data.routes?.[0]?.summary?.distance || null;
}
async function findBestWarehouse(companyA, companyB, warehouses) {
  // Step 1: 유클리디안 거리 기준 5개 필터
  const topCandidates = warehouses
    .map(wh => ({
      ...wh,
      approxDist: euclideanDistance(companyA.lat, companyA.lng, wh.lat, wh.lng)
                + euclideanDistance(wh.lat, wh.lng, companyB.lat, companyB.lng)
    }))
    .sort((a, b) => a.approxDist - b.approxDist)
    .slice(0, 5);

  // Step 2: 도로 거리 기반으로 재계산
  let bestWarehouse = null;
  let minRealDist = Infinity;

  for (const wh of topCandidates) {
    const distAtoW = await getRealDistance(companyA.lat, companyA.lng, wh.lat, wh.lng);
    const distWtoB = await getRealDistance(wh.lat, wh.lng, companyB.lat, companyB.lng);
    const total = distAtoW + distWtoB;

    if (total < minRealDist) {
      minRealDist = total;
      bestWarehouse = { ...wh, totalDistance: total };
    }
  }

  return bestWarehouse;
}

app.post('/api/get-coordinates', async (req, res) => {
  const { companyA, companyB } = req.body;

  if (!companyA || !companyB) {
    return res.status(400).json({ error: "두 기업명을 모두 입력해주세요." });
  }

  try {
    const result = await pool.query(
      `SELECT business_name, coord_x, coord_y 
       FROM business_info 
       WHERE business_name = $1 OR business_name = $2`,
      [companyA, companyB]
    );

    const company1 = result.rows.find(c => c.business_name === companyA);
    const company2 = result.rows.find(c => c.business_name === companyB);

    const warehouseResult = await pool.query(
      `SELECT business_name, coord_x, coord_y, full_road_address 
       FROM business_info 
       WHERE service_name = '물류창고업체'`
    );
    let bestWarehouse = null;
    let minTotalDistance = Infinity;

    if (result.rows.length !== 2) {
      return res.status(404).json({ error: "기업을 찾을 수 없습니다." });
    }
    const top5Warehouses = warehouseResult.rows
      .map(wh => {
        const approxDist = euclideanDistance(company1.coord_y, company1.coord_x, wh.coord_y, wh.coord_x)
                        + euclideanDistance(wh.coord_y, wh.coord_x, company2.coord_y, company2.coord_x);
        return { ...wh, approxDist };
      })
      .sort((a, b) => a.approxDist - b.approxDist)
      .slice(0, 5);

    for (const wh of top5Warehouses) {
      const distAtoW = await getRealDistance(company1.coord_y, company1.coord_x, wh.coord_y, wh.coord_x);
      const distWtoB = await getRealDistance(wh.coord_y, wh.coord_x, company2.coord_y, company2.coord_x);
      const totalDist = distAtoW + distWtoB;

      if (totalDist < minTotalDistance) {
        minTotalDistance = totalDist;
        bestWarehouse = {
          ...wh,
          total_distance: totalDist.toFixed(2),
          distAtoW: distAtoW.toFixed(2),
          distWtoB: distWtoB.toFixed(2)
        };
      }
}

    const carrierResult = await pool.query(
      `SELECT business_name, coord_x, coord_y
      FROM business_info 
      WHERE service_name = '국제물류주선업'`
    );

    let bestCarrierAtoW = null;
    let minDistAtoW = Infinity;

    carrierResult.rows.forEach(c => {
      const dist = euclideanDistance(company1.coord_y, company1.coord_x, c.coord_y, c.coord_x);
      if (dist < minDistAtoW) {
        minDistAtoW = dist;
        bestCarrierAtoW = {
          ...c,
          distance: dist.toFixed(6)
        };
      }
    });
    console.log('result:',carrierResult);
    console.log('best:',bestWarehouse);

    let bestCarrierWtoB = null;
    let minDistWtoB = Infinity;

    carrierResult.rows.forEach(c => {
      const dist = euclideanDistance(bestWarehouse.coord_y, bestWarehouse.coord_x, c.coord_y, c.coord_x);
      if (dist < minDistWtoB) {
        minDistWtoB = dist;
        bestCarrierWtoB = {
          ...c,
          distance: dist.toFixed(6)
        };
      }
    });

    res.json({
      companyA: company1,
      companyB: company2,
      bestWarehouse: bestWarehouse,
      carrierAtoW: bestCarrierAtoW,
      carrierWtoB: bestCarrierWtoB
    });
  } catch (err) {
    console.error("❌ DB 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});



app.get("/", (req, res) => {
  res.render("index2", { googleMapsApiKey: "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc" });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
