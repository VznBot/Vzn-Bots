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

const app = express();
app.get("/", (_, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000, () => console.log("Servidor web ligado"));

const TICKET_CATEGORY_ID = "1407113666029162498";
const STAFF_ROLE_ID = "1407113665546817612";
const CLIENT_ROLE_ID = "1407113665555071047";
const PREFIX = "!";

let PIX_CHAVE = process.env.PIX_CHAVE || "victomiguel2013@gmail.com";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const ticketTypes = {
  ticket_gamepass: {
    nome: "Robux Via Gamepass",
    prefixo: "gamepass",
    emoji: "🛒",
    descricao: "Abra um ticket para compra de Robux via gamepass"
  },
  ticket_gift: {
    nome: "Robux Via Gift",
    prefixo: "gift",
    emoji: "🎁",
    descricao: "Abra um ticket para compra de Robux via gift"
  }
};

const products = {
  robux_100: { label: "100 Robux", value: "robux_100", preco: "R$ 6,50" },
  robux_200: { label: "200 Robux", value: "robux_200", preco: "R$ 13,00" },
  robux_300: { label: "300 Robux", value: "robux_300", preco: "R$ 19,50" },
  robux_400: { label: "400 Robux", value: "robux_400", preco: "R$ 26,00" },
  robux_500: { label: "500 Robux", value: "robux_500", preco: "R$ 32,50" },
  robux_600: { label: "600 Robux", value: "robux_600", preco: "R$ 39,00" },
  robux_1000: { label: "1000 Robux", value: "robux_1000", preco: "R$ 65,00" }
};

const sanitizeName = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);

const painelEmbed = () =>
  new EmbedBuilder()
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

const painelMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("abrir_ticket_menu")
      .setPlaceholder("Selecione o tipo de ticket")
      .addOptions(
        Object.entries(ticketTypes).map(([value, item]) => ({
          label: item.nome,
          description: item.descricao,
          value,
          emoji: item.emoji
        }))
      )
  );

const productMenu = (tipo) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`produto_${tipo}`)
      .setPlaceholder("Selecione a quantidade de Robux")
      .addOptions(
        Object.values(products).map((p) => ({
          label: p.label,
          description: `Valor: ${p.preco}`,
          value: p.value,
          emoji: "💸"
        }))
      )
  );

const paymentButtons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ja_paguei")
      .setLabel("Já paguei")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId("cancelar_pedido")
      .setLabel("Cancelar pedido")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❌"),
    new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

const staffButtons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirmar_pagamento")
      .setLabel("Confirmar pagamento")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰"),
    new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

const openButtons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

