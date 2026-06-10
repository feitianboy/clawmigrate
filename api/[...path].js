const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');

const JWT_SECRET = process.env.JWT_SECRET || 'clawmigrate-secret-key-2024';

let DATA = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@clawmigrate.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  migrationRecords: [],
  userConfigs: [],
  verificationCodes: [],
  userStats: [],
  userActivities: [],
  pageViews: []
};

let nextIds = {
  users: 2,
  migrationRecords: 1,
  userConfigs: 1,
  verificationCodes: 1,
  userStats: 1,
  userActivities: 1,
  pageViews: 1
};

const corsOptions = {
  origin: ['https://feitianboy.github.io', 'http://localhost:3000', 'https://*.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '需要登录' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '无效的 token' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

module.exports = (req, res) => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url.replace(/^\/api/, '') || '/';
  const method = req.method.toLowerCase();

  if (method === 'post' && path === '/auth/register') {
    const { username, email, password, emailCode } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: '缺少必填字段' });
    if (!emailCode) return res.status(400).json({ error: '请输入邮箱验证码' });
    
    const record = DATA.verificationCodes
      .filter(c => c.email === email && c.code === emailCode && c.type === 'email' && !c.used)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    if (!record) return res.status(400).json({ error: '验证码错误或已过期' });
    if (new Date() > new Date(record.expires_at)) return res.status(400).json({ error: '验证码已过期，请重新获取' });
    
    record.used = 1;
    
    if (DATA.users.some(u => u.username === username || u.email === email)) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = nextIds.users++;
    DATA.users.push({
      id: userId, username, email, password: hashedPassword, role: 'user',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    DATA.userStats.push({ id: nextIds.userStats++, user_id: userId, total_migrations: 0, total_page_views: 0 });
    
    const token = jwt.sign({ userId, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: '注册成功', token, user: { id: userId, username, email, role: 'user' } });
    return;
  }

  if (method === 'post' && path === '/auth/login') {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
    const user = DATA.users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: '登录成功', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    return;
  }

  if (method === 'get' && path === '/captcha') {
    const captcha = svgCaptcha.create({
      inverse: false, backgroundColor: '#1e293b', fontSize: 48,
      width: 120, height: 40, noise: 5,
      charPreset: '1234567890ABCDEFGHJKLMNPQRSTUVWXYZ'
    });
    res.json({ captchaId: Date.now().toString(), captcha: captcha.data });
    return;
  }

  if (method === 'post' && path === '/auth/send-email-code') {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: '请输入有效的邮箱地址' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    DATA.verificationCodes.push({
      id: nextIds.verificationCodes++, email, code, type: 'email',
      expires_at: expiresAt, used: 0, created_at: new Date().toISOString()
    });
    res.json({ message: '验证码已发送到您的邮箱', code });
    return;
  }

  if (method === 'get' && path === '/auth/me') {
    authenticateToken(req, res, () => {
      const user = DATA.users.find(u => u.id === req.user.userId);
      if (!user) return res.status(404).json({ error: '用户不存在' });
      res.json({ id: user.id, username: user.username, email: user.email, role: user.role, created_at: user.created_at });
    });
    return;
  }

  if (method === 'get' && path === '/admin/users') {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        res.json(DATA.users.map(u => ({
          id: u.id, username: u.username, email: u.email, role: u.role,
          created_at: u.created_at, updated_at: u.updated_at
        })));
      });
    });
    return;
  }

  if (method === 'get' && path.match(/^\/admin\/users\/\d+$/)) {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        const userId = parseInt(path.split('/')[3]);
        const user = DATA.users.find(u => u.id === userId);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
      });
    });
    return;
  }

  if (method === 'put' && path.match(/^\/admin\/users\/\d+$/)) {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        const userId = parseInt(path.split('/')[3]);
        const user = DATA.users.find(u => u.id === userId);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        const { username, email, role } = req.body;
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        user.updated_at = new Date().toISOString();
        res.json({ message: '用户更新成功' });
      });
    });
    return;
  }

  if (method === 'delete' && path.match(/^\/admin\/users\/\d+$/)) {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        const userId = parseInt(path.split('/')[3]);
        const idx = DATA.users.findIndex(u => u.id === userId);
        if (idx === -1) return res.status(404).json({ error: '用户不存在' });
        DATA.users.splice(idx, 1);
        res.json({ message: '用户删除成功' });
      });
    });
    return;
  }

  if (method === 'get' && path === '/migrations') {
    authenticateToken(req, res, () => {
      let records = DATA.migrationRecords;
      if (req.user.role !== 'admin') records = records.filter(r => r.user_id === req.user.userId);
      res.json(records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    });
    return;
  }

  if (method === 'post' && path === '/migrations') {
    authenticateToken(req, res, () => {
      const { source_platform, target_platform, data_content, status } = req.body;
      const recordId = nextIds.migrationRecords++;
      DATA.migrationRecords.push({
        id: recordId, user_id: req.user.userId,
        source_platform, target_platform, data_content,
        status: status || 'completed', created_at: new Date().toISOString()
      });
      const stat = DATA.userStats.find(s => s.user_id === req.user.userId);
      if (stat) stat.total_migrations++;
      res.json({ message: '迁移记录创建成功', id: recordId });
    });
    return;
  }

  if (method === 'delete' && path.match(/^\/migrations\/\d+$/)) {
    authenticateToken(req, res, () => {
      const id = parseInt(path.split('/')[2]);
      const idx = DATA.migrationRecords.findIndex(r =>
        r.id === id && (req.user.role === 'admin' || r.user_id === req.user.userId)
      );
      if (idx === -1) return res.status(404).json({ error: '迁移记录不存在' });
      DATA.migrationRecords.splice(idx, 1);
      res.json({ message: '迁移记录删除成功' });
    });
    return;
  }

  if (method === 'get' && path === '/configs') {
    authenticateToken(req, res, () => {
      const configs = DATA.userConfigs.filter(c => c.user_id === req.user.userId);
      const map = {};
      configs.forEach(cfg => { map[cfg.config_key] = cfg.config_value; });
      res.json(map);
    });
    return;
  }

  if (method === 'post' && path === '/configs') {
    authenticateToken(req, res, () => {
      const { config_key, config_value } = req.body;
      const existing = DATA.userConfigs.find(c => c.user_id === req.user.userId && c.config_key === config_key);
      if (existing) {
        existing.config_value = config_value;
        existing.updated_at = new Date().toISOString();
      } else {
        DATA.userConfigs.push({
          id: nextIds.userConfigs++, user_id: req.user.userId,
          config_key, config_value, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        });
      }
      res.json({ message: '配置保存成功' });
    });
    return;
  }

  if (method === 'get' && path === '/admin/stats/overview') {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        res.json({
          total_users: DATA.users.length,
          total_migrations: DATA.migrationRecords.length,
          today_pv: DATA.pageViews.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length,
          today_uv: new Set(DATA.pageViews.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).map(p => p.user_id || p.ip_address)).size
        });
      });
    });
    return;
  }

  if (method === 'get' && path === '/admin/stats/trend') {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        const grouped = {};
        DATA.pageViews.forEach(p => {
          const day = new Date(p.created_at).toISOString().slice(0, 10);
          if (!grouped[day]) grouped[day] = { date: day, page_views: 0, unique_users: new Set() };
          grouped[day].page_views++;
          if (p.user_id) grouped[day].unique_users.add(p.user_id);
        });
        const result = Object.values(grouped).map(g => ({
          date: g.date, page_views: g.page_views, unique_users: g.unique_users.size
        })).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
        res.json(result);
      });
    });
    return;
  }

  if (method === 'get' && path === '/admin/stats/platforms') {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        const platformMap = {};
        DATA.migrationRecords.forEach(r => {
          const key = `${r.source_platform} -> ${r.target_platform}`;
          platformMap[key] = (platformMap[key] || 0) + 1;
        });
        res.json(Object.entries(platformMap).map(([platform, count]) => ({ platform, count })));
      });
    });
    return;
  }

  if (method === 'get' && path === '/admin/activities') {
    authenticateToken(req, res, () => {
      isAdmin(req, res, () => {
        res.json(DATA.userActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100));
      });
    });
    return;
  }

  if (method === 'get' && path === '/health') {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
