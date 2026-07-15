# 한성대학교 상상베이스 예약 시스템

상상베이스 지도에서 IB101~IB108, IB111을 선택하고 30분 단위로 최대 3시간까지 예약하는 React + Firebase 웹 앱입니다.

## 실행

```bash
npm install
npm run dev
```

Firebase 설정 전에는 데모 모드로 동작합니다. 예약·취소·관리자 공간 중지를 브라우저에서 바로 시험할 수 있습니다.

## Firebase 연결

1. `.env.example`을 `.env.local`로 복사하고 Firebase Web App 설정값을 입력합니다.
2. Firebase Authentication에서 Google 공급자를 활성화합니다.
3. Firestore Database를 생성합니다.
4. 서버 함수를 설치하고 배포합니다.

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions,firestore,hosting
```

`functions/src/index.ts`의 API는 Firebase ID Token을 검증한 뒤 허용 공간, 30분 경계, 30분~3시간 범위를 검사합니다. 필요한 `bookingSlots`를 먼저 모두 읽고, 충돌 시 `409 Conflict`를 반환하며 예약과 슬롯 문서를 하나의 Firestore 트랜잭션에서 생성합니다.

관리자 계정에는 Firebase Admin SDK로 `admin: true` 커스텀 클레임을 부여해야 합니다. 클라이언트는 예약/슬롯을 직접 쓰지 못하도록 Firestore 규칙이 차단합니다.

