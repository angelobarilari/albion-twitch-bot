/**
 * Valores usados quando settings.json ainda não existe.
 * @type {import("./types").Settings}
 */
const defaultSettings = {
    channel: "",
    broadcasterToken: "",
    cooldownMs: 3000,
    mouseFreezeDurationMs: 5000,
    mouseFreezeActions: [{ bits: 1 }],
    testCommandsEnabled: true,
    mouseFreezeCommand: "mousefreeze",
    testCommands: [
        { command: "dismount", key: "A" },
        { command: "press q", key: "Q" },
        { command: "press w", key: "W" },
        { command: "press e", key: "E" },
        { command: "press armor", key: "R" },
        { command: "press helmet", key: "D" },
        { command: "press boots", key: "F" },
        { command: "press potion", key: "1" },
        { command: "press food", key: "2" },
        { command: "use overcharge", key: "O" },
    ],
    bitsActions: [
        { bits: 1, key: "A", description: "Dismount" },
        { bits: 2, key: "Q", description: "Habilidade Q" },
        { bits: 3, key: "W", description: "Habilidade W" },
        { bits: 4, key: "E", description: "Habilidade E" },
        { bits: 5, key: "R", description: "Armadura" },
        { bits: 6, key: "D", description: "Capacete" },
        { bits: 7, key: "F", description: "Botas" },
        { bits: 8, key: "1", description: "Poção" },
        { bits: 9, key: "2", description: "Comida" },
        { bits: 10, key: "O", description: "Overcharge" },
    ],
    channelPointsActions: [
        { rewardTitle: "Habilidade Q", key: "Q", description: "Habilidade Q" },
        { rewardTitle: "Habilidade W", key: "W", description: "Habilidade W" },
        { rewardTitle: "Habilidade E", key: "E", description: "Habilidade E" },
    ],
};

module.exports = { defaultSettings };