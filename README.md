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
$env:TWITCH_BOT_USERNAME = "your_bot_username"
$env:TWITCH_BOT_TOKEN = "oauth:your_token"
$env:TWITCH_BROADCASTER_TOKEN = "your_broadcaster_token"
```

Edit `settings.json` and set `channel`. `TWITCH_BROADCASTER_TOKEN` is optional and is only needed for channel point redemptions; give it only the `channel:read:redemptions` scope. Tokens must not be stored in `settings.json`.

Compile the application before starting it:

```bash
npm run build
```

Start the bot as administrator:

```bash
npm start
```

Run with administrator privileges only if Windows `BlockInput` requires it for the configured freeze behavior. Key sending may also depend on the game's privilege level.

## Configuration

Run `npm run typecheck` to validate TypeScript sources and `npm test` to run the automated tests.

`settings.json` contains the operational configuration and can be changed without editing source code. The main fields are:

| Field                    | Purpose                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `channel`                | Twitch channel the bot should monitor.                                 |
| `bitsActions`            | Maps an exact bit amount to a key.                                     |
| `channelPointsActions`   | Maps a reward title or ID to a key.                                    |
| `cooldownMs`             | Minimum interval between keyboard actions.                             |
| `mouseFreezeActions`     | Bit amounts that block the mouse.                                      |
| `mouseFreezeCooldownMs`  | Minimum interval between input-freeze requests.                        |
| `testCommandsEnabled`    | Enables moderator/broadcaster-only test commands; disabled by default. |
| `testMouseFreezeCommand` | Chat command for a test freeze.                                        |

Test commands are disabled by default. When enabled, only moderators and the broadcaster can invoke configured commands, the freeze command, or `points <reward name>`.

## Project Structure

- `index.ts`: process startup and Twitch client connection.
- `config.ts`: Twitch credentials read from environment variables.
- `src/types/actions.ts`: action configuration contracts.
- `src/types/settings.ts`: application settings contract.
- `src/types/handlers.ts`: dependency contracts for event handlers.
- `src/settings.ts`: configuration loading and merging.
- `src/defaultSettings.ts`: defaults used on first run.
- `src/handlers/bits.ts`: bit event handling.
- `src/handlers/messages.ts`: chat test commands.
- `src/chatHandler.ts`: handler composition and connection events.
- `src/services/twitch/pubsub.ts`: PubSub connection and channel point redemptions.
- `src/services/input/blockMouse.ts`: Windows input blocking.
- `src/services/input/pressKey.ts`: key presses and cooldown handling.

Runtime modules are written in TypeScript and compiled to CommonJS under `dist/app` before packaging.

## Tests

Run the automated tests with:

```bash
npm test
```

The suite covers configuration, settings validation, PubSub, key presses, mouse blocking, chat connection handlers, bit events, and chat commands. Tests use injected fakes for environment variables, the settings file system, Twitch clients, WebSockets, timers, key sending, and Windows input blocking. They do not connect to Twitch, call Windows APIs, send real keyboard or mouse input, or require Albion to be running. GitHub Actions runs this suite on Windows.

These are isolated tests, not end-to-end checks of Twitch connectivity, `tmi.js` reconnection behavior, or interaction with Albion and Windows input APIs.

## Known Limitations and Risks

- IRC reconnection is handled by `tmi.js`; the bot does not schedule a second manual reconnect. Live reconnect behavior still requires validation with Twitch.
- Test commands are disabled by default and require a moderator or broadcaster role when enabled.
- Mouse-freeze requests have their own cooldown; an accepted later request extends the block, and stale timers cannot release it early.
- `settings.json` values are validated at load time. Invalid files fall back to defaults, and overlapping bit mappings keep the key action while disabling the conflicting freeze.
- Broadcaster tokens belong in `TWITCH_BROADCASTER_TOKEN`, not in `settings.json`. If a real token was previously stored or committed, remove it and revoke/rotate it.

## Formatting and Git Hooks

Run Prettier across the project with:

```bash
npm run format
```

`npm install` enables the Husky pre-commit hook. Before each commit, lint-staged formats supported staged files. GitHub Actions runs `npm run format:check` on pushes and pull requests.

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
