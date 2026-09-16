// Unit tests against a mock Camera Hub JSON-RPC WebSocket server. No hardware
// or Camera Hub install required.
//
// Uses the `ws` package if available; otherwise skips (kept dependency-free by
// default). Install with `npm i -D ws` to run these.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PrompterClient, PrompterProperty, CameraHubUnavailableError } from "../src/client.mjs";

let WebSocketServer;
try {
  ({ WebSocketServer } = await import("ws"));
} catch {
  // ws not installed; tests below self-skip.
}

/** Spin up a mock Camera Hub that tracks Prompter Enabled state. */
async function startMockCameraHub(initialEnabled = 1) {
  let enabled = initialEnabled;
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise((r) => server.on("listening", r));

  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const { id, method, params } = JSON.parse(raw.toString());
      const properties = () => [
        { propertyID: PrompterProperty.ENABLED, friendlyName: "Prompter Enabled", value: enabled },
        { propertyID: PrompterProperty.BRIGHTNESS, friendlyName: "Prompter Brightness", value: 100 },
      ];
      let result;
      if (method === "getSupportedPrompterProperties") {
        result = properties();
      } else if (method === "setPrompterProperty") {
        if (params.propertyID === PrompterProperty.ENABLED) enabled = params.value;
        result = { value: true };
      }
      socket.send(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });

  return { port: server.address().port, close: () => server.close() };
}

test("connect + isEnabled reads reported state", { skip: !WebSocketServer }, async () => {
  const hub = await startMockCameraHub(1);
  const client = await PrompterClient.connect({ ports: [hub.port] });
  assert.equal(await client.isEnabled(), true);
  client.close();
  hub.close();
});

test("setEnabled(false) turns the display off", { skip: !WebSocketServer }, async () => {
  const hub = await startMockCameraHub(1);
  const client = await PrompterClient.connect({ ports: [hub.port] });
  assert.equal(await client.setEnabled(false), false);
  assert.equal(await client.isEnabled(), false);
  client.close();
  hub.close();
});

test("toggleEnabled flips state", { skip: !WebSocketServer }, async () => {
  const hub = await startMockCameraHub(0);
  const client = await PrompterClient.connect({ ports: [hub.port] });
  assert.equal(await client.toggleEnabled(), true);
  client.close();
  hub.close();
});

test("connect throws when no port answers", async () => {
  await assert.rejects(
    () => PrompterClient.connect({ ports: [1] }),
    CameraHubUnavailableError,
  );
});
