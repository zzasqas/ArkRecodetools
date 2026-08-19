const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app         = express();
const PORT        = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const DATA_FILE   = path.join(__dirname, 'submissions.jsonl');

if (ADMIN_TOKEN === 'changeme') {
  console.warn('[WARN] ADMIN_TOKEN 使用預設值，請在 Railway 設定 ADMIN_TOKEN 環境變數！');
}

// 只允許 GitHub Pages 與本機開發
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://zzasqas.github.io,http://localhost,http://127.0.0.1')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o));
    cb(ok ? null : new Error('CORS blocked'), ok);
  },
}));
app.use(express.json({ limit: '64kb' }));

// 低流量社群投票：限制短時間重複提交，避免單一來源灌入大量 JSONL。
// Railway 會在公開請求加上 X-Real-IP；不將使用者送來的其他 forwarded header 當作識別依據。
const SUBMIT_WINDOW_MS = 60 * 1000;
const SUBMIT_LIMIT = 5;
const MAX_RATE_KEYS = 10000;
const submitBuckets = new Map();

function clientIp(req) {
  const railwayIp = req.get('x-real-ip');
  return railwayIp && /^[0-9a-f:.]{3,64}$/i.test(railwayIp)
    ? railwayIp
    : (req.socket.remoteAddress || 'unknown');
}

function submitRateLimit(req, res, next) {
  const now = Date.now();
  const key = clientIp(req);
  const bucket = submitBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= SUBMIT_WINDOW_MS) {
    submitBuckets.set(key, { startedAt: now, count: 1 });
  } else if (bucket.count >= SUBMIT_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((SUBMIT_WINDOW_MS - (now - bucket.startedAt)) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  } else {
    bucket.count += 1;
  }

  if (submitBuckets.size > MAX_RATE_KEYS) {
    for (const [ip, entry] of submitBuckets) {
      if (now - entry.startedAt >= SUBMIT_WINDOW_MS) submitBuckets.delete(ip);
    }
    while (submitBuckets.size > MAX_RATE_KEYS) submitBuckets.delete(submitBuckets.keys().next().value);
  }
  next();
}

function validTierMembers(tierMembers) {
  const entries = Object.entries(tierMembers);
  if (!entries.length || entries.length > 12) return false;
  const seen = new Set();
  let total = 0;
  for (const [tierId, names] of entries) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(tierId) || !Array.isArray(names) || names.length > 300) return false;
    for (const name of names) {
      if (typeof name !== 'string' || !name.length || name.length > 64 || seen.has(name)) return false;
      seen.add(name); total += 1;
      if (total > 300) return false;
    }
  }
  return true;
}

function validCharPlusMinus(value) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 300) return false;
  return Object.entries(value).every(([name, mark]) =>
    typeof name === 'string' && name.length > 0 && name.length <= 64 && (mark === '' || mark === '+' || mark === '-')
  );
}

// 啟動時從檔案載入已有資料到記憶體
let submissions = [];
if (fs.existsSync(DATA_FILE)) {
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (raw) {
    submissions = raw.split('\n').filter(Boolean).map(l => JSON.parse(l));
  }
}
console.log(`Loaded ${submissions.length} existing submissions.`);

function getISOWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d - yearStart) / 86400000 - 3 + (yearStart.getDay() + 6) % 7) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── POST /submit ──────────────────────────────────────────────────────────────
app.post('/submit', submitRateLimit, (req, res) => {
  const { deviceId, nickname, mode, payload } = req.body || {};

  if (!deviceId || !mode || !payload) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  if (typeof deviceId !== 'string' || deviceId.length > 64) {
    return res.status(400).json({ ok: false, error: 'invalid_deviceId' });
  }
  if (typeof mode !== 'string' || mode.length > 32 || !/^[a-z0-9_]+$/.test(mode)) {
    return res.status(400).json({ ok: false, error: 'invalid_mode' });
  }
  if (typeof payload !== 'object' || Array.isArray(payload) || payload === null) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  if (!payload.tierMembers || typeof payload.tierMembers !== 'object' || Array.isArray(payload.tierMembers)) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  if (!validTierMembers(payload.tierMembers) || !validCharPlusMinus(payload.charPlusMinus)) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  if (nickname !== undefined && typeof nickname !== 'string') {
    return res.status(400).json({ ok: false, error: 'invalid_nickname' });
  }
  const safePayload = { tierMembers: payload.tierMembers };
  if (payload.charPlusMinus !== undefined) safePayload.charPlusMinus = payload.charPlusMinus;

  const week = getISOWeek();

  // 同一 deviceId + mode + week 只允許一筆
  const isDuplicate = submissions.some(
    s => s.deviceId === deviceId && s.mode === mode && s.week === week
  );
  if (isDuplicate) {
    return res.status(409).json({ ok: false, error: 'duplicate' });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    week,
    nickname: (nickname || '匿名').slice(0, 32),
    deviceId,
    mode,
    payload: safePayload,
  };

  submissions.push(entry);
  fs.appendFileSync(DATA_FILE, JSON.stringify(entry) + '\n', 'utf8');

  res.json({ ok: true });
});

// ── GET /admin/download ───────────────────────────────────────────────────────
app.get('/admin/download', (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const week   = req.query.week;   // 可選：只撈特定週 e.g. ?week=2026-W21
  const mode   = req.query.mode;   // 可選：只撈特定模式 e.g. ?mode=overall
  let data = submissions;
  if (week) data = data.filter(s => s.week === week);
  if (mode) data = data.filter(s => s.mode === mode);

  const filename = `submissions_${week || 'all'}_${mode || 'all'}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(data);
});

// ── GET / (health check) ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    total:  submissions.length,
    week:   getISOWeek(),
    thisWeek: submissions.filter(s => s.week === getISOWeek()).length,
  });
});

app.listen(PORT, () => {
  console.log(`ArkRecode tier list server running on port ${PORT}`);
});
