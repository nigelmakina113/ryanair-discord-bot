const { SlashCommandBuilder } = require("discord.js");
const { getFlightByNumber, createFlight } = require("../src/flightStore");
const { canUseControlPanel } = require("../src/flightControlPanel");
const { parseDateTime } = require("../src/utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addflight")
    .setDescription("Add a new flight to the Ryanair operations system")
    .addStringOption(option =>
      option.setName("flight_number").setDescription("Flight number, e.g. FR123").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("origin").setDescription("Departure airport code").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("destination").setDescription("Destination airport code").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("departure").setDescription("Scheduled departure (DD/MM/YYYY HH:MM)").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("arrival").setDescription("Scheduled arrival (DD/MM/YYYY HH:MM)").setRequired(false)
    )
    .addStringOption(option =>
      option.setName("aircraft").setDescription("Aircraft type or registration").setRequired(false)
    )
    .addStringOption(option =>
      option.setName("gate").setDescription("Gate assignment").setRequired(false)
    ),

  async execute(interaction) {
    if (!canUseControlPanel(interaction.member)) {
      await interaction.reply({
        content: "❌ You need Manage Events or Manage Guild permission to add flights.",
        ephemeral: true
      });
      return;
    }

    const flightNumber = interaction.options.getString("flight_number", true).trim().toUpperCase();
    const origin = interaction.options.getString("origin", true).trim().toUpperCase();
    const destination = interaction.options.getString("destination", true).trim().toUpperCase();
    const departureInput = interaction.options.getString("departure", true);
    const arrivalInput = interaction.options.getString("arrival");
    const aircraft = interaction.options.getString("aircraft") || "TBC";
    const gate = interaction.options.getString("gate") || "TBA";

    const departureIso = parseDateTime(departureInput);
    if (!departureIso) {
      await interaction.reply({ content: "❌ Invalid departure time. Use `DD/MM/YYYY HH:MM` or `HH:MM`.", ephemeral: true });
      return;
    }

    const arrivalIso = arrivalInput ? parseDateTime(arrivalInput) : null;
    if (getFlightByNumber(flightNumber)) {
      await interaction.reply({ content: `⚠️ Flight ${flightNumber} already exists.`, ephemeral: true });
      return;
    }

    const flight = createFlight({
      flight_number: flightNumber,
      origin,
      destination,
      departure_iso: departureIso,
      scheduled_arrival_time_iso: arrivalIso,
      arrival_iso: arrivalIso,
      aircraft,
      gate,
      status: "Scheduled",
      delay_minutes: 0,
      checkin_open: 0,
      automation_enabled: 1,
      announcement_channel_id: interaction.channelId
    });

    await interaction.reply({
      content: `✅ Flight ${flight.flight_number} has been created and is ready for automation.`,
      ephemeral: false
    });
  }
};
