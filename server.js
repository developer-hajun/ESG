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

app.post('/api/route-search-kakao', async (req, res) => {
  const { companyA, companyB } = req.body;

  if (!companyA || !companyB) {
    return res.status(400).json({ error: "두 기업명을 모두 입력해야 합니다." });
  }

  try {
    const companyResult = await pool.query(
      `SELECT business_name, coord_x, coord_y 
       FROM business_info 
       WHERE business_name = $1 OR business_name = $2`,
      [companyA, companyB]
    );

    if (companyResult.rows.length !== 2) {
      return res.status(404).json({ error: "기업을 찾을 수 없습니다." });
    }

    const company1 = companyResult.rows.find(c => c.business_name === companyA);
    const company2 = companyResult.rows.find(c => c.business_name === companyB);

    const warehouseResult = await pool.query(
      `SELECT business_name, coord_x, coord_y, full_road_address 
       FROM business_info 
       WHERE service_name = '물류창고업체'`
    );

    if (warehouseResult.rows.length === 0) {
      return res.status(404).json({ error: "창고 데이터가 없습니다." });
    }

    let bestWarehouse = null;
    let minTotalDistance = Infinity;

    warehouseResult.rows.forEach(wh => {
      const distAtoW = euclideanDistance(company1.coord_y, company1.coord_x, wh.coord_y, wh.coord_x);
      const distWtoB = euclideanDistance(wh.coord_y, wh.coord_x, company2.coord_y, company2.coord_x);
      const totalDist = distAtoW + distWtoB;

      if (totalDist < minTotalDistance) {
        minTotalDistance = totalDist;
        bestWarehouse = {
          ...wh,
          total_distance: totalDist.toFixed(6)
        };
      }
    });

    res.json({
      companyA: company1,
      companyB: company2,
      bestWarehouse: bestWarehouse
    });

  } catch (err) {
    console.error("❌ DB 에러:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});
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

    if (result.rows.length !== 2) {
      return res.status(404).json({ error: "기업을 찾을 수 없습니다." });
    }

    const company1 = result.rows.find(c => c.business_name === companyA);
    const company2 = result.rows.find(c => c.business_name === companyB);

    res.json({
      companyA: company1,
      companyB: company2
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
