
let popupMapInstance;
let directionsService;
let directionsRendererAtoW;
let directionsRendererWtoB;

async function sendRouteRequest() {
  const companyA = document.getElementById("companyInputA").value;
  const companyB = document.getElementById("companyInputB").value;

  if (!companyA || !companyB) {
    alert("두 기업명을 모두 입력해주세요.");
    return;
  }

  try {
    const response = await fetch('/api/route-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyA, companyB })
    });

    const data = await response.json();
    console.log(data)

    if (data.error) {
      alert(data.error);
      return;
    }

    openModal(); // 팝업 띄우기
    drawRouteOnMap(data); // 지도에 경로 표시
  } catch (err) {
    console.error("❌ 오류:", err);
    alert("서버 오류가 발생했습니다.");
  }
}

function drawRouteOnMap(data) {
  const { companyA, companyB, bestWarehouse } = data;

  const coordA = { lat: parseFloat(companyA.coord_y), lng: parseFloat(companyA.coord_x) };
  const coordW = { lat: parseFloat(bestWarehouse.coord_y), lng: parseFloat(bestWarehouse.coord_x) };
  const coordB = { lat: parseFloat(companyB.coord_y), lng: parseFloat(companyB.coord_x) };

  // 지도 초기화
  if (!popupMapInstance) {
    popupMapInstance = new google.maps.Map(document.getElementById("popupMap"), {
      center: coordW,
      zoom: 12,
    });
  }

  // DirectionsService/Renderer 초기화
  directionsService = new google.maps.DirectionsService();

  // 이전 경로 제거
  if (directionsRendererAtoW) directionsRendererAtoW.setMap(null);
  if (directionsRendererWtoB) directionsRendererWtoB.setMap(null);

  directionsRendererAtoW = new google.maps.DirectionsRenderer({ suppressMarkers: false });
  directionsRendererWtoB = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    polylineOptions: { strokeColor: '#0000FF' }
  });

  directionsRendererAtoW.setMap(popupMapInstance);
  directionsRendererWtoB.setMap(popupMapInstance);

  // 경로 1: A → W
  directionsService.route({
    origin: coordA,
    destination: coordW,
    travelMode: google.maps.TravelMode.TRANSIT
  }, (result1, status1) => {
    if (status1 === 'OK') {
      directionsRendererAtoW.setDirections(result1);
    } else {
      alert("회사 A → 창고 경로를 불러올 수 없습니다.");
    }
  });

  // 경로 2: W → B
  directionsService.route({
    origin: coordW,
    destination: coordB,
    travelMode: google.maps.TravelMode.TRANSIT
  }, (result2, status2) => {
    if (status2 === 'OK') {
      directionsRendererWtoB.setDirections(result2);
    } else {
      alert("창고 → 회사 B 경로를 불러올 수 없습니다.");
    }
  });
}

function openModal() {
  document.getElementById("popupModal").style.display = "block";
}

function closeModal() {
  document.getElementById("popupModal").style.display = "none";

  // 팝업 닫을 때 지도 초기화
  if (directionsRendererAtoW) directionsRendererAtoW.setMap(null);
  if (directionsRendererWtoB) directionsRendererWtoB.setMap(null);
}
