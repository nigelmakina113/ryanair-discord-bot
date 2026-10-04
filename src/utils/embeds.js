const { EmbedBuilder } = require("discord.js");

/**
 * Ryanair brand colors
 */
const RYANAIR_BLUE = "#003DA5";
const RYANAIR_YELLOW = "#FFC72C";
const RYANAIR_WHITE = "#FFFFFF";

/**
 * Create a Ryanair-styled embed with blue, white, and yellow accents
 */
function createRyanairEmbed(title, description = "") {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(RYANAIR_BLUE)
    .setFooter({ text: "Ryanair Operations Bot", iconURL: "https://www.ryanair.com/ie/en/assets/images/common/ryanair-blue-logo.png" });
}

/**
 * Flight information embed
 */
function flightEmbed(flight, formatDateTime, formatTime) {
  const embed = createRyanairEmbed(`✈️ Flight ${flight.flight_number}`, "");
  
  embed.addFields(
    { name: "Route", value: `${flight.origin} → ${flight.destination}`, inline: true },
    { name: "Status", value: flight.status, inline: true },
    { name: "Aircraft", value: flight.aircraft || "N/A", inline: true },
    { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
    { name: "Arrival", value: flight.arrival_iso ? formatDateTime(flight.arrival_iso) : "N/A", inline: true },
    { name: "Gate", value: flight.gate || "Not assigned", inline: true }
  );

  if (flight.delay_minutes > 0) {
    embed.addFields({ name: "Delay", value: `${flight.delay_minutes} minutes`, inline: true });
  }

  return embed;
}

/**
 * Passenger manifest embed
 */
function manifestEmbed(flight, passengers) {
  const embed = createRyanairEmbed(`📋 Manifest - Flight ${flight.flight_number}`, `${passengers.length} passenger(s) checked in`);
  
  if (passengers.length === 0) {
    embed.addFields({ name: "Passengers", value: "No checked-in passengers yet." });
  } else {
    const passengerList = passengers
      .map(p => `${p.first_name} ${p.last_name} - Seat ${p.seat || "TBD"}`)
      .join("\n");
    embed.addFields({ name: "Passengers", value: passengerList || "None" });
  }

  return embed;
}

/**
 * Crew assignment embed
 */
function crewEmbed(flight, crew) {
  const embed = createRyanairEmbed(`👨‍✈️ Crew - Flight ${flight.flight_number}`, `${crew.length} crew member(s)`);
  
  if (crew.length === 0) {
    embed.addFields({ name: "Crew", value: "No crew assigned yet." });
  } else {
    const crewList = crew
      .map(c => `<@${c.user_id}> - ${c.role_name}${c.crew_checked_in ? " ✓ Checked In" : ""}`)
      .join("\n");
    embed.addFields({ name: "Assignments", value: crewList || "None" });
  }

  return embed;
}

/**
 * Boarding pass embed
 */
function boardingPassEmbed(passenger, flight, formatDateTime) {
  const embed = new EmbedBuilder()
    .setTitle("🎫 Boarding Pass")
    .setColor(RYANAIR_BLUE)
    .setThumbnail("https://www.ryanair.com/ie/en/assets/images/common/ryanair-blue-logo.png")
    .addFields(
      { name: "Passenger", value: `${passenger.first_name} ${passenger.last_name}`, inline: true },
      { name: "Flight", value: flight.flight_number, inline: true },
      { name: "Seat", value: passenger.seat || "TBD", inline: true },
      { name: "Route", value: `${flight.origin} → ${flight.destination}`, inline: true },
      { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
      { name: "Boarding Pass Code", value: passenger.boarding_pass_code || "PENDING", inline: true }
    )
    .setFooter({ text: "Ryanair Operations", iconURL: "https://www.ryanair.com/ie/en/assets/images/common/ryanair-blue-logo.png" });

  return embed;
}

/**
 * Staff profile embed
 */
function staffProfileEmbed(profile) {
  const ranks = ["", "Captain", "First Officer", "Crew Member", "Ground Staff"];
  const rankName = ranks[profile.rank] || "Unknown";
  
  const embed = createRyanairEmbed(`👤 ${profile.name}`, `Role: ${profile.role}`);
  embed.addFields(
    { name: "Rank", value: rankName, inline: true },
    { name: "Status", value: profile.status, inline: true }
  );

  if (profile.loa_start_iso && profile.loa_end_iso) {
    embed.addFields({ name: "Leave of Absence", value: `Active (ends ${new Date(profile.loa_end_iso).toLocaleDateString()})`, inline: false });
  }

  return embed;
}

/**
 * Announcement embed
 */
function announcementEmbed(title, content, author = "Operations Team") {
  return new EmbedBuilder()
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setColor(RYANAIR_YELLOW)
    .setFooter({ text: `Announced by ${author}` });
}

/**
 * Error embed
 */
function errorEmbed(message) {
  return new EmbedBuilder()
    .setTitle("❌ Error")
    .setDescription(message)
    .setColor("#FF0000");
}

/**
 * Success embed
 */
function successEmbed(title, message = "") {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(message)
    .setColor("#00FF00");
}

module.exports = {
  createRyanairEmbed,
  flightEmbed,
  manifestEmbed,
  crewEmbed,
  boardingPassEmbed,
  staffProfileEmbed,
  announcementEmbed,
  errorEmbed,
  successEmbed,
  RYANAIR_BLUE,
  RYANAIR_YELLOW,
  RYANAIR_WHITE
};
