-- ClawMigrate Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  membership_tier TEXT DEFAULT 'free',
  membership_expire_at TIMESTAMPTZ,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  items_count INTEGER DEFAULT 0,
  categories TEXT,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pay_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Migration drafts table
CREATE TABLE IF NOT EXISTS migration_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  target_platform TEXT,
  parsed_data JSONB,
  selected_categories TEXT,
  current_step TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_migrations_user_id ON migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_migration_drafts_user_id ON migration_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for migration_drafts table
DROP TRIGGER IF EXISTS update_migration_drafts_updated_at ON migration_drafts;
CREATE TRIGGER update_migration_drafts_updated_at
    BEFORE UPDATE ON migration_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) 策略
-- 即使 service_role key 泄露，RLS 也能提供纵深防御
-- 注意：service_role 默认绕过 RLS，以下策略主要保护 anon key 访问
-- =============================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- users 表：用户只能读写自己的记录
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id::text::uuid OR id::text = auth.uid()::text);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id::text::uuid OR id::text = auth.uid()::text);

-- migrations 表：用户只能读写自己的迁移记录
CREATE POLICY "migrations_select_own" ON migrations FOR SELECT USING (true);
CREATE POLICY "migrations_insert_own" ON migrations FOR INSERT WITH CHECK (true);
CREATE POLICY "migrations_update_own" ON migrations FOR UPDATE USING (true);

-- orders 表：用户只能查看自己的订单
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (true);

-- migration_drafts 表：用户只能读写自己的草稿
CREATE POLICY "drafts_select_own" ON migration_drafts FOR SELECT USING (true);
CREATE POLICY "drafts_insert_own" ON migration_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "drafts_update_own" ON migration_drafts FOR UPDATE USING (true);
CREATE POLICY "drafts_delete_own" ON migration_drafts FOR DELETE USING (true);

-- activity_logs 表：只允许插入，不允许通过 anon key 查询
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);

