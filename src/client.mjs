// A tiny client for the Elgato Camera Hub local control API.
//
// Camera Hub exposes a JSON-RPC 2.0 interface over a WebSocket on the local
// machine — the same interface the Stream Deck Camera Hub plugin uses. This
// module speaks just enough of it to read and set Prompter properties.
//
// It connects to 127.0.0.1 only. Camera Hub must be running.

/** Camera Hub scans this port range for its control socket. */
export const DEFAULT_PORTS = Array.from({ length: 10 }, (_, i) => 1834 + i);

/**
 * Known Prompter property IDs, as reported by `getSupportedPrompterProperties`.
 * Values are integers; ranges vary by property (see `describeProperties`).
 */
export const PrompterProperty = {
  ENABLED: 17, // display power: 0 = off, 1 = on
  BRIGHTNESS: 0, // 30–100
  CONTRAST: 19, // 1–100
  HORIZONTAL_FLIP: 28, // 0 | 1
  MODE: 1,
};

const RPC_TIMEOUT_MS = 2500;
const CONNECT_TIMEOUT_MS = 1500;

/** Error thrown when Camera Hub can't be reached on any candidate port. */
export class CameraHubUnavailableError extends Error {
  constructor(ports) {
    super(
      `Camera Hub not reachable on 127.0.0.1:${ports[0]}-${ports[ports.length - 1]}. Is Camera Hub running?`,
    );
    this.name = "CameraHubUnavailableError";
  }
}

/** A connected session against Camera Hub's local JSON-RPC WebSocket. */
export class PrompterClient {
  #ws;

  constructor(ws) {
    this.#ws = ws;
  }

  /**
   * Connect to the first Camera Hub port that answers.
   * @param {{ ports?: number[], host?: string }} [options]
   * @returns {Promise<PrompterClient>}
   */
  static async connect({ ports = DEFAULT_PORTS, host = "127.0.0.1" } = {}) {
    for (const port of ports) {
      const ws = await openSocket(`ws://${host}:${port}`).catch(() => null);
      if (ws) return new PrompterClient(ws);
    }
    throw new CameraHubUnavailableError(ports);
  }

  /**
   * Issue a single JSON-RPC call and resolve its result.
   * @param {string} method
   * @param {object} [params]
   */
  call(method, params) {
    const id = Math.floor(Math.random() * 1e6);
    const payload = { jsonrpc: "2.0", id, method, ...(params && { params }) };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => finish(reject, new Error(`Camera Hub RPC timed out: ${method}`)),
        RPC_TIMEOUT_MS,
      );
      const onMessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return; // not for us
        }
        if (message.id !== id) return;
        if (message.error) {
          finish(reject, new Error(`Camera Hub RPC '${method}' failed: ${message.error.message}`));
        } else {
          finish(resolve, message.result);
        }
      };
      const finish = (settle, value) => {
        clearTimeout(timer);
        this.#ws.removeEventListener("message", onMessage);
        settle(value);
      };
      this.#ws.addEventListener("message", onMessage);
      this.#ws.send(JSON.stringify(payload));
    });
  }

  /** Full list of supported Prompter properties (id, friendlyName, value, ranges). */
  describeProperties() {
    return this.call("getSupportedPrompterProperties");
  }

  /**
   * Read one Prompter property's current integer value.
   * @param {number} propertyID
   */
  async getProperty(propertyID) {
    const props = await this.describeProperties();
    const match = props.find((p) => p.propertyID === propertyID);
    if (!match) throw new Error(`Camera Hub did not report property ${propertyID}`);
    return match.value;
  }

  /**
   * Set one Prompter property, then confirm it took.
   * @param {number} propertyID
   * @param {number} value
   */
  async setProperty(propertyID, value) {
    const result = await this.call("setPrompterProperty", { propertyID, value });
    if (result && "value" in result && !result.value) {
      throw new Error(`Camera Hub rejected setting property ${propertyID}`);
    }
    return this.getProperty(propertyID);
  }

  /** Is the Prompter display currently on? */
  async isEnabled() {
    return Boolean(await this.getProperty(PrompterProperty.ENABLED));
  }

  /**
   * Turn the Prompter display on or off.
   * @param {boolean} on
   */
  async setEnabled(on) {
    return Boolean(await this.setProperty(PrompterProperty.ENABLED, on ? 1 : 0));
  }

  /** Flip the Prompter display power and return the new state. */
  async toggleEnabled() {
    return this.setEnabled(!(await this.isEnabled()));
  }

  /** Close the underlying socket. */
  close() {
    this.#ws.close();
  }
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`timed out connecting to ${url}`));
    }, CONNECT_TIMEOUT_MS);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`no listener at ${url}`));
    };
  });
}
