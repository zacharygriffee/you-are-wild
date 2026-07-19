# Example Tileset Pack V1

This fixture proves the complete URI-installed Tileset Pack lifecycle without
adding executable rendering code to the asset bundle. Serve the repository
root over localhost or HTTPS, then use **Mods → Import from URI**.

1. Import and install the disabled target module:
   `http://localhost:3000/optional-mods/example-tileset-pack/you-are-wild-example-tileset.yawmod.json`
2. Import and install the code-free asset bundle:
   `http://localhost:3000/optional-mods/example-tileset-pack/bundle.json`
3. Enable **You Are Wild: Example Tileset Override**. Its stone vertical-road
   and current-position layers override only those semantics; all other tiles
   continue through the bundled pack.
4. To exercise replacement, disable the module and review:
   `http://localhost:3000/optional-mods/example-tileset-pack/bundle-replacement.json`
   Install it, then enable the module again. The replacement changes the
   current-position crop and records bundle version `1.1.0`.
5. Disable the module to restore the bundled presentation immediately.

The atlas URI resolves relative to each reviewed manifest. Installation
verifies its SHA-256 and copies the bytes into IndexedDB. Gameplay uses a
session `blob:` lease and never hotlinks the HTTP source. The same manifests
work from the downloaded `file://` game when the serving endpoint permits the
browser's cross-origin request.

This directory is deliberately a development fixture, not a marketplace item.
Sprites, portraits, animation, audio, video, and 3D are outside Tileset Pack V1.
