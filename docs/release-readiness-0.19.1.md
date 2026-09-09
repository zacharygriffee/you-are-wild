# Release Readiness — 0.19.1

Status: **published and verified on 2026-09-09**.

The operator authorized publishing the 0.19.1 Internal Improvements maintenance
alpha on 2026-09-09. This extends the existing select-group alpha audience.
Broader promotion, service activation, and desktop-host updates are excluded.

- [x] Release record, English/Spanish notes, package mirrors, and first-party
  production metadata identify 0.19.1; minimum module versions stay unchanged.
- [x] Save Schema remains 11 and Module API remains 1.
- [x] The release poster identifies internal improvements rather than new gameplay.
- [x] Exact numbered game full build, including old-save, Continue, module
  lifecycle, desktop/mobile, offline/hosted, artifact, and branding checks.
- [x] Exact source commit and CI recorded.
- [x] Sites runtime, wrapper, catalog, archive history, and poster synchronized.
- [x] Sites build, rendered-page tests, and lint passed.
- [x] Rollback-ready prior Sites version and source recorded.
- [x] Exact site source pushed, packaged, and saved as a Sites version.
- [x] Authorized publication succeeded; live chooser, release notes, game
  version, and poster read back in the live browser; source provenance confirmed
  through the deployed Sites version and validated archive.

The previous recovery main 5498be8 passed all 1296 unit tests and maintained
suites. That result supports the code changes but does not substitute for the
numbered 0.19.1 package checks above. Physical-phone comfort, longer play, and
human Spanish-copy review remain continuing observations.

## Publication receipt

- Game source: `c7e02cabecddda2351557b8eda23f878f342e598` (PR #33), identical
  tree to CI-validated `9a5144fd5e3eabd0499b121f0c02515474ca11af`.
- Local numbered full build passed, including all 1296 unit tests and maintained
  browser, lifecycle, module, offline/hosted, artifact, and branding checks.
- Release CI: https://github.com/zacharygriffee/you-are-wild/actions/runs/34313827514
- Site source: `08b22f0955ddf5d0d62765b9f502cd7dfbf84c48`.
- Site build and all 10 rendered-page/runtime tests passed. Lint passed with the
  existing `no-img-element` warning on the changelog poster and no errors.
- Sites saved version: **44**,
  `appgprj_6a56ecda7a2881918aabdaedbf5420d0~appgver_974809424f7481918283cd03a89737c9`.
- Deployment `appgdep_6aa0ed48bf20819187566f5439979883` reported **succeeded**.
- Live homepage identifies 0.19.1; the changelog shows Internal Improvements,
  the new poster, and retained 0.19.0 history. The game starts successfully and
  its What's New dialog identifies 0.19.1 with matching release notes.
- Public JSON navigation was blocked by the in-app browser. Provenance was
  independently confirmed through Sites version 44, which resolves the exact
  pushed site source, and archive inspection confirmed the game source above.
- Rollback: Sites version **43**,
  `appgprj_6a56ecda7a2881918aabdaedbf5420d0~appgver_e1c3aae44ffc81918b63bc4509a2b612`,
  site source `b5bccf37cd61cfd44a30507001b21c0985d2c4ef`; game tag `v0.19.0`.
- Existing public select-group alpha access is unchanged.

Live release: https://you-are-wild-game.zacharygriffee.chatgpt.site
