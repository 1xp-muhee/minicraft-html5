# OfficeCraft HTML5

브라우저에서 바로 실행되는 HTML5 오피스 배틀 샌드박스 게임입니다.  
GitHub Pages 배포 기준으로 동작합니다.

플레이 링크: https://1xp-muhee.github.io/minicraft-html5/

## 핵심 기능
- 멀티 룸 접속 (`?room=...`)
- 닉네임 표시 + 채팅
- 무기 선택 팝업
  - 새총 / 마법 지팡이 / K2 / 석궁
- 무기별 투사체 비주얼
- 10히트 기력 충전 + 필살기
- 리더보드(유저별 점수)
- 직원 AI
  - 기본 착석 근무
  - 확률적으로 자리 이탈
  - 문(4면)에서 주기 리젠 후 자리 복귀
- 직원 랜덤 헤어 스타일
- 배경음(판타지 무드, WebAudio)

## 조작
- 이동: `WASD`
- 점프: `Space`
- 달리기: `Shift`
- 공격: 좌클릭 / 모바일 공격 버튼
- 필살기 준비: `Q` / 모바일 필살기 버튼
- 채팅: `Enter` (입력), `Esc` (취소)

## 게임 룰 요약
- 이동 중(자리 이탈) 직원 타격: 보상
- 착석 직원 오타격: 패널티
- 필살기 상태에서는 강력 투사체 발사

## URL 파라미터
- `room`: 룸 이름
- `nick`: 닉네임 (없으면 첫 진입 시 입력)

예시:
`https://1xp-muhee.github.io/minicraft-html5/?room=jinwoo&nick=muhee`

## 코드 구조 (리팩토링)
- `index.html`: UI 마크업 + HUD
- `main.js`: 게임 루프/네트워크/전투/AI 통합 제어
- `weapons.js`: 무기 카탈로그/무기 선택 로직
- `audio.js`: 배경음 생성/재생 제어
- `identity.js`: 닉네임 해석/입력 로직
- `projectiles.js`: 무기별 투사체 메시/속도 생성

## 개발 메모
- 정적 호스팅 환경에서 ES Module 로딩 구조
- 외부 빌드툴 없이 유지보수 가능하도록 파일 분리
