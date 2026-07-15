export default function handler(_req, res) {
    res.status(200).json({ ok: true, runtime: 'vercel-node', timestamp: new Date().toISOString() });
}
