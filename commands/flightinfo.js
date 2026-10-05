const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getFlightByNumber, getLatestFlight, getAllFlights } = require("../src/flightStore");
const { formatDateTime } = require("../src/utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flightinfo")
    .setDescription("View a flight record")
    .addStringOption(option =>
      option.setName("flight_number").setDescription("Flight number to look up").setRequired(false)
    ),

  async execute(interaction) {
    const flightNumber = interaction.options.getString("flight_number");
    const flight = flightNumber ? getFlightByNumber(flightNumber.toUpperCase()) : getLatestFlight();

    if (!flight) {
      await interaction.reply({ content: "❌ No flight found. Create one with /addflight first.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`✈️ Flight ${flight.flight_number}`)
      .setColor("#003DA5")
      .addFields(
        { name: "Route", value: `${flight.origin} → ${flight.destination}`, inline: true },
        { name: "Status", value: flight.status || "Scheduled", inline: true },
        { name: "Gate", value: flight.gate || "TBA", inline: true },
        { name: "Aircraft", value: flight.aircraft || "TBC", inline: true },
        { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
        { name: "Arrival", value: flight.scheduled_arrival_time_iso ? formatDateTime(flight.scheduled_arrival_time_iso) : (flight.arrival_iso ? formatDateTime(flight.arrival_iso) : "N/A"), inline: true },
        { name: "Delay", value: `${flight.delay_minutes || 0} minutes`, inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
