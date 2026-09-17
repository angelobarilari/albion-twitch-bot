const fs = require("fs");
const path = require("path");
const { defaultSettings } = require("./defaultSettings");

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

const settings = {};

/**
 * Reads the configuration file from the current working directory.
 * @returns {Partial<import("./types").Settings>|null}
 */
function loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
        } catch {
            console.error("[ERROR] Invalid settings.json, using default settings.");
        }
    }
    return null;
}

/**
 * Loads settings.json and merges its values with the project defaults.
 * @returns {import("./types").Settings}
 */
function initSettings() {
    const loaded = { ...defaultSettings, ...(loadSettings() ?? {}) };

    Object.assign(settings, loaded);

    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
        console.log("[CONFIG] settings.json created — edit it to customize the actions");
    }

    return settings;
}

module.exports = { settings, initSettings };
