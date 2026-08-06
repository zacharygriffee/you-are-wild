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
      sand: 'terrain-sand',
      dungeon: 'terrain-dungeon',
      manor: 'terrain-manor',
      farm: 'terrain-farm',
      indoors: 'terrain-indoors',
      entrance: 'terrain-entrance',
      road: 'route-road-horizontal',
      bridge: 'route-bridge-horizontal'
    },
    roads: {
      'north-south': 'route-road-vertical',
      'east-west': 'route-road-horizontal',
      vertical: 'route-road-vertical',
      horizontal: 'route-road-horizontal',
      end: 'route-road-end',
      'end-north': 'route-road-end-north',
      'end-east': 'route-road-end-east',
      'end-south': 'route-road-end-south',
      'end-west': 'route-road-end-west',
      corner: 'route-road-corner',
      'corner-ne': 'route-road-corner-ne',
      'corner-es': 'route-road-corner-es',
      'corner-sw': 'route-road-corner-sw',
      'corner-wn': 'route-road-corner-wn',
      't-north': 'route-road-t-north',
      't-east': 'route-road-t-east',
      't-south': 'route-road-t-south',
      't-west': 'route-road-t-west',
      't-n': 'route-road-t-north',
      't-e': 'route-road-t-east',
      't-s': 'route-road-t-south',
      't-w': 'route-road-t-west',
      intersection: 'route-road-intersection'
    },
    bridges: {
      'north-south': 'route-bridge-vertical',
      'east-west': 'route-bridge-horizontal',
      vertical: 'route-bridge-vertical',
      horizontal: 'route-bridge-horizontal'
    },
    covers: {
      foliage: 'cover-foliage',
      obstacle: 'cover-obstacle',
      conifer: 'cover-conifer',
      broadleaf: 'cover-broadleaf',
      jungle: 'cover-jungle',
      jungleCanopy: 'cover-jungle-canopy',
      jungleUndergrowth: 'cover-jungle-undergrowth',
      jungleLitter: 'cover-jungle-litter',
      jungleSpill: 'cover-jungle-spill',
      groveIdentity: 'cover-grove-identity',
      groveSpill: 'cover-grove-spill',
      forestIdentity: 'cover-forest-identity',
      forestSpill: 'cover-forest-spill',
      plainsIdentity: 'cover-plains-identity',
      plainsSpill: 'cover-plains-spill',
      swampIdentity: 'cover-swamp-identity',
      swampSpill: 'cover-swamp-spill',
      caveIdentity: 'cover-cave-identity',
      caveSpill: 'cover-cave-spill',
      beachIdentity: 'cover-beach-identity',
      reeds: 'cover-reeds',
      grass: 'cover-grass',
      drift: 'cover-drift',
      scrub: 'cover-scrub',
      rock: 'cover-rock'
    },
    elevation: Object.fromEntries(
      ['slope', 'ledge', 'cliff'].flatMap(kind =>
        ['north', 'east', 'south', 'west'].map(direction => [
          `${kind}-${direction}`,
          `terrain-elevation-${kind}-${direction}`
        ])
      )
    ),
    groundTransitions: Object.fromEntries(
      ['grove', 'forest', 'plains', 'swamp', 'cave', 'jungle', 'beach', 'cliff', 'water', 'sand']
        .flatMap(biome => ['north', 'east', 'south', 'west'].map(direction => [
          `${biome}-${direction}`,
          `ground-transition-${biome}-${direction}`
        ]))
    ),
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
      web: 'structure-web',
      cabin: 'structure-cabin',
      pond: 'structure-pond',
      tree: 'structure-great-tree',
      burrow: 'structure-burrow',
      nest: 'structure-nest',
      caveMouth: 'structure-cave-mouth'
    },
    evidence: {
      item: 'evidence-item',
      provisions: 'evidence-provisions',
      remains: 'evidence-remains',
      recoveryBag: 'evidence-recovery-bag',
      depleted: 'evidence-depleted',
      placedObject: 'evidence-placed-object',
      trailMarker: 'evidence-trail-marker'
    },
    presence: {
      occupants: 'presence-occupants'
    },
    interior: {
      room: 'interior-room',
      cave: 'interior-cave-room',
      exit: 'interior-exit',
      wall: 'interior-wall',
      door: 'interior-door',
      entrance: 'interior-entrance'
    },
    interiorPaths: {
      isolated: 'interior-path-isolated',
      'end-north': 'interior-path-end-north',
      'end-east': 'interior-path-end-east',
      'end-south': 'interior-path-end-south',
      'end-west': 'interior-path-end-west',
      horizontal: 'interior-path-horizontal',
      vertical: 'interior-path-vertical',
      'corner-ne': 'interior-path-corner-ne',
      'corner-es': 'interior-path-corner-es',
      'corner-sw': 'interior-path-corner-sw',
      'corner-wn': 'interior-path-corner-wn',
      't-north': 'interior-path-t-north',
      't-east': 'interior-path-t-east',
      't-south': 'interior-path-t-south',
      't-west': 'interior-path-t-west',
      intersection: 'interior-path-intersection'
    },
    interiorDoors: {
      north: 'interior-door-north',
      east: 'interior-door-east',
      south: 'interior-door-south',
      west: 'interior-door-west'
    },
    interiorExits: {
      north: 'interior-exit-north',
      east: 'interior-exit-east',
      south: 'interior-exit-south',
      west: 'interior-exit-west'
    },
    interiorWalls: {
      north: 'interior-wall-north',
      east: 'interior-wall-east',
      south: 'interior-wall-south',
      west: 'interior-wall-west'
    },
    shorelines: {
      north: 'shoreline-water-north',
      east: 'shoreline-water-east',
      south: 'shoreline-water-south',
      west: 'shoreline-water-west'
    },
    shorelineCorners: {
      'outer-ne': 'shoreline-water-outer-ne',
      'outer-es': 'shoreline-water-outer-es',
      'outer-sw': 'shoreline-water-outer-sw',
      'outer-wn': 'shoreline-water-outer-wn',
      'inner-ne': 'shoreline-water-inner-ne',
      'inner-es': 'shoreline-water-inner-es',
      'inner-sw': 'shoreline-water-inner-sw',
      'inner-wn': 'shoreline-water-inner-wn'
    },
    effects: {
      dangerInfluence: 'state-danger-influence'
    },
    states: {
      current: 'state-current',
      quest: 'state-quest',
      blocked: 'state-blocked',
      danger: 'state-danger',
      'blocked-north': 'state-blocked-north',
      'blocked-east': 'state-blocked-east',
      'blocked-south': 'state-blocked-south',
      'blocked-west': 'state-blocked-west'
    }
  };

  const fallbackTiles = Object.values(TILE_KEYS.biomes)
    .concat(Object.values(TILE_KEYS.roads))
    .concat(Object.values(TILE_KEYS.bridges))
    .concat(Object.values(TILE_KEYS.covers))
    .concat(Object.values(TILE_KEYS.elevation))
    .concat(Object.values(TILE_KEYS.groundTransitions))
    .concat(Object.values(TILE_KEYS.poi))
    .concat(Object.values(TILE_KEYS.structures))
    .concat(Object.values(TILE_KEYS.evidence))
    .concat(Object.values(TILE_KEYS.presence))
    .concat(Object.values(TILE_KEYS.interior))
    .concat(Object.values(TILE_KEYS.interiorPaths))
    .concat(Object.values(TILE_KEYS.interiorDoors))
    .concat(Object.values(TILE_KEYS.interiorExits))
    .concat(Object.values(TILE_KEYS.interiorWalls))
    .concat(Object.values(TILE_KEYS.shorelines))
    .concat(Object.values(TILE_KEYS.shorelineCorners))
    .concat(Object.values(TILE_KEYS.effects))
    .concat(Object.values(TILE_KEYS.states))
    .concat([TILE_KEYS.unknown])
    .reduce((acc, key) => {
      acc[key] = { fallback: 'emoji' };
      return acc;
    }, {});

  const BASIC_TILESET_SRC = 'basic-tileset-v1.png';
  const BASIC_TILESET_WIDTH = 1774;
  const BASIC_TILESET_HEIGHT = 887;
  const BASIC_TILESET_COLUMNS = 8;
  const BASIC_TILESET_ROWS = 4;
  const BASIC_TILESET_OVERLAY_SRC = 'basic-tileset-overlays-v1.png';
  const BASIC_TILESET_OVERLAY_WIDTH = 1254;
  const BASIC_TILESET_OVERLAY_HEIGHT = 1254;
  const BASIC_TILESET_OVERLAY_COLUMNS = 4;
  const BASIC_TILESET_OVERLAY_ROWS = 4;
  const BASIC_TILESET_MATERIAL_SRC = 'terrain-sand-seamless-v1.png';
  const BASIC_TILESET_MATERIAL_WIDTH = 512;
  const BASIC_TILESET_MATERIAL_HEIGHT = 512;
  const TILESET_MATERIAL_V2_SRC = 'terrain-materials-v2.png';
  const TILESET_MATERIAL_V2_WIDTH = 768;
  const TILESET_MATERIAL_V2_HEIGHT = 768;
  const TILESET_MATERIAL_V2_COLUMNS = 3;
  const TILESET_MATERIAL_V2_ROWS = 3;
  const TILESET_BRIDGE_V2_SRC = 'bridge-span-v2.png';
  const TILESET_BRIDGE_V2_WIDTH = 1024;
  const TILESET_BRIDGE_V2_HEIGHT = 512;
  const TILESET_BRIDGE_V2_CELL_SIZE = 512;
  const TILESET_COVER_V2_SRC = 'foliage-cover-v2.png';
  const TILESET_COVER_V2_SIZE = 512;
  const TILESET_COVER_V3_SRC = 'cover-overlays-v3.png';
  const TILESET_COVER_V3_WIDTH = 1774;
  const TILESET_COVER_V3_HEIGHT = 887;
  const TILESET_COVER_V3_COLUMNS = 4;
  const TILESET_COVER_V3_ROWS = 2;
  const TILESET_RELIEF_V1_SRC = 'terrain-relief-v1.png';
  const TILESET_RELIEF_V1_WIDTH = 1995;
  const TILESET_RELIEF_V1_HEIGHT = 788;
  const TILESET_JUNGLE_STRATA_V1_SRC = 'jungle-strata-v1.png';
  const TILESET_JUNGLE_STRATA_V1_WIDTH = 1774;
  const TILESET_JUNGLE_STRATA_V1_HEIGHT = 887;
  const TILESET_BIOME_STRATA_V2_SRC = 'biome-strata-v2.png';
  const TILESET_BIOME_STRATA_V2_WIDTH = 1500;
  const TILESET_BIOME_STRATA_V2_HEIGHT = 600;
  const TILESET_BIOME_STRATA_V2_COLUMNS = 5;
  const TILESET_BIOME_STRATA_V2_ROWS = 2;
  const TILESET_STRUCTURE_V3_SRC = 'structure-overlays-v3.png';
  const TILESET_STRUCTURE_V3_WIDTH = 1254;
  const TILESET_STRUCTURE_V3_HEIGHT = 1254;
  const TILESET_STRUCTURE_V3_COLUMNS = 4;
  const TILESET_STRUCTURE_V3_ROWS = 4;
  const TILESET_POI_V3_SRC = 'poi-overlays-v3.png';
  const TILESET_POI_V3_WIDTH = 1536;
  const TILESET_POI_V3_HEIGHT = 1024;
  const TILESET_POI_V3_COLUMNS = 3;
  const TILESET_POI_V3_ROWS = 2;
  const TILESET_EVIDENCE_V3_SRC = 'evidence-overlays-v3.png';
  const TILESET_EVIDENCE_V3_WIDTH = 1774;
  const TILESET_EVIDENCE_V3_HEIGHT = 887;
  const TILESET_EVIDENCE_V3_COLUMNS = 4;
  const TILESET_EVIDENCE_V3_ROWS = 2;
  const gridRect = (width, height, columns, rows, col, row) => {
    const x = Math.floor((col * width) / columns);
    const y = Math.floor((row * height) / rows);
    const right = Math.floor(((col + 1) * width) / columns);
    const bottom = Math.floor(((row + 1) * height) / rows);
    return { x, y, width: right - x, height: bottom - y };
  };
  const basicTileRect = (col, row) => {
    const x = Math.floor((col * BASIC_TILESET_WIDTH) / BASIC_TILESET_COLUMNS);
    const y = Math.floor((row * BASIC_TILESET_HEIGHT) / BASIC_TILESET_ROWS);
    const right = Math.floor(((col + 1) * BASIC_TILESET_WIDTH) / BASIC_TILESET_COLUMNS);
    const bottom = Math.floor(((row + 1) * BASIC_TILESET_HEIGHT) / BASIC_TILESET_ROWS);
    return { x, y, width: right - x, height: bottom - y };
  };
  const basicTile = (col, row, label, extra = {}) => ({
    src: BASIC_TILESET_SRC,
    sprite: {
      col,
      row,
      label,
      sheet: BASIC_TILESET_SRC,
      rect: basicTileRect(col, row)
    },
    renderMode: 'sprite-sheet',
    fallback: 'sprite-sheet',
    ...extra
  });
  const basicTileFromRect = (rect, label, extra = {}) => ({
    src: BASIC_TILESET_SRC,
    sprite: {
      label,
      sheet: BASIC_TILESET_SRC,
      rect: { ...rect }
    },
    renderMode: 'sprite-sheet',
    fallback: 'sprite-sheet',
    ...extra
  });
  const basicMaterialTile = (label, extra = {}) => ({
    src: BASIC_TILESET_MATERIAL_SRC,
    sprite: {
      label,
      sheet: BASIC_TILESET_MATERIAL_SRC,
      rect: { x: 0, y: 0, width: BASIC_TILESET_MATERIAL_WIDTH, height: BASIC_TILESET_MATERIAL_HEIGHT }
    },
    renderMode: 'sprite-sheet',
    fallback: 'sprite-sheet',
    ...extra
  });
  const materialV2Rect = (col, row) => ({
    x: col * (TILESET_MATERIAL_V2_WIDTH / TILESET_MATERIAL_V2_COLUMNS),
    y: row * (TILESET_MATERIAL_V2_HEIGHT / TILESET_MATERIAL_V2_ROWS),
    width: TILESET_MATERIAL_V2_WIDTH / TILESET_MATERIAL_V2_COLUMNS,
    height: TILESET_MATERIAL_V2_HEIGHT / TILESET_MATERIAL_V2_ROWS
  });
  const materialV2Tile = (col, row, label, extra = {}) => ({
    src: TILESET_MATERIAL_V2_SRC,
    sprite: {
      col,
      row,
      label,
      sheet: TILESET_MATERIAL_V2_SRC,
      rect: materialV2Rect(col, row)
    },
    renderMode: 'sprite-sheet',
    fallback: 'sprite-sheet',
    ...extra
  });
  const fullV2Tile = (src, size, label, extra = {}) => ({
    src,
    sprite: { label, sheet: src, rect: { x: 0, y: 0, width: size, height: size } },
    renderMode: 'sprite-sheet-overlay',
    fallback: 'sprite-sheet',
    ...extra
  });
  const transparentGridTile = (src, width, height, columns, rows, col, row, label, extra = {}) => ({
    src,
    sprite: {
      col,
      row,
      label,
      sheet: src,
      rect: gridRect(width, height, columns, rows, col, row)
    },
    renderMode: 'sprite-sheet-overlay',
    fallback: 'sprite-sheet',
    ...extra
  });
  const transparentRectTile = (src, rect, label, transform = {}) => ({
    src,
    sprite: {
      label,
      sheet: src,
      rect: { ...rect },
      transform: { rotate: 0, flipX: false, flipY: false, ...transform }
    },
    renderMode: 'sprite-sheet-overlay',
    fallback: 'sprite-sheet'
  });
  const bridgeV2Tile = (col, label) => ({
    src: TILESET_BRIDGE_V2_SRC,
    sprite: {
      col,
      row: 0,
      label,
      sheet: TILESET_BRIDGE_V2_SRC,
      rect: { x: col * TILESET_BRIDGE_V2_CELL_SIZE, y: 0, width: TILESET_BRIDGE_V2_CELL_SIZE, height: TILESET_BRIDGE_V2_CELL_SIZE }
    },
    renderMode: 'sprite-sheet-overlay',
    fallback: 'sprite-sheet'
  });
  const overlayTileRect = (col, row) => {
    const x = Math.floor((col * BASIC_TILESET_OVERLAY_WIDTH) / BASIC_TILESET_OVERLAY_COLUMNS);
    const y = Math.floor((row * BASIC_TILESET_OVERLAY_HEIGHT) / BASIC_TILESET_OVERLAY_ROWS);
    const right = Math.floor(((col + 1) * BASIC_TILESET_OVERLAY_WIDTH) / BASIC_TILESET_OVERLAY_COLUMNS);
    const bottom = Math.floor(((row + 1) * BASIC_TILESET_OVERLAY_HEIGHT) / BASIC_TILESET_OVERLAY_ROWS);
    return { x, y, width: right - x, height: bottom - y };
  };
  const overlayTile = (col, row, label, transform = {}) => ({
    src: BASIC_TILESET_OVERLAY_SRC,
    sprite: {
      col,
      row,
      label,
      sheet: BASIC_TILESET_OVERLAY_SRC,
      rect: overlayTileRect(col, row),
      transform: { rotate: 0, flipX: false, flipY: false, ...transform }
    },
    renderMode: 'sprite-sheet-overlay',
    fallback: 'sprite-sheet'
  });

  const basicTiles = {
    [TILE_KEYS.biomes.forest]: materialV2Tile(2, 0, 'seamless pine forest floor'),
    [TILE_KEYS.biomes.grove]: materialV2Tile(1, 0, 'seamless leafy grove floor'),
    [TILE_KEYS.biomes.plains]: materialV2Tile(0, 0, 'seamless grass meadow'),
    [TILE_KEYS.biomes.swamp]: materialV2Tile(0, 1, 'seamless swamp mud'),
    [TILE_KEYS.biomes.jungle]: materialV2Tile(1, 1, 'seamless jungle floor'),
    [TILE_KEYS.biomes.cliff]: materialV2Tile(1, 2, 'seamless mountain rock'),
    [TILE_KEYS.biomes.water]: materialV2Tile(0, 2, 'seamless deep water'),
    [TILE_KEYS.biomes.sand]: materialV2Tile(2, 1, 'seamless neutral sand'),
    [TILE_KEYS.biomes.beach]: materialV2Tile(2, 1, 'seamless neutral beach sand'),
    [TILE_KEYS.biomes.cave]: materialV2Tile(2, 2, 'seamless dark cave floor'),
    [TILE_KEYS.biomes.dungeon]: materialV2Tile(2, 2, 'seamless stone dungeon'),
    [TILE_KEYS.biomes.manor]: materialV2Tile(2, 2, 'seamless stone manor interior'),
    [TILE_KEYS.biomes.farm]: materialV2Tile(0, 0, 'seamless open farm terrain'),
    [TILE_KEYS.biomes.indoors]: basicTile(1, 1, 'indoor floor'),
    [TILE_KEYS.biomes.entrance]: basicTile(1, 1, 'structure entrance floor'),
    [TILE_KEYS.roads.vertical]: overlayTile(0, 0, 'vertical dirt road overlay'),
    [TILE_KEYS.roads.horizontal]: overlayTile(0, 0, 'horizontal dirt road overlay', { rotate: 90 }),
    [TILE_KEYS.roads.end]: overlayTile(0, 1, 'north dirt road end overlay'),
    [TILE_KEYS.roads.corner]: overlayTile(1, 0, 'north-east road corner overlay'),
    [TILE_KEYS.roads['end-north']]: overlayTile(0, 1, 'north dirt road end overlay'),
    [TILE_KEYS.roads['end-east']]: overlayTile(0, 1, 'east dirt road end overlay', { rotate: 90 }),
    [TILE_KEYS.roads['end-south']]: overlayTile(0, 1, 'south dirt road end overlay', { rotate: 180 }),
    [TILE_KEYS.roads['end-west']]: overlayTile(0, 1, 'west dirt road end overlay', { rotate: 270 }),
    [TILE_KEYS.roads['corner-ne']]: overlayTile(1, 0, 'north-east road corner overlay'),
    [TILE_KEYS.roads['corner-es']]: overlayTile(1, 0, 'east-south road corner overlay', { rotate: 90 }),
    [TILE_KEYS.roads['corner-sw']]: overlayTile(1, 0, 'south-west road corner overlay', { rotate: 180 }),
    [TILE_KEYS.roads['corner-wn']]: overlayTile(1, 0, 'west-north road corner overlay', { rotate: 270 }),
    [TILE_KEYS.roads['t-south']]: overlayTile(2, 0, 'south road T overlay'),
    [TILE_KEYS.roads['t-west']]: overlayTile(2, 0, 'west road T overlay', { rotate: 90 }),
    [TILE_KEYS.roads['t-north']]: overlayTile(2, 0, 'north road T overlay', { rotate: 180 }),
    [TILE_KEYS.roads['t-east']]: overlayTile(2, 0, 'east road T overlay', { rotate: 270 }),
    [TILE_KEYS.roads.intersection]: overlayTile(3, 0, 'road intersection overlay'),
    [TILE_KEYS.bridges.vertical]: bridgeV2Tile(0, 'seamless vertical bridge overlay'),
    [TILE_KEYS.bridges.horizontal]: bridgeV2Tile(1, 'seamless horizontal bridge overlay'),
    [TILE_KEYS.covers.foliage]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 0, 'transparent broadleaf cover'),
    [TILE_KEYS.covers.obstacle]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 1, 'transparent rock obstacle'),
    [TILE_KEYS.covers.conifer]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 0, 0, 'transparent conifer cover'),
    [TILE_KEYS.covers.broadleaf]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 0, 'transparent broadleaf cover'),
    [TILE_KEYS.covers.jungle]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 2, 0, 'transparent jungle cover'),
    [TILE_KEYS.covers.jungleCanopy]: transparentRectTile(TILESET_JUNGLE_STRATA_V1_SRC, { x: 44, y: 241, width: 398, height: 406 }, 'transparent jungle canopy'),
    [TILE_KEYS.covers.jungleUndergrowth]: transparentRectTile(TILESET_JUNGLE_STRATA_V1_SRC, { x: 483, y: 252, width: 384, height: 377 }, 'transparent jungle undergrowth'),
    [TILE_KEYS.covers.jungleLitter]: transparentRectTile(TILESET_JUNGLE_STRATA_V1_SRC, { x: 923, y: 253, width: 407, height: 382 }, 'transparent jungle floor detail'),
    [TILE_KEYS.covers.jungleSpill]: transparentRectTile(TILESET_JUNGLE_STRATA_V1_SRC, { x: 1330, y: 245, width: 408, height: 362 }, 'transparent jungle edge spill'),
    [TILE_KEYS.covers.groveIdentity]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 0, 0, 'transparent grove identity'),
    [TILE_KEYS.covers.groveSpill]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 0, 1, 'transparent grove edge spill'),
    [TILE_KEYS.covers.forestIdentity]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 1, 0, 'transparent forest identity'),
    [TILE_KEYS.covers.forestSpill]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 1, 1, 'transparent forest edge spill'),
    [TILE_KEYS.covers.plainsIdentity]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 2, 0, 'transparent plains identity'),
    [TILE_KEYS.covers.plainsSpill]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 2, 1, 'transparent plains edge spill'),
    [TILE_KEYS.covers.swampIdentity]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 3, 0, 'transparent swamp identity'),
    [TILE_KEYS.covers.swampSpill]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 3, 1, 'transparent swamp edge spill'),
    [TILE_KEYS.covers.caveIdentity]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 4, 0, 'transparent cave identity'),
    [TILE_KEYS.covers.caveSpill]: transparentGridTile(TILESET_BIOME_STRATA_V2_SRC, TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 4, 1, 'transparent cave edge spill'),
    [TILE_KEYS.covers.beachIdentity]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 1, 'transparent beach drift identity'),
    [TILE_KEYS.covers.reeds]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 0, 'transparent reeds cover'),
    [TILE_KEYS.covers.grass]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 0, 1, 'transparent grass cover'),
    [TILE_KEYS.covers.drift]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 1, 'transparent drift cover'),
    [TILE_KEYS.covers.scrub]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 2, 1, 'transparent scrub cover'),
    [TILE_KEYS.covers.rock]: transparentGridTile(TILESET_COVER_V3_SRC, TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 1, 'transparent rock cover'),
    [TILE_KEYS.structures.camp]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 0, 'camp overlay'),
    [TILE_KEYS.structures.hut]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 0, 'hut overlay'),
    [TILE_KEYS.structures.ruins]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 0, 'ruins overlay'),
    [TILE_KEYS.structures.spring]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 0, 'spring overlay'),
    [TILE_KEYS.structures.shrine]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 1, 'shrine overlay'),
    [TILE_KEYS.structures.farm]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 1, 'farm overlay'),
    [TILE_KEYS.structures.village]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 1, 'village overlay'),
    [TILE_KEYS.structures.cave]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 1, 'cave overlay'),
    [TILE_KEYS.structures.web]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 2, 'web overlay'),
    [TILE_KEYS.structures.cabin]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 2, 'cabin overlay'),
    [TILE_KEYS.structures.pond]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 2, 'pond overlay'),
    [TILE_KEYS.structures.tree]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 2, 'great tree overlay'),
    [TILE_KEYS.structures.burrow]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 3, 'burrow overlay'),
    [TILE_KEYS.structures.nest]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 3, 'nest overlay'),
    [TILE_KEYS.structures.caveMouth]: transparentGridTile(TILESET_STRUCTURE_V3_SRC, TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 3, 'cave mouth overlay'),
    [TILE_KEYS.poi.settlement]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 0, 0, 'settlement marker overlay'),
    [TILE_KEYS.poi.restSite]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 1, 0, 'rest marker overlay'),
    [TILE_KEYS.poi.dangerSite]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 2, 0, 'danger marker overlay'),
    [TILE_KEYS.poi.resourceSite]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 0, 1, 'resource marker overlay'),
    [TILE_KEYS.poi.landmark]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 1, 1, 'landmark marker overlay'),
    [TILE_KEYS.poi.structure]: transparentGridTile(TILESET_POI_V3_SRC, TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 2, 1, 'structure marker overlay'),
    [TILE_KEYS.evidence.item]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 0, 0, 'dropped item overlay'),
    [TILE_KEYS.evidence.provisions]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 1, 0, 'provisions overlay'),
    [TILE_KEYS.evidence.remains]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 2, 0, 'remains overlay'),
    [TILE_KEYS.evidence.recoveryBag]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 3, 0, 'recovery bag overlay'),
    [TILE_KEYS.evidence.depleted]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 0, 1, 'depleted resource overlay'),
    [TILE_KEYS.evidence.placedObject]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 1, 1, 'placed object overlay'),
    [TILE_KEYS.evidence.trailMarker]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 2, 1, 'trail marker overlay'),
    [TILE_KEYS.presence.occupants]: transparentGridTile(TILESET_EVIDENCE_V3_SRC, TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 3, 1, 'occupants overlay'),
    [TILE_KEYS.interior.cave]: basicTile(0, 1, 'interior cave room'),
    [TILE_KEYS.interior.room]: basicTile(1, 1, 'interior room'),
    [TILE_KEYS.interior.exit]: overlayTile(3, 1, 'interior exit marker'),
    [TILE_KEYS.interior.wall]: basicTile(0, 1, 'shadowed interior boundary'),
    [TILE_KEYS.interior.door]: overlayTile(2, 1, 'interior door overlay'),
    [TILE_KEYS.interior.entrance]: overlayTile(3, 1, 'interior entrance marker'),
    [TILE_KEYS.interiorPaths.isolated]: basicTile(1, 1, 'isolated interior room'),
    [TILE_KEYS.interiorPaths['end-north']]: overlayTile(0, 2, 'north interior path'),
    [TILE_KEYS.interiorPaths['end-east']]: overlayTile(0, 2, 'east interior path', { rotate: 90 }),
    [TILE_KEYS.interiorPaths['end-south']]: overlayTile(0, 2, 'south interior path', { rotate: 180 }),
    [TILE_KEYS.interiorPaths['end-west']]: overlayTile(0, 2, 'west interior path', { rotate: 270 }),
    [TILE_KEYS.interiorPaths.vertical]: overlayTile(0, 2, 'vertical interior path'),
    [TILE_KEYS.interiorPaths.horizontal]: overlayTile(0, 2, 'horizontal interior path', { rotate: 90 }),
    [TILE_KEYS.interiorPaths['corner-ne']]: overlayTile(1, 2, 'north-east interior corner'),
    [TILE_KEYS.interiorPaths['corner-es']]: overlayTile(1, 2, 'east-south interior corner', { rotate: 90 }),
    [TILE_KEYS.interiorPaths['corner-sw']]: overlayTile(1, 2, 'south-west interior corner', { rotate: 180 }),
    [TILE_KEYS.interiorPaths['corner-wn']]: overlayTile(1, 2, 'west-north interior corner', { rotate: 270 }),
    [TILE_KEYS.interiorPaths['t-south']]: overlayTile(2, 2, 'south interior T'),
    [TILE_KEYS.interiorPaths['t-west']]: overlayTile(2, 2, 'west interior T', { rotate: 90 }),
    [TILE_KEYS.interiorPaths['t-north']]: overlayTile(2, 2, 'north interior T', { rotate: 180 }),
    [TILE_KEYS.interiorPaths['t-east']]: overlayTile(2, 2, 'east interior T', { rotate: 270 }),
    [TILE_KEYS.interiorPaths.intersection]: overlayTile(3, 2, 'interior intersection'),
    [TILE_KEYS.interiorDoors.north]: overlayTile(2, 1, 'north interior door'),
    [TILE_KEYS.interiorDoors.east]: overlayTile(2, 1, 'east interior door'),
    [TILE_KEYS.interiorDoors.south]: overlayTile(2, 1, 'south interior door'),
    [TILE_KEYS.interiorDoors.west]: overlayTile(2, 1, 'west interior door'),
    [TILE_KEYS.interiorExits.north]: overlayTile(3, 1, 'north surface exit'),
    [TILE_KEYS.interiorExits.east]: overlayTile(3, 1, 'east surface exit', { rotate: 90 }),
    [TILE_KEYS.interiorExits.south]: overlayTile(3, 1, 'south surface exit', { rotate: 180 }),
    [TILE_KEYS.interiorExits.west]: overlayTile(3, 1, 'west surface exit', { rotate: 270 }),
    [TILE_KEYS.interiorWalls.north]: overlayTile(0, 3, 'north interior wall edge'),
    [TILE_KEYS.interiorWalls.east]: overlayTile(0, 3, 'east interior wall edge', { rotate: 90 }),
    [TILE_KEYS.interiorWalls.south]: overlayTile(0, 3, 'south interior wall edge', { rotate: 180 }),
    [TILE_KEYS.interiorWalls.west]: overlayTile(0, 3, 'west interior wall edge', { rotate: 270 }),
    [TILE_KEYS.states.current]: overlayTile(3, 3, 'current-position marker'),
    [TILE_KEYS.states.quest]: overlayTile(2, 3, 'quest marker'),
    [TILE_KEYS.states.danger]: overlayTile(1, 3, 'danger marker'),
    [TILE_KEYS.states.blocked]: overlayTile(0, 3, 'blocked edge'),
    [TILE_KEYS.states['blocked-north']]: overlayTile(0, 3, 'north blocked edge'),
    [TILE_KEYS.states['blocked-east']]: overlayTile(0, 3, 'east blocked edge', { rotate: 90 }),
    [TILE_KEYS.states['blocked-south']]: overlayTile(0, 3, 'south blocked edge', { rotate: 180 }),
    [TILE_KEYS.states['blocked-west']]: overlayTile(0, 3, 'west blocked edge', { rotate: 270 })
  };

  const basicElevationDirections = { north: 0, east: 90, south: 180, west: 270 };
  const basicReliefRects = {
    cliff: { x: 57, y: 175, width: 554, height: 309 },
    ledge: { x: 712, y: 258, width: 555, height: 219 },
    slope: { x: 1356, y: 232, width: 568, height: 244 }
  };
  for (const [kind, rect] of Object.entries(basicReliefRects)) {
    for (const [direction, rotate] of Object.entries(basicElevationDirections)) {
      basicTiles[TILE_KEYS.elevation[`${kind}-${direction}`]] = transparentRectTile(
        TILESET_RELIEF_V1_SRC,
        rect,
        `${direction} ${kind} relief overlay`,
        { rotate }
      );
    }
  }

  const materialV2Cells = {
    plains: [0, 0], grove: [1, 0], forest: [2, 0], swamp: [0, 1], jungle: [1, 1],
    sand: [2, 1], beach: [2, 1], water: [0, 2], cliff: [1, 2], cave: [2, 2]
  };
  for (const [transitionId, key] of Object.entries(TILE_KEYS.groundTransitions)) {
    const biome = transitionId.slice(0, transitionId.lastIndexOf('-'));
    const [col, row] = materialV2Cells[biome] || materialV2Cells.plains;
    basicTiles[key] = materialV2Tile(col, row, `${biome} ground transition overlay`);
  }

  const bundledLayer = (col, row, slot = 'base', transform = {}) => ({
    atlasId: 'main',
    rect: basicTileRect(col, row),
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledRectLayer = (rect, slot = 'base', transform = {}) => ({
    atlasId: 'main',
    rect: { ...rect },
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledMaterialLayer = (slot = 'base', transform = {}) => ({
    atlasId: 'materials',
    rect: { x: 0, y: 0, width: BASIC_TILESET_MATERIAL_WIDTH, height: BASIC_TILESET_MATERIAL_HEIGHT },
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledTile = (col, row, slot = 'base', transform = {}) => ({ layers: [bundledLayer(col, row, slot, transform)] });
  const bundledRectTile = (rect, slot = 'base', transform = {}) => ({ layers: [bundledRectLayer(rect, slot, transform)] });
  const bundledMaterialTile = (slot = 'base', transform = {}) => ({ layers: [bundledMaterialLayer(slot, transform)] });
  const bundledMaterialV2Layer = (col, row, slot = 'base', transform = {}) => ({
    atlasId: 'materials-v2',
    rect: materialV2Rect(col, row),
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledMaterialV2Tile = (col, row, slot = 'base', transform = {}) => ({
    layers: [bundledMaterialV2Layer(col, row, slot, transform)]
  });
  const bundledFullV2Layer = (atlasId, size, slot, transform = {}) => ({
    atlasId,
    rect: { x: 0, y: 0, width: size, height: size },
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledFullV2Tile = (atlasId, size, slot, transform = {}) => ({
    layers: [bundledFullV2Layer(atlasId, size, slot, transform)]
  });
  const bundledGridLayer = (atlasId, width, height, columns, rows, col, row, slot, transform = {}) => ({
    atlasId,
    rect: gridRect(width, height, columns, rows, col, row),
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledGridTile = (atlasId, width, height, columns, rows, col, row, slot, transform = {}) => ({
    layers: [bundledGridLayer(atlasId, width, height, columns, rows, col, row, slot, transform)]
  });
  const bundledAtlasRectTile = (atlasId, rect, slot, transform = {}) => ({
    layers: [{
      atlasId,
      rect: { ...rect },
      slot,
      transform: { rotate: 0, flipX: false, flipY: false, ...transform }
    }]
  });
  const bundledBridgeV2Tile = col => ({
    layers: [{
      atlasId: 'bridge-v2',
      rect: { x: col * TILESET_BRIDGE_V2_CELL_SIZE, y: 0, width: TILESET_BRIDGE_V2_CELL_SIZE, height: TILESET_BRIDGE_V2_CELL_SIZE },
      slot: 'route',
      transform: { rotate: 0, flipX: false, flipY: false }
    }]
  });
  const bundledOverlayLayer = (col, row, slot = 'feature', transform = {}) => ({
    atlasId: 'overlays',
    rect: overlayTileRect(col, row),
    slot,
    transform: { rotate: 0, flipX: false, flipY: false, ...transform }
  });
  const bundledOverlayTile = (col, row, slot = 'feature', transform = {}) => ({ layers: [bundledOverlayLayer(col, row, slot, transform)] });
  const bundledTransparentTile = () => ({
    layers: [{ ...bundledOverlayLayer(0, 0, 'marker'), opacity: 0 }]
  });
  const bundledAlias = fallback => ({ fallback });
  const BUNDLED_TILESET_PRESENTATION = {
    type: 'yaw-tileset-pack',
    version: 1,
    id: 'yaw.default-basic-v1',
    name: 'You Are Wild: Basic Tiles',
    nativeTileSize: { width: 222, height: 222 },
    scaling: 'smooth',
    atlases: [
      { id: 'main', resourceId: 'atlas.main', density: 1 },
      { id: 'overlays', resourceId: 'atlas.overlays', density: 1 },
      { id: 'materials', resourceId: 'atlas.materials', density: 1 },
      { id: 'materials-v2', resourceId: 'atlas.materials-v2', density: 1 },
      { id: 'bridge-v2', resourceId: 'atlas.bridge-v2', density: 1 },
      { id: 'cover-v2', resourceId: 'atlas.cover-v2', density: 1 },
      { id: 'cover-v3', resourceId: 'atlas.cover-v3', density: 1 },
      { id: 'relief-v1', resourceId: 'atlas.relief-v1', density: 1 },
      { id: 'jungle-strata-v1', resourceId: 'atlas.jungle-strata-v1', density: 1 },
      { id: 'biome-strata-v2', resourceId: 'atlas.biome-strata-v2', density: 1 },
      { id: 'structures-v3', resourceId: 'atlas.structures-v3', density: 1 },
      { id: 'poi-v3', resourceId: 'atlas.poi-v3', density: 1 },
      { id: 'evidence-v3', resourceId: 'atlas.evidence-v3', density: 1 }
    ],
    tiles: {
      [TILE_KEYS.unknown]: bundledTile(0, 3, 'base'),
      [TILE_KEYS.biomes.forest]: bundledMaterialV2Tile(2, 0, 'base'),
      [TILE_KEYS.biomes.grove]: bundledMaterialV2Tile(1, 0, 'base'),
      [TILE_KEYS.biomes.plains]: bundledMaterialV2Tile(0, 0, 'base'),
      [TILE_KEYS.biomes.swamp]: bundledMaterialV2Tile(0, 1, 'base'),
      [TILE_KEYS.biomes.jungle]: bundledMaterialV2Tile(1, 1, 'base'),
      [TILE_KEYS.biomes.cliff]: bundledMaterialV2Tile(1, 2, 'base'),
      [TILE_KEYS.biomes.water]: bundledMaterialV2Tile(0, 2, 'base'),
      [TILE_KEYS.biomes.sand]: bundledMaterialV2Tile(2, 1, 'base'),
      [TILE_KEYS.biomes.beach]: bundledAlias(TILE_KEYS.biomes.sand),
      // Terrain Transition V1 reuses the water material through pack-scoped
      // CSS masks. Semantics remain ordinary layers so replacement packs can
      // supply authored edge and corner artwork without core clipping it.
      [TILE_KEYS.shorelines.north]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelines.east]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelines.south]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelines.west]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['outer-ne']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['outer-es']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['outer-sw']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['outer-wn']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['inner-ne']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['inner-es']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['inner-sw']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.shorelineCorners['inner-wn']]: bundledMaterialV2Tile(0, 2, 'feature'),
      [TILE_KEYS.biomes.cave]: bundledMaterialV2Tile(2, 2, 'base'),
      [TILE_KEYS.biomes.dungeon]: bundledMaterialV2Tile(2, 2, 'base'),
      [TILE_KEYS.biomes.manor]: bundledAlias(TILE_KEYS.biomes.dungeon),
      [TILE_KEYS.biomes.farm]: bundledAlias(TILE_KEYS.biomes.plains),
      [TILE_KEYS.biomes.indoors]: bundledAlias(TILE_KEYS.interior.room),
      [TILE_KEYS.biomes.entrance]: bundledAlias(TILE_KEYS.interior.room),
      [TILE_KEYS.roads.vertical]: bundledOverlayTile(0, 0, 'route'),
      [TILE_KEYS.roads.horizontal]: bundledOverlayTile(0, 0, 'route', { rotate: 90 }),
      [TILE_KEYS.roads.end]: bundledAlias(TILE_KEYS.roads['end-north']),
      [TILE_KEYS.roads.corner]: bundledAlias(TILE_KEYS.roads['corner-ne']),
      [TILE_KEYS.roads['end-north']]: bundledOverlayTile(0, 1, 'route'),
      [TILE_KEYS.roads['end-east']]: bundledOverlayTile(0, 1, 'route', { rotate: 90 }),
      [TILE_KEYS.roads['end-south']]: bundledOverlayTile(0, 1, 'route', { rotate: 180 }),
      [TILE_KEYS.roads['end-west']]: bundledOverlayTile(0, 1, 'route', { rotate: 270 }),
      [TILE_KEYS.roads['corner-ne']]: bundledOverlayTile(1, 0, 'route'),
      [TILE_KEYS.roads['corner-es']]: bundledOverlayTile(1, 0, 'route', { rotate: 90 }),
      [TILE_KEYS.roads['corner-sw']]: bundledOverlayTile(1, 0, 'route', { rotate: 180 }),
      [TILE_KEYS.roads['corner-wn']]: bundledOverlayTile(1, 0, 'route', { rotate: 270 }),
      [TILE_KEYS.roads['t-south']]: bundledOverlayTile(2, 0, 'route'),
      [TILE_KEYS.roads['t-west']]: bundledOverlayTile(2, 0, 'route', { rotate: 90 }),
      [TILE_KEYS.roads['t-north']]: bundledOverlayTile(2, 0, 'route', { rotate: 180 }),
      [TILE_KEYS.roads['t-east']]: bundledOverlayTile(2, 0, 'route', { rotate: 270 }),
      [TILE_KEYS.roads.intersection]: bundledOverlayTile(3, 0, 'route'),
      [TILE_KEYS.bridges.vertical]: bundledBridgeV2Tile(0),
      [TILE_KEYS.bridges.horizontal]: bundledBridgeV2Tile(1),
      [TILE_KEYS.covers.foliage]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 0, 'feature'),
      [TILE_KEYS.covers.obstacle]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 1, 'feature'),
      [TILE_KEYS.covers.conifer]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 0, 0, 'feature'),
      [TILE_KEYS.covers.broadleaf]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 0, 'feature'),
      [TILE_KEYS.covers.jungle]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 2, 0, 'feature'),
      [TILE_KEYS.covers.jungleCanopy]: bundledAtlasRectTile('jungle-strata-v1', { x: 44, y: 241, width: 398, height: 406 }, 'feature'),
      [TILE_KEYS.covers.jungleUndergrowth]: bundledAtlasRectTile('jungle-strata-v1', { x: 483, y: 252, width: 384, height: 377 }, 'feature'),
      [TILE_KEYS.covers.jungleLitter]: bundledAtlasRectTile('jungle-strata-v1', { x: 923, y: 253, width: 407, height: 382 }, 'feature'),
      [TILE_KEYS.covers.jungleSpill]: bundledAtlasRectTile('jungle-strata-v1', { x: 1330, y: 245, width: 408, height: 362 }, 'feature'),
      [TILE_KEYS.covers.groveIdentity]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 0, 0, 'feature'),
      [TILE_KEYS.covers.groveSpill]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 0, 1, 'feature'),
      [TILE_KEYS.covers.forestIdentity]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 1, 0, 'feature'),
      [TILE_KEYS.covers.forestSpill]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 1, 1, 'feature'),
      [TILE_KEYS.covers.plainsIdentity]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 2, 0, 'feature'),
      [TILE_KEYS.covers.plainsSpill]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 2, 1, 'feature'),
      [TILE_KEYS.covers.swampIdentity]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 3, 0, 'feature'),
      [TILE_KEYS.covers.swampSpill]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 3, 1, 'feature'),
      [TILE_KEYS.covers.caveIdentity]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 4, 0, 'feature'),
      [TILE_KEYS.covers.caveSpill]: bundledGridTile('biome-strata-v2', TILESET_BIOME_STRATA_V2_WIDTH, TILESET_BIOME_STRATA_V2_HEIGHT, 5, 2, 4, 1, 'feature'),
      [TILE_KEYS.covers.beachIdentity]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 1, 'feature'),
      [TILE_KEYS.covers.reeds]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 0, 'feature'),
      [TILE_KEYS.covers.grass]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 0, 1, 'feature'),
      [TILE_KEYS.covers.drift]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 1, 1, 'feature'),
      [TILE_KEYS.covers.scrub]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 2, 1, 'feature'),
      [TILE_KEYS.covers.rock]: bundledGridTile('cover-v3', TILESET_COVER_V3_WIDTH, TILESET_COVER_V3_HEIGHT, 4, 2, 3, 1, 'feature'),
      [TILE_KEYS.structures.camp]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 0, 'feature'),
      [TILE_KEYS.structures.hut]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 0, 'feature'),
      [TILE_KEYS.structures.ruins]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 0, 'feature'),
      [TILE_KEYS.structures.spring]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 0, 'feature'),
      [TILE_KEYS.structures.shrine]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 1, 'feature'),
      [TILE_KEYS.structures.farm]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 1, 'feature'),
      [TILE_KEYS.structures.village]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 1, 'feature'),
      [TILE_KEYS.structures.cave]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 1, 'feature'),
      [TILE_KEYS.structures.web]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 2, 'feature'),
      [TILE_KEYS.structures.cabin]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 2, 'feature'),
      [TILE_KEYS.structures.pond]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 2, 'feature'),
      [TILE_KEYS.structures.tree]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 3, 2, 'feature'),
      [TILE_KEYS.structures.burrow]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 0, 3, 'feature'),
      [TILE_KEYS.structures.nest]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 1, 3, 'feature'),
      [TILE_KEYS.structures.caveMouth]: bundledGridTile('structures-v3', TILESET_STRUCTURE_V3_WIDTH, TILESET_STRUCTURE_V3_HEIGHT, 4, 4, 2, 3, 'feature'),
      [TILE_KEYS.poi.settlement]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 0, 0, 'marker'),
      [TILE_KEYS.poi.restSite]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 1, 0, 'marker'),
      [TILE_KEYS.poi.dangerSite]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 2, 0, 'marker'),
      [TILE_KEYS.poi.resourceSite]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 0, 1, 'marker'),
      [TILE_KEYS.poi.landmark]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 1, 1, 'marker'),
      [TILE_KEYS.poi.structure]: bundledGridTile('poi-v3', TILESET_POI_V3_WIDTH, TILESET_POI_V3_HEIGHT, 3, 2, 2, 1, 'marker'),
      [TILE_KEYS.evidence.item]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 0, 0, 'marker'),
      [TILE_KEYS.evidence.provisions]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 1, 0, 'marker'),
      [TILE_KEYS.evidence.remains]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 2, 0, 'marker'),
      [TILE_KEYS.evidence.recoveryBag]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 3, 0, 'marker'),
      [TILE_KEYS.evidence.depleted]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 0, 1, 'marker'),
      [TILE_KEYS.evidence.placedObject]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 1, 1, 'marker'),
      [TILE_KEYS.evidence.trailMarker]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 2, 1, 'marker'),
      [TILE_KEYS.presence.occupants]: bundledGridTile('evidence-v3', TILESET_EVIDENCE_V3_WIDTH, TILESET_EVIDENCE_V3_HEIGHT, 4, 2, 3, 1, 'presence'),
      [TILE_KEYS.interior.cave]: bundledTile(0, 1, 'base'),
      [TILE_KEYS.interior.room]: bundledTile(7, 3, 'base'),
      [TILE_KEYS.interior.wall]: bundledAlias(TILE_KEYS.interior.cave),
      [TILE_KEYS.interior.exit]: bundledAlias(TILE_KEYS.structures.cave),
      [TILE_KEYS.interior.door]: bundledAlias(TILE_KEYS.structures.hut),
      [TILE_KEYS.interior.entrance]: bundledAlias(TILE_KEYS.interior.exit),
      [TILE_KEYS.interiorPaths.isolated]: bundledAlias(TILE_KEYS.interior.room),
      [TILE_KEYS.interiorPaths['end-north']]: bundledOverlayTile(0, 2, 'route'),
      [TILE_KEYS.interiorPaths['end-east']]: bundledOverlayTile(0, 2, 'route', { rotate: 90 }),
      [TILE_KEYS.interiorPaths['end-south']]: bundledOverlayTile(0, 2, 'route', { rotate: 180 }),
      [TILE_KEYS.interiorPaths['end-west']]: bundledOverlayTile(0, 2, 'route', { rotate: 270 }),
      [TILE_KEYS.interiorPaths.vertical]: bundledOverlayTile(0, 2, 'route'),
      [TILE_KEYS.interiorPaths.horizontal]: bundledOverlayTile(0, 2, 'route', { rotate: 90 }),
      [TILE_KEYS.interiorPaths['corner-ne']]: bundledOverlayTile(1, 2, 'route'),
      [TILE_KEYS.interiorPaths['corner-es']]: bundledOverlayTile(1, 2, 'route', { rotate: 90 }),
      [TILE_KEYS.interiorPaths['corner-sw']]: bundledOverlayTile(1, 2, 'route', { rotate: 180 }),
      [TILE_KEYS.interiorPaths['corner-wn']]: bundledOverlayTile(1, 2, 'route', { rotate: 270 }),
      [TILE_KEYS.interiorPaths['t-south']]: bundledOverlayTile(2, 2, 'route'),
      [TILE_KEYS.interiorPaths['t-west']]: bundledOverlayTile(2, 2, 'route', { rotate: 90 }),
      [TILE_KEYS.interiorPaths['t-north']]: bundledOverlayTile(2, 2, 'route', { rotate: 180 }),
      [TILE_KEYS.interiorPaths['t-east']]: bundledOverlayTile(2, 2, 'route', { rotate: 270 }),
      [TILE_KEYS.interiorPaths.intersection]: bundledOverlayTile(3, 2, 'route'),
      [TILE_KEYS.interiorDoors.north]: bundledOverlayTile(2, 1, 'feature'),
      [TILE_KEYS.interiorDoors.east]: bundledOverlayTile(2, 1, 'feature'),
      [TILE_KEYS.interiorDoors.south]: bundledOverlayTile(2, 1, 'feature'),
      [TILE_KEYS.interiorDoors.west]: bundledOverlayTile(2, 1, 'feature'),
      [TILE_KEYS.interiorExits.north]: bundledOverlayTile(3, 1, 'marker'),
      [TILE_KEYS.interiorExits.east]: bundledOverlayTile(3, 1, 'marker', { rotate: 90 }),
      [TILE_KEYS.interiorExits.south]: bundledOverlayTile(3, 1, 'marker', { rotate: 180 }),
      [TILE_KEYS.interiorExits.west]: bundledOverlayTile(3, 1, 'marker', { rotate: 270 }),
      [TILE_KEYS.interiorWalls.north]: bundledOverlayTile(0, 3, 'feature'),
      [TILE_KEYS.interiorWalls.east]: bundledOverlayTile(0, 3, 'feature', { rotate: 90 }),
      [TILE_KEYS.interiorWalls.south]: bundledOverlayTile(0, 3, 'feature', { rotate: 180 }),
      [TILE_KEYS.interiorWalls.west]: bundledOverlayTile(0, 3, 'feature', { rotate: 270 }),
      [TILE_KEYS.states.current]: bundledOverlayTile(3, 3, 'presence'),
      [TILE_KEYS.states.quest]: bundledOverlayTile(2, 3, 'marker'),
      [TILE_KEYS.states.blocked]: bundledOverlayTile(0, 3, 'marker'),
      [TILE_KEYS.states['blocked-north']]: bundledOverlayTile(0, 3, 'marker'),
      [TILE_KEYS.states['blocked-east']]: bundledOverlayTile(0, 3, 'marker', { rotate: 90 }),
      [TILE_KEYS.states['blocked-south']]: bundledOverlayTile(0, 3, 'marker', { rotate: 180 }),
      [TILE_KEYS.states['blocked-west']]: bundledOverlayTile(0, 3, 'marker', { rotate: 270 }),
      [TILE_KEYS.states.danger]: bundledOverlayTile(1, 3, 'marker'),
      [TILE_KEYS.effects.dangerInfluence]: bundledTransparentTile()
    }
  };
  const elevationDirections = { north: 0, east: 90, south: 180, west: 270 };
  const reliefRects = {
    cliff: { x: 57, y: 175, width: 554, height: 309 },
    ledge: { x: 712, y: 258, width: 555, height: 219 },
    slope: { x: 1356, y: 232, width: 568, height: 244 }
  };
  for (const [kind, rect] of Object.entries(reliefRects)) {
    for (const [direction, rotate] of Object.entries(elevationDirections)) {
      BUNDLED_TILESET_PRESENTATION.tiles[TILE_KEYS.elevation[`${kind}-${direction}`]] = bundledAtlasRectTile('relief-v1', rect, 'feature', { rotate });
    }
  }
  for (const [transitionId, key] of Object.entries(TILE_KEYS.groundTransitions)) {
    const biome = transitionId.slice(0, transitionId.lastIndexOf('-'));
    const [col, row] = materialV2Cells[biome] || materialV2Cells.plains;
    BUNDLED_TILESET_PRESENTATION.tiles[key] = bundledMaterialV2Tile(col, row, 'feature');
  }
  const BUNDLED_TILESET_RESOURCE = {
    id: 'atlas.main',
    hash: '6ae193e46a3cce413bb4316e88a1c86debf4281f819ddc877e89fef645e6df78',
    mimeType: 'image/png',
    byteLength: 2498176,
    width: BASIC_TILESET_WIDTH,
    height: BASIC_TILESET_HEIGHT,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/basic-tileset-v1.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_OVERLAY_RESOURCE = {
    id: 'atlas.overlays',
    hash: '4e926d26895b5b7e8f69c66c82ffef812f06991922549748e45b34e84f15c57b',
    mimeType: 'image/png',
    byteLength: 1077089,
    width: BASIC_TILESET_OVERLAY_WIDTH,
    height: BASIC_TILESET_OVERLAY_HEIGHT,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/basic-tileset-overlays-v1.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_MATERIAL_RESOURCE = {
    id: 'atlas.materials',
    hash: '82bf985a5673eb7ec348814098422db9e861659af85c064f192ce00e8c1cf1b5',
    mimeType: 'image/png',
    byteLength: 391293,
    width: BASIC_TILESET_MATERIAL_WIDTH,
    height: BASIC_TILESET_MATERIAL_HEIGHT,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/terrain-sand-seamless-v1.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_MATERIAL_V2_RESOURCE = {
    id: 'atlas.materials-v2',
    hash: '3c7a4ed11b00645f656b419c37b754e286f85b19a6bfb0cb52ea9a52e822a146',
    mimeType: 'image/png',
    byteLength: 1112463,
    width: TILESET_MATERIAL_V2_WIDTH,
    height: TILESET_MATERIAL_V2_HEIGHT,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/terrain-materials-v2.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_BRIDGE_V2_RESOURCE = {
    id: 'atlas.bridge-v2',
    hash: '9063675c61e691efc1cd3a3a868dc4bab2eff1053446e398f4659e212e8575f4',
    mimeType: 'image/png',
    byteLength: 281159,
    width: TILESET_BRIDGE_V2_WIDTH,
    height: TILESET_BRIDGE_V2_HEIGHT,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/bridge-span-v2.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_COVER_V2_RESOURCE = {
    id: 'atlas.cover-v2',
    hash: 'c21e703f85b01762f9000b3d420eaa4070d0ff3be5410508cfcceeecfb919304',
    mimeType: 'image/png',
    byteLength: 233292,
    width: TILESET_COVER_V2_SIZE,
    height: TILESET_COVER_V2_SIZE,
    role: 'tileset-atlas',
    license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/foliage-cover-v2.png' },
    fallback: null,
    source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_COVER_V3_RESOURCE = {
    id: 'atlas.cover-v3',
    hash: '601cb0c7d0bca29f5e6e6fc8efc3ce5cd7518a1f6a372ccc313814ddedb7c8dd',
    mimeType: 'image/png', byteLength: 1616068,
    width: TILESET_COVER_V3_WIDTH, height: TILESET_COVER_V3_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/cover-overlays-v3.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_RELIEF_V1_RESOURCE = {
    id: 'atlas.relief-v1',
    hash: 'a722c1ad84a4a638447ab749dfa8e053169f6299e989c91c2d28a78afaccb40b',
    mimeType: 'image/png', byteLength: 161601,
    width: TILESET_RELIEF_V1_WIDTH, height: TILESET_RELIEF_V1_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/terrain-relief-v1.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_JUNGLE_STRATA_V1_RESOURCE = {
    id: 'atlas.jungle-strata-v1',
    hash: 'ed78657cf0f0c966c78d40f37db869a4dc903b61011e7168ad9ab18b3a72d785',
    mimeType: 'image/png', byteLength: 266504,
    width: TILESET_JUNGLE_STRATA_V1_WIDTH, height: TILESET_JUNGLE_STRATA_V1_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/jungle-strata-v1.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_BIOME_STRATA_V2_RESOURCE = {
    id: 'atlas.biome-strata-v2',
    hash: '786672f78ddf2e89be4f9d5863ac87f5b8dece464494e3292630925cf19a6b45',
    mimeType: 'image/png', byteLength: 161425,
    width: TILESET_BIOME_STRATA_V2_WIDTH, height: TILESET_BIOME_STRATA_V2_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/biome-strata-v2.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_STRUCTURE_V3_RESOURCE = {
    id: 'atlas.structures-v3',
    hash: '489a7fcb10dff9497a4b138e32c19aae1459ff2c2bdc1ef7f8aa969e4b13af7a',
    mimeType: 'image/png', byteLength: 1457236,
    width: TILESET_STRUCTURE_V3_WIDTH, height: TILESET_STRUCTURE_V3_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/structure-overlays-v3.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_POI_V3_RESOURCE = {
    id: 'atlas.poi-v3',
    hash: '72eac35d5ffe6bead867e85a543a92b4624bbb11798619ffc1f281e273b48951',
    mimeType: 'image/png', byteLength: 907542,
    width: TILESET_POI_V3_WIDTH, height: TILESET_POI_V3_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/poi-overlays-v3.png' },
    fallback: null, source: { kind: 'bundled' }
  };
  const BUNDLED_TILESET_EVIDENCE_V3_RESOURCE = {
    id: 'atlas.evidence-v3',
    hash: '3acc21325fbe5bc18be62f1ab9bdd548d0524564b01d66f9caed07354cd9d5d8',
    mimeType: 'image/png', byteLength: 550866,
    width: TILESET_EVIDENCE_V3_WIDTH, height: TILESET_EVIDENCE_V3_HEIGHT,
    role: 'tileset-atlas', license: 'owner-supplied-ai-generated',
    provenance: { kind: 'ai_generated', tool: 'ChatGPT Image', source: 'media/evidence-overlays-v3.png' },
    fallback: null, source: { kind: 'bundled' }
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
        version: '1.0.0',
        author: 'Project owner',
        license: 'owner-supplied-ai-generated',
        allowedUse: ['bundled', 'first-party-prototype', 'local-build', 'future-mod-pack', 'mod-overridable'],
        enabled: true,
        provenance: {
          kind: 'ai_generated',
          tool: 'ChatGPT Image 2',
          generatedBy: 'project-owner',
          generatedAt: null,
          source: 'media/basic-tileset-v1.png',
          sources: [
            'media/basic-tileset-v1.png',
            'media/basic-tileset-overlays-v1.png',
            'media/terrain-sand-seamless-v1.png',
            'media/terrain-materials-v2.png',
            'media/bridge-span-v2.png',
            'media/foliage-cover-v2.png',
            'media/cover-overlays-v3.png',
            'media/terrain-relief-v1.png',
            'media/jungle-strata-v1.png',
            'media/biome-strata-v2.png',
            'media/structure-overlays-v3.png',
            'media/poi-overlays-v3.png',
            'media/evidence-overlays-v3.png'
          ],
          notes: 'Owner-directed AI-generated fallback atlas plus Tile Composition V2 seamless ground, continuous bridge, transparent cover, and topology/state layers.'
        },
        aiMetadata: {
          aiMade: true,
          modelFamily: 'ChatGPT Image',
          suppliedBy: 'project-owner',
          reviewStatus: 'accepted-for-v1'
        },
        relativeBasePath: '../media/',
        sheet: {
          src: BASIC_TILESET_SRC,
          width: BASIC_TILESET_WIDTH,
          height: BASIC_TILESET_HEIGHT,
          columns: BASIC_TILESET_COLUMNS,
          rows: BASIC_TILESET_ROWS,
          slicing: 'integer-grid-boundaries',
          notes: 'Each source rectangle uses floor(column * width / 8) and floor(row * height / 4) boundaries.'
        },
        sheets: [
          { src: BASIC_TILESET_SRC, width: BASIC_TILESET_WIDTH, height: BASIC_TILESET_HEIGHT, columns: BASIC_TILESET_COLUMNS, rows: BASIC_TILESET_ROWS, alpha: false },
          { src: BASIC_TILESET_OVERLAY_SRC, width: BASIC_TILESET_OVERLAY_WIDTH, height: BASIC_TILESET_OVERLAY_HEIGHT, columns: BASIC_TILESET_OVERLAY_COLUMNS, rows: BASIC_TILESET_OVERLAY_ROWS, alpha: true },
          { src: BASIC_TILESET_MATERIAL_SRC, width: BASIC_TILESET_MATERIAL_WIDTH, height: BASIC_TILESET_MATERIAL_HEIGHT, columns: 1, rows: 1, alpha: false },
          { src: TILESET_MATERIAL_V2_SRC, width: TILESET_MATERIAL_V2_WIDTH, height: TILESET_MATERIAL_V2_HEIGHT, columns: TILESET_MATERIAL_V2_COLUMNS, rows: TILESET_MATERIAL_V2_ROWS, alpha: false },
          { src: TILESET_BRIDGE_V2_SRC, width: TILESET_BRIDGE_V2_WIDTH, height: TILESET_BRIDGE_V2_HEIGHT, columns: 2, rows: 1, alpha: true },
          { src: TILESET_COVER_V2_SRC, width: TILESET_COVER_V2_SIZE, height: TILESET_COVER_V2_SIZE, columns: 1, rows: 1, alpha: true },
          { src: TILESET_COVER_V3_SRC, width: TILESET_COVER_V3_WIDTH, height: TILESET_COVER_V3_HEIGHT, columns: TILESET_COVER_V3_COLUMNS, rows: TILESET_COVER_V3_ROWS, alpha: true },
          { src: TILESET_RELIEF_V1_SRC, width: TILESET_RELIEF_V1_WIDTH, height: TILESET_RELIEF_V1_HEIGHT, columns: 3, rows: 1, alpha: true },
          { src: TILESET_JUNGLE_STRATA_V1_SRC, width: TILESET_JUNGLE_STRATA_V1_WIDTH, height: TILESET_JUNGLE_STRATA_V1_HEIGHT, columns: 4, rows: 1, alpha: true },
          { src: TILESET_BIOME_STRATA_V2_SRC, width: TILESET_BIOME_STRATA_V2_WIDTH, height: TILESET_BIOME_STRATA_V2_HEIGHT, columns: TILESET_BIOME_STRATA_V2_COLUMNS, rows: TILESET_BIOME_STRATA_V2_ROWS, alpha: true },
          { src: TILESET_STRUCTURE_V3_SRC, width: TILESET_STRUCTURE_V3_WIDTH, height: TILESET_STRUCTURE_V3_HEIGHT, columns: TILESET_STRUCTURE_V3_COLUMNS, rows: TILESET_STRUCTURE_V3_ROWS, alpha: true },
          { src: TILESET_POI_V3_SRC, width: TILESET_POI_V3_WIDTH, height: TILESET_POI_V3_HEIGHT, columns: TILESET_POI_V3_COLUMNS, rows: TILESET_POI_V3_ROWS, alpha: true },
          { src: TILESET_EVIDENCE_V3_SRC, width: TILESET_EVIDENCE_V3_WIDTH, height: TILESET_EVIDENCE_V3_HEIGHT, columns: TILESET_EVIDENCE_V3_COLUMNS, rows: TILESET_EVIDENCE_V3_ROWS, alpha: true }
        ],
        fallback: { mode: 'tileset-key', tilesetId: 'core-emoji-fallback' },
        tiles: basicTiles
      }
    }
  };

  const AssetManifest = {
    manifest: ASSET_MANIFEST,
    tileKeys: TILE_KEYS,
    allTileKeys() {
      return Object.keys(fallbackTiles).sort();
    },
    bundledTilesetPack() {
      const embedded = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_URL || '') : '';
      const embeddedOverlays = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_OVERLAY_URL || '') : '';
      const embeddedMaterials = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_MATERIAL_URL || '') : '';
      const embeddedMaterialsV2 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_MATERIAL_V2_URL || '') : '';
      const embeddedBridgeV2 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_BRIDGE_V2_URL || '') : '';
      const embeddedCoverV2 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_COVER_V2_URL || '') : '';
      const embeddedCoverV3 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_COVER_V3_URL || '') : '';
      const embeddedReliefV1 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_RELIEF_V1_URL || '') : '';
      const embeddedJungleStrataV1 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_JUNGLE_STRATA_V1_URL || '') : '';
      const embeddedBiomeStrataV2 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_BIOME_STRATA_V2_URL || '') : '';
      const embeddedStructuresV3 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_STRUCTURE_V3_URL || '') : '';
      const embeddedPoiV3 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_POI_V3_URL || '') : '';
      const embeddedEvidenceV3 = typeof window !== 'undefined' ? String(window.YAW_BUNDLED_TILESET_EVIDENCE_V3_URL || '') : '';
      return {
        presentation: JSON.parse(JSON.stringify(BUNDLED_TILESET_PRESENTATION)),
        resources: [
          BUNDLED_TILESET_RESOURCE,
          BUNDLED_TILESET_OVERLAY_RESOURCE,
          BUNDLED_TILESET_MATERIAL_RESOURCE,
          BUNDLED_TILESET_MATERIAL_V2_RESOURCE,
          BUNDLED_TILESET_BRIDGE_V2_RESOURCE,
          BUNDLED_TILESET_COVER_V2_RESOURCE,
          BUNDLED_TILESET_COVER_V3_RESOURCE,
          BUNDLED_TILESET_RELIEF_V1_RESOURCE,
          BUNDLED_TILESET_JUNGLE_STRATA_V1_RESOURCE,
          BUNDLED_TILESET_BIOME_STRATA_V2_RESOURCE,
          BUNDLED_TILESET_STRUCTURE_V3_RESOURCE,
          BUNDLED_TILESET_POI_V3_RESOURCE,
          BUNDLED_TILESET_EVIDENCE_V3_RESOURCE
        ].map(resource => JSON.parse(JSON.stringify(resource))),
        atlasUrls: {
          'atlas.main': embedded || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${BASIC_TILESET_SRC}`,
          'atlas.overlays': embeddedOverlays || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${BASIC_TILESET_OVERLAY_SRC}`,
          'atlas.materials': embeddedMaterials || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${BASIC_TILESET_MATERIAL_SRC}`,
          'atlas.materials-v2': embeddedMaterialsV2 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_MATERIAL_V2_SRC}`,
          'atlas.bridge-v2': embeddedBridgeV2 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_BRIDGE_V2_SRC}`,
          'atlas.cover-v2': embeddedCoverV2 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_COVER_V2_SRC}`,
          'atlas.cover-v3': embeddedCoverV3 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_COVER_V3_SRC}`,
          'atlas.relief-v1': embeddedReliefV1 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_RELIEF_V1_SRC}`,
          'atlas.jungle-strata-v1': embeddedJungleStrataV1 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_JUNGLE_STRATA_V1_SRC}`,
          'atlas.biome-strata-v2': embeddedBiomeStrataV2 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_BIOME_STRATA_V2_SRC}`,
          'atlas.structures-v3': embeddedStructuresV3 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_STRUCTURE_V3_SRC}`,
          'atlas.poi-v3': embeddedPoiV3 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_POI_V3_SRC}`,
          'atlas.evidence-v3': embeddedEvidenceV3 || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${TILESET_EVIDENCE_V3_SRC}`
        }
      };
    },
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
