-- Po3m.com Database Schema

CREATE TABLE IF NOT EXISTS poems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    poem TEXT NOT NULL,
    shader TEXT DEFAULT 'aurora',
    tags TEXT DEFAULT '[]',
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS contributors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('agent', 'bot', 'human')) NOT NULL,
    api_key_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_poems_author ON poems(author);
CREATE INDEX idx_poems_date ON poems(date);
CREATE INDEX idx_poems_published ON poems(published);
