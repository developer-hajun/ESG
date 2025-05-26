  let kakaoMapInstance;
  let polylineAtoW = null;
  let polylineWtoB = null;

  async function sendRouteRequest() {
    const companyA = document.getElementById("companyInputA").value;
    const companyB = document.getElementById("companyInputB").value;

    if (!companyA || !companyB) {
      alert("두 기업명을 모두 입력해주세요.");
      return;
    }

    try {
      const response = await fetch('/api/route-search-kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyA, companyB })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      openModal();
      drawRouteOnKakaoMap(data);

    } catch (err) {
      console.error("❌ 오류:", err);
      alert("서버 오류가 발생했습니다.");
    }
  }

  function openModal() {
    document.getElementById("popupModal").style.display = "block";
  }

  function closeModal() {
    document.getElementById("popupModal").style.display = "none";
    if (polylineAtoW) polylineAtoW.setMap(null);
    if (polylineWtoB) polylineWtoB.setMap(null);
  }

  async function getCarDirection() {
    const companyA = document.getElementById("companyInputA").value;
    const companyB = document.getElementById("companyInputB").value;

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
        }
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
    const url = 'https://apis-navi.kakaomobility.com/v1/directions';
    const origin = `${pointObj.startPoint.lng},${pointObj.startPoint.lat}`;
    const destination = `${pointObj.endPoint.lng},${pointObj.endPoint.lat}`;

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
      destination: destination
    });
    const requestUrl = `${url}?${queryParams}`;

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

      const roads = data.routes[0].sections[0].roads;
      const linePath = [];

      roads.forEach(road => {
        const v = road.vertexes;
        for (let i = 0; i < v.length; i += 2) {
          if (v[i + 1] !== undefined) {
            linePath.push(new kakao.maps.LatLng(v[i + 1], v[i]));
          }
        }
      });

      if (!linePath.length) {
        alert("경로를 그릴 수 없습니다.");
        return;
      }
      console.log(linePath);

      const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: '#000000',
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
      });
      polyline.setMap(kakaoMapInstance || map);
    } catch (error) {
      console.error('Error:', error);
    }
  }