const closedButtons = () =>
  new ActionRowBuilder().addComponents(
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

function parseTopic(topic = "") {
  const get = (key) => topic.match(new RegExp(`${key}:([^|]+)`))?.[1]?.trim();
  return {
    userId: get("user"),
    tipo: get("tipo"),
    status: get("status"),
    produto: get("produto"),
    preco: get("preco"),
    pago: get("pago")
  };
}

async function findOpenTicket(guild, userId, tipo) {
  const prefixo = ticketTypes[tipo].prefixo;
  return guild.channels.cache.find(
    (c) =>
      c.parentId === TICKET_CATEGORY_ID &&
      c.type === ChannelType.GuildText &&
      c.topic?.includes(`user:${userId}`) &&
      c.topic?.includes(`tipo:${tipo}`) &&
      c.topic?.includes("status:aberto") &&
      c.name.startsWith(`${prefixo}-`)
  );
}

async function createTicket(interaction, tipo) {
  const { guild, user } = interaction;
  const config = ticketTypes[tipo];

  const existing = await findOpenTicket(guild, user.id, tipo);
  if (existing) {
    return interaction.reply({
      content: `Você já possui um ticket aberto: ${existing}`,
      ephemeral: true
    });
  }

  const channel = await guild.channels.create({
    name: `${config.prefixo}-${sanitizeName(user.username)}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,
    topic: `user:${user.id} | tipo:${tipo} | status:aberto | pago:nao`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
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
    .setTitle("🛍️ Pedido iniciado")
    .setDescription(
      [
        `Olá ${user}, seu ticket foi criado com sucesso.`,
        "",
        `**Tipo:** ${config.nome}`,
        "",
        "Agora selecione abaixo a quantidade de Robux que você deseja comprar."
      ].join("\n")
    )
    .setColor(0x57f287);

  await channel.send({
    content: `${user} <@&${STAFF_ROLE_ID}>`,
    embeds: [embed],
    components: [productMenu(tipo), openButtons()]
  });

  await interaction.reply({
    content: `Seu ticket foi criado: ${channel}`,
    ephemeral: true
  });
}

async function sendOrderSummary(channel, user, tipo, productKey) {
  const ticket = ticketTypes[tipo];
  const product = products[productKey];
  const info = parseTopic(channel.topic || "");

  let newTopic = `user:${info.userId} | tipo:${tipo} | status:${info.status || "aberto"} | produto:${product.label} | preco:${product.preco} | pago:${info.pago || "nao"}`;
  await channel.setTopic(newTopic);

  const embed = new EmbedBuilder()
    .setTitle("🧾 Resumo do Pedido")
    .setDescription(
      [
        `**Cliente:** ${user}`,
        `**Produto:** ${product.label}`,
        `**Método:** ${ticket.nome}`,
        `**Valor:** ${product.preco}`,
        `**Status:** Aguardando pagamento`,
        "",
        "**Pagamento via PIX**",
        `Chave PIX: \`${PIX_CHAVE}\``,
        "",
        "Após pagar, clique em **Já paguei** e envie o comprovante no ticket."
      ].join("\n")
    )
    .setColor(0xf1c40f);

  await channel.send({
    embeds: [embed],
    components: [paymentButtons()]
  });
}

async function markAsPaid(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("📨 Pagamento enviado")
    .setDescription(
      [
        `${interaction.user} informou que já realizou o pagamento.`,
        "",
        "A equipe deve conferir o comprovante e clicar em **Confirmar pagamento**."
      ].join("\n")
    )
    .setColor(0x3498db);

  await interaction.reply({
    embeds: [embed],
    components: [staffButtons()]
  });
}

async function confirmPayment(interaction) {
  const { channel, guild } = interaction;
  const topic = channel.topic || "";

  if (topic.includes("pago:sim")) {
    return interaction.reply({
      content: "Este pedido já foi confirmado como pago.",
      ephemeral: true
    });
  }

  const info = parseTopic(topic);
  const newTopic = topic.replace("pago:nao", "pago:sim");
  await channel.setTopic(newTopic);

  if (CLIENT_ROLE_ID !== "COLOQUE_AQUI_O_ID_DO_CARGO_CLIENTE" && info.userId) {
    const member = await guild.members.fetch(info.userId).catch(() => null);
    if (member) {
      await member.roles.add(CLIENT_ROLE_ID).catch(console.error);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("✅ Pagamento confirmado")
    .setDescription(
      [
        `**Produto:** ${info.produto || "Não definido"}`,
        `**Valor:** ${info.preco || "Não definido"}`,
        "",
        "Pagamento confirmado com sucesso.",
        "Agora a equipe pode prosseguir com a entrega.",
        CLIENT_ROLE_ID !== "COLOQUE_AQUI_O_ID_DO_CARGO_CLIENTE"
          ? "O cargo de cliente foi adicionado automaticamente."
          : "Defina o ID do cargo de cliente para ativar o cargo automático."
      ].join("\n")
    )
    .setColor(0x2ecc71);

  await interaction.reply({ embeds: [embed] });
}

async function cancelOrder(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("❌ Pedido cancelado")
    .setDescription("Este pedido foi cancelado. Se desejar, abra um novo ticket.")
    .setColor(0xe74c3c);

  await interaction.reply({
    embeds: [embed],
    components: [openButtons()]
  });
}

async function closeTicket(interaction) {
  const { channel, guild } = interaction;
  const topic = channel.topic || "";

  if (!topic.includes("status:aberto")) {
    return interaction.reply({
      content: "Este ticket já está fechado.",
      ephemeral: true
    });
  }

  const userId = topic.match(/user:(\d+)/)?.[1];
  await channel.setTopic(topic.replace("status:aberto", "status:fechado"));
  await channel.setName(`fechado-${channel.name.replace(/^fechado-/, "")}`);

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: false
  });

  if (userId) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: false,
      SendMessages: false
    });
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔒 Ticket Fechado")
        .setDescription("Este ticket foi fechado. Você pode reabrir ou deletar abaixo.")
        .setColor(0xed4245)
    ],
    components: [closedButtons()]
  });
}

