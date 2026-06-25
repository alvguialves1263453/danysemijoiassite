-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (id, label) VALUES
  ('corrente', 'Corrente'),
  ('colar', 'Colar'),
  ('pulseira', 'Pulseira'),
  ('anel', 'Anel'),
  ('brinco', 'Brinco')
ON CONFLICT (id) DO NOTHING;
