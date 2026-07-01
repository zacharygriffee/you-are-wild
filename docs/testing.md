# Testing

The current test runner is intentionally lightweight and runs in Node.

## Commands

```sh
npm test
npm run test:core
npm run test:ui
npm run lint
npm run check
npm run full-build
```

## Filters

`test/test.js` supports:

- `--filter=core`
- `--filter=ui`

Unknown filters fail fast.

## Current Coverage

The tests cover:

- JavaScript syntax for every source module
- expected core app structure
- save/load codec presence
- content-system structure
- required template screens and panels

The tests are smoke and structure checks. They do not yet replace browser interaction tests. Higher-confidence follow-up work should add DOM smoke tests and behavior tests for serialization, content preferences, save slots, and module manifests.
