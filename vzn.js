const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// ===== SERVIDOR WEB (necessário pro Render free) =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// ===== TOKEN =====
const token = (process.env.TOKEN || "").trim();

console.log("TOKEN existe?", !!token);
console.log("Tamanho do token:", token.length);

// ===== BOT DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Quando o bot ligar
client.once("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

// Comando de teste
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!teste") {
    message.reply("Bot ativo!");
  }
});

// ===== LOGIN =====
console.log("Tentando logar no Discord...");

client.login(token)
  .then(() => {
    console.log("Login enviado com sucesso");
  })
  .catch((err) => {
    console.error("ERRO AO LOGAR NO DISCORD:");
    console.error(err);
  });
