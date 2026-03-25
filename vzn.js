require("dns").setDefaultResultOrder("ipv4first");

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events
} = require("discord.js");
const express = require("express");

// ===== Servidor web pro Railway/Render =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// ===== Configurações =====
// Coloque aqui o ID da categoria onde os tickets serão criados
const TICKET_CATEGORY_ID = "1407113666029162498";

// Cargo que pode ver/gerenciar tickets além do dono
const STAFF_ROLE_ID = "1407113665546817612";

// Canal onde você vai mandar o painel
const PAINEL_CANAL_ID = "1407113666029162500";

// Prefixo opcional para comando de enviar painel
const PREFIX = "!";

// ===== Cliente =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Guarda tickets em memória para evitar duplicados por usuário/tipo
const openTickets = new Map();

/**
 * Gera nome limpo para canal
 */
function sanitizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
}

/**
 * Cria embed do painel
 */
function createPainelEmbed() {
  return new EmbedBuilder()
    .setTitle("🎫 Central de Tickets")
    .setDescription(
      [
        "Selecione abaixo o tipo de atendimento que você deseja abrir.",
        "",
        "**Opções disponíveis:**",
        "🛒 **Robux Via Gamepass**",
        "🎁 **Robux Via Gift**"
      ].join("\n")
    )
    .setColor(0x5865f2);
}

/**
 * Cria menu do painel
 */
function createPainelMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("abrir_ticket_menu")
      .setPlaceholder("Selecione o tipo de ticket")
      .addOptions([
        {
          label: "Robux Via Gamepass",
          description: "Abra um ticket para compra de Robux via gamepass",
          value: "ticket_gamepass",
          emoji: "🛒"
        },
        {
          label: "Robux Via Gift",
          description: "Abra um ticket para compra de Robux via gift",
          value: "ticket_gift",
          emoji: "🎁"
        }
      ])
  );
}

/**
 * Botões de ticket aberto
 */
function createOpenTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );
}

/**
 * Botões de ticket fechado
 */
function createClosedTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reabrir_ticket")
      .setLabel("Reabrir Ticket")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔓"),
    new ButtonBuilder()
      .setCustomId("deletar_ticket")
      .setLabel("Deletar Ticket")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🗑️")
  );
}

/**
 * Verifica se usuário já tem ticket aberto do mesmo tipo
 */
async function userAlreadyHasTicket(guild, userId, tipo) {
  const expectedStart =
    tipo === "ticket_gamepass" ? `gamepass-` : `gift-`;

  return guild.channels.cache.find(
    (c) =>
      c.parentId === TICKET_CATEGORY_ID &&
      c.type === ChannelType.GuildText &&
      c.topic &&
      c.topic.includes(`user:${userId}`) &&
      c.topic.includes("status:aberto") &&
      c.name.startsWith(expectedStart)
  );
}

/**
 * Cria ticket
 */
async function createTicket(interaction, tipo) {
  const guild = interaction.guild;
  const member = interaction.member;
  const user = interaction.user;

  const existing = await userAlreadyHasTicket(guild, user.id, tipo);
  if (existing) {
    return interaction.reply({
      content: `Você já possui um ticket aberto: ${existing}`,
      ephemeral: true
    });
  }

  const tipoNome =
    tipo === "ticket_gamepass" ? "Robux Via Gamepass" : "Robux Via Gift";

  const prefixo =
    tipo === "ticket_gamepass" ? "gamepass" : "gift";

  const channelName = `${prefixo}-${sanitizeName(user.username)}`;

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,
    topic: `user:${user.id} | tipo:${tipo} | status:aberto`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel
        ]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: STAFF_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("🎟️ Ticket Aberto")
    .setDescription(
      [
        `Olá ${user}, seu ticket foi criado com sucesso.`,
        "",
        `**Tipo:** ${tipoNome}`,
        "",
        "Explique seu pedido com o máximo de detalhes possível.",
        "A equipe irá responder em breve."
      ].join("\n")
    )
    .setColor(0x57f287);

  await ticketChannel.send({
    content: `${user} <@&${STAFF_ROLE_ID}>`,
    embeds: [embed],
    components: [createOpenTicketButtons()]
  });

  await interaction.reply({
    content: `Seu ticket foi criado: ${ticketChannel}`,
    ephemeral: true
  });
}

/**
 * Fecha ticket
 */
async function closeTicket(interaction) {
  const channel = interaction.channel;
  const topic = channel.topic || "";

  if (!topic.includes("status:aberto")) {
    return interaction.reply({
      content: "Este ticket já está fechado.",
      ephemeral: true
    });
  }

  const newTopic = topic.replace("status:aberto", "status:fechado");

  await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
    ViewChannel: false
  });

  const userIdMatch = topic.match(/user:(\d+)/);
  if (userIdMatch) {
    await channel.permissionOverwrites.edit(userIdMatch[1], {
      ViewChannel: false,
      SendMessages: false
    });
  }

  await channel.setTopic(newTopic);
  await channel.setName(`fechado-${channel.name.replace(/^fechado-/, "")}`);

  const embed = new EmbedBuilder()
    .setTitle("🔒 Ticket Fechado")
    .setDescription("Este ticket foi fechado. Você pode reabrir ou deletar abaixo.")
    .setColor(0xed4245);

  await interaction.update({
    embeds: [embed],
    components: [createClosedTicketButtons()]
  });
}

/**
 * Reabre ticket
 */
async function reopenTicket(interaction) {
  const channel = interaction.channel;
  const topic = channel.topic || "";

  if (!topic.includes("status:fechado")) {
    return interaction.reply({
      content: "Este ticket já está aberto.",
      ephemeral: true
    });
  }

  const userIdMatch = topic.match(/user:(\d+)/);
  if (!userIdMatch) {
    return interaction.reply({
      content: "Não foi possível identificar o dono do ticket.",
      ephemeral: true
    });
  }

  const newTopic = topic.replace("status:fechado", "status:aberto");

  await channel.permissionOverwrites.edit(userIdMatch[1], {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  await channel.setTopic(newTopic);
  await channel.setName(channel.name.replace(/^fechado-/, ""));

  const embed = new EmbedBuilder()
    .setTitle("🔓 Ticket Reaberto")
    .setDescription("Este ticket foi reaberto com sucesso.")
    .setColor(0x57f287);

  await interaction.update({
    embeds: [embed],
    components: [createOpenTicketButtons()]
  });
}

/**
 * Deleta ticket
 */
async function deleteTicket(interaction) {
  await interaction.reply({
    content: "Este ticket será deletado em 5 segundos...",
    ephemeral: false
  });

  setTimeout(async () => {
    try {
      await interaction.channel.delete();
    } catch (error) {
      console.error("Erro ao deletar ticket:", error);
    }
  }, 5000);
}

// ===== Quando o bot ficar online =====
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logado como ${readyClient.user.tag}`);
});

// ===== Comando pra enviar o painel =====
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content === `${PREFIX}painel`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Você precisa ser administrador para usar este comando.");
    }

    await message.channel.send({
      embeds: [createPainelEmbed()],
      components: [createPainelMenu()]
    });

    await message.reply("Painel enviado com sucesso.");
  }
});

// ===== Interações =====
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "abrir_ticket_menu") {
        const tipo = interaction.values[0];
        await createTicket(interaction, tipo);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "fechar_ticket") {
        await closeTicket(interaction);
      }

      if (interaction.customId === "reabrir_ticket") {
        await reopenTicket(interaction);
      }

      if (interaction.customId === "deletar_ticket") {
        await deleteTicket(interaction);
      }
    }
  } catch (error) {
    console.error("Erro na interação:", error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Ocorreu um erro ao processar essa ação.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "Ocorreu um erro ao processar essa ação.",
        ephemeral: true
      });
    }
  }
});

// ===== Login =====
client.login(process.env.TOKEN);
