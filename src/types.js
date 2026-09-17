/** @typedef {{bits: number, key: string, description?: string}} BitsAction */
/** @typedef {{rewardId?: string, rewardTitle?: string, key: string, description?: string}} ChannelPointsAction */
/** @typedef {{command: string, key: string}} TestCommand */
/** @typedef {{bits: number}} MouseFreezeAction */
/**
 * @typedef {Object} Settings
 * @property {string} channel
 * @property {string} broadcasterToken
 * @property {number} cooldownMs
 * @property {number} mouseFreezeDurationMs
 * @property {MouseFreezeAction[]} mouseFreezeActions
 * @property {boolean} testCommandsEnabled
 * @property {string} mouseFreezeCommand
 * @property {TestCommand[]} testCommands
 * @property {BitsAction[]} bitsActions
 * @property {ChannelPointsAction[]} channelPointsActions
 */

module.exports = {};