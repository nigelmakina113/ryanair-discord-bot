const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getFlightById, updateFlight, getFlightByNumber, getLatestFlight } = require("./flightStore");
const { updateFlightStatus, sendFlightAnnouncement } = require("./flightAutomation");
const { formatDateTime } = require("./utils/embeds");

/**
 * Check if member can use control panel
 */
function canUseControlPanel(member) {
  if (!member) return false;

  // Check for ManageEvents or ManageGuild permission
  if (member.permissions && (member.permissions.has("ManageEvents") || member.permissions.has("ManageGuild"))) {
    return true;
  }

  // Fall back to role-based check
  if (member.roles && member.roles.cache) {
    const configured = (process.env.FLIGHT_MANAGEMENT_ROLE || "Operations").toLowerCase();
    return member.roles.cache.some(
      role => role.name.toLowerCase() === configured ||
              role.name.toLowerCase().includes("operations") ||
              role.name.toLowerCase().includes("ground") ||
              role.name.toLowerCase().includes("staff")
    );
  }

  return false;
}

/**
 * Build the control panel embed and buttons
 */
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
    new ButtonBuilder().setCustomId(`ctrl:checkin_open:${flight.id}`).setLabel("Open Check-in").setStyle(ButtonStyle.Success).setEmoji("📋"),
    new ButtonBuilder().setCustomId(`ctrl:checkin_close:${flight.id}`).setLabel("Close Check-in").setStyle(ButtonStyle.Secondary).setEmoji("🚫"),
    new ButtonBuilder().setCustomId(`ctrl:boarding_start:${flight.id}`).setLabel("Start Boarding").setStyle(ButtonStyle.Primary).setEmoji("🚪")
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:final_call:${flight.id}`).setLabel("Final Call").setStyle(ButtonStyle.Warning).setEmoji("📣"),
    new ButtonBuilder().setCustomId(`ctrl:departed:${flight.id}`).setLabel("Mark Departed").setStyle(ButtonStyle.Success).setEmoji("✈️"),
    new ButtonBuilder().setCustomId(`ctrl:arrived:${flight.id}`).setLabel("Mark Arrived").setStyle(ButtonStyle.Success).setEmoji("🛬")
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:delay:${flight.id}`).setLabel("Delay Flight").setStyle(ButtonStyle.Danger).setEmoji("⏰"),
    new ButtonBuilder().setCustomId(`ctrl:gate:${flight.id}`).setLabel("Change Gate").setStyle(ButtonStyle.Secondary).setEmoji("🚪"),
    new ButtonBuilder().setCustomId(`ctrl:aircraft:${flight.id}`).setLabel("Change Aircraft").setStyle(ButtonStyle.Secondary).setEmoji("✈️")
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ctrl:cancel:${flight.id}`).setLabel("Cancel Flight").setStyle(ButtonStyle.Danger).setEmoji("🚫"),
    new ButtonBuilder().setCustomId(`ctrl:auto_on:${flight.id}`).setLabel("Enable Automation").setStyle(ButtonStyle.Success).setEmoji("⚙️"),
    new ButtonBuilder().setCustomId(`ctrl:auto_off:${flight.id}`).setLabel("Disable Automation").setStyle(ButtonStyle.Secondary).setEmoji("⚙️")
  );

  return { embed, components: [row1, row2, row3, row4] };
}

/**
 * Handle control panel button interactions
 */
async function handleControlPanelAction(interaction, client) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("ctrl:")) return false;

  // Check authorization
  if (!canUseControlPanel(interaction.member)) {
    await interaction.reply({
      content: "❌ You are not authorized to use the flight control panel. You need Manage Events/Guild permission.",
      ephemeral: true
    });
    return true;
  }

  const [prefix, action, rawFlightId] = interaction.customId.split(":");
  if (prefix !== "ctrl" || !rawFlightId) return true;

  const flight = getFlightById(Number(rawFlightId));
  if (!flight) {
    await interaction.reply({ content: "❌ Flight not found.", ephemeral: true });
    return true;
  }

  try {
    switch (action) {
      case "checkin_open": {
        if (flight.status === "Check-in Open") {
          await interaction.reply({ content: "ℹ️ Check-in is already open.", ephemeral: true });
          return true;
        }
        const result = await updateFlightStatus(client, flight, "Check-in Open", { manual: true });
        await interaction.reply({ content: `✅ Check-in opened for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "checkin_close": {
        if (flight.status === "Scheduled" && flight.checkin_open === 0) {
          await interaction.reply({ content: "ℹ️ Check-in is already closed.", ephemeral: true });
          return true;
        }
        updateFlight(flight.id, {
          status: "Scheduled",
          checkin_open: 0,
          updated_at: new Date().toISOString()
        });
        await sendFlightAnnouncement(
          client,
          flight,
          `📋 Check-in Closed | ${flight.flight_number}`,
          `Check-in for flight ${flight.flight_number} is now closed. Boarding information will be announced at the gate."
        );
        await interaction.reply({ content: `✅ Check-in closed for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "boarding_start": {
        if (flight.status === "Boarding") {
          await interaction.reply({ content: "ℹ️ Boarding has already started.", ephemeral: true });
          return true;
        }
        const result = await updateFlightStatus(client, flight, "Boarding", { manual: true });
        await interaction.reply({ content: `✅ Boarding started for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "final_call": {
        if (flight.status === "Final Call") {
          await interaction.reply({ content: "ℹ️ Final call has already been announced.", ephemeral: true });
          return true;
        }
        const result = await updateFlightStatus(client, flight, "Final Call", { manual: true });
        await interaction.reply({ content: `✅ Final call announced for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "departed": {
        if (flight.status === "Departed") {
          await interaction.reply({ content: "ℹ️ Flight has already departed.", ephemeral: true });
          return true;
        }
        const result = await updateFlightStatus(client, flight, "Departed", { manual: true });
        await interaction.reply({ content: `✅ ${flight.flight_number} marked as departed.`, ephemeral: true });
        return true;
      }

      case "arrived": {
        if (flight.status === "Arrived") {
          await interaction.reply({ content: "ℹ️ Flight has already arrived.", ephemeral: true });
          return true;
        }
        const result = await updateFlightStatus(client, flight, "Arrived", { manual: true });
        await interaction.reply({ content: `✅ ${flight.flight_number} marked as arrived.`, ephemeral: true });
        return true;
      }

      case "delay": {
        const nextDelay = (Number(flight.delay_minutes) || 0) + 15;
        updateFlight(flight.id, {
          delay_minutes: nextDelay,
          updated_at: new Date().toISOString()
        });
        await sendFlightAnnouncement(
          client,
          { ...flight, delay_minutes: nextDelay },
          `⏰ Delay Update | ${flight.flight_number}`,
          `Flight ${flight.flight_number} has been delayed. New delay: ${nextDelay} minutes. Thank you for your patience."
        );
        await interaction.reply({ content: `✅ ${flight.flight_number} delayed by 15 minutes (total: ${nextDelay} min).`, ephemeral: true });
        return true;
      }

      case "gate": {
        const gates = ["A1", "A2", "A3", "A12", "B5", "B7", "C3"];
        const currentGate = flight.gate || "TBA";
        const nextGate = gates.find(g => g !== currentGate) || gates[0];
        updateFlight(flight.id, {
          gate: nextGate,
          updated_at: new Date().toISOString()
        });
        await sendFlightAnnouncement(
          client,
          { ...flight, gate: nextGate },
          `🚪 Gate Change | ${flight.flight_number}`,
          `Flight ${flight.flight_number} has changed gate to ${nextGate}. Passengers should proceed to the updated gate immediately."
        );
        await interaction.reply({ content: `✅ Gate updated to ${nextGate} for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "aircraft": {
        const aircraft = ["Boeing 737", "Airbus A320", "Boeing 747", "Airbus A380"];
        const nextAircraft = aircraft.find(a => a !== flight.aircraft) || aircraft[0];
        updateFlight(flight.id, {
          aircraft: nextAircraft,
          updated_at: new Date().toISOString()
        });
        await sendFlightAnnouncement(
          client,
          { ...flight, aircraft: nextAircraft },
          `✈️ Aircraft Change | ${flight.flight_number}`,
          `The aircraft for flight ${flight.flight_number} has been changed to ${nextAircraft}. Operations will resume as scheduled."
        );
        await interaction.reply({ content: `✅ Aircraft updated to ${nextAircraft} for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "cancel": {
        if (flight.status === "Cancelled") {
          await interaction.reply({ content: "ℹ️ This flight is already cancelled.", ephemeral: true });
          return true;
        }
        updateFlight(flight.id, {
          status: "Cancelled",
          updated_at: new Date().toISOString()
        });
        await sendFlightAnnouncement(
          client,
          { ...flight, status: "Cancelled" },
          `⛔ Flight Cancelled | ${flight.flight_number}`,
          `Flight ${flight.flight_number} from ${flight.origin} to ${flight.destination} has been cancelled. Passengers should contact the Ryanair service desk for rebooking options."
        );
        await interaction.reply({ content: `✅ ${flight.flight_number} has been cancelled.`, ephemeral: true });
        return true;
      }

      case "auto_on": {
        if (flight.automation_enabled) {
          await interaction.reply({ content: "ℹ️ Automation is already enabled.", ephemeral: true });
          return true;
        }
        updateFlight(flight.id, {
          automation_enabled: 1,
          updated_at: new Date().toISOString()
        });
        await interaction.reply({ content: `✅ Automation enabled for ${flight.flight_number}.`, ephemeral: true });
        return true;
      }

      case "auto_off": {
        if (!flight.automation_enabled) {
          await interaction.reply({ content: "ℹ️ Automation is already disabled.", ephemeral: true });
          return true;
        }
        updateFlight(flight.id, {
          automation_enabled: 0,
          updated_at: new Date().toISOString()
        });
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
