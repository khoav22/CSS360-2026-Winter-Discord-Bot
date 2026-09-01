// Gets the stats for the person who runs the command
import { SlashCommandBuilder } from "discord.js";
import { getRoundsPlayed, getRoundsWon, getGamesPlayed, getGamesWon, getHintsUsed, getPowerupsUsed } from "../helpers/statsStore.js";

export default {
    data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows your stats for music trivia"),

    async execute(interaction) {
        if (!interaction.guild) {
          return interaction.reply({
            content: "This command can only be used in a server.",
            ephemeral: true,
          });
        }
    
        // Get user info
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
    
        // Get stats for that user
        const roundsPlayed = await getRoundsPlayed(guildId, userId);
        const roundsWon = await getRoundsWon(guildId, userId);
        const gamesPlayed = await getGamesPlayed(guildId, userId);
        const gamesWon = await getGamesWon(guildId, userId);
        const hintsUsed = await getHintsUsed(guildId, userId);
        const powerupsUsed = await getPowerupsUsed(guildId, userId);

        await interaction.reply({
          content: `Your stats:\nRounds played: ${roundsPlayed}\nRounds won: ${roundsWon}\nGames played: ${gamesPlayed}\nGames won: ${gamesWon}\nHints used: ${hintsUsed}\nPowerups used: ${powerupsUsed}`,
          ephemeral: true,
        });
      },
};