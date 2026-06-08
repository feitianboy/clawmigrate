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
  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建用户表失败:', err);
    } else {
      console.log('✅ 用户表已就绪');
    }
  });

  // 创建迁移数据记录表
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
    if (err) {
      console.error('创建迁移记录表失败:', err);
    } else {
      console.log('✅ 迁移记录表已就绪');
    }
  });

  // 创建用户配置表
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
    if (err) {
      console.error('创建用户配置表失败:', err);
    } else {
      console.log('✅ 用户配置表已就绪');
      // 插入默认管理员账号
      insertDefaultAdmin();
    }
  });
}

function insertDefaultAdmin() {
  const defaultUsername = 'admin';
  const defaultEmail = 'admin@clawmigrate.com';
  const defaultPassword = 'admin123';
  
  checkUserExists(defaultUsername, (exists) => {
    if (!exists) {
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [defaultUsername, defaultEmail, hashedPassword, 'admin'],
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
    }
  });
}

function checkUserExists(username, callback) {
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    callback(!!row);
  });
}

module.exports = db;
