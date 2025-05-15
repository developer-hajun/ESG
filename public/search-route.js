let popupMap = null;
let popupMarkers = [];

function sendRouteRequest() {
  const nameA = document.getElementById("companyInputA").value.trim();
  const nameB = document.getElementById("companyInputB").value.trim();

  if (!nameA || !nameB) {
    alert("두 기업명을 모두 입력해주세요.");
    return;
  }

  fetch("/api/route-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyA: nameA, companyB: nameB })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.companyA || !data.companyB || !data.bestWarehouse) {
        alert("경로 데이터를 찾을 수 없습니다.");
        return;
      }

      const { companyA, companyB, bestWarehouse } = data;

      // 1️⃣ 팝업 지도 없으면 생성
      if (!popupMap) {
        popupMap = new google.maps.Map(document.getElementById("popupMap"), {
          center: { lat: parseFloat(companyA.coord_y), lng: parseFloat(companyA.coord_x) },
          zoom: 8
        });
      }

      // 2️⃣ 기존 마커 제거
      popupMarkers.forEach(marker => marker.setMap(null));
      popupMarkers = [];

      // 3️⃣ 마커 생성 함수
      const addPopupMarker = (lat, lng, label, color) => {
        const marker = new google.maps.Marker({
          position: { lat: parseFloat(lat), lng: parseFloat(lng) },
          map: popupMap,
          title: label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 1,
            strokeWeight: 1
          }
        });
        popupMarkers.push(marker);
      };

      // 4️⃣ A, 창고, B 마커 생성
      addPopupMarker(companyA.coord_y, companyA.coord_x, companyA.business_name, "blue");
      addPopupMarker(bestWarehouse.coord_y, bestWarehouse.coord_x, bestWarehouse.business_name, "orange");
      addPopupMarker(companyB.coord_y, companyB.coord_x, companyB.business_name, "green");

      // 5️⃣ 팝업 지도 중심 조정
      const midLat = (parseFloat(companyA.coord_y) + parseFloat(companyB.coord_y)) / 2;
      const midLng = (parseFloat(companyA.coord_x) + parseFloat(companyB.coord_x)) / 2;
      popupMap.setCenter({ lat: midLat, lng: midLng });

    })
    .catch(err => {
      console.error("❌ 서버 통신 오류:", err);
    });
}
