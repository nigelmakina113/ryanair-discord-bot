const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const RYANAIR_BLUE = "#003DA5";
const RYANAIR_YELLOW = "#FFC72C";
const RYANAIR_WHITE = "#FFFFFF";

function createRyanairEmbed(title, description = "") {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(RYANAIR_BLUE)
    .setFooter({ text: "Ryanair Operations Bot", iconURL: "https://www.ryanair.com/ie/en/assets/images/common/ryanair-blue-logo.png" });
}

function flightEmbed(flight, formatDateTime) {
  const embed = createRyanairEmbed(`✈️ Flight ${flight.flight_number}`);
  embed.addFields(
    { name: "Route", value: `${flight.origin} → ${flight.destination}`, inline: true },
    { name: "Status", value: flight.status || "Scheduled", inline: true },
    { name: "Aircraft", value: flight.aircraft || "N/A", inline: true },
    { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
    { name: "Arrival", value: flight.arrival_iso ? formatDateTime(flight.arrival_iso) : "N/A", inline: true },
    { name: "Gate", value: flight.gate || "Not assigned", inline: true }
  );
  if (Number(flight.delay_minutes) > 0) {
    embed.addFields({ name: "Delay", value: `${flight.delay_minutes} minutes`, inline: true });
  }
  return embed;
}

function successEmbed(title, description = "") {
  return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(description).setColor("#00A651");
}

function errorEmbed(description) {
  return new EmbedBuilder().setTitle("❌ Error").setDescription(description).setColor("#D62828");
}

function announcementEmbed(title, content, author = "Operations Team") {
  return new EmbedBuilder()
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setColor(RYANAIR_YELLOW)
    .setFooter({ text: `Announced by ${author}` });
}

function buildFlightPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("view_flights").setLabel("View Flights").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("check_in").setLabel("Check In").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("boarding_pass").setLabel("Boarding Pass").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("flight_info").setLabel("Flight Information").setStyle(ButtonStyle.Secondary)
  );

  return row;
}

module.exports = {
  createRyanairEmbed,
  flightEmbed,
  successEmbed,
  errorEmbed,
  announcementEmbed,
  buildFlightPanel,
  RYANAIR_BLUE,
  RYANAIR_YELLOW,
  RYANAIR_WHITE
};
