  let kakaoMapInstance;
  let polylineAtoW = null;
  let polylineWtoB = null;

  function openModal() {
    document.getElementById("popupModal").style.display = "block";
  }

  function closeModal() {
    document.getElementById("popupModal").style.display = "none";
    if (polylineAtoW) polylineAtoW.setMap(null);
    if (polylineWtoB) polylineWtoB.setMap(null);
  }
  function formatDepartureTimeString(inputValue) {
  const date = new Date(inputValue);  // ISO 형식 파싱
  if (isNaN(date)) return null;
  console.log(date);

  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${yyyy}${MM}${dd}${hh}${mm}`;  // Kakao API가 요구하는 형식
}

  async function getCarDirection() {
    const companyA = document.getElementById("companyInputA").value;
    const companyB = document.getElementById("companyInputB").value;
    const departure_time = document.getElementById("departure_time").value;
    let departureTimeStr = "";

    departureTimeStr = formatDepartureTimeString(departure_time);
    if (!companyA || !companyB) {
      alert("두 기업명을 입력해주세요.");
      return;
    }

    try {
      // 1. 서버에 회사명 2개 보내서 좌표 조회
      const response = await fetch('/api/get-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyA, companyB })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      const pointObj = {
        startPoint: {
          name: data.companyA.business_name,
          lng: data.companyA.coord_x,
          lat: data.companyA.coord_y
        },
        endPoint: {
          name: data.companyB.business_name,
          lng: data.companyB.coord_x,
          lat: data.companyB.coord_y
        },
        viaPoint:{
          name: data.bestWarehouse.business_name,
          lng: data.bestWarehouse.coord_x,
          lat: data.bestWarehouse.coord_y
        },
        carrierAtoW: {
          name: data.carrierAtoW.business_name,
          lng: data.carrierAtoW.coord_x,
          lat: data.carrierAtoW.coord_y
        },
        carrierWtoB: {
          name: data.carrierWtoB.business_name,
          lng: data.carrierWtoB.coord_x,
          lat: data.carrierWtoB.coord_y
        },
        departure_time: departureTimeStr 
      };
      // 2. Kakao API 호출
      await drawRouteWithKakaoAPI(pointObj);

    } catch (err) {
      console.error("❌ 오류:", err);
      alert("서버 오류가 발생했습니다.");
    }
  }
  async function drawRouteWithKakaoAPI(pointObj) {
    const REST_API_KEY = 'd050db88ea871e4352d56b8448f3fcaf';
    const url = 'https://apis-navi.kakaomobility.com/v1/future/directions';
    const origin = `${pointObj.startPoint.lng},${pointObj.startPoint.lat}`;
    const destination = `${pointObj.endPoint.lng},${pointObj.endPoint.lat}`;
    const waypoint = `${pointObj.viaPoint.lng},${pointObj.viaPoint.lat}`;
    const departure_time = pointObj.departure_time ;

    if (!kakaoMapInstance) {
      kakaoMapInstance = new kakao.maps.Map(document.getElementById("kakaoMap"), {
        center: new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng),
        level: 5
      });
    }
    const headers = {
      Authorization: `KakaoAK ${REST_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const queryParams = new URLSearchParams({
      origin: origin,
      destination: destination,
      waypoints: waypoint,
      departure_time: departure_time
    });
    const requestUrl = `${url}?${queryParams}`;
    console.log(requestUrl);
    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.routes || !data.routes[0]?.sections?.[0]?.roads) {
        console.error("🚨 경로 데이터 없음:", data);
        alert("경로 데이터를 불러오지 못했습니다.");
        return;
      }

      const sections = data.routes[0].sections;
      const linePath = [];

      sections.forEach(section => {
        section.roads.forEach(road => {
          const v = road.vertexes;
          for (let i = 0; i < v.length; i += 2) {
            if (v[i + 1] !== undefined) {
              linePath.push(new kakao.maps.LatLng(v[i + 1], v[i]));
            }
          }
        });
      });

      if (!linePath.length) {
        alert("경로를 그릴 수 없습니다.");
        return;
      }
      console.log(linePath);

      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: 'rgb(69, 178, 98)',
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
      });
      polyline.setMap(kakaoMapInstance || map);
      const warehouseMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pointObj.viaPoint.lat, pointObj.viaPoint.lng),
        map: kakaoMapInstance,
        color:rgb(69, 178, 98),
        title: `경유지: ${pointObj.viaPoint.name}`
      });
      const Origin = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pointObj.startPoint.lat, pointObj.startPoint.lng),
        map: kakaoMapInstance,
        title: `출발지: ${pointObj.startPoint.name}`
      });
      const Destination = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pointObj.endPoint.lat, pointObj.endPoint.lng),
        map: kakaoMapInstance,
        title: `도착지: ${pointObj.endPoint.name}`
      });
      const DeliveryA = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pointObj.carrierAtoW.lat, pointObj.carrierAtoW.lng),
        map: kakaoMapInstance,
        title: `${pointObj.startPoint.name}→${pointObj.viaPoint.name}: ${pointObj.carrierAtoW.name}`
      });
      const DeliveryB = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pointObj.carrierWtoB.lat, pointObj.carrierWtoB.lng),
        map: kakaoMapInstance,
        title: `${pointObj.viaPoint.name}→${pointObj.endPoint.name}: ${pointObj.carrierWtoB.name}`
      });
    } catch (error) {
      console.error('Error:', error);
    }
  }



