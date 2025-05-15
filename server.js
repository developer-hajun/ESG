const express = require("express");
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
    const result = await pool.query('SELECT business_name, coord_x, coord_y, full_road_address FROM business_info');
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

app.get("/", (req, res) => {
  res.render("index2", { googleMapsApiKey: "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc" });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
