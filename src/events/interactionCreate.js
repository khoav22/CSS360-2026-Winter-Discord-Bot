import { Events, MessageFlags } from "discord.js";
import { recordUsername } from "../helpers/usersStore.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.client.commands.get(interaction.commandName);
    if (!cmd) return;

    // Fire-and-forget: keep a readable username on file for this user ID,
    // purely so admin/debugging views (like `npm run db:check`) can show
    // a name instead of a raw ID. Never blocks the actual command.
    recordUsername(interaction.user.id, interaction.user.username);

    try {
      await cmd.execute(interaction);
    } catch (e) {
      console.error("[interactionCreate] Command error:", e);

      if (interaction.deferred || interaction.replied) {
        try { await interaction.editReply("❌ Failed"); } catch {}
      } else {
        try {
          await interaction.reply({ content: "❌ Failed", flags: MessageFlags.Ephemeral });
        } catch {}
      }
    }
  },
};
