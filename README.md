# Albion Twitch Bot

Bot that connects a Twitch channel to Albion Online. It turns live stream events into in-game actions:

- specific bit amounts press configured keys;
- channel point redemptions trigger keys;
- chat test commands simulate these events;
- a bit amount can block the mouse for a few seconds;
- every action respects a cooldown to prevent spam.

## Requirements

- Windows, because key input uses `keysender` and mouse blocking uses `user32.dll`;
- Node.js 18 or later;
- Albion open in a window;
- a created and authorized Twitch bot.

## Installation

```bash
npm install
```

Set the bot credentials in the terminal environment. Never store the token in source code:

```powershell
$env:TWITCH_BOT_USERNAME = "nome_do_bot"
$env:TWITCH_BOT_TOKEN = "oauth:seu_token"
```

Edit `settings.json` and set `channel`. To listen for channel points, also fill in `broadcasterToken` with a token that has the `channel:read:redemptions` scope.

Start the bot as administrator:

```bash
npm start
```

Administrator privileges are required by `BlockInput` and may be required to send keys to the game.

## Configuration

`settings.json` contains the operational configuration and can be changed without editing source code. The main fields are:

| Field | Purpose |
| --- | --- |
| `channel` | Twitch channel the bot should monitor. |
| `bitsActions` | Maps an exact bit amount to a key. |
| `channelPointsActions` | Maps a reward title or ID to a key. |
| `cooldownMs` | Minimum interval between keyboard actions. |
| `mouseFreezeActions` | Bit amounts that block the mouse. |
| `testCommandsEnabled` | Enables or disables test commands. |

The available test commands are listed in the terminal after connecting. The `points Reward name` command simulates a redemption by title.

## Project Structure

- `index.js`: process startup and Twitch client connection.
- `src/settings.js`: configuration loading and merging.
- `src/defaultSettings.js`: defaults used on first run.
- `src/handlers/bits.js`: bit event handling.
- `src/handlers/messages.js`: chat test commands.
- `src/chatHandler.js`: handler composition and connection events.
- `src/pubsub.js`: PubSub connection and channel point redemptions.
- `src/input.js`: key input and temporary mouse blocking.
- `src/types.js`: JSDoc contracts used by the editor.

Public functions include JSDoc comments with `@param`, `@returns`, and reusable types. This allows the VS Code JavaScript language service to provide suggestions and detect incompatible calls.

## Building the Executable

```bash
npm run build
```

The executable is generated at `dist/albion-bot.exe`. Before distributing it, configure the environment variables on the target machine and keep tokens outside the repository.

Build outputs such as `dist/`, `dist.rar`, and `albion-bot.exe` are intentionally excluded from Git. The repository keeps the source code and the reproducible build command; a ready-to-use executable should be published as an asset in a GitHub Release instead of being committed to the source branch.

To create a local build, run `npm run build` on Windows. To distribute one, create a release from a reviewed commit and attach the generated executable or archive without including credentials.

## Security

If a real token has ever been published, revoke it in the Twitch dashboard and generate a new one. Credentials must never be committed to the repository.

## License

This project uses the ISC license defined in `package.json`.