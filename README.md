# prompter-ctl

[![CI](https://github.com/benbalter/prompter-ctl/actions/workflows/ci.yml/badge.svg)](https://github.com/benbalter/prompter-ctl/actions/workflows/ci.yml)

Control the [Elgato Prompter](https://www.elgato.com/us/en/p/prompter) from the
command line — display power, brightness, contrast, and flip — by talking to
Elgato Camera Hub's local control API.

The Prompter is driven as a display, and Camera Hub has no built-in hotkey or
Stream Deck action for turning that display on and off. This gives you a
scriptable one: bind `prompter toggle` to a Stream Deck key, a shortcut, or a
home-automation trigger.

> [!NOTE]
> **Unofficial project.** Not affiliated with, authorized by, or endorsed by
> Elgato or Corsair. "Elgato", "Prompter", and "Camera Hub" are trademarks of
> Corsair Memory, Inc., used here only to describe compatibility. This is an
> independent, clean-room reimplementation of a local protocol observed by use;
> it contains no Elgato/Corsair code. Use at your own risk — see [Legal](#legal).

## How it works

Camera Hub exposes a [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
interface over a local WebSocket — the same interface its own Stream Deck plugin
uses. This tool connects to that API on `127.0.0.1` and reads or sets Prompter
properties (`getSupportedPrompterProperties` / `setPrompterProperty`).

**Camera Hub must be running.** These are undocumented internal methods, so
behavior may change between Camera Hub versions; the property IDs are pinned in
[`src/client.mjs`](src/client.mjs) and easy to update.

## Requirements

- macOS (or wherever Camera Hub runs) with **Elgato Camera Hub** installed and running
- An Elgato Prompter connected
- **Node.js 22+** (uses the built-in `WebSocket` — no runtime dependencies)

## Install

```sh
npm install -g prompter-ctl
```

Or run without installing:

```sh
npx prompter-ctl status
```

Or clone and link for development:

```sh
git clone https://github.com/benbalter/prompter-ctl
cd prompter-ctl
npm link
```

## Usage

```sh
prompter                 # print "on" or "off" (same as `status`)
prompter on              # turn the Prompter display on
prompter off             # turn the Prompter display off
prompter toggle          # flip the Prompter display power
prompter brightness 80   # set brightness (30–100)
prompter contrast 44     # set contrast (1–100)
prompter properties      # dump every supported Prompter property as JSON
prompter --help          # full usage
prompter --version       # print version
```

Exit codes: `0` success · `1` command sent but new state not confirmed · `2`
Camera Hub unreachable · `3` usage error.

## Library

The client is also usable as an ES module:

```js
import { PrompterClient } from "prompter-ctl";

const prompter = await PrompterClient.connect();
console.log(await prompter.isEnabled()); // true | false
await prompter.setEnabled(false);        // turn the display off
prompter.close();
```

See [`PrompterProperty`](src/client.mjs) for the known property IDs
(`ENABLED`, `BRIGHTNESS`, `CONTRAST`, `HORIZONTAL_FLIP`, `MODE`).

## Stream Deck

Camera Hub's own plugin can adjust Prompter brightness and flip, but not display
power. To bind power to a key, point a **System → Open** action (or a small
wrapper app) at `prompter toggle`. Because Stream Deck launches actions without
your shell environment, use an absolute path to `node` and to the CLI, and make
sure Camera Hub is running first.

## Tests

Tests run against a mock Camera Hub — no hardware needed. They use `ws` for the
mock server:

```sh
npm install
npm test
```

## Contributing

Property IDs and methods were derived by observing Camera Hub's own,
publicly-reachable local interface — no decompilation of Elgato software. If a
Camera Hub update changes them, PRs updating [`src/client.mjs`](src/client.mjs)
are welcome. Please keep contributions clean-room: protocol facts only, never
code or assets copied from Elgato/Corsair software.

## Legal

This is an independent, unofficial tool. It is **not** affiliated with,
authorized by, maintained by, sponsored by, or endorsed by Elgato or Corsair
Memory, Inc. "Elgato", "Prompter", "Camera Hub", and "Stream Deck" are
trademarks of their respective owners and are used here solely for nominative,
descriptive purposes (to identify the hardware and software this tool
interoperates with).

The tool talks only to Camera Hub's own local API on your own machine
(`127.0.0.1`) — the same interface Camera Hub's Stream Deck plugin uses. It
implements an interoperable client from observed protocol behavior; it does not
copy, decompile, or redistribute any Elgato/Corsair code, and it circumvents no
access control or license mechanism.

Provided "as is", without warranty of any kind. You are responsible for your own
use, including compliance with any applicable software license or terms for
Elgato Camera Hub. See [LICENSE](LICENSE).

## License

[MIT](LICENSE) © [Ben Balter](https://ben.balter.com)
