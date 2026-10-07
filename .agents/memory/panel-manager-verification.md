---
name: Panel Manager verification
description: Durable verification notes for the multi-artifact Expo and API workspace.
---

The Panel Manager mobile app and API are separate workspace packages. Run Expo diagnostics from `artifacts/panel-manager`; running `expo-doctor` from the monorepo root cannot infer the SDK. The API typecheck may require the database package declarations to be built first when schema exports were recently changed.

**Why:** The workspace root is not itself the Expo package, while the API consumes generated database package declarations.

**How to apply:** For future validation, run Expo checks from the mobile artifact directory and build/check the database package before diagnosing an API schema import as missing.

When applying audit-generated dependency overrides, inspect existing exact overrides first. A pre-existing exact workspace override can take precedence over a new advisory-range override and keep the vulnerable version in the lockfile.

**Why:** The workspace had an exact global esbuild pin, so the audit-generated range override did not move esbuild until the original pin was updated too.

**How to apply:** After `pnpm audit --fix`, inspect `pnpm-workspace.yaml`, regenerate the lockfile, and verify the resolved version with both `pnpm audit` and the affected package's build.