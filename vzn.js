const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.login(process.env.TOKEN);

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!teste") {
    message.reply("Bot ativo!");
  }
});

client.login(TOKEN);