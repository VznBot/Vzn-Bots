const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!teste") {
    message.reply("Bot ativo!");
  }
});

console.log("Tentando logar no Discord...");

client.login(process.env.TOKEN)
  .then(() => {
    console.log("Login enviado com sucesso");
  })
  .catch((err) => {
    console.error("ERRO AO LOGAR NO DISCORD:");
    console.error(err);
  });

client.login(process.env.TOKEN);
