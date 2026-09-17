# Albion Twitch Bot

Bot para conectar um canal da Twitch ao Albion Online. Ele transforma eventos da live em ações no jogo:

- bits específicos pressionam teclas configuradas;
- resgates de pontos do canal acionam teclas;
- comandos de teste no chat simulam esses eventos;
- uma quantidade de bits pode bloquear o mouse por alguns segundos;
- todas as ações respeitam um cooldown para evitar spam.

## Requisitos

- Windows, porque o envio de teclas usa `keysender` e o bloqueio do mouse usa `user32.dll`;
- Node.js 18 ou superior;
- janela do Albion aberta;
- bot da Twitch criado e autorizado.

## Instalação

```bash
npm install
```

Defina as credenciais do bot no ambiente do terminal. O token não deve ser salvo no código:

```powershell
$env:TWITCH_BOT_USERNAME = "nome_do_bot"
$env:TWITCH_BOT_TOKEN = "oauth:seu_token"
```

Edite `settings.json` e informe `channel`. Para ouvir pontos do canal, preencha também `broadcasterToken` com um token que tenha o escopo `channel:read:redemptions`.

Inicie o bot como administrador:

```bash
npm start
```

O privilégio de administrador é necessário para `BlockInput` e pode ser necessário para enviar teclas ao jogo.

## Configuração

`settings.json` é a configuração operacional e pode ser alterado sem editar o código. Os campos mais importantes são:

| Campo | Função |
| --- | --- |
| `channel` | Canal da Twitch que o bot deve acompanhar. |
| `bitsActions` | Mapeia uma quantidade exata de bits para uma tecla. |
| `channelPointsActions` | Mapeia o título ou ID de uma recompensa para uma tecla. |
| `cooldownMs` | Intervalo mínimo entre ações de teclado. |
| `mouseFreezeActions` | Quantidades de bits que bloqueiam o mouse. |
| `testCommandsEnabled` | Liga ou desliga os comandos de teste. |

Os comandos de teste existentes são listados no terminal quando a conexão é feita. O comando `pontos Nome da recompensa` simula um resgate pelo título.

## Estrutura

- `index.js`: inicialização do processo e conexão do cliente Twitch.
- `src/settings.js`: leitura e combinação da configuração.
- `src/defaultSettings.js`: valores padrão usados na primeira execução.
- `src/handlers/bits.js`: tratamento de bits.
- `src/handlers/messages.js`: comandos de teste do chat.
- `src/chatHandler.js`: composição dos handlers e eventos de conexão.
- `src/pubsub.js`: conexão PubSub e resgates de pontos.
- `src/input.js`: envio de teclas e bloqueio temporário do mouse.
- `src/types.js`: contratos JSDoc usados pelo editor.

As funções públicas possuem comentários JSDoc com `@param`, `@returns` e tipos reutilizáveis. Isso permite que o serviço de linguagem JavaScript do VS Code forneça sugestões e detecte chamadas incompatíveis.

## Build do executável

```bash
npm run build
```

O executável é gerado em `dist/albion-bot.exe`. Antes de distribuir, configure as variáveis de ambiente na máquina que executará o bot e mantenha tokens fora do repositório.

## Segurança

Se um token real já foi publicado em algum lugar, revogue-o no painel da Twitch e gere outro. O projeto não deve conter credenciais versionadas.

## Licença

Este projeto mantém a licença ISC definida no `package.json`.