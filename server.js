const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

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
