# 한성대학교 상상베이스 예약 시스템

상상베이스 지도에서 IB101~IB108, IB111을 선택하고 30분 단위로 최대 3시간까지 예약하는 React + Vercel Functions + Firebase 웹 앱입니다.

- 프론트엔드 및 예약 API: Vercel
- 로그인: Firebase Authentication
- 예약 데이터와 트랜잭션: Cloud Firestore

## 로컬 실행

화면만 확인할 때는 `npm run dev`를 사용합니다. Firebase 설정 전에는 데모 모드로 동작합니다. Vercel API까지 함께 실행하려면 다음 명령을 사용합니다.

```bash
npx vercel dev
```

## 환경변수

`.env.example`을 참고해 로컬 `.env`와 Vercel 프로젝트 환경변수를 설정합니다.

클라이언트에 공개되는 Firebase Web App 설정:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BOOKING_API_URL=/api
```

Vercel Functions에서만 읽는 Firebase Admin 설정:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FIREBASE_PRIVATE_KEY` 등 서버 비밀값에는 절대 `VITE_` 접두사를 붙이지 마세요. `VITE_` 변수는 브라우저 번들에 포함됩니다.

## API

- `POST /api/bookings`: 예약 생성
- `DELETE /api/bookings/:bookingId`: 본인 예약 취소 또는 관리자 강제 취소
- `POST /api/blocks`: 관리자 시간 차단
- `PATCH /api/spaces/:spaceId/status`: 관리자 공간 예약 중지/재개

API는 Firebase ID Token과 한성대학교 이메일을 검증합니다. 필요한 `bookingSlots` 문서를 모두 읽은 뒤 충돌하면 `409 Conflict`를 반환하고, 예약과 슬롯 문서를 하나의 Firestore 트랜잭션에서 생성합니다.

## 배포

1. Git 저장소를 Vercel 프로젝트에 연결합니다.
2. 위 환경변수를 Vercel Project Settings에 추가합니다.
3. Firebase 서비스 계정에는 필요한 최소 Firestore 권한만 부여합니다.
4. Firestore 보안 규칙과 인덱스를 `firebase deploy --only firestore`로 배포합니다.

관리자 계정에는 Firebase Admin SDK로 `admin: true` 커스텀 클레임을 부여해야 합니다.
