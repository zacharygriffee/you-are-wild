/**
 * YOU ARE WILD TRAVERSAL SYSTEM
 * Authoritative cardinal movement rules shared by movement and map surfaces.
 */

const YAW_TRAVERSAL = (() => {
    const DIRECTIONS = Object.freeze({
        north: Object.freeze({ id: 'north', dx: 0, dy: -1, opposite: 'south' }),
        east: Object.freeze({ id: 'east', dx: 1, dy: 0, opposite: 'west' }),
        south: Object.freeze({ id: 'south', dx: 0, dy: 1, opposite: 'north' }),
        west: Object.freeze({ id: 'west', dx: -1, dy: 0, opposite: 'east' })
    });

    function directionFor(dx, dy) {
        const x = Number(dx);
        const y = Number(dy);
        return Object.values(DIRECTIONS).find(direction => direction.dx === x && direction.dy === y) || null;
    }

    function connectionList(tile) {
        const bridge = tile?.overlays?.bridge;
        if (Array.isArray(bridge?.connections)) return bridge.connections;
        if (bridge?.direction === 'north-south') return ['north', 'south'];
        if (bridge) return ['east', 'west'];
        return null;
    }

    function unitCapabilities(unit) {
        const sources = [unit?.traversalCapabilities, unit?.capabilities, unit?.traits, unit?.tags];
        const values = [];
        sources.forEach(source => {
            if (source instanceof Set) values.push(...source);
            else if (Array.isArray(source)) values.push(...source);
            else if (source && typeof source === 'object') {
                Object.entries(source).forEach(([key, enabled]) => { if (enabled) values.push(key); });
            }
        });
        return new Set(values.map(value => String(value).toLowerCase()));
    }

    function hasCapability(app, capability) {
        if (!capability) return true;
        const members = [app?.player, ...(app?.party || [])].filter(Boolean);
        return members.some(unit => unitCapabilities(unit).has(String(capability).toLowerCase()));
    }

    function blocked(direction, from, to, reasonCode, details = {}) {
        return { allowed: false, direction: direction?.id || null, from, to, cost: 0, reasonCode, ...details };
    }

    function resolveOverworld(app, dx, dy) {
        const direction = directionFor(dx, dy);
        const from = { x: Number(app?.location?.x || 0), y: Number(app?.location?.y || 0), interior: false };
        const to = { x: from.x + Number(dx || 0), y: from.y + Number(dy || 0), interior: false };
        if (!direction) return blocked(null, from, to, 'cardinal-only');
        const sourceTile = app.getTile(from.x, from.y);
        const targetTile = app.getTile(to.x, to.y);
        const sourceBridge = connectionList(sourceTile);
        const targetBridge = connectionList(targetTile);
        if (sourceBridge && !sourceBridge.includes(direction.id)) {
            return blocked(direction, from, to, 'bridge-direction');
        }
        if (targetBridge && !targetBridge.includes(direction.opposite)) {
            return blocked(direction, from, to, 'bridge-direction');
        }
        if (sourceTile?.overlays?.barriers?.includes(direction.id) || targetTile?.overlays?.barriers?.includes(direction.opposite)) {
            return blocked(direction, from, to, 'barrier');
        }
        const traversal = targetTile?.traversal || targetTile?.terrain?.traversal
            || (typeof WorldGen !== 'undefined' ? WorldGen.getTraversal(targetTile, app.biomes?.[targetTile?.biome]) : { passable: true, traversalCost: 1 });
        const capability = traversal?.requiredCapability || null;
        if (traversal?.passable === false && !hasCapability(app, capability)) {
            return blocked(direction, from, to, capability ? 'capability' : 'impassable', { requiredCapability: capability });
        }
        return {
            allowed: true,
            direction: direction.id,
            from,
            to,
            cost: Math.max(1, Math.floor(Number(traversal?.traversalCost) || 1)),
            requiredCapability: capability,
            reasonCode: null,
            tile: targetTile
        };
    }

    function resolveInterior(app, dx, dy) {
        const direction = directionFor(dx, dy);
        const from = { x: Number(app?.interiorLocation?.x || 0), y: Number(app?.interiorLocation?.y || 0), interior: true };
        const to = { x: from.x + Number(dx || 0), y: from.y + Number(dy || 0), interior: true };
        if (!direction) return blocked(null, from, to, 'cardinal-only');
        const sourceRoom = app?.activeInterior?.tiles?.[`${from.x},${from.y}`] || null;
        const targetRoom = app?.activeInterior?.tiles?.[`${to.x},${to.y}`] || null;
        if (!targetRoom) return blocked(direction, from, to, 'wall');
        if (Array.isArray(sourceRoom?.connections) && !sourceRoom.connections.includes(direction.id)) {
            return blocked(direction, from, to, 'wall');
        }
        if (Array.isArray(targetRoom?.connections) && !targetRoom.connections.includes(direction.opposite)) {
            return blocked(direction, from, to, 'wall');
        }
        return { allowed: true, direction: direction.id, from, to, cost: 1, requiredCapability: null, reasonCode: null, tile: targetRoom };
    }

    function resolve(app, dx, dy) {
        return app?.inInterior ? resolveInterior(app, dx, dy) : resolveOverworld(app, dx, dy);
    }

    function message(app, decision) {
        const labels = {
            'cardinal-only': ['movement.cardinalOnly', 'Travel follows the four cardinal directions.'],
            'bridge-direction': ['movement.bridgeDirection', 'The crossing does not run in that direction.'],
            barrier: ['movement.barrier', 'A steep natural barrier blocks that route.'],
            capability: ['movement.capabilityRequired', 'You need {capability} to travel there.'],
            impassable: ['movement.impassable', 'The terrain blocks the way.'],
            wall: ['structure.wallBlocked', 'A wall blocks the way.']
        };
        const [key, fallback] = labels[decision?.reasonCode] || labels.impassable;
        return app?._label ? app._label(key, fallback, { capability: decision?.requiredCapability || 'special traversal' }) : fallback;
    }

    return { DIRECTIONS, directionFor, hasCapability, resolve, resolveOverworld, resolveInterior, message };
})();

if (typeof window !== 'undefined') window.YAW_TRAVERSAL = YAW_TRAVERSAL;
