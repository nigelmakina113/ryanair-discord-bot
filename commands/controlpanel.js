const { SlashCommandBuilder } = require("discord.js");
const { getFlightByNumber, getLatestFlight } = require("../src/flightStore");
const { buildControlPanel, canUseControlPanel } = require("../src/flightControlPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("controlpanel")
    .setDescription("Open the Ryanair staff flight control panel")
    .addStringOption(option =>
      option.setName("flight_number").setDescription("Flight number to control").setRequired(false)
    ),

  async execute(interaction) {
    if (!canUseControlPanel(interaction.member)) {
      await interaction.reply({
        content: "❌ You need Manage Events or Manage Guild permission to use the control panel.",
        ephemeral: true
      });
      return;
    }

    const flightNumber = interaction.options.getString("flight_number");
    const flight = flightNumber ? getFlightByNumber(flightNumber.toUpperCase()) : getLatestFlight();

    if (!flight) {
      await interaction.reply({ content: "❌ No matching flight found. Use /addflight first.", ephemeral: true });
      return;
    }

    const panel = buildControlPanel(flight);
    await interaction.reply({ embeds: [panel.embed], components: panel.components, ephemeral: false });
  }
};
