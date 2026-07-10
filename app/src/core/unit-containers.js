/**
 * YOU ARE WILD UNIT CONTAINERS
 * Shared capacity, containment, and summary helpers for unit containers.
 */

const YAW_UNIT_CONTAINERS = {
    capacity(unit, container = 'stomach') {
        const base = Math.max(1, (unit?.size || 4) + (unit?.appetite || 0));
        return container === 'stomach' ? base : Math.max(1, Math.floor(base / 2));
    },

    contents(unit, container = 'stomach') {
        if (container === 'womb') return unit?.womb || [];
        if (container === 'balls') return unit?.balls || [];
        return unit?.stomach || [];
    },

    used(unit, container = 'stomach') {
        return this.contents(unit, container).reduce((sum, prey) => {
            const state = prey?.state || prey?.digestionState || 'contained';
            if (['terminal', 'released', 'passed'].includes(state)) return sum;
            if (container === 'stomach' && prey?.inStomach === false) return sum;
            if (prey?.alive === false && prey?.CPun === 0) return sum;
            return sum + (prey.size || 1);
        }, 0);
    },

    canFit(predator, prey, container = 'stomach') {
        if (!predator || !prey) return false;
        return this.used(predator, container) + (prey.size || 1) <= this.capacity(predator, container);
    },

    failureMessage(app, actor, target, container = 'stomach') {
        const containerKey = container === 'womb' ? 'capacity.womb' : container === 'balls' ? 'capacity.balls' : 'capacity.stomach';
        const fallbackContainer = container === 'womb' ? 'inner' : container === 'balls' ? 'reserve' : 'belly';
        const owner = actor === app.player
            ? app._label('capacity.owner.your', 'Your')
            : app._label('capacity.owner.named', "{name}'s", { name: actor?.name || 'Someone' });
        return app._label('capacity.tooFull', '{owner} {container} is too full for {target}!', {
            owner,
            container: app._label(containerKey, fallbackContainer),
            target: target?.name || 'target'
        });
    },

    summary(app, unit, container = 'stomach') {
        return `${this.used(unit, container)}/${this.capacity(unit, container)}`;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CONTAINERS = YAW_UNIT_CONTAINERS;
}
