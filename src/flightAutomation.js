const { EmbedBuilder } = require("discord.js");
const { getActiveFlights, getFlightById, updateFlight, recordAutomationEvent, hasAutomationEvent } = require("./flightStore");
const { formatDateTime } = require("./utils/embeds");

const RYANAIR_BLUE = "#003DA5";
const RYANAIR_YELLOW = "#FFC72C";

function minutesUntil(isoString) {
  if (!isoString) return Infinity;
  const target = new Date(isoString).getTime();
  const now = Date.now();
  return Math.floor((target - now) / 60000);
}

function getStatusAnnouncement(flight, newStatus) {
  const route = `${flight.origin} → ${flight.destination}`;
  switch (newStatus) {
    case "Check-in Open":
      return {
        title: `📋 Check-in Open | ${flight.flight_number}`,
        content: `Check-in is now open for flight ${flight.flight_number}. Route: ${route}. Please proceed to the check-in desk or use online check-in.`
      };
    case "Boarding":
      return {
        title: `🚪 Boarding | ${flight.flight_number}`,
        content: `Boarding has started for flight ${flight.flight_number}. Route: ${route}. Passengers should proceed to gate ${flight.gate || "TBA"}.`
      };
    case "Final Call":
      return {
        title: `📣 Final Call | ${flight.flight_number}`,
        content: `Final call for flight ${flight.flight_number}. Route: ${route}. Boarding closes now.`
      };
    case "Departed":
      return {
        title: `✈️ Departed | ${flight.flight_number}`,
        content: `Flight ${flight.flight_number} has departed. Route: ${route}. Thank you for flying with Ryanair.`
      };
    case "Arrived":
      return {
        title: `🛬 Arrived | ${flight.flight_number}`,
        content: `Flight ${flight.flight_number} has arrived at ${flight.destination}. Welcome to ${flight.destination}.`
      };
    default:
      return { title: `📢 ${newStatus} | ${flight.flight_number}`, content: `Flight ${flight.flight_number} is now ${newStatus}.` };
  }
}

async function sendFlightAnnouncement(client, flight, title, content) {
  const channelId = flight.announcement_channel_id;
  if (!channelId) return null;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return null;

  const embed = new EmbedBuilder()
    .setTitle(title)
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
    .setFooter({ text: "Ryanair Operations Team" });

  if (Number(flight.delay_minutes || 0) > 0) {
    embed.addFields({ name: "Delay", value: `${flight.delay_minutes} minutes`, inline: true });
  }

  return channel.send({ embeds: [embed] });
}

async function updateFlightStatus(client, flight, newStatus, options = {}) {
  const { manual = false } = options;
  if (!flight || !newStatus) return { updated: false, announcementSent: false };
  if (flight.status === newStatus) return { updated: false, announcementSent: false };

  if (!manual && hasAutomationEvent(flight.id, newStatus)) {
    return { updated: false, announcementSent: false };
  }

  const db = require("./db");
  db.prepare(`
    UPDATE flights
    SET status = ?,
        checkin_open = ?,
        checkin_open_time_iso = COALESCE(checkin_open_time_iso, ?),
        boarding_time_iso = COALESCE(boarding_time_iso, ?),
        final_call_time_iso = COALESCE(final_call_time_iso, ?),
        actual_departure_iso = COALESCE(actual_departure_iso, ?),
        actual_arrival_iso = COALESCE(actual_arrival_iso, ?),
        last_automation_status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newStatus,
    newStatus === "Check-in Open" ? 1 : (flight.checkin_open || 0),
    newStatus === "Check-in Open" ? new Date().toISOString() : (flight.checkin_open_time_iso || null),
    newStatus === "Boarding" ? new Date().toISOString() : (flight.boarding_time_iso || null),
    newStatus === "Final Call" ? new Date().toISOString() : (flight.final_call_time_iso || null),
    newStatus === "Departed" ? new Date().toISOString() : (flight.actual_departure_iso || null),
    newStatus === "Arrived" ? new Date().toISOString() : (flight.actual_arrival_iso || null),
    newStatus,
    flight.id
  );

  if (!manual) {
    recordAutomationEvent(flight.id, newStatus);
  }

  const statusMessage = getStatusAnnouncement(flight, newStatus);
  await sendFlightAnnouncement(client, { ...flight, status: newStatus }, statusMessage.title, statusMessage.content);

  return { updated: true, announcementSent: true };
}

function getNextAutomationState(flight) {
  if (!flight || !flight.departure_iso || flight.status === "Cancelled") return null;
  if (flight.status === "Arrived") return null;

  const departureMinutes = minutesUntil(flight.departure_iso);
  const arrivalMinutes = flight.scheduled_arrival_time_iso ? minutesUntil(flight.scheduled_arrival_time_iso) : Infinity;

  if (flight.status === "Scheduled" && departureMinutes <= 60 && departureMinutes > 30) return "Check-in Open";
  if (["Scheduled", "Check-in Open"].includes(flight.status) && departureMinutes <= 30 && departureMinutes > 10) return "Boarding";
  if (["Scheduled", "Check-in Open", "Boarding"].includes(flight.status) && departureMinutes <= 10 && departureMinutes > 0) return "Final Call";
  if (["Scheduled", "Check-in Open", "Boarding", "Final Call"].includes(flight.status) && departureMinutes <= 0) return "Departed";
  if (flight.status === "Departed" && arrivalMinutes <= 0) return "Arrived";

  return null;
}

function startFlightAutomation(client) {
  setInterval(async () => {
    try {
      const flights = getActiveFlights();
      for (const flight of flights) {
        const nextState = getNextAutomationState(flight);
        if (!nextState) continue;
        if (flight.status !== nextState) {
          await updateFlightStatus(client, flight, nextState, { manual: false });
        }
      }
    } catch (err) {
      console.error("[Automation Error]", err.message);
    }
  }, 60000);

  console.log("[Flight Automation] Started - checks every 60 seconds");
}

module.exports = {
  startFlightAutomation,
  getNextAutomationState,
  updateFlightStatus,
  sendFlightAnnouncement
};
