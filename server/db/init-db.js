const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'clawmigrate.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('✅ 已连接到 SQLite 数据库');
    initTables();
  }
});

function initTables() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('创建用户表失败:', err);
  });

  // 迁移记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS migration_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      source_platform TEXT NOT NULL,
      target_platform TEXT NOT NULL,
      data_content TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建迁移记录表失败:', err);
  });

  // 用户配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      config_key TEXT NOT NULL,
      config_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, config_key)
    )
  `, (err) => {
    if (err) console.error('创建用户配置表失败:', err);
  });

  // 验证码存储表
  db.run(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'email',
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('创建验证码表失败:', err);
  });

  // 访问统计表
  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      page_url TEXT,
      referrer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建访问统计表失败:', err);
  });

  // 用户行为轨迹表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建用户行为轨迹表失败:', err);
  });

  // 用户使用统计表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      total_migrations INTEGER DEFAULT 0,
      total_page_views INTEGER DEFAULT 0,
      last_active_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('创建用户使用统计表失败:', err);
  });

  // 插入默认管理员
  setTimeout(insertDefaultAdmin, 500);
}

function insertDefaultAdmin() {
  const checkSql = 'SELECT id FROM users WHERE username = ?';
  db.get(checkSql, ['admin'], (err, row) => {
    if (err) {
      console.error('检查管理员失败:', err);
      return;
    }
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@clawmigrate.com', hashedPassword, 'admin'],
        (err) => {
          if (err) {
            console.error('创建默认管理员失败:', err);
          } else {
            console.log('✅ 默认管理员已创建');
            console.log('   账号: admin');
            console.log('   密码: admin123');
          }
        }
      );
    } else {
      console.log('✅ 默认管理员已存在');
    }
  });
}

module.exports = db;
