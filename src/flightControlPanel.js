const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getFlightById, updateFlight } = require("./flightStore");
const { updateFlightStatus, sendFlightAnnouncement } = require("./flightAutomation");
const { formatDateTime } = require("./utils/embeds");

function canUseControlPanel(member) {
  if (!member) return false;
  if (member.permissions && (member.permissions.has("ManageEvents") || member.permissions.has("ManageGuild"))) {
    return true;
  }

  const configured = (process.env.FLIGHT_MANAGEMENT_ROLE || "Operations").toLowerCase();
  if (member.roles && member.roles.cache) {
    return member.roles.cache.some(role => {
      const name = role.name.toLowerCase();
      return name === configured || name.includes("operations") || name.includes("ground") || name.includes("staff");
    });
  }

  return false;
}

function buildControlPanel(flight) {
  const embed = new EmbedBuilder()
    .setTitle(`🛫 ${flight.flight_number} • Staff Control Panel`)
    .setColor("#003DA5")
    .setDescription(`${flight.origin} → ${flight.destination}`)
    .addFields(
      { name: "Status", value: flight.status || "Scheduled", inline: true },
      { name: "Gate", value: flight.gate || "TBA", inline: true },
      { name: "Aircraft", value: flight.aircraft || "TBC", inline: true },
      { name: "Departure", value: flight.departure_iso ? formatDateTime(flight.departure_iso) : "N/A", inline: true },
      { name: "Automation", value: flight.automation_enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
      { name: "Delay", value: `${flight.delay_minutes || 0} min`, inline: true }
    )
    .setFooter({ text: "Operations Team" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:checkin_open:${flight.id}`).setLabel("Open Check-in").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ctrl:checkin_close:${flight.id}`).setLabel("Close Check-in").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ctrl:boarding_start:${flight.id}`).setLabel("Start Boarding").setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:final_call:${flight.id}`).setLabel("Final Call").setStyle(ButtonStyle.Warning),
    new ButtonBuilder().setCustomId(`ctrl:delay:${flight.id}`).setLabel("Delay Flight").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ctrl:gate:${flight.id}`).setLabel("Change Gate").setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:aircraft:${flight.id}`).setLabel("Change Aircraft").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ctrl:cancel:${flight.id}`).setLabel("Cancel Flight").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ctrl:departed:${flight.id}`).setLabel("Mark Departed").setStyle(ButtonStyle.Success)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:arrived:${flight.id}`).setLabel("Mark Arrived").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ctrl:auto_on:${flight.id}`).setLabel("Enable Automation").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ctrl:auto_off:${flight.id}`).setLabel("Disable Automation").setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2, row3, row4] };
}

async function handleControlPanelAction(interaction, client) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("ctrl:")) return false;

  if (!canUseControlPanel(interaction.member)) {
    await interaction.reply({
      content: "❌ You are not authorized to use the flight control panel. Requires Manage Events or Manage Guild.",
      ephemeral: true
    });
    return true;
  }

  const [, action, rawFlightId] = interaction.customId.split(":");
  const flight = getFlightById(Number(rawFlightId));
  if (!flight) {
    await interaction.reply({ content: "❌ Flight not found.", ephemeral: true });
    return true;
  }

  try {
    switch (action) {
      case "checkin_open": {
        await updateFlightStatus(client, flight, "Check-in Open", { manual: true });
        await interaction.reply({ content: `✅ Check-in opened for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      case "checkin_close": {
        updateFlight(flight.id, { status: "Scheduled", checkin_open: 0, updated_at: new Date().toISOString() });
        await sendFlightAnnouncement(client, { ...flight, status: "Scheduled" }, "📋 Check-in Closed", `Check-in for flight ${flight.flight_number} is now closed.`);
        await interaction.reply({ content: `✅ Check-in closed for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      case "boarding_start": {
        await updateFlightStatus(client, flight, "Boarding", { manual: true });
        await interaction.reply({ content: `✅ Boarding started for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      case "final_call": {
        await updateFlightStatus(client, flight, "Final Call", { manual: true });
        await interaction.reply({ content: `✅ Final call started for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      case "delay": {
        const nextDelay = (Number(flight.delay_minutes) || 0) + 15;
        updateFlight(flight.id, { delay_minutes: nextDelay, updated_at: new Date().toISOString() });
        await sendFlightAnnouncement(client, { ...flight, delay_minutes: nextDelay }, `⏰ Delay Update | ${flight.flight_number}`, `Flight ${flight.flight_number} has been delayed by 15 minutes.`);
        await interaction.reply({ content: `✅ ${flight.flight_number} delayed by 15 minutes.`, ephemeral: true });
        return true;
      }
      case "gate": {
        const nextGate = (flight.gate && flight.gate !== "TBA") ? "B7" : "A12";
        updateFlight(flight.id, { gate: nextGate, updated_at: new Date().toISOString() });
        await sendFlightAnnouncement(client, { ...flight, gate: nextGate }, `🚪 Gate Change | ${flight.flight_number}`, `Flight ${flight.flight_number} has moved to gate ${nextGate}.`);
        await interaction.reply({ content: `✅ Gate updated to ${nextGate}.`, ephemeral: true });
        return true;
      }
      case "aircraft": {
        const candidates = ["Boeing 737-800", "Airbus A320", "Airbus A321", "Boeing 737 MAX 8"];
        const nextAircraft = candidates.find(value => value !== (flight.aircraft || "")) || candidates[0];
        updateFlight(flight.id, { aircraft: nextAircraft, updated_at: new Date().toISOString() });
        await sendFlightAnnouncement(client, { ...flight, aircraft: nextAircraft }, `✈️ Aircraft Change | ${flight.flight_number}`, `Flight ${flight.flight_number} has changed aircraft to ${nextAircraft}.`);
        await interaction.reply({ content: `✅ Aircraft updated to ${nextAircraft}.`, ephemeral: true });
        return true;
      }
      case "cancel": {
        updateFlight(flight.id, { status: "Cancelled", updated_at: new Date().toISOString() });
        await sendFlightAnnouncement(client, { ...flight, status: "Cancelled" }, `⛔ Flight Cancelled | ${flight.flight_number}`, `Flight ${flight.flight_number} from ${flight.origin} to ${flight.destination} has been cancelled.`);
        await interaction.reply({ content: `✅ ${flight.flight_number} has been cancelled.`, ephemeral: true });
        return true;
      }
      case "departed": {
        await updateFlightStatus(client, flight, "Departed", { manual: true });
        await interaction.reply({ content: `✅ ${flight.flight_number} marked as departed.`, ephemeral: true });
        return true;
      }
      case "arrived": {
        await updateFlightStatus(client, flight, "Arrived", { manual: true });
        await interaction.reply({ content: `✅ ${flight.flight_number} marked as arrived.`, ephemeral: true });
        return true;
      }
      case "auto_on": {
        updateFlight(flight.id, { automation_enabled: 1, updated_at: new Date().toISOString() });
        await interaction.reply({ content: `✅ Automation enabled for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      case "auto_off": {
        updateFlight(flight.id, { automation_enabled: 0, updated_at: new Date().toISOString() });
        await interaction.reply({ content: `✅ Automation disabled for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }
      default:
        await interaction.reply({ content: "❌ Unknown action.", ephemeral: true });
        return true;
    }
  } catch (err) {
    console.error("Control panel error:", err);
    await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
    return true;
  }
}

module.exports = {
  buildControlPanel,
  canUseControlPanel,
  handleControlPanelAction
};
