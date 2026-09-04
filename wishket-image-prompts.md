# StoreDesk 이미지 브리프

## 먼저 읽을 것

1. `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-requirements.md`
2. `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-purpose-brief.md`
3. `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-proposal.txt`

## 이 제품이 약속하는 것

StoreDesk는 컨테이너 보관 창고 3개소를 운영하는 회사의 **사내 업무 시스템**이다. 고객 약
1,500명의 계약과 입금을 엑셀 장부로 관리하던 일을 옮겨 온다. 회계·정산 담당자가 은행 거래내역
엑셀을 올리면 계약자명과 등록 입금자명으로 자동 대조하고, 동명이인·미등록 입금자명·분할
입금·계약 없는 입금만 검토 목록에 남는다. 담당자가 그 예외만 판정하면 계약 만료일과 연체
상태가 다시 계산되고, 청구·안내 발송과 처리 이력이 같은 계약 원장에 이어진다. 산업은 창고
보관업이지만 **파는 것은 창고가 아니라 "매달 반복되던 눈대조가 사라진 상태"** 다. 컨테이너나
지게차가 주인공이 아니라, 예외 다섯 건만 남은 담당자의 책상이 주인공이다.

## 현재 히어로 자산 상태

- 현재 `public/hero-landing.jpg` 는 **실제 구현 화면을 촬영해 합성한 임시 래스터 이미지**다.
  `tools/build-hero-image.mjs` 가 입금 계약 자동 대조(업로드 직후)·미매칭 검토(동명이인 판정 중)·
  운영 대시보드를 실제로 조작해 캡처한 뒤 1920×1080 JPEG 한 장으로 합성한다.
- `public/hero-landing-alt.jpg` 는 Codex 이미지 생성 도구로 만든 **컨테이너 보관 창고 실사
  이미지**다. 서비스 소개는 실제 구현 화면 합성과 현장 실사를 14초 주기로 교차해 보여준다.
- 임시 이미지에는 문구용 암막이나 테마색을 굽지 않았다. 대비는 CSS의 중립 암막 레이어가,
  테마 반응은 `--hero-start`/`--hero-end` 틴트 레이어가 담당한다.
- 임시 이미지를 다시 만들려면: `node tools/build-hero-image.mjs`

## 공통 스타일 (모든 프롬프트에 적용)

자연광, 열린 그림자, 실제에 가까운 색. 인공적인 암막·비네팅·과도한 대비 없음. 한국의 실제
물류·창고 현장에 맞는 규모와 마감. 사람은 차분하고 전문적이며 호감형인 표정으로 지금 무언가를
확인하거나 결정하는 순간. 안전 규정을 어기는 자세나 위험한 행동 없음. 이미지 안에 글자, 숫자,
로고, UI 라벨, 화살표, 업무 흐름도를 넣지 않는다.

---

### 01. 서비스 소개 히어로 — 컨테이너 보관 창고 실사

- 대상 파일: `public/hero-landing.jpg`
- 크기: 1920×1080 (16:9), 최소 1920×1080
- 절대 경로:
  `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/public/hero-landing.jpg`

English prompt:

> A wide, calm daytime photograph inside a Korean container storage yard used by a
> small self-storage business. Rows of clean 20ft and 40ft steel storage containers
> stand in orderly lines under an open sky with soft natural light. In the right two
> thirds of the frame, a warehouse operations manager in a plain navy work jacket
> stands beside an open container door holding a tablet, calmly checking one unit
> against a list. The left third of the frame is quiet open space: ground and sky,
> no subject, no clutter. Realistic colours, open shadows, no artificial darkening,
> no vignette, no text or signage anywhere in the image.

- 크롭·피사체 위치: 왼쪽 3분의 1은 문구 자리이므로 비운다. 컨테이너 열과 인물은 오른쪽에
  둔다. `object-fit: cover` 로 잘려도 컨테이너 열과 인물이 남아야 한다.
- 넣지 말 것: 글자·간판·번호판·브랜드 로고, 어둡게 깔린 그라디언트, 지게차 위 사람,
  안전모 미착용 고소 작업, 화면 안의 UI 목업.

### 02. 보조 프레임 — 현장에서 태블릿으로 확인하는 순간

- 대상 파일: `public/hero-landing-alt.jpg` (기존 제품 화면 프레임인 `public/hero-landing.jpg`와 함께 사용)
- 크기: 1920×1080

English prompt:

> A wide daytime photograph of a Korean container storage yard. Clean storage
> containers stand in orderly rows while a warehouse operations manager in workwear
> and a safety vest checks an inbound or outbound job on a tablet. Another worker and
> a forklift appear farther in the background. Natural light, realistic colours, and
> a quiet left third reserved for headline copy. No text, signage, logos, UI, tint,
> gradient, vignette, or artificial blue cast.

- 크롭·피사체 위치: 왼쪽 3분의 1 비움. 주 작업자와 현장 행위는 오른쪽에 유지.
- 넣지 말 것: 읽히는 간판·번호·상표·글자, UI 합성, 이미지 자체의 테마색·그라데이션.

