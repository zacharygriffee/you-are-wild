/**
 * Asset and tileset manifest registry.
 * Keeps provenance, licensing, relative paths, and tile-key mappings outside map logic.
 */
(function() {
  'use strict';

  const TILE_KEYS = {
    unknown: 'unknown',
    biomes: {
      grove: 'terrain-grove',
      forest: 'terrain-forest',
      plains: 'terrain-plains',
      swamp: 'terrain-swamp',
      cave: 'terrain-cave',
      jungle: 'terrain-jungle',
      beach: 'terrain-beach',
      cliff: 'terrain-cliff',
      water: 'terrain-water',
      dungeon: 'terrain-dungeon',
      manor: 'terrain-manor',
      road: 'route-road-horizontal',
      bridge: 'route-bridge-horizontal'
    },
    roads: {
      'north-south': 'route-road-vertical',
      'east-west': 'route-road-horizontal',
      vertical: 'route-road-vertical',
      horizontal: 'route-road-horizontal',
      end: 'route-road-end',
      'corner-ne': 'route-road-corner-ne',
      'corner-es': 'route-road-corner-es',
      'corner-sw': 'route-road-corner-sw',
      'corner-wn': 'route-road-corner-wn',
      't-north': 'route-road-t-north',
      't-east': 'route-road-t-east',
      't-south': 'route-road-t-south',
      't-west': 'route-road-t-west',
      intersection: 'route-road-intersection'
    },
    bridges: {
      'north-south': 'route-bridge-vertical',
      'east-west': 'route-bridge-horizontal',
      vertical: 'route-bridge-vertical',
      horizontal: 'route-bridge-horizontal'
    },
    poi: {
      settlement: 'poi-settlement',
      restSite: 'poi-rest-site',
      dangerSite: 'poi-danger-site',
      resourceSite: 'poi-resource-site',
      landmark: 'poi-landmark',
      structure: 'poi-structure'
    },
    structures: {
      camp: 'structure-camp',
      hut: 'structure-hut',
      ruins: 'structure-ruins',
      spring: 'structure-spring',
      shrine: 'structure-shrine',
      farm: 'structure-farm',
      village: 'structure-village',
      cave: 'structure-cave',
      web: 'structure-web'
    },
    interior: {
      room: 'interior-room',
      cave: 'interior-cave-room',
      exit: 'interior-exit',
      wall: 'interior-wall',
      door: 'interior-door'
    }
  };

  const fallbackTiles = Object.values(TILE_KEYS.biomes)
    .concat(Object.values(TILE_KEYS.roads))
    .concat(Object.values(TILE_KEYS.bridges))
    .concat(Object.values(TILE_KEYS.poi))
    .concat(Object.values(TILE_KEYS.structures))
    .concat(Object.values(TILE_KEYS.interior))
    .concat([TILE_KEYS.unknown])
    .reduce((acc, key) => {
      acc[key] = { fallback: 'emoji' };
      return acc;
    }, {});

  const ASSET_MANIFEST = {
    version: 1,
    activeTileset: 'core-emoji-fallback',
    fallbackTileset: 'core-emoji-fallback',
    tilesets: {
      'core-emoji-fallback': {
        id: 'core-emoji-fallback',
        type: 'tileset',
        version: '1.0.0',
        author: 'Project',
        license: 'project-internal',
        allowedUse: ['bundled', 'mod-fallback', 'redistributable-with-project'],
        provenance: {
          kind: 'procedural_ui',
          tool: 'html-css-emoji',
          generatedBy: 'project',
          generatedAt: null,
          notes: 'No bitmap assets. Map renders text/icon fallback for every known tile key.'
        },
        relativeBasePath: '',
        fallback: { mode: 'emoji', required: true },
        tiles: fallbackTiles
      },
      'painted-chatgpt-image-tileset-placeholder': {
        id: 'painted-chatgpt-image-tileset-placeholder',
        type: 'tileset',
        version: '0.1.0',
        author: 'Project owner',
        license: 'owner-supplied-ai-generated',
        allowedUse: ['first-party-prototype', 'local-build', 'future-mod-pack'],
        enabled: false,
        provenance: {
          kind: 'ai_generated',
          tool: 'ChatGPT Image',
          generatedBy: 'project-owner',
          generatedAt: null,
          source: 'user-provided tilesheet screenshot',
          notes: 'Placeholder metadata only. Individual tile image files have not been extracted or imported yet.'
        },
        relativeBasePath: 'assets/tilesets/painted-chatgpt-image/',
        fallback: { mode: 'tileset-key', tilesetId: 'core-emoji-fallback' },
        tiles: {}
      }
    }
  };

  const AssetManifest = {
    manifest: ASSET_MANIFEST,
    tileKeys: TILE_KEYS,
    getTileset(id = ASSET_MANIFEST.activeTileset) {
      return ASSET_MANIFEST.tilesets[id] || ASSET_MANIFEST.tilesets[ASSET_MANIFEST.fallbackTileset];
    },
    getTileAsset(key, tilesetId = ASSET_MANIFEST.activeTileset) {
      const tileset = this.getTileset(tilesetId);
      const fallback = this.getTileset(ASSET_MANIFEST.fallbackTileset);
      const entry = tileset?.tiles?.[key] || fallback?.tiles?.[key] || null;
      if (!entry) return null;
      return {
        ...entry,
        id: `${tileset.id}:${key}`,
        key,
        tilesetId: tileset.id,
        src: entry.src ? `${tileset.relativeBasePath || ''}${entry.src}` : null,
        provenance: tileset.provenance,
        license: tileset.license,
        allowedUse: tileset.allowedUse || [],
        fallbackMode: entry.fallback || tileset.fallback?.mode || 'emoji'
      };
    },
    registerTileset(tileset) {
      if (!tileset || !tileset.id) return false;
      ASSET_MANIFEST.tilesets[tileset.id] = {
        type: 'tileset',
        version: '1.0.0',
        tiles: {},
        fallback: { mode: 'tileset-key', tilesetId: ASSET_MANIFEST.fallbackTileset },
        ...tileset
      };
      return true;
    },
    setActiveTileset(id) {
      if (!ASSET_MANIFEST.tilesets[id]) return false;
      ASSET_MANIFEST.activeTileset = id;
      return true;
    }
  };

  if (typeof window !== 'undefined') window.AssetManifest = AssetManifest;
  if (typeof globalThis !== 'undefined') globalThis.AssetManifest = AssetManifest;
})();
