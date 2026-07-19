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
    .concat(Object.values(TILE_KEYS.poi))
    .concat(Object.values(TILE_KEYS.structures))
    .concat(Object.values(TILE_KEYS.interior))
    .concat(Object.values(TILE_KEYS.interiorPaths))
    .concat(Object.values(TILE_KEYS.interiorDoors))
    .concat(Object.values(TILE_KEYS.interiorExits))
    .concat(Object.values(TILE_KEYS.interiorWalls))
    .concat(Object.values(TILE_KEYS.shorelines))
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
    [TILE_KEYS.biomes.forest]: basicTile(0, 0, 'dense conifer forest'),
    [TILE_KEYS.biomes.grove]: basicTile(1, 0, 'leafy grove'),
    [TILE_KEYS.biomes.plains]: basicTile(2, 0, 'open grassland'),
    [TILE_KEYS.biomes.swamp]: basicTile(3, 0, 'wet swamp'),
    [TILE_KEYS.biomes.jungle]: basicTile(4, 0, 'tropical jungle'),
    [TILE_KEYS.biomes.cliff]: basicTile(5, 0, 'rock cliff'),
    [TILE_KEYS.biomes.water]: basicTile(6, 0, 'deep water'),
    [TILE_KEYS.biomes.sand]: basicTileFromRect({ x: 1646, y: 0, width: 128, height: 221 }, 'neutral sand'),
    [TILE_KEYS.biomes.beach]: basicTileFromRect({ x: 1646, y: 0, width: 128, height: 221 }, 'neutral beach sand'),
    [TILE_KEYS.biomes.cave]: basicTile(0, 1, 'dark cave floor'),
    [TILE_KEYS.biomes.dungeon]: basicTile(1, 1, 'stone dungeon'),
    [TILE_KEYS.biomes.manor]: basicTile(1, 1, 'stone manor interior'),
    [TILE_KEYS.biomes.farm]: basicTile(2, 0, 'open farm terrain'),
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
    [TILE_KEYS.bridges.vertical]: overlayTile(1, 1, 'vertical bridge overlay'),
    [TILE_KEYS.bridges.horizontal]: overlayTile(1, 1, 'horizontal bridge overlay', { rotate: 90 }),
    [TILE_KEYS.structures.camp]: basicTile(0, 2, 'camp'),
    [TILE_KEYS.structures.spring]: basicTile(1, 2, 'spring'),
    [TILE_KEYS.structures.shrine]: basicTile(2, 2, 'shrine'),
    [TILE_KEYS.structures.hut]: basicTile(3, 2, 'hut'),
    [TILE_KEYS.structures.farm]: basicTile(4, 2, 'farm'),
    [TILE_KEYS.structures.village]: basicTile(5, 2, 'village'),
    [TILE_KEYS.structures.cave]: basicTile(6, 2, 'cave entrance'),
    [TILE_KEYS.structures.web]: basicTile(7, 2, 'web landmark'),
    [TILE_KEYS.structures.ruins]: basicTile(2, 2, 'ruins'),
    [TILE_KEYS.structures.cabin]: basicTile(3, 2, 'cabin'),
    [TILE_KEYS.structures.pond]: basicTile(1, 2, 'pond'),
    [TILE_KEYS.structures.tree]: basicTile(1, 0, 'great tree'),
    [TILE_KEYS.structures.burrow]: basicTile(6, 2, 'burrow entrance'),
    [TILE_KEYS.structures.nest]: basicTile(0, 2, 'nest'),
    [TILE_KEYS.structures.caveMouth]: basicTile(6, 2, 'cave mouth'),
    [TILE_KEYS.poi.landmark]: basicTile(1, 3, 'map marker'),
    [TILE_KEYS.poi.dangerSite]: basicTile(3, 3, 'danger marker'),
    [TILE_KEYS.poi.resourceSite]: basicTile(4, 3, 'resource marker'),
    [TILE_KEYS.poi.restSite]: basicTile(5, 3, 'rest marker'),
    [TILE_KEYS.poi.settlement]: basicTile(6, 3, 'settlement marker'),
    [TILE_KEYS.poi.structure]: basicTile(6, 3, 'structure marker'),
    [TILE_KEYS.interior.cave]: basicTile(0, 1, 'interior cave room'),
    [TILE_KEYS.interior.room]: basicTile(1, 1, 'interior room'),
    [TILE_KEYS.interior.exit]: overlayTile(3, 1, 'interior exit marker'),
    [TILE_KEYS.interior.wall]: overlayTile(0, 3, 'interior wall edge'),
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
  const bundledTile = (col, row, slot = 'base', transform = {}) => ({ layers: [bundledLayer(col, row, slot, transform)] });
  const bundledRectTile = (rect, slot = 'base', transform = {}) => ({ layers: [bundledRectLayer(rect, slot, transform)] });
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
      { id: 'overlays', resourceId: 'atlas.overlays', density: 1 }
    ],
    tiles: {
      [TILE_KEYS.unknown]: bundledTile(0, 3, 'base'),
      [TILE_KEYS.biomes.forest]: bundledTile(0, 0, 'base'),
      [TILE_KEYS.biomes.grove]: bundledTile(1, 0, 'base'),
      [TILE_KEYS.biomes.plains]: bundledTile(2, 0, 'base'),
      [TILE_KEYS.biomes.swamp]: bundledTile(3, 0, 'base'),
      [TILE_KEYS.biomes.jungle]: bundledTile(4, 0, 'base'),
      [TILE_KEYS.biomes.cliff]: bundledTile(5, 0, 'base'),
      [TILE_KEYS.biomes.water]: bundledTile(6, 0, 'base'),
      [TILE_KEYS.biomes.sand]: bundledRectTile({ x: 1646, y: 0, width: 128, height: 221 }, 'base'),
      [TILE_KEYS.biomes.beach]: bundledAlias(TILE_KEYS.biomes.sand),
      [TILE_KEYS.shorelines.north]: bundledAlias(TILE_KEYS.biomes.sand),
      [TILE_KEYS.shorelines.east]: bundledAlias(TILE_KEYS.biomes.sand),
      [TILE_KEYS.shorelines.south]: bundledAlias(TILE_KEYS.biomes.sand),
      [TILE_KEYS.shorelines.west]: bundledAlias(TILE_KEYS.biomes.sand),
      [TILE_KEYS.biomes.cave]: bundledTile(0, 1, 'base'),
      [TILE_KEYS.biomes.dungeon]: bundledTile(1, 1, 'base'),
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
      [TILE_KEYS.bridges.vertical]: bundledOverlayTile(1, 1, 'route'),
      [TILE_KEYS.bridges.horizontal]: bundledOverlayTile(1, 1, 'route', { rotate: 90 }),
      [TILE_KEYS.structures.camp]: bundledTile(0, 2, 'feature'),
      [TILE_KEYS.structures.spring]: bundledTile(1, 2, 'feature'),
      [TILE_KEYS.structures.shrine]: bundledTile(2, 2, 'feature'),
      [TILE_KEYS.structures.hut]: bundledTile(3, 2, 'feature'),
      [TILE_KEYS.structures.farm]: bundledTile(4, 2, 'feature'),
      [TILE_KEYS.structures.village]: bundledTile(5, 2, 'feature'),
      [TILE_KEYS.structures.cave]: bundledTile(6, 2, 'feature'),
      [TILE_KEYS.structures.web]: bundledTile(7, 2, 'feature'),
      [TILE_KEYS.structures.ruins]: bundledAlias(TILE_KEYS.structures.shrine),
      [TILE_KEYS.structures.cabin]: bundledAlias(TILE_KEYS.structures.hut),
      [TILE_KEYS.structures.pond]: bundledAlias(TILE_KEYS.structures.spring),
      [TILE_KEYS.structures.tree]: bundledAlias(TILE_KEYS.biomes.grove),
      [TILE_KEYS.structures.burrow]: bundledAlias(TILE_KEYS.structures.cave),
      [TILE_KEYS.structures.nest]: bundledAlias(TILE_KEYS.structures.camp),
      [TILE_KEYS.structures.caveMouth]: bundledAlias(TILE_KEYS.structures.cave),
      [TILE_KEYS.poi.landmark]: bundledTile(6, 3, 'marker'),
      [TILE_KEYS.poi.settlement]: bundledTile(6, 3, 'marker'),
      [TILE_KEYS.poi.structure]: bundledTile(6, 3, 'marker'),
      [TILE_KEYS.poi.dangerSite]: bundledTile(3, 3, 'marker'),
      [TILE_KEYS.poi.resourceSite]: bundledTile(4, 3, 'marker'),
      [TILE_KEYS.poi.restSite]: bundledTile(5, 3, 'marker'),
      [TILE_KEYS.interior.cave]: bundledTile(0, 1, 'base'),
      [TILE_KEYS.interior.room]: bundledTile(7, 3, 'base'),
      [TILE_KEYS.interior.wall]: bundledAlias(TILE_KEYS.biomes.cliff),
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
          sources: ['media/basic-tileset-v1.png', 'media/basic-tileset-overlays-v1.png'],
          notes: 'Owner-directed AI-generated opaque 8x4 terrain atlas plus transparent 4x4 topology/state overlay atlas.'
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
          { src: BASIC_TILESET_OVERLAY_SRC, width: BASIC_TILESET_OVERLAY_WIDTH, height: BASIC_TILESET_OVERLAY_HEIGHT, columns: BASIC_TILESET_OVERLAY_COLUMNS, rows: BASIC_TILESET_OVERLAY_ROWS, alpha: true }
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
      return {
        presentation: JSON.parse(JSON.stringify(BUNDLED_TILESET_PRESENTATION)),
        resources: [BUNDLED_TILESET_RESOURCE, BUNDLED_TILESET_OVERLAY_RESOURCE].map(resource => JSON.parse(JSON.stringify(resource))),
        atlasUrls: {
          'atlas.main': embedded || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${BASIC_TILESET_SRC}`,
          'atlas.overlays': embeddedOverlays || `${ASSET_MANIFEST.tilesets['default-basic-tileset'].relativeBasePath}${BASIC_TILESET_OVERLAY_SRC}`
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
