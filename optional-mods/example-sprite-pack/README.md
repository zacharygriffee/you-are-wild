# Example Sprite Pack V1

This neutral fixture proves the real Asset Bundle V1 and Sprite Pack V1
lifecycle without adding gameplay behavior.

1. Serve the repository over localhost.
2. Import `you-are-wild-example-sprites.yawmod.json` through Mod Manager.
3. Review and install `bundle.json` by URI.
4. Enable the module.

Human and Wolfkin cards use two-frame idle strips plus explicit wounded and
Ghost states. Other species deliberately exercise the pack-local `default`
fallback. The atlas is retained in IndexedDB and rendered through a local
session lease; normal play never hotlinks its source URI.

Run `node scripts/build-example-sprite-atlas.js` to reproduce the tiny fixture
atlas exactly.