async function reopenTicket(interaction) {
  const { channel } = interaction;
  const topic = channel.topic || "";

  if (!topic.includes("status:fechado")) {
    return interaction.reply({
      content: "Este ticket já está aberto.",
      ephemeral: true
    });
  }

  const userId = topic.match(/user:(\d+)/)?.[1];
  if (!userId) {
    return interaction.reply({
      content: "Não foi possível identificar o dono do ticket.",
      ephemeral: true
    });
  }

  await channel.setTopic(topic.replace("status:fechado", "status:aberto"));
  await channel.setName(channel.name.replace(/^fechado-/, ""));

  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔓 Ticket Reaberto")
        .setDescription("Este ticket foi reaberto com sucesso.")
        .setColor(0x57f287)
    ],
    components: [openButtons()]
  });
}

async function deleteTicket(interaction) {
  await interaction.reply({
    content: "Este ticket será deletado em 5 segundos..."
  });

  setTimeout(() => {
    interaction.channel.delete().catch(console.error);
  }, 5000);
}

client.once(Events.ClientReady, (bot) => {
  console.log(`Logado como ${bot.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content === `${PREFIX}painel`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Você precisa ser administrador para usar este comando.");
    }

    await message.channel.send({
      embeds: [painelEmbed()],
      components: [painelMenu()]
    });

    return message.reply("Painel enviado com sucesso.");
  }

  if (message.content.startsWith(`${PREFIX}configpix `)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Você precisa ser administrador para usar este comando.");
    }

    const novaChave = message.content.slice(`${PREFIX}configpix `.length).trim();
    if (!novaChave) {
      return message.reply(`Use assim: ${PREFIX}configpix sua_chave_pix`);
    }

    PIX_CHAVE = novaChave;
    return message.reply("Chave PIX atualizada com sucesso.");
  }

  if (message.content === `${PREFIX}verpix`) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Você precisa ser administrador para usar este comando.");
    }

    return message.reply(`Chave PIX atual: \`${PIX_CHAVE}\``);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "abrir_ticket_menu") {
        return createTicket(interaction, interaction.values[0]);
      }

      if (interaction.customId.startsWith("produto_")) {
        const tipo = interaction.customId.replace("produto_", "");
        await sendOrderSummary(
          interaction.channel,
          interaction.user,
          tipo,
          interaction.values[0]
        );

        return interaction.reply({
          content: "Produto selecionado com sucesso.",
          ephemeral: true
        });
      }
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === "ja_paguei") return markAsPaid(interaction);
    if (interaction.customId === "confirmar_pagamento") return confirmPayment(interaction);
    if (interaction.customId === "cancelar_pedido") return cancelOrder(interaction);
    if (interaction.customId === "fechar_ticket") return closeTicket(interaction);
    if (interaction.customId === "reabrir_ticket") return reopenTicket(interaction);
    if (interaction.customId === "deletar_ticket") return deleteTicket(interaction);
  } catch (error) {
    console.error("Erro na interação:", error);

    const payload = {
      content: "Ocorreu um erro ao processar essa ação.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
