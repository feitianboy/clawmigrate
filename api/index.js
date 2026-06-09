const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const svgCaptcha = require('svg-captcha');
const db = require('./db/init-db');

const app = express();
const JWT_SECRET = 'clawmigrate-secret-key-2024';

// 中间件
const corsOptions = {
  origin: ['https://feitianboy.github.io', 'http://localhost:3000', 'https://clawmigrate.vercel.app'],
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

      db.run(
        'UPDATE verification_codes SET used = 1 WHERE id = ?',
        [record.id],
        () => {
          db.get(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email],
            (err, user) => {
              if (err) {
                return res.status(500).json({ error: '注册失败' });
              }

              if (user) {
                return res.status(400).json({ error: '用户名或邮箱已被使用' });
              }

              const hashedPassword = bcrypt.hashSync(password, 10);
              db.run(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword],
                function (err) {
                  if (err) {
                    return res.status(500).json({ error: '注册失败' });
                  }

                  db.run(
                    'INSERT INTO user_stats (user_id) VALUES (?)',
                    [this.lastID],
                    () => {
                      const token = jwt.sign(
                        { userId: this.lastID, username, role: 'user' },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                      );
                      res.json({
                        message: '注册成功',
                        token,
                        user: { id: this.lastID, username, email, role: 'user' }
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      db.run(
        'UPDATE user_stats SET last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [user.id],
        () => {}
      );

      res.json({
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
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

// 更新用户信息
app.put('/api/auth/me', authenticateToken, (req, res) => {
  const { username, email, password } = req.body;
  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  if (password) {
    updates.push('password = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  params.push(req.user.userId);

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  db.run(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: '更新失败' });
      }
      res.json({ message: '更新成功' });
    }
  );
});

// 获取验证码
app.get('/api/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0oO1IlI',
    noise: 3,
    color: true,
    background: '#1a1a2e'
  });
  req.session = req.session || {};
  req.session.captcha = captcha.text.toLowerCase();
  
  res.type('svg');
  res.send(captcha.data);
});

// 发送邮箱验证码
app.post('/api/auth/send-email-code', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  db.run(
    'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
    [email, code, 'email', expiresAt.toISOString()],
    (err) => {
      if (err) {
        return res.status(500).json({ error: '发送失败' });
      }

      console.log(`📧 验证码发送到 ${email}: ${code}`);
      res.json({ 
        message: '演示模式：验证码已显示在服务端日志',
        demoCode: code 
      });
    }
  );
});

// ==================== 管理员相关 API ====================

// 获取用户列表
app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: '获取用户列表失败' });
    }
    res.json(users);
  });
});

// 获取单个用户
app.get('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  db.get(
    'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
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
  const updates = [];
  const params = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  if (role) {
    updates.push('role = ?');
    params.push(role);
  }
  params.push(req.params.id);

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  db.run(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: '更新失败' });
      }
      res.json({ message: '更新成功' });
    }
  );
});

// 删除用户
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: '删除失败' });
    }
    res.json({ message: '删除成功' });
  });
});

// ==================== 数据统计 API ====================

// 获取统计数据
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as total FROM users', (err, row) => {
    stats.totalUsers = row?.total || 0;

    db.get('SELECT COUNT(*) as total FROM migration_records', (err, row) => {
      stats.totalMigrations = row?.total || 0;

      db.get(`SELECT COUNT(DISTINCT session_id) as uv FROM page_views WHERE DATE(created_at) = DATE('now')`, (err, row) => {
        stats.todayUV = row?.uv || 0;

        db.get(`SELECT COUNT(*) as pv FROM page_views WHERE DATE(created_at) = DATE('now')`, (err, row) => {
          stats.todayPV = row?.pv || 0;

          db.all(`SELECT DATE(created_at) as date, COUNT(*) as count FROM page_views GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7`, (err, rows) => {
            stats.trend = rows || [];

            db.all(`SELECT source_platform, COUNT(*) as count FROM migration_records GROUP BY source_platform`, (err, rows) => {
              stats.platforms = rows || [];

              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// 获取用户活动日志
app.get('/api/admin/activities', authenticateToken, isAdmin, (req, res) => {
  db.all(`
    SELECT ua.*, u.username 
    FROM user_activities ua 
    LEFT JOIN users u ON ua.user_id = u.id 
    ORDER BY ua.created_at DESC 
    LIMIT 50
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取活动日志失败' });
    }
    res.json(rows);
  });
});

// ==================== 迁移记录 API ====================

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

      db.run(
        'UPDATE user_stats SET total_migrations = total_migrations + 1 WHERE user_id = ?',
        [req.user.userId],
        () => {}
      );

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
    res.json({ message: '删除成功' });
  });
});

// ==================== 页面路由 ====================

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Vercel Serverless 兼容
module.exports = app;

// 本地开发启动
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 ClawMigrate 服务已启动 http://localhost:${PORT}`);
  });
}