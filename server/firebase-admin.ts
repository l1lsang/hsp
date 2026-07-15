import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createPrivateKey } from 'node:crypto'

function normalizePrivateKey(rawPrivateKey: string) {
  let privateKey = rawPrivateKey.trim()

  const hasMatchingQuotes =
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))

  if (hasMatchingQuotes) {
    privateKey = privateKey.slice(1, -1).trim()
  }

  // Vercel에는 실제 줄바꿈 또는 \n 문자열 중 어느 형태로 저장되어도 처리합니다.
  privateKey = privateKey
    .split('\\\\r\\\\n').join('\n')
    .split('\\r\\n').join('\n')
    .split('\\\\n').join('\n')
    .split('\\n').join('\n')
    .replace(/\r/g, '')
    .trim()

  if (
    !privateKey.startsWith('-----BEGIN PRIVATE KEY-----') ||
    !privateKey.endsWith('-----END PRIVATE KEY-----')
  ) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY가 올바른 PEM 형식이 아닙니다. Vercel에는 변수명과 바깥쪽 따옴표를 제외한 전체 키만 입력하세요.',
    )
  }

  try {
    createPrivateKey({ key: privateKey, format: 'pem' })
  } catch {
    throw new Error(
      'FIREBASE_PRIVATE_KEY를 해석할 수 없습니다. 노출된 키를 폐기하고 새 서비스 계정 키를 Vercel 환경변수에 다시 입력하세요.',
    )
  }

  return privateKey
}

export function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error('Firebase Admin 환경변수가 설정되지 않았습니다.')
  }

  const privateKey = normalizePrivateKey(rawPrivateKey)

  const app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })

  return { auth: getAuth(app), db: getFirestore(app) }
}
