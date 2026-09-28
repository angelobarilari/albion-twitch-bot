import assert from "node:assert/strict";
import test from "node:test";
import settingsModule = require("./settings.js");

function createFileSystem(initialContent?: string) {
  let content = initialContent;
  const writes: string[] = [];

  return {
    writes,
    getContent: () => content,
    existsSync: () => content !== undefined,
    readFileSync: () => {
      if (content === undefined) throw new Error("File does not exist");
      return content;
    },
    writeFileSync: (_filePath: string, value: string) => {
      content = value;
      writes.push(value);
    },
  };
}

const silentLogger = { error() {}, log() {} };

test("settings merge persisted values over defaults", () => {
  const fileSystem = createFileSystem(JSON.stringify({ channel: "my_channel", cooldownMs: 900 }));
  const store = settingsModule.createSettingsStore(
    "memory-settings.json",
    fileSystem,
    silentLogger,
  );
  const settings = store.initSettings();

  assert.equal(settings.channel, "my_channel");
  assert.equal(settings.cooldownMs, 900);
  assert.equal(settings.mouseFreezeDurationMs, 5000);
  assert.equal(settings.mouseFreezeCooldownMs, 30_000);
  assert.equal(settings.testCommandsEnabled, false);
  assert.deepEqual(fileSystem.writes, []);
});

test("settings create a defaults file when no file exists", () => {
  const fileSystem = createFileSystem();
  const store = settingsModule.createSettingsStore(
    "memory-settings.json",
    fileSystem,
    silentLogger,
  );
  const settings = store.initSettings();

  assert.equal(fileSystem.writes.length, 1);
  assert.deepEqual(JSON.parse(fileSystem.writes[0]), settings);
  assert.equal(settings.channel, "");
});

test("invalid settings fall back to defaults without overwriting the existing file", () => {
  const fileSystem = createFileSystem("{");
  const errors: string[] = [];
  const store = settingsModule.createSettingsStore("memory-settings.json", fileSystem, {
    error: (message) => errors.push(message),
    log() {},
  });
  const settings = store.initSettings();

  assert.equal(settings.cooldownMs, 3000);
  assert.equal(fileSystem.writes.length, 0);
  assert.equal(errors.length, 1);
});

test("structurally invalid settings fall back to defaults", () => {
  const fileSystem = createFileSystem(
    JSON.stringify({ bitsActions: { unexpected: true }, testCommands: null }),
  );
  const store = settingsModule.createSettingsStore(
    "memory-settings.json",
    fileSystem,
    silentLogger,
  );
  const settings = store.initSettings();

  assert.equal(settings.testCommandsEnabled, false);
  assert.ok(Array.isArray(settings.bitsActions));
  assert.deepEqual(fileSystem.writes, []);
});

test("overlapping bit actions keep the key action and disable the freeze mapping", () => {
  const fileSystem = createFileSystem(
    JSON.stringify({
      bitsActions: [{ bits: 1, key: "A" }],
      mouseFreezeActions: [{ bits: 1 }],
    }),
  );
  const errors: string[] = [];
  const store = settingsModule.createSettingsStore("memory-settings.json", fileSystem, {
    error: (message) => errors.push(message),
    log() {},
  });
  const settings = store.initSettings();

  assert.deepEqual(settings.bitsActions, [{ bits: 1, key: "A" }]);
  assert.deepEqual(settings.mouseFreezeActions, []);
  assert.equal(errors.length, 1);
});

test("legacy broadcaster tokens are removed from the settings file", () => {
  const fileSystem = createFileSystem(JSON.stringify({ broadcasterToken: "legacy-token" }));
  const errors: string[] = [];
  const store = settingsModule.createSettingsStore("memory-settings.json", fileSystem, {
    error: (message) => errors.push(message),
    log() {},
  });

  store.initSettings();

  assert.equal(errors.length, 1);
  assert.equal(fileSystem.writes.length, 1);
  assert.equal(fileSystem.getContent()?.includes("broadcasterToken"), false);
});

test("legacy broadcaster tokens are removed even when other settings are invalid", () => {
  const fileSystem = createFileSystem(
    JSON.stringify({ broadcasterToken: "legacy-token", bitsActions: null }),
  );
  const errors: string[] = [];
  const store = settingsModule.createSettingsStore("memory-settings.json", fileSystem, {
    error: (message) => errors.push(message),
    log() {},
  });

  store.initSettings();

  assert.equal(fileSystem.writes.length, 1);
  assert.equal(fileSystem.getContent()?.includes("broadcasterToken"), false);
  assert.equal(errors.length, 2);
});
