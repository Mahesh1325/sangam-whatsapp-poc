-- =======================================================
-- SANGAM WHATSAPP POC - SUPABASE POSTGRESQL SCHEMA WITH RLS
-- =======================================================

-- 1. Admin Users Table (For Secure Console Login)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 3. Member Profile Updates Log
CREATE TABLE IF NOT EXISTS member_updates (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Live WhatsApp Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user', 'admin', 'bot'
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_phone ON tickets(phone);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_chat_phone ON chat_messages(phone);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);

-- =======================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- =======================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow your backend service (using ANON or SERVICE key) to perform operations
CREATE POLICY "Allow service access to admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service access to tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service access to member_updates" ON member_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service access to chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
