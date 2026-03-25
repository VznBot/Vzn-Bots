const { Client, GatewayIntentBits, Events } = require("discord.js");
const express = require("express");

process.on("unhandledRejection", (error) => {
  console.error("unhandledRejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("uncaughtException:", error);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

const token = (process.env.TOKEN || "").trim();

console.log("TOKEN existe?", !!token);
console.log("Tamanho do token:", token.length);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("debug", (msg) => {
  if (
    msg.includes("Preparing to connect") ||
    msg.includes("Identifying") ||
    msg.includes("Session Limit Information") ||
    msg.includes("connected")
  ) {
    console.log("DEBUG:", msg);
  }
});

client.on("warn", (msg) => {
  console.warn("WARN:", msg);
});

client.on("error", (err) => {
  console.error("CLIENT ERROR:", err);
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logado como ${readyClient.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!teste") {
    message.reply("Bot ativo!");
  }
});

console.log("Chamando client.login...");

client.login(token)
  .then(() => {
    console.log("client.login resolveu com sucesso");
  })
  .catch((err) => {
    console.error("ERRO NO client.login:", err);
  });
