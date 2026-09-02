// ISST 中国官网 · 报名表单写入企业微信智能表格（Node HTTP server · 零依赖）
// PM2 守护：pm2 start server.js --name isst-wecom
// 配置：同目录 .env（见 .env.example），或系统环境变量
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

/* ---------- 配置加载 ---------- */
const ENV_PATH = path.join(__dirname, '.env');

function loadEnv() {
  const cfg = {};
  if (fs.existsSync(ENV_PATH)) {
    const txt = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of txt.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith('#') || !s.includes('=')) continue;
      const i = s.indexOf('=');
      cfg[s.slice(0, i).trim()] = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return cfg;
}

const env = loadEnv();
// 端口：避开同机 pakfront 已占用的 3000，ISST 用 3002
const PORT = Number(env.PORT || process.env.PORT || 3002);

const CFG = {
  CORP_ID: env.WECOM_CORP_ID || process.env.WECOM_CORP_ID || '',
  SECRET: env.WECOM_SECRET || process.env.WECOM_SECRET || '',
  DOCID: env.WECOM_DOCID || process.env.WECOM_DOCID || 'dcucwRlsuqdGk3_nUonrig6DWf3udT_9yGRC9pf1QdwJF3WOIDbTHK96P1rGfUTNkY9oPDRGgHRxwxrQ6yVA9dqQ',
  SHEET_ID: env.WECOM_SHEET_ID || process.env.WECOM_SHEET_ID || 'q979lj',
};

// 智能表格字段名（必须与表格表头完全一致，含空格；提交时间为后端自动添加）
const FIELD_MAP = {
  name: '姓名',
  phone: '手机号',
  city: '所在城市',
  job: '职业背景',
  course: '意向课程',
  session: '意向城市/场次',
  message: '想咨询的问题',
};
const FIELD_TIME = '提交时间';

/* ---------- access_token 缓存（有效期 2 小时，提前 10 分钟刷新） ---------- */
let tokenCache = { token: '', expireAt: 0 };

function httpJson(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method || 'GET',
      headers: headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('请求超时')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expireAt) return tokenCache.token;
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CFG.CORP_ID}&corpsecret=${CFG.SECRET}`;
  const r = await httpJson(url, 'GET');
  if (r.status !== 200 || r.data.errcode) {
    throw new Error(`获取 access_token 失败: ${r.data.errcode} ${r.data.errmsg}`);
  }
  tokenCache = { token: r.data.access_token, expireAt: now + (r.data.expires_in - 600) * 1000 };
  return tokenCache.token;
}

async function addRecord(token, values) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/add_records?access_token=${token}`;
  const body = {
    docid: CFG.DOCID,
    sheet_id: CFG.SHEET_ID,
    key_type: 'CELL_VALUE_KEY_TYPE_FIELD_TITLE',
    records: [{ values }],
  };
  const r = await httpJson(url, 'POST', { 'Content-Type': 'application/json' }, body);
  if (r.status !== 200 || r.data.errcode) {
    throw new Error(`写入智能表格失败: ${r.data.errcode} ${r.data.errmsg}`);
  }
  return r.data;
}

// 字段值统一按文本类型封装（智能表格文本字段格式）
function textCell(val) {
  return [{ type: 'text', text: String(val) }];
}

// 组装 values：只保留表格里存在的字段
function buildValues(form) {
  const values = {};
  for (const [key, fieldName] of Object.entries(FIELD_MAP)) {
    const v = (form[key] || '').trim();
    if (v) values[fieldName] = textCell(v);
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  values[FIELD_TIME] = textCell(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
  return values;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/* ---------- HTTP server ---------- */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'POST' && (req.url === '/api/apply' || req.url === '/submit')) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      let form;
      try {
        form = JSON.parse(raw || '{}');
      } catch (e) {
        return sendJson(res, 400, { ok: false, message: '请求体不是合法 JSON' });
      }

      // 必填校验
      const name = (form.name || '').trim();
      const phone = (form.phone || '').trim();
      const course = (form.course || '').trim();
      if (!name) return sendJson(res, 400, { ok: false, message: '姓名不能为空' });
      if (!phone) return sendJson(res, 400, { ok: false, message: '手机号不能为空' });
      if (!course) return sendJson(res, 400, { ok: false, message: '意向课程不能为空' });

      try {
        const token = await getToken();
        const values = buildValues(form);
        await addRecord(token, values);
        return sendJson(res, 200, { ok: true, message: '提交成功' });
      } catch (err) {
        console.error('[wecom]', err.message);
        return sendJson(res, 502, { ok: false, message: '写入失败，请稍后重试或直接联系课程顾问' });
      }
    });
    return;
  }

  // 健康检查（PM2 可用）
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { ok: false, message: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`ISST wecom server listening on :${PORT}`);
  if (!CFG.CORP_ID || !CFG.SECRET) {
    console.warn('[WARN] WECOM_CORP_ID / WECOM_SECRET 未配置，请在 .env 中填写');
  }
});
