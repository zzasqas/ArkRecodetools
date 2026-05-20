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
app.use(express.json({ limit: '256kb' }));

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
app.post('/submit', (req, res) => {
  const { deviceId, nickname, mode, payload } = req.body || {};

  if (!deviceId || !mode || !payload) {
    return res.json({ ok: false, error: 'missing_fields' });
  }
  if (typeof deviceId !== 'string' || deviceId.length > 64) {
    return res.json({ ok: false, error: 'invalid_deviceId' });
  }
  if (typeof mode !== 'string' || mode.length > 32 || !/^[a-z0-9_]+$/.test(mode)) {
    return res.json({ ok: false, error: 'invalid_mode' });
  }
  if (typeof payload !== 'object' || Array.isArray(payload) || payload === null) {
    return res.json({ ok: false, error: 'invalid_payload' });
  }
  if (!payload.tierMembers || typeof payload.tierMembers !== 'object' || Array.isArray(payload.tierMembers)) {
    return res.json({ ok: false, error: 'invalid_payload' });
  }
  const tierVals = Object.values(payload.tierMembers);
  if (!tierVals.every(v => Array.isArray(v) && v.every(n => typeof n === 'string' && n.length <= 64))) {
    return res.json({ ok: false, error: 'invalid_payload' });
  }

  const week = getISOWeek();

  // 同一 deviceId + mode + week 只允許一筆
  const isDuplicate = submissions.some(
    s => s.deviceId === deviceId && s.mode === mode && s.week === week
  );
  if (isDuplicate) {
    return res.json({ ok: false, error: 'duplicate' });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    week,
    nickname: (nickname || '匿名').slice(0, 32),
    deviceId,
    mode,
    payload,
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
