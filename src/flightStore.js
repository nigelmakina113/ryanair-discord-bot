const db = require("./db");

/**
 * Get a single flight by ID
 */
function getFlightById(id) {
  return db.prepare("SELECT * FROM flights WHERE id = ?").get(id);
}

/**
 * Get a flight by flight number
 */
function getFlightByNumber(flightNumber) {
  return db.prepare("SELECT * FROM flights WHERE flight_number = ?").get(flightNumber);
}

/**
 * Get the latest flight
 */
function getLatestFlight() {
  return db.prepare("SELECT * FROM flights ORDER BY id DESC LIMIT 1").get();
}

/**
 * Get all flights
 */
function getAllFlights() {
  return db.prepare("SELECT * FROM flights ORDER BY id DESC").all();
}

/**
 * Get active flights (scheduled, check-in, boarding, final call, departed)
 */
function getActiveFlights() {
  return db.prepare("SELECT * FROM flights WHERE status IN (?, ?, ?, ?, ?) AND automation_enabled = 1 ORDER BY departure_iso ASC").all(
    "Scheduled",
    "Check-in Open",
    "Boarding",
    "Final Call",
    "Departed"
  );
}

/**
 * Create a new flight
 */
function createFlight(data) {
  const {
    flight_number,
    origin,
    destination,
    departure_iso,
    scheduled_arrival_time_iso,
    arrival_iso,
    aircraft,
    gate,
    status,
    delay_minutes,
    checkin_open,
    automation_enabled,
    announcement_channel_id
  } = data;

  const result = db.prepare(`
    INSERT INTO flights (
      flight_number, origin, destination, departure_iso, scheduled_arrival_time_iso, arrival_iso,
      aircraft, gate, status, delay_minutes, checkin_open, automation_enabled, announcement_channel_id,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    flight_number, origin, destination, departure_iso, scheduled_arrival_time_iso, arrival_iso,
    aircraft, gate, status || "Scheduled", delay_minutes || 0, checkin_open || 0,
    automation_enabled !== undefined ? automation_enabled : 1, announcement_channel_id || null
  );

  return getFlightById(result.lastInsertRowid);
}

/**
 * Update flight fields
 */
function updateFlight(id, data) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id") {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getFlightById(id);

  values.push(id);
  const query = `UPDATE flights SET ${fields.join(", ")} WHERE id = ?`;
  db.prepare(query).run(...values);
  return getFlightById(id);
}

/**
 * Record an automation event to prevent duplicates
 */
function recordAutomationEvent(flightId, eventName) {
  try {
    db.prepare(`
      INSERT INTO flight_automation_events (flight_id, event_name, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(flightId, eventName);
    return true;
  } catch (err) {
    // Event already exists
    return false;
  }
}

/**
 * Check if automation event was already recorded
 */
function hasAutomationEvent(flightId, eventName) {
  const row = db.prepare(`
    SELECT id FROM flight_automation_events WHERE flight_id = ? AND event_name = ?
  `).get(flightId, eventName);
  return Boolean(row);
}

module.exports = {
  getFlightById,
  getFlightByNumber,
  getLatestFlight,
  getAllFlights,
  getActiveFlights,
  createFlight,
  updateFlight,
  recordAutomationEvent,
  hasAutomationEvent
};
