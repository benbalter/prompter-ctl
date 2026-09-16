#!/usr/bin/env node
// `prompter` — control the Elgato Prompter display from the command line.
//
// Usage:
//   prompter [status]         Print "on" or "off" (default command)
//   prompter on               Turn the Prompter display on
//   prompter off              Turn the Prompter display off
//   prompter toggle           Flip the Prompter display power
//   prompter brightness <n>   Set brightness (30–100)
//   prompter contrast <n>     Set contrast (1–100)
//   prompter properties       Dump all supported Prompter properties as JSON
//
// Exit codes: 0 success · 1 command applied but state not confirmed · 2 Camera
// Hub unreachable · 3 usage error.

import { readFileSync } from "node:fs";
import { PrompterClient, PrompterProperty, CameraHubUnavailableError } from "./client.mjs";

const HELP = `prompter — control the Elgato Prompter display via Camera Hub.

usage: prompter <command>

commands:
  status            Print "on" or "off" (default)
  on                Turn the Prompter display on
  off               Turn the Prompter display off
  toggle            Flip the Prompter display power
  brightness <n>    Set brightness (30-100)
  contrast <n>      Set contrast (1-100)
  properties        Dump all supported Prompter properties as JSON

options:
  -h, --help        Show this help
  -v, --version     Show version

Requires Elgato Camera Hub to be running. Exit codes: 0 ok · 1 unconfirmed ·
2 Camera Hub unreachable · 3 usage error.`;

const [command = "status", argument] = process.argv.slice(2);

if (command === "-h" || command === "--help") {
  console.log(HELP);
  process.exit(0);
}
if (command === "-v" || command === "--version") {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  console.log(version);
  process.exit(0);
}

// Camera Hub is reached over the built-in WebSocket, added to Node in v22.
if (typeof WebSocket === "undefined") {
  process.stderr.write("prompter: requires Node.js 22 or newer (global WebSocket).\n");
  process.exit(2);
}

function usage(message) {
  if (message) process.stderr.write(`prompter: ${message}\n`);
  process.stderr.write(
    "usage: prompter [status|on|off|toggle|brightness <n>|contrast <n>|properties] (--help for more)\n",
  );
  process.exit(3);
}

function intArg(name, min, max) {
  const n = Number(argument);
  if (!Number.isInteger(n) || n < min || n > max) {
    usage(`${name} requires an integer ${min}-${max}`);
  }
  return n;
}

const COMMANDS = ["status", "on", "off", "toggle", "brightness", "contrast", "properties"];
if (!COMMANDS.includes(command)) usage(`unknown command '${command}'`);

let client;
try {
  client = await PrompterClient.connect();

  switch (command) {
    case "status": {
      console.log((await client.isEnabled()) ? "on" : "off");
      break;
    }
    case "on":
    case "off": {
      const target = command === "on";
      const before = await client.isEnabled();
      const after = await client.setEnabled(target);
      console.log(`prompter display: ${before ? "on" : "off"} -> ${after ? "on" : "off"}`);
      if (after !== target) process.exit(1);
      break;
    }
    case "toggle": {
      const before = await client.isEnabled();
      const after = await client.toggleEnabled();
      console.log(`prompter display: ${before ? "on" : "off"} -> ${after ? "on" : "off"}`);
      if (after === before) process.exit(1);
      break;
    }
    case "brightness": {
      const value = intArg("brightness", 30, 100);
      console.log(`brightness -> ${await client.setProperty(PrompterProperty.BRIGHTNESS, value)}`);
      break;
    }
    case "contrast": {
      const value = intArg("contrast", 1, 100);
      console.log(`contrast -> ${await client.setProperty(PrompterProperty.CONTRAST, value)}`);
      break;
    }
    case "properties": {
      console.log(JSON.stringify(await client.describeProperties(), null, 2));
      break;
    }
    default:
      usage(`unknown command '${command}'`);
  }
} catch (error) {
  if (error instanceof CameraHubUnavailableError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
  process.stderr.write(`prompter: ${error.message}\n`);
  process.exit(1);
} finally {
  client?.close();
}
