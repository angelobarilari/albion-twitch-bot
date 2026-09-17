const fs = require("fs");
const path = require("path");
const { defaultSettings } = require("./defaultSettings");

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

const settings = {};

/**
 * Lê o arquivo de configuração do diretório de execução.
 * @returns {Partial<import("./types").Settings>|null}
 */
function loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
        } catch {
            console.error("[ERRO] settings.json inválido, usando padrões do config.js");
        }
    }
    return null;
}

/**
 * Carrega settings.json e combina seus valores com os padrões do projeto.
 * @returns {import("./types").Settings}
 */
function initSettings() {
    const loaded = { ...defaultSettings, ...(loadSettings() ?? {}) };

    Object.assign(settings, loaded);

    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
        console.log("[CONFIG] settings.json criado — edite-o para personalizar os preços");
    }

    return settings;
}

module.exports = { settings, initSettings };
