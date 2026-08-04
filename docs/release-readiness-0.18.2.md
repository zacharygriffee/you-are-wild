# Release Readiness — 0.18.2

Status: **released public-access alpha**

This checklist records the 0.18.2 patch evidence. It preserves the 0.18.1 gameplay and Moddable Core boundaries while adding an isolated public playtest surface and deterministic agent fixtures.

## Documentation and identity

- [x] Application package, lockfile, first-party packages, Mod Author Kit, tests, and release metadata identify 0.18.2.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] English and Spanish release metadata describe the exact patch scope.
- [x] `releases/0.18.2.md` records compatibility and exclusions.

## Exact-release evidence

- [x] Full build, source tests, hosted artifact check, viewport suite, interaction suite, branding audit, map acceptance, and whitespace checks pass.
- [x] The Alpha browser matrix launches all eight deterministic fixtures and verifies the public phone-width lab/report flow.
- [x] Alpha fixtures use isolated save/world databases and Alpha-only slot metadata.
- [x] Reports require explicit sharing and contain bounded diagnostic context plus exact build identity.
- [x] Existing representative older-save and module compatibility tests remain green.

## Publication record

- [x] Operator authorized commit, push, and public Sites publication as 0.18.2.
- [ ] GitHub CI passes for the exact merged release revision.
- [ ] The 0.18.2 site deployment reports success and its public URL is verified.

