const express = require("express");
const path = require("path");
const { Pool } = require('pg');

const app = express();
const PORT = 3000;



const pool = new Pool({
  user: 'ihajun',
  host: 'localhost',
  database: 'postgres',
  password: '1234',
  port: 5432,
});

app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, latitude, longitude FROM company');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/api/find', async (req, res) => {
  const searchTerm = req.query.q; // 쿼리 파라미터에서 검색어를 가져옵니다.

  if (!searchTerm) {
    return res.status(400).send('검색어를 입력해주세요.');
  }
  try {
    const result = await pool.query(
      'SELECT name, latitude, longitude FROM company WHERE name ILIKE $1',
      [`%${searchTerm}%`] // 대소문자를 구분하지 않고 검색어가 포함된 이름을 찾습니다.
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류');
  }
});

// EJS 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 정적 파일 서빙 (CSS, JS 등)
app.use(express.static('public'));

// 홈 라우트
app.get("/", (req, res) => {
    res.render("index2", { googleMapsApiKey: "AIzaSyAtKGLzxCbGf6d-Vsl5Fd2c8YJim_44xsc" });
});

app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});

