// 📦 화면에 띄울 PPL 소품들의 물리적 위치와 부력 데이터를 관리합니다.
export const propConfigs = [
  {
    id: 'left_prop',
    xOffset: -380, // 중앙 기준 왼쪽으로 380px 이동
    yOffset: 30, // 수면 기준 높이
    mass: 1.2, // 질량 (파도에 약간 무겁게 반응)
    phaseShift: 1.0, // 파도를 타는 박자 엇갈림
    size: 200, // 그려질 이미지 크기
  },
  {
    id: 'right_prop',
    xOffset: 360, // 중앙 기준 오른쪽으로 360px 이동
    yOffset: 25,
    mass: 0.9, // 질량 (파도에 가볍게 출렁임)
    phaseShift: 3.5, // 파도를 타는 박자 엇갈림
    size: 160, // 원근감을 위해 왼쪽보다 살짝 작게
  },
];
