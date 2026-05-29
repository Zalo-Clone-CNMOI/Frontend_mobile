# Maestro E2E Flows

End-to-end UI flows for the AI features, written as [Maestro](https://maestro.mobile.dev) YAML.

Maestro is a **standalone CLI** — it is **not** an npm dependency and does not
appear in `package.json`.

## Install (one-time)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

(Windows: install via WSL, or see the Maestro docs for the Windows installer.)

## Run a flow

Start the app on a connected emulator/device (`npm run android` / `npm run ios`),
then:

```bash
maestro test .maestro/<flow>.yaml
```

## App identifiers

- Android `appId`: `com.x22664321k.Zalo_2026` (default in `config.yaml`)
- iOS `bundleId`: `com.nguyenannguyen.zalo`

## Conventions

- One flow file per feature branch, named after the issue, e.g.
  `catchup-autoprompt.yaml`, `translate-error.yaml`, `zai-streaming.yaml`,
  `entity-info-panel.yaml`, `moderation-flag.yaml`, `i18n-locale.yaml`.
- Each flow declares its own `appId:` header so it can run standalone.
- Pass condition: the described tap/input sequence completes with no error/crash
  and the asserted UI element is visible.
