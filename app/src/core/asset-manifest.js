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

  const BASIC_TILESET_SRC = 'basic-tileset.png';
  const basicTile = (col, row, label, extra = {}) => ({
    src: BASIC_TILESET_SRC,
    sprite: {
      col,
      row,
      label,
      sheet: BASIC_TILESET_SRC
    },
    renderMode: 'sprite-sheet',
    fallback: 'sprite-sheet',
    ...extra
  });

  const basicTiles = {
    [TILE_KEYS.biomes.forest]: basicTile(0, 0, 'dense conifer forest'),
    [TILE_KEYS.biomes.grove]: basicTile(1, 0, 'leafy grove'),
    [TILE_KEYS.biomes.plains]: basicTile(2, 0, 'open grassland'),
    [TILE_KEYS.biomes.swamp]: basicTile(3, 0, 'wet swamp'),
    [TILE_KEYS.biomes.jungle]: basicTile(4, 0, 'tropical jungle'),
    [TILE_KEYS.biomes.cliff]: basicTile(5, 0, 'rock cliff'),
    [TILE_KEYS.biomes.water]: basicTile(6, 0, 'deep water'),
    [TILE_KEYS.biomes.beach]: basicTile(7, 0, 'sand beach'),
    [TILE_KEYS.biomes.cave]: basicTile(0, 1, 'dark cave floor'),
    [TILE_KEYS.biomes.dungeon]: basicTile(1, 1, 'stone dungeon'),
    [TILE_KEYS.roads.vertical]: basicTile(2, 1, 'vertical dirt road'),
    [TILE_KEYS.roads['corner-ne']]: basicTile(3, 1, 'road corner'),
    [TILE_KEYS.roads['corner-es']]: basicTile(3, 1, 'road corner'),
    [TILE_KEYS.roads['corner-sw']]: basicTile(3, 1, 'road corner'),
    [TILE_KEYS.roads['corner-wn']]: basicTile(3, 1, 'road corner'),
    [TILE_KEYS.roads.intersection]: basicTile(4, 1, 'road intersection'),
    [TILE_KEYS.roads.horizontal]: basicTile(4, 1, 'horizontal dirt road'),
    [TILE_KEYS.bridges.horizontal]: basicTile(6, 1, 'horizontal bridge'),
    [TILE_KEYS.bridges.vertical]: basicTile(7, 1, 'vertical bridge'),
    [TILE_KEYS.structures.camp]: basicTile(0, 2, 'camp'),
    [TILE_KEYS.structures.spring]: basicTile(1, 2, 'spring'),
    [TILE_KEYS.structures.shrine]: basicTile(2, 2, 'shrine'),
    [TILE_KEYS.structures.hut]: basicTile(3, 2, 'hut'),
    [TILE_KEYS.structures.farm]: basicTile(4, 2, 'farm'),
    [TILE_KEYS.structures.village]: basicTile(5, 2, 'village'),
    [TILE_KEYS.structures.cave]: basicTile(6, 2, 'cave entrance'),
    [TILE_KEYS.structures.web]: basicTile(7, 2, 'web landmark'),
    [TILE_KEYS.poi.landmark]: basicTile(1, 3, 'map marker'),
    [TILE_KEYS.poi.dangerSite]: basicTile(3, 3, 'danger marker'),
    [TILE_KEYS.poi.resourceSite]: basicTile(4, 3, 'resource marker'),
    [TILE_KEYS.poi.restSite]: basicTile(5, 3, 'rest marker'),
    [TILE_KEYS.poi.settlement]: basicTile(6, 3, 'settlement marker'),
    [TILE_KEYS.poi.structure]: basicTile(6, 3, 'structure marker'),
    [TILE_KEYS.interior.cave]: basicTile(0, 1, 'interior cave room'),
    [TILE_KEYS.interior.room]: basicTile(1, 1, 'interior room'),
    [TILE_KEYS.interior.exit]: basicTile(7, 1, 'interior exit'),
    [TILE_KEYS.interior.wall]: basicTile(5, 0, 'interior wall'),
    [TILE_KEYS.interior.door]: basicTile(2, 2, 'interior door')
  };

  const ASSET_MANIFEST = {
    version: 1,
    activeTileset: 'default-basic-tileset',
    defaultTileset: 'default-basic-tileset',
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
      'default-basic-tileset': {
        id: 'default-basic-tileset',
        type: 'tileset',
        version: '0.1.0',
        author: 'Project owner',
        license: 'owner-supplied-ai-generated',
        allowedUse: ['bundled', 'first-party-prototype', 'local-build', 'future-mod-pack', 'mod-overridable'],
        enabled: true,
        provenance: {
          kind: 'ai_generated',
          tool: 'ChatGPT Image 2',
          generatedBy: 'project-owner',
          generatedAt: null,
          source: 'media/basic-tileset.png',
          notes: 'Owner-supplied AI-generated bitmap tilesheet. Sprite coordinates are coarse metadata for first-party prototyping and future extraction.'
        },
        aiMetadata: {
          aiMade: true,
          modelFamily: 'ChatGPT Image',
          suppliedBy: 'project-owner',
          reviewStatus: 'accepted-for-prototype'
        },
        relativeBasePath: '../media/',
        sheet: {
          src: BASIC_TILESET_SRC,
          width: 1774,
          height: 887,
          columns: 8,
          rows: 4,
          slicing: 'coarse-grid-metadata',
          notes: 'The current sheet is a composed bitmap. Exact sprite extraction/cropping remains future asset-pack work.'
        },
        fallback: { mode: 'tileset-key', tilesetId: 'core-emoji-fallback' },
        tiles: basicTiles
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
      const defaultTileset = this.getTileset(ASSET_MANIFEST.defaultTileset);
      const fallback = this.getTileset(ASSET_MANIFEST.fallbackTileset);
      const localEntry = tileset?.tiles?.[key] || null;
      const defaultEntry = !localEntry && tileset?.id !== defaultTileset?.id ? defaultTileset?.tiles?.[key] || null : null;
      const fallbackEntry = fallback?.tiles?.[key] || null;
      const entry = localEntry || defaultEntry || fallbackEntry;
      if (!entry) return null;
      const sourceTileset = localEntry ? tileset : defaultEntry ? defaultTileset : fallback;
      return {
        ...entry,
        id: `${sourceTileset.id}:${key}`,
        key,
        tilesetId: sourceTileset.id,
        src: entry.src ? `${sourceTileset.relativeBasePath || ''}${entry.src}` : null,
        provenance: sourceTileset.provenance,
        license: sourceTileset.license,
        allowedUse: sourceTileset.allowedUse || [],
        fallbackMode: entry.fallback || sourceTileset.fallback?.mode || 'emoji'
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
