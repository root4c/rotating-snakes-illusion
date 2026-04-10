# Rotating Snakes Experiment - Final Package

이 패키지는 바로 배포 가능한 최종본이다.

구성:
- `index.html` : 실험 화면
- `style.css` : 스타일
- `app.js` : 실험 로직
- `config.js` : 자극 목록 / 저장 주소 / 시간 설정
- `stimuli/` : 자극 이미지 넣는 폴더
- `backend/worker.js` : 응답 저장용 Cloudflare Worker
- `backend/wrangler.toml` : Worker 배포 설정 예시

## 현재 포함된 기능
- 모바일/태블릿 차단, PC만 시작 가능
- 시작 전 미리보기
- A/C/B 조건 랜덤 제시
- 최소 관찰 시간 후 수동 평가
- 진행률 표시
- 로컬 JSON/CSV 다운로드
- 서버 자동 저장 POST 지원

## 1. stimuli 폴더에 넣어야 할 파일
반드시 아래 이름 그대로 넣어야 한다.

- `A_01.png`
- `A_02.png`
- `A_03.png`
- `A_04.png`
- `C_02.png`
- `C_03.png`
- `C_04.png`
- `C_05.png`
- `C_06.png`
- `check_base.png`

선택:
- `intro_example.png`

## 2. 프론트엔드 배포
정적 파일만 배포하면 된다.

업로드 대상:
- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `stimuli/`

## 3. 응답 저장 활성화
기본 설정은 아래처럼 placeholder 상태다.

```js
saving: {
  autoPostEndpoint: "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/submit",
  endpointMethod: "POST"
}
```

### 해야 할 일
1. `backend/worker.js` 를 Cloudflare Worker로 배포
2. KV namespace 생성 후 `RESULTS` 바인딩 연결
3. 배포된 Worker 주소를 `config.js`의 `autoPostEndpoint`에 넣기

예시:
```js
saving: {
  autoPostEndpoint: "https://rotating-snakes-submit.root4c.workers.dev/submit",
  endpointMethod: "POST"
}
```

## 4. Worker 배포 개요
### KV 생성
Cloudflare에서 KV namespace 생성 후 ID를 확인한다.

### wrangler.toml 수정
`backend/wrangler.toml`의 아래 값을 바꾼다.

```toml
id = "PASTE_YOUR_KV_NAMESPACE_ID"
```

### 배포
```bash
cd backend
npm install -g wrangler
wrangler login
wrangler deploy
```

## 5. 저장 확인
Worker가 배포되면 아래 주소가 열려야 한다.
- `/health`

예:
```text
https://rotating-snakes-submit.root4c.workers.dev/health
```

정상이라면 JSON이 반환된다.

## 6. 주의
- 현재 평정 척도는 **1~7점**이다.
- 참가자 응답은 서버 저장이 실패해도 로컬 JSON/CSV 다운로드는 시도된다.
- 프론트엔드와 저장 Worker는 서로 다른 주소여도 된다.
- 같은 주소에서 프론트와 `/submit`을 같이 처리하려면 별도 통합 Worker 구성이 필요하다.
