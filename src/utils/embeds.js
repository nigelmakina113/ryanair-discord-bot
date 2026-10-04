/**
 * Parse user-friendly Ryanair date/time input: 04/10/2026, 20:00, 04/10/2026 20:00
 */
function parseDateTime(dateStr, timeStr = null) {
  if (!dateStr) return null;
  let input = dateStr;
  if (timeStr) input = `${dateStr} ${timeStr}`;

  const patterns = [
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/,
      parse: (m) => new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), parseInt(m[4], 10), parseInt(m[5], 10))
    },
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parse: (m) => new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), 0, 0)
    },
    {
      regex: /^(\d{1,2}):(\d{2})$/,
      parse: (m) => {
        const date = new Date();
        date.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
        return date;
      }
    }
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern.regex);
    if (match) {
      const date = pattern.parse(match);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  return null;
}

function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Invalid Date";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatTime(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Invalid Time";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(isoString) {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Invalid Date";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

module.exports = { parseDateTime, formatDateTime, formatTime, formatDate };
