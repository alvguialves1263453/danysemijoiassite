-- Migration: Create admin config table
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO admin_config (key, value)
VALUES ('password', 'danyadmin')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
