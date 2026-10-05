const { EmbedBuilder } = require("discord.js");
const {
  getFlightById,
  updateFlight,
  hasAutomationEvent,
  recordAutomationEvent,
  getActiveFlights
} = require("./flightStore");
const { formatDateTime, formatTime } = require("./utils/embeds");

const RYANAIR_BLUE = "#003DA5";
const RYANAIR_YELLOW = "#FFC72C";

/**
 * Calculate minutes until a time
 */
function minutesUntil(isoString) {
  if (!isoString) return Infinity;
  const target = new Date(isoString).getTime();
  const now = new Date().getTime();
  return Math.floor((target - now) / 60000);
}

/**
 * Determine the next status for a flight
 */
function getNextStatus(flight) {
  if (!flight.departure_iso) return null;

  const minsDeparture = minutesUntil(flight.departure_iso);
  const minsArrival = flight.scheduled_arrival_time_iso ? minutesUntil(flight.scheduled_arrival_time_iso) : Infinity;

  // If the flight departed, check for arrival
  if (flight.status === "Departed") {
    if (minsArrival <= 0) {
      return "Arrived";
    }
    return null;
  }

  // If already arrived, stay arrived
  if (flight.status === "Arrived") {
    return null;
  }

  // If cancelled, don't progress
  if (flight.status === "Cancelled") {
    return null;
  }

  // Check-in should open 60 mins before departure
  if (flight.status === "Scheduled" && minsDeparture <= 60 && minsDeparture > 30) {
    return "Check-in Open";
  }

  // Boarding should start 30 mins before departure
  if (["Scheduled", "Check-in Open"].includes(flight.status) && minsDeparture <= 30 && minsDeparture > 10) {
    return "Boarding";
  }

  // Final call 10 mins before departure
  if (["Scheduled", "Check-in Open", "Boarding"].includes(flight.status) && minsDeparture <= 10 && minsDeparture > 0) {
    return "Final Call";
  }

  // Departure at scheduled time
  if (["Scheduled", "Check-in Open", "Boarding", "Final Call"].includes(flight.status) && minsDeparture <= 0) {
    return "Departed";
  }

  return null;
}

/**
 * Get announcement channel from flight record
 */
async function getAnnouncementChannel(client, flight) {
  if (!flight.announcement_channel_id) return null;
  try {
    return await client.channels.fetch(flight.announcement_channel_id);
  } catch (err) {
    console.error(`Failed to fetch announcement channel ${flight.announcement_channel_id}:`, err.message);
    return null;
  }
}

/**
 * Send a flight announcement to the channel
 */
async function sendFlightAnnouncement(client, flight, title, content, author = "Operations Team") {
  const channel = await getAnnouncementChannel(client, flight);
  if (!channel) return null;

  const embed = new EmbedBuilder()
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setColor(RYANAIR_YELLOW)
    .addFields(
      { name: "Flight", value: flight.flight_number, inline: true },
      { name: "Route", value: `${flight.origin} → ${flight.destination}`, inline: true },
      { name: "Status", value: flight.status || "Scheduled", inline: true },
      { name: "Gate", value: flight.gate || "TBA", inline: true },
      { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
      { name: "Aircraft", value: flight.aircraft || "TBC", inline: true }
    )
    .setFooter({ text: `Announced by ${author}` });

  if (Number(flight.delay_minutes) > 0) {
    embed.addFields({ name: "Delay", value: `${flight.delay_minutes} minutes`, inline: true });
  }

  try {
    return await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send announcement in channel ${flight.announcement_channel_id}:`, err.message);
    return null;
  }
}

/**
 * Create professional status update messages
 */
function getStatusAnnouncement(flight, newStatus) {
  const base = {
    title: `✈️ ${newStatus} | ${flight.flight_number}`,
    flight: flight.flight_number,
    route: `${flight.origin} → ${flight.destination}`
  };

  switch (newStatus) {
    case "Check-in Open":
      return {
        ...base,
        title: `📋 Check-in Now Open | ${flight.flight_number}`,
        content: `Check-in is now open for flight ${flight.flight_number} departing from ${flight.origin} to ${flight.destination}. Please proceed to the check-in desk or use online check-in. Gate: ${flight.gate || "TBA"}`
      };
    case "Boarding":
      return {
        ...base,
        title: `🚪 Boarding Started | ${flight.flight_number}`,
        content: `Boarding has commenced for flight ${flight.flight_number} to ${flight.destination}. All passengers should proceed to gate ${flight.gate || "TBA"} with their boarding pass and travel documents. Aircraft: ${flight.aircraft || "TBC"}`
      };
    case "Final Call":
      return {
        ...base,
        title: `📣 Final Call | ${flight.flight_number}`,
        content: `Final call for flight ${flight.flight_number}. This is the last call for passengers to board. All passengers must proceed immediately to gate ${flight.gate || "TBA"}. Doors will close shortly.`
      };
    case "Departed":
      return {
        ...base,
        title: `✈️ Departed | ${flight.flight_number}`,
        content: `Flight ${flight.flight_number} has departed from ${flight.origin} bound for ${flight.destination}. Expected arrival time: ${flight.scheduled_arrival_time_iso ? formatTime(flight.scheduled_arrival_time_iso) : "TBC"}`
      };
    case "Arrived":
      return {
        ...base,
        title: `🛬 Arrived | ${flight.flight_number}`,
        content: `Flight ${flight.flight_number} has arrived at ${flight.destination}. Thank you for flying with Ryanair. Please follow crew instructions when deplaning.`
      };
    default:
      return {
        ...base,
        title: `📢 Status Update | ${flight.flight_number}`,
        content: `Flight ${flight.flight_number} status has been updated to: ${newStatus}`
      };
  }
}

/**
 * Update flight status and post announcement
 */
async function updateFlightStatus(client, flight, newStatus, options = {}) {
  const { manual = false } = options;

  // Check if already at this status
  if (flight.status === newStatus) {
    return { updated: false, announcementSent: false };
  }

  // Check if this event was already triggered (prevent duplicates on restart)
  if (!manual && hasAutomationEvent(flight.id, newStatus)) {
    return { updated: false, announcementSent: false };
  }

  // Update database
  const announcement = getStatusAnnouncement(flight, newStatus);
  updateFlight(flight.id, {
    status: newStatus,
    last_automation_status: newStatus,
    updated_at: new Date().toISOString()
  });

  // Record automation event (unless manual)
  if (!manual) {
    recordAutomationEvent(flight.id, newStatus);
  }

  // Post announcement
  await sendFlightAnnouncement(client, { ...flight, status: newStatus }, announcement.title, announcement.content);

  return { updated: true, announcementSent: true };
}

/**
 * Main automation loop - checks active flights every 60 seconds
 */
function startFlightAutomation(client) {
  setInterval(async () => {
    try {
      const flights = getActiveFlights();

      for (const flight of flights) {
        const nextStatus = getNextStatus(flight);

        if (nextStatus && nextStatus !== flight.status) {
          console.log(`[Automation] Flight ${flight.flight_number}: ${flight.status} -> ${nextStatus}`);
          await updateFlightStatus(client, flight, nextStatus, { manual: false });
        }
      }
    } catch (err) {
      console.error("[Automation Error]", err.message);
    }
  }, 60000); // Run every 60 seconds

  console.log("[Flight Automation] Started - checks every 60 seconds");
}

module.exports = {
  startFlightAutomation,
  updateFlightStatus,
  sendFlightAnnouncement,
  getStatusAnnouncement,
  getNextStatus,
  getAnnouncementChannel,
  minutesUntil
};
