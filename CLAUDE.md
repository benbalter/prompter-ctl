# CLAUDE.md

Unofficial Node.js CLI and ES module that controls the Elgato Prompter through Camera Hub's local JSON-RPC WebSocket API. The client is [`src/client.mjs`](src/client.mjs), the CLI [`src/cli.mjs`](src/cli.mjs).

## Commands

- `npm ci && npm test` (Node's built-in test runner). Run `npm ci` first: the tests in [`test/`](test/) mock Camera Hub with the `ws` dev dependency and silently skip without it, so a bare `npm test` can pass while testing nothing. CI runs on Node 22 and 24.

## Releasing

The package isn't on npm yet, despite the README's install instructions. Publishing to npm or tagging a release is outward-facing: prepare it if asked, but wait for the owner's explicit go-ahead, and push branches with `--no-follow-tags`.

## Gotchas

- Keep runtime dependencies at zero. The client uses Node 22's built-in `WebSocket`; `ws` is only for tests.
- The JSON-RPC methods and property IDs are undocumented and may change between Camera Hub versions. They're pinned in `PrompterProperty` and `DEFAULT_PORTS` in `src/client.mjs`.
- This is a clean-room client built from observed protocol behavior. Never add Elgato or Corsair code, decompiled or otherwise, and keep the README's non-affiliation and legal notes intact.
- The CLI's exit codes (`0` ok, `1` unconfirmed, `2` Camera Hub unreachable, `3` usage) are documented in the README for scripts to rely on, so treat changes as breaking.
