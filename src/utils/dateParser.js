/**
 * Parse user-friendly date/time formats into ISO 8601 strings
 * Accepts formats like: 04/10/2026, 20:00, 04/10/2026 20:00
 */
function parseDateTime(dateStr, timeStr = null) {
  if (!dateStr) return null;

  let fullString = dateStr;
  if (timeStr) {
    fullString = `${dateStr} ${timeStr}`;
  }

  // Regex patterns for various formats
  const patterns = [
    // DD/MM/YYYY HH:MM or D/M/YYYY H:M
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/,
      parse: (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]))
    },
    // DD/MM/YYYY or D/M/YYYY (defaults to 00:00)
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parse: (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), 0, 0)
    },
    // HH:MM or H:M (assumes today)
    {
      regex: /^(\d{1,2}):(\d{2})$/,
      parse: (m) => {
        const today = new Date();
        today.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0);
        return today;
      }
    }
  ];

  for (const pattern of patterns) {
    const match = fullString.match(pattern.regex);
    if (match) {
      const date = pattern.parse(match);
      // Validate the date
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null; // Invalid format
}

/**
 * Convert ISO 8601 string to readable format (e.g., "04/10/2026 20:00")
 */
function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format ISO time to just time (HH:MM)
 */
function formatTime(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Time";
  
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${hours}:${minutes}`;
}

/**
 * Format ISO date to just date (DD/MM/YYYY)
 */
function formatDate(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

module.exports = {
  parseDateTime,
  formatDateTime,
  formatTime,
  formatDate
};
