const tmi = require("tmi.js");
const config = require("./config");
const { settings, initSettings } = require("./src/settings");
const { setupChatHandlers } = require("./src/chatHandler");

initSettings();

const channel = settings.channel;

if (!channel) {
    console.error('[ERRO] Nenhum canal configurado. Defina "channel" no settings.json.');
    process.exit(1);
}

if (!config.username || !config.token) {
    console.error("[ERRO] Credenciais ausentes. Defina TWITCH_BOT_USERNAME e TWITCH_BOT_TOKEN.");
    process.exit(1);
}

const client = new tmi.Client({
    identity: {
        username: config.username,
        password: config.token,
    },
    channels: [channel],
});

setupChatHandlers(client);

client.connect().then(() => {
    console.log(`[BOT] Conectado no canal: ${channel}`);
    console.log("");
    console.log("=".repeat(60));
    console.log("  !! ATENÇÃO !!");
    console.log("");
    console.log("  ESTE BOT PRECISA SER RODADO COMO ADMINISTRADOR!");
    console.log("");
    console.log("  Clique com o botão direito no executável ou terminal");
    console.log('  e selecione "Executar como administrador".');
    console.log("=".repeat(60));
}).catch((err) => {
    console.error("[ERRO] Não foi possível conectar:", err);
});
