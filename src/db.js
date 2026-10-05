const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "bot.db"));
db.pragma("journal_mode = WAL");

function tableExists(name) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  return Boolean(row);
}

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(column => column.name === columnName);
}

function addColumnIfMissing(tableName, columnDefinition) {
  const columnName = columnDefinition.trim().split(/\s+/)[0];
  if (!columnExists(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
  }
}

const schema = `
CREATE TABLE IF NOT EXISTS flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_number TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_iso TEXT,
  arrival_iso TEXT,
  scheduled_arrival_time_iso TEXT,
  aircraft TEXT,
  gate TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  checkin_open INTEGER NOT NULL DEFAULT 0,
  checkin_time_iso TEXT,
  checkin_open_time_iso TEXT,
  boarding_time_iso TEXT,
  final_call_time_iso TEXT,
  actual_departure_iso TEXT,
  actual_arrival_iso TEXT,
  automation_enabled INTEGER NOT NULL DEFAULT 1,
  last_automation_status TEXT,
  event_url TEXT,
  announcement_channel_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flight_automation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(flight_id, event_name)
);
`;

db.exec(schema);

if (tableExists("flights")) {
  addColumnIfMissing("flights", "scheduled_arrival_time_iso TEXT");
  addColumnIfMissing("flights", "checkin_open_time_iso TEXT");
  addColumnIfMissing("flights", "boarding_time_iso TEXT");
  addColumnIfMissing("flights", "final_call_time_iso TEXT");
  addColumnIfMissing("flights", "actual_departure_iso TEXT");
  addColumnIfMissing("flights", "actual_arrival_iso TEXT");
  addColumnIfMissing("flights", "automation_enabled INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing("flights", "last_automation_status TEXT");
  addColumnIfMissing("flights", "announcement_channel_id TEXT");
}

module.exports = db;
