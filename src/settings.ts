import fs from "node:fs";
import path from "node:path";
import type { Settings } from "./types/settings.js";
import defaultSettingsModule = require("./defaultSettings.js");

const { defaultSettings } = defaultSettingsModule;
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

type SettingsFileSystem = {
  existsSync(filePath: string): boolean;
  readFileSync(filePath: string, encoding: "utf8"): string;
  writeFileSync(filePath: string, contents: string, encoding: "utf8"): void;
};

type SettingsLogger = Pick<Console, "error" | "log">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isOptionalString(value: unknown): boolean {
  return typeof value === "undefined" || typeof value === "string";
}

function isAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    isPositiveInteger(value.bits) &&
    typeof value.key === "string" &&
    value.key.trim().length > 0 &&
    isOptionalString(value.description)
  );
}

function isMouseFreezeAction(value: unknown): boolean {
  return isRecord(value) && isPositiveInteger(value.bits);
}

function isChannelPointsAction(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    value.key.trim().length > 0 &&
    (typeof value.rewardId === "undefined" ||
      (typeof value.rewardId === "string" && value.rewardId.trim().length > 0)) &&
    (typeof value.rewardTitle === "undefined" ||
      (typeof value.rewardTitle === "string" && value.rewardTitle.trim().length > 0)) &&
    (typeof value.rewardId === "string" || typeof value.rewardTitle === "string") &&
    isOptionalString(value.description)
  );
}

function parseSettings(value: unknown): Partial<Settings> | null {
  if (!isRecord(value)) return null;

  const valid =
    (typeof value.channel === "undefined" ||
      (typeof value.channel === "string" &&
        (value.channel === "" || /^[a-z0-9_]{1,25}$/i.test(value.channel)))) &&
    (typeof value.cooldownMs === "undefined" || isPositiveInteger(value.cooldownMs)) &&
    (typeof value.mouseFreezeDurationMs === "undefined" ||
      (isPositiveInteger(value.mouseFreezeDurationMs) && value.mouseFreezeDurationMs <= 60_000)) &&
    (typeof value.mouseFreezeCooldownMs === "undefined" ||
      (isPositiveInteger(value.mouseFreezeCooldownMs) &&
        value.mouseFreezeCooldownMs <= 3_600_000)) &&
    (typeof value.mouseFreezeActions === "undefined" ||
      (Array.isArray(value.mouseFreezeActions) &&
        value.mouseFreezeActions.every(isMouseFreezeAction))) &&
    (typeof value.testCommandsEnabled === "undefined" ||
      typeof value.testCommandsEnabled === "boolean") &&
    (typeof value.testMouseFreezeCommand === "undefined" ||
      (typeof value.testMouseFreezeCommand === "string" &&
        value.testMouseFreezeCommand.trim().length > 0)) &&
    (typeof value.testCommands === "undefined" ||
      (Array.isArray(value.testCommands) &&
        value.testCommands.every(
          (command) =>
            isRecord(command) &&
            typeof command.command === "string" &&
            command.command.trim().length > 0 &&
            typeof command.key === "string" &&
            command.key.trim().length > 0,
        ))) &&
    (typeof value.bitsActions === "undefined" ||
      (Array.isArray(value.bitsActions) && value.bitsActions.every(isAction))) &&
    (typeof value.channelPointsActions === "undefined" ||
      (Array.isArray(value.channelPointsActions) &&
        value.channelPointsActions.every(isChannelPointsAction)));

  if (!valid) return null;

  return value as Partial<Settings>;
}

function hasConflictingBitActions(settings: Settings): boolean {
  const freezeAmounts = new Set(settings.mouseFreezeActions.map((action) => action.bits));
  return settings.bitsActions.some((action) => freezeAmounts.has(action.bits));
}

/**
 * Reads optional settings from the JSON configuration file.
 *
 * @returns The persisted settings, or null when the file is missing or invalid.
 */
function loadSettings(
  filePath: string,
  fileSystem: SettingsFileSystem,
  logger: SettingsLogger,
): Partial<Settings> | null {
  if (fileSystem.existsSync(filePath)) {
    try {
      const parsed: unknown = JSON.parse(fileSystem.readFileSync(filePath, "utf8"));
      if (!isRecord(parsed)) throw new Error("Invalid settings structure");
      if (Object.hasOwn(parsed, "broadcasterToken")) {
        logger.error(
          "[ERROR] broadcasterToken is no longer supported in settings.json; use TWITCH_BROADCASTER_TOKEN.",
        );
        delete parsed.broadcasterToken;
        fileSystem.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
      }
      const settings = parseSettings(parsed);
      if (!settings) throw new Error("Invalid settings structure");
      return settings;
    } catch {
      logger.error("[ERROR] Invalid settings.json, using default settings.");
    }
  }
  return null;
}

/**
 * Merges persisted settings with defaults and creates the configuration file when needed.
 *
 * @returns The initialized application settings.
 */
function createSettingsStore(
  filePath = SETTINGS_FILE,
  fileSystem: SettingsFileSystem = fs,
  logger: SettingsLogger = console,
) {
  const settings = {} as Settings;

  function initSettings(): Settings {
    const loaded = { ...defaultSettings, ...(loadSettings(filePath, fileSystem, logger) ?? {}) };

    if (hasConflictingBitActions(loaded)) {
      logger.error(
        "[WARNING] A bits amount cannot trigger both a key action and input blocking; keeping the key action and disabling the overlapping freeze.",
      );
      const keyActionAmounts = new Set(loaded.bitsActions.map((action) => action.bits));
      loaded.mouseFreezeActions = loaded.mouseFreezeActions.filter(
        (action) => !keyActionAmounts.has(action.bits),
      );
    }

    Object.assign(settings, loaded);

    if (!fileSystem.existsSync(filePath)) {
      fileSystem.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf8");
      logger.log("[CONFIG] settings.json created — edit it to customize the actions");
    }

    return settings;
  }

  return { settings, initSettings };
}

const settingsStore = createSettingsStore();

export = Object.assign(settingsStore, { createSettingsStore });
