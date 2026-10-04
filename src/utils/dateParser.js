function hasPermission(interaction, permissionName) {
  if (!interaction.member) return false;
  return interaction.member.permissions.has(permissionName);
}

function isAdmin(interaction) {
  return hasPermission(interaction, "Administrator");
}

function isModerator(interaction) {
  return hasPermission(interaction, "ManageMessages");
}

function isStaff(interaction) {
  if (isAdmin(interaction)) return true;
  if (!interaction.member || !interaction.member.roles) return false;

  const names = interaction.member.roles.cache.map(role => role.name.toLowerCase());
  const keywords = ["staff", "crew", "operations", "manager", "dispatcher", "ground" ];
  return names.some(name => keywords.some(keyword => name.includes(keyword)));
}

async function requireAdmin(interaction) {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: "❌ You need Administrator permission for this command.", ephemeral: true });
    return false;
  }
  return true;
}

async function requireModerator(interaction) {
  if (!isModerator(interaction)) {
    await interaction.reply({ content: "❌ You need Moderator permission for this command.", ephemeral: true });
    return false;
  }
  return true;
}

async function requireStaff(interaction) {
  if (!isStaff(interaction)) {
    await interaction.reply({ content: "❌ You need staff permission for this command.", ephemeral: true });
    return false;
  }
  return true;
}

module.exports = { hasPermission, isAdmin, isModerator, isStaff, requireAdmin, requireModerator, requireStaff };
