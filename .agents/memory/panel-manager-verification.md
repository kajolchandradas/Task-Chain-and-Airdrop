---
name: Panel Manager verification
description: Durable verification notes for the multi-artifact Expo and API workspace.
---

The Panel Manager mobile app and API are separate workspace packages. Run Expo diagnostics from `artifacts/panel-manager`; running `expo-doctor` from the monorepo root cannot infer the SDK. The API typecheck may require the database package declarations to be built first when schema exports were recently changed.

**Why:** The workspace root is not itself the Expo package, while the API consumes generated database package declarations.

**How to apply:** For future validation, run Expo checks from the mobile artifact directory and build/check the database package before diagnosing an API schema import as missing.