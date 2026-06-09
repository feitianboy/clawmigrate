const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const svgCaptcha = require('svg-captcha');
const db = require('./db/init-db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'clawmigrate-secret-key-2024';

// 中间件
const corsOptions = {
  origin: ['https://feitianboy.github.io', 'http://localhost:3000', 'https://clawmigrate-api.onrender.com'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的 token' });
    }
    req.user = user;
    next();
  });
}

// 管理员认证中间件
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// ==================== 用户认证相关 API ====================

// 用户注册
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, emailCode } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  if (!emailCode) {
    return res.status(400).json({ error: '请输入邮箱验证码' });
  }

  // 验证邮箱验证码
  db.get(
    'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
    [email, emailCode, 'email'],
    (err, record) => {
      if (err) {
        return res.status(500).json({ error: '注册失败' });
      }

      if (!record) {
        return res.status(400).json({ error: '验证码错误或已过期' });
      }

      const now = new Date();
      const expiresAt = new Date(record.expires_at);

      if (now > expiresAt) {
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
      }

      // 标记验证码已使用
      db.run('UPDATE verification_codes SET used = 1 WHERE id = ?', [record.id]);

      // 创建用户
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, 'user'],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: '用户名或邮箱已存在' });
            }
            return res.status(500).json({ error: '注册失败' });
          }

          const userId = this.lastID;

          // 创建用户统计
          db.run('INSERT INTO user_stats (user_id) VALUES (?)', [userId]);

          const token = jwt.sign(
            { userId, username, role: 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.json({ 
            message: '注册成功', 
            token, 
            user: { id: userId, username, email, role: 'user' } 
          });
        }
      );
    }
  );
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    }
  );
});

// ==================== 验证码 API ====================

// 生成图形验证码
app.get('/api/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    inverse: false,
    backgroundColor: '#1e293b',
    fontSize: 48,
    width: 120,
    height: 40,
    noise: 5,
    charPreset: '1234567890ABCDEFGHJKLMNPQRSTUVWXYZ'
  });
  
  const sessionId = req.ip + '-' + Date.now();
  res.json({
    captchaId: sessionId,
    captcha: captcha.data
  });
});

// 发送邮箱验证码
app.post('/api/auth/send-email-code', (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }
  
  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  
  // 存储验证码
  db.run(
    'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
    [email, code, 'email', expiresAt],
    (err) => {
      if (err) {
        console.error('存储验证码失败:', err);
        return res.status(500).json({ error: '发送验证码失败' });
      }
      
      // 这里可以集成真实的邮件发送服务
      // 目前模拟发送成功，实际使用时需要配置邮件服务
      console.log(`📧 邮箱验证码已生成: ${email} -> ${code}`);
      
      res.json({ 
        message: '验证码已发送到您的邮箱',
        // 演示模式下直接返回验证码（开发环境）
        // 实际使用时应该删除这行
        code: code 
      });
    }
  );
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.json(user);
    }
  );
});

// ==================== 用户管理 API（管理员） ====================

// 获取所有用户列表
app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
  db.all(
    'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC',
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: '获取用户列表失败' });
      }
      res.json(users);
    }
  );
});

// 获取单个用户详情
app.get('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  db.get(
    'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
    [req.params.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.json(user);
    }
  );
});

// 更新用户
app.put('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  const { username, email, role } = req.body;
  const updateFields = ['updated_at = CURRENT_TIMESTAMP'];
  const params = [];

  if (username) {
    updateFields.push('username = ?');
    params.push(username);
  }
  if (email) {
    updateFields.push('email = ?');
    params.push(email);
  }
  if (role) {
    updateFields.push('role = ?');
    params.push(role);
  }

  params.push(req.params.id);

  db.run(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: '更新用户失败' });
      }
      res.json({ message: '用户更新成功' });
    }
  );
});

// 删除用户
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: '删除用户失败' });
    }
    res.json({ message: '用户删除成功' });
  });
});

// ==================== 数据管理 API ====================

// 获取迁移记录
app.get('/api/migrations', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM migration_records';
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' WHERE user_id = ?';
    params.push(req.user.userId);
  }
  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, records) => {
    if (err) {
      return res.status(500).json({ error: '获取迁移记录失败' });
    }
    res.json(records);
  });
});

// 创建迁移记录
app.post('/api/migrations', authenticateToken, (req, res) => {
  const { source_platform, target_platform, data_content, status } = req.body;

  db.run(
    'INSERT INTO migration_records (user_id, source_platform, target_platform, data_content, status) VALUES (?, ?, ?, ?, ?)',
    [req.user.userId, source_platform, target_platform, data_content, status || 'completed'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: '创建迁移记录失败' });
      }
      res.json({ message: '迁移记录创建成功', id: this.lastID });
    }
  );
});

// 删除迁移记录
app.delete('/api/migrations/:id', authenticateToken, (req, res) => {
  let query = 'DELETE FROM migration_records WHERE id = ?';
  const params = [req.params.id];

  if (req.user.role !== 'admin') {
    query += ' AND user_id = ?';
    params.push(req.user.userId);
  }

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: '删除迁移记录失败' });
    }
    res.json({ message: '迁移记录删除成功' });
  });
});

// 获取用户配置
app.get('/api/configs', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM user_configs WHERE user_id = ?',
    [req.user.userId],
    (err, configs) => {
      if (err) {
        return res.status(500).json({ error: '获取配置失败' });
      }
      const configMap = {};
      configs.forEach(cfg => {
        configMap[cfg.config_key] = cfg.config_value;
      });
      res.json(configMap);
    }
  );
});

// 保存用户配置
app.post('/api/configs', authenticateToken, (req, res) => {
  const { config_key, config_value } = req.body;

  db.run(
    `INSERT OR REPLACE INTO user_configs (user_id, config_key, config_value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [req.user.userId, config_key, config_value],
    function (err) {
      if (err) {
        return res.status(500).json({ error: '保存配置失败' });
      }
      res.json({ message: '配置保存成功' });
    }
  );
});

// ==================== 管理后台页面 ====================

// 管理后台首页
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 ClawMigrate 后端服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📊 API 文档说明:`);
  console.log(`   - /api/auth/* - 用户认证接口`);
  console.log(`   - /api/admin/* - 管理后台接口（需管理员权限）`);
  console.log(`   - /api/migrations - 迁移记录管理`);
  console.log(`   - /admin - 管理后台页面`);
  console.log(`\n👤 默认管理员账号:`);
  console.log(`   - 用户名: admin`);
  console.log(`   - 密码: admin123`);
});