---

## Codex 히어로 최종 보정

현재 프로젝트의 서비스 소개 히어로 이미지만 최종 제작·적용해 주세요.

먼저 `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-requirements.md`,
`/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-purpose-brief.md`,
`/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/wishket-proposal.txt`, 현재 서비스 소개 화면, 그리고 이 문서의
RFP별 이미지 브리프를 확인하세요. 발주처가 첫 화면만 보고도 사용자, 핵심 업무,
최종 결과를 이해할 수 있는 한 장면을 선택합니다.

### 이미지 제작

1. OpenAI 이미지 생성 도구로 실제 비트맵 이미지를 만듭니다. 코드, CSS, SVG,
   그라데이션 상자나 기존 화면 캡처만으로 새 히어로 이미지를 대신하지 마세요.
2. 공고의 실제 업무 환경·사용자·핵심 행위를 한 장면으로 보여주세요. 일반적인
   사무실 사진이나 다른 프로젝트에도 그대로 쓸 수 있는 장면은 사용하지 마세요.
3. 이미지 안에는 글자, 숫자, 로고, UI 라벨, 화살표, 업무 흐름도를 넣지 마세요.
4. 현재 히어로 문구가 놓이는 쪽에는 충분한 여백을 두고 핵심 인물·장비·공간은
   반대쪽에 배치하여 `cover` 크롭 뒤에도 장면이 유지되게 하세요.
5. 기본 비율은 16:9, 최소 크기는 1920×1080입니다.
6. 원본 이미지 자체에는 테마 색상, 그라데이션, 암막, 비네팅 또는 문구 보호용
   그림자를 합성하지 마세요. 밝고 자연스러운 원본을 유지하세요.
7. 최종 파일을 `/Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop/public/hero-landing-alt.jpg`에 저장하세요.
   기존 제품 화면 프레임인 `public/hero-landing.jpg`는 유지하고 두 프레임을 현재
   `data-landing-hero-image` 영역에서 함께 사용하세요.

### 랜딩 적용

- 기존 서비스 소개의 정보 구조, 문구, CTA, 탭형 SVG, 아래 섹션과 기능은
  그대로 보존하세요.
- 데스크톱 히어로의 기준 깊이는 640px입니다. 얕은 배너처럼 줄이지 마세요.
- 960px 이하에서는 고정 높이를 해제하고 문구와 핵심 장면이 잘리지 않는
  content-driven 높이를 사용하세요.
- `object-fit: cover`와 화면별 `object-position`을 실제 이미지 구도에 맞게
  조정하세요.

### 테마 반응

- A–E 모든 테마에서 동일한 원본 이미지를 사용하세요.
- 문구 가독성을 보호하는 중립 암막 레이어와 `--hero-start`, `--hero-end`를
  사용하는 가벼운 테마 틴트 레이어를 CSS에서 분리하세요.
- 테마 변경 시 사진의 분위기는 미묘하게 반응해야 하지만 원본 색을 덮어쓰거나
  사진이 탁해지면 안 됩니다.

### 변경 제한

기존 제품 화면 프레임인 `public/hero-landing.jpg`는 유지하고 실사 프레임인
`public/hero-landing-alt.jpg`, 크롭 위치, 히어로 높이, 두 오버레이 레이어와 해당 접근성
속성만 수정하세요. 히어로 이외의 화면, 문구, 메뉴, SVG, 상태, 데이터,
인터랙션, 기능과 배포 주소는 수정하지 마세요.

### 검증

- 1920×1080, 1440×900, 390×844에서 히어로를 확인하세요.
- 서로 다른 A–E 테마 두 개 이상에서 같은 원본 이미지와 다른 테마 틴트를
  확인하세요.
- 제목·설명·버튼 대비, 인물과 핵심 피사체의 크롭, 모바일 줄바꿈을 확인하세요.
- 데스크톱 첫 화면에서 다음 의미 있는 섹션의 시작이 보여야 합니다.
- 프로젝트의 기존 검사와 빌드를 통과시킨 뒤 기존 배포 절차로 반영하세요.
  새 Vercel 프로젝트나 별칭을 만들거나 운영 도메인을 변경하지 마세요.

## 후속 실행 명령 (사람이 지시할 때만)

```bash
cd /Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop && npm run build
git add -A && git commit -m "승인 이미지 반영" && git push origin main
# Vercel Git 연동이 main을 운영 배포하고 https://storedesk.vercel.app 별칭을 유지합니다.
node "$WISHKET_AUTOMATION_ROOT/portfolio/capture-screens.mjs" /Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop \
  --start "npm run preview -- --port 4321"
node "$WISHKET_AUTOMATION_ROOT/portfolio/portfolio-register.mjs" /Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop --dry
node "$WISHKET_AUTOMATION_ROOT/portfolio/portfolio-register.mjs" /Users/lsg/Developer/msoftech/wishket/storedesk_20260902_opus5_develop
```
