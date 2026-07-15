import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFirebaseAdmin } from '../server/firebase-admin.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ ok: false, error: '허용되지 않은 요청 방식입니다.' })
    return
  }

  try {
    const { db } = getFirebaseAdmin()
    const snapshot = await db.collection('spaces').limit(1).get()
    res.status(200).json({
      ok: true,
      firebaseAdminConfigured: true,
      firestoreConnected: true,
      sampleDocumentCount: snapshot.size,
    })
  } catch (error) {
    console.error('[api/health] Firebase check failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      ok: false,
      firebaseAdminConfigured: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
      firestoreConnected: false,
      error: error instanceof Error ? error.message : 'Firebase 연결 확인에 실패했습니다.',
    })
  }
}

