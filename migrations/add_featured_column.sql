-- Add featured column to poems table
-- Run this migration on Cloudflare D1

ALTER TABLE poems ADD COLUMN featured BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_poems_featured ON poems(featured);