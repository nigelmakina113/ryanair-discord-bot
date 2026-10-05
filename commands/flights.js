const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllFlights } = require("../src/flightStore");
const { formatDateTime } = require("../src/utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flights")
    .setDescription("List active flights in the operations board"),

  async execute(interaction) {
    const flights = getAllFlights().slice(0, 10);

    if (!flights.length) {
      await interaction.reply({ content: "No flights are currently in the system.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("✈️ Active Flight Board")
      .setColor("#003DA5")
      .setDescription("Current operations overview")
      .addFields(
        ...flights.map(flight => ({
          name: `${flight.flight_number} • ${flight.origin} → ${flight.destination}`,
          value: `Status: ${flight.status || "Scheduled"}\nDeparture: ${flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A"}\nGate: ${flight.gate || "TBA"}`,
          inline: false
        }))
      );

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
