# HTFD Dashboard

Harmony Township Fire Department station dashboard and administrator interface.

## Install dependencies

```powershell
pnpm install
```

## Verify the project

```powershell
pnpm check
```

## Run locally

```powershell
pnpm start
```

## Build the Windows installer

```powershell
pnpm build:local
```

The installer is written to `dist/`. To publish a GitHub release with `pnpm build`, provide the GitHub token through the `GH_TOKEN` environment variable. Do not commit a token file.

Firebase deployment information is available in `DEPLOYMENT.md`.

The separate Google Apps Script source is intentionally not part of this repository package.
