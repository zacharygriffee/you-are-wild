/**
 * YOU ARE WILD COMBAT ACTOR STATE
 * Current-turn actor lookup and mobile combat prompt coordination.
 */

const YAW_COMBAT_ACTOR_STATE = {
    current(app) {
        if (!app.combatState?.active) return null;
        return app.combatState.turnQueue?.[app.combatState.currentTurn]?.unit || null;
    },

    blockingStatus(unit) {
        if (!unit) return null;
        if (unit.refractory) return 'refractory';
        const status = unit.status || {};
        if (status.stun?.turns > 0) return 'stun';
        if (status.freeze?.skip) return 'freeze';
        if (status.restrained?.turns > 0) return 'restrained';
        if (status.stuck?.turns > 0) return 'stuck';
        if (status.enveloped?.turns > 0) return 'enveloped';
        if (status.terror?.turns > 0 || status.frightened
            || (status.fear?.turns > 0 && unit.CPun < unit.MPun * 0.3)) return 'terror-flee';
        return null;
    },

    progressState(app) {
        if (!app.combatState?.active) {
            return { kind: 'inactive', phase: 'none', actorId: null, actorName: null, commands: [] };
        }
        const livingEnemies = app._livingEnemies?.(app.creatures) || [];
        const livingParty = (app.party || []).filter(unit => unit?.CPun > 0 && !unit.knockedOut && !unit.fledCombat);
        if (livingEnemies.length === 0 || livingParty.length === 0) {
            return {
                kind: 'terminal',
                phase: livingEnemies.length === 0 ? 'victory' : 'defeat',
                actorId: null,
                actorName: null,
                commands: ['resolve-combat']
            };
        }
        const actor = this.current(app);
        if (!actor) {
            return { kind: 'automatic', phase: 'repair-queue', actorId: null, actorName: null, commands: ['process-turn'] };
        }
        const actorId = app._unitSelectionId(actor);
        const base = { actorId, actorName: actor.name || actorId };
        const blockingStatus = this.blockingStatus(actor);
        if (blockingStatus) {
            return { kind: 'automatic', phase: `status-${blockingStatus}`, ...base, commands: ['process-turn'] };
        }
        const controllable = app.party.includes(actor) && (actor.name === app.player?.name || actor.obedient !== false);
        if (!controllable) {
            return { kind: 'automatic', phase: app.party.includes(actor) ? 'ally-ai' : 'enemy-ai', ...base, commands: ['process-turn'] };
        }
        if (app.combatState.processing) {
            return { kind: 'invalid', phase: 'stale-processing', ...base, commands: ['recover-combat'] };
        }
        if (app.feedSelection?.active) {
            return { kind: 'manual', phase: 'action-variant-options', ...base, commands: ['back-variant'] };
        }
        if (app.syncSelection?.active && !app._isCombatGroupCompose?.()) {
            return { kind: 'manual', phase: `sync-${app.syncSelection.phase || 'choose'}`, ...base, commands: ['cancel-sync'] };
        }
        if (app.targetSelection?.source === 'combat') {
            return { kind: 'manual', phase: 'targeting', ...base, commands: ['cancel-targeting'] };
        }
        if (app.combatPlanSelection?.active && app.combatPlanSelection.pendingIntent) {
            return { kind: 'manual', phase: 'combat-plan-confirm', ...base, commands: ['confirm-combat-plan', 'clear-intent'] };
        }
        if (app._isCombatGroupCompose?.()) {
            return { kind: 'manual', phase: 'combat-group-compose', ...base, commands: ['skip', 'flee', 'clear-group'] };
        }
        return { kind: 'manual', phase: 'choose-action', ...base, commands: ['skip', 'flee'] };
    },

    recoverProgress(app, reason = 'unknown') {
        if (!app.combatState?.active || app._recoveringCombatProgress) return false;
        app._recoveringCombatProgress = true;
        try {
            app.combatState.processing = false;
            app._clearTransientInteractionState?.();
            this.sanitize(app, { preserveTurn: true });
            app.combatProgressDiagnostic = {
                reason: String(reason || 'unknown'),
                snapshot: this.progressState(app),
                round: app.combatState.round || 1,
                turn: app.combatState.currentTurn || 0
            };
            app.processTurn();
            return true;
        } finally {
            app._recoveringCombatProgress = false;
        }
    },

    ambushInitiativeBonus(app) {
        return Math.max(25, 100 - app._partyRoleEffect('guard', 35, 75));
    },

    ambushAwareness(app, enemy) {
        const observers = (app.party || []).filter(unit =>
            unit
            && unit.CPun > 0
            && !unit.knockedOut
            && !unit.fledCombat
            && !app._isCorpse?.(unit)
        );
        const observer = observers.reduce((best, unit) =>
            !best || Number(unit.wis || 10) > Number(best.wis || 10) ? unit : best
        , null) || app.player;
        const observerWis = Math.max(1, Number(observer?.wis || 10));
        const scoutBonus = app._partyRoleEffect('scout', 7, 14);
        const guardBonus = app._partyRoleEffect('guard', 2, 6);
        const night = Boolean(app._isNight?.());
        const partyDarkvision = Boolean(app._partyHasDarkvision?.());
        const visibility = night ? (partyDarkvision ? 1 : -4) : 2;
        const biomeId = app._currentBiomeId?.();
        const terrainStealth = biomeId === 'cave' || biomeId === 'dungeon'
            ? 3
            : (app._isDenseForestBiome?.(biomeId) ? 2 : (biomeId === 'swamp' ? 1 : 0));
        const temperament = app._getSpeciesTemperament?.(enemy?.species) || {};
        const enemyStealth = Math.max(1, Number(enemy?.spd || 10))
            + (temperament.ambush ? 4 : 0)
            + (temperament.cunning ? 2 : 0)
            + terrainStealth
            + (night && (enemy?.darkvision || temperament.nocturnal) ? 2 : 0);
        const observerId = app._unitSelectionId?.(observer || {}) || 'party';
        const enemyId = app._unitSelectionId?.(enemy || {}) || enemy?.species || 'ambusher';
        const x = Number(app.location?.x ?? 0);
        const y = Number(app.location?.y ?? 0);
        const awarenessSwing = (app._worldRoll(
            'ambush-awareness-party',
            x,
            y,
            observerId,
            enemyId,
            app.dayCount || 0,
            app.timeHour || 0
        ) - 0.5) * 8;
        const stealthSwing = (app._worldRoll(
            'ambush-awareness-enemy',
            x,
            y,
            enemyId,
            observerId,
            app.dayCount || 0,
            app.timeHour || 0
        ) - 0.5) * 8;
        const awareness = observerWis + scoutBonus + guardBonus + visibility + awarenessSwing;
        const stealth = enemyStealth + stealthSwing;
        return {
            enemy,
            observer,
            detected: awareness >= stealth,
            awareness,
            stealth,
            scoutBonus,
            guardBonus,
            visibility,
            biomeId
        };
    },

    resolveAmbushAwareness(app, enemies = []) {
        const candidates = (enemies || []).filter(enemy => enemy?.ambushReady);
        const results = candidates.map(enemy => this.ambushAwareness(app, enemy));
        for (const result of results) {
            if (!result.detected) continue;
            result.enemy.ambushReady = false;
            result.enemy.ambushDetected = true;
        }
        return {
            results,
            detected: results.filter(result => result.detected).map(result => result.enemy),
            undetected: results.filter(result => !result.detected).map(result => result.enemy)
        };
    },

    initiative(app, unit) {
        let base = app._effectiveSpeed(unit) + app._combatStateRoll('combat-initiative', unit, 'jitter') * 10;
        if (unit.bodyParts) {
            for (const bp of unit.bodyParts) {
                const part = app.BODY_PARTS[bp];
                if (part && part.priority) base += part.priority;
            }
        }
        if (unit.fastFlee) base += 2;
        if (unit.cum >= 20) base -= 5;
        const stomachSize = (unit.stomach?.length || 0) + (unit.womb?.length || 0) + (unit.balls?.length || 0);
        if (stomachSize >= 3) base -= 2;
        if (stomachSize >= 6) base -= 4;
        return app._applyHungerCombatPressure?.(base, unit, 'initiative') ?? Math.max(1, base);
    },

    syncActionLabel(app, type) {
        const action = { sync_fight: 'fight', sync_flirt: 'flirt', sync_fuck: 'fuck', sync_feed: 'feed' }[type];
        return action ? app._uiLabel(action) : app._label('combat.group', 'Group');
    },

    pendingSyncForUnit(app, unit) {
        if (!app.combatState.active || !unit) return null;
        return (app.combatState.syncActions || []).find(sync =>
            !sync.resolved &&
            sync.round === app.combatState.round &&
            ((typeof YAW_COMBAT_SYNC !== 'undefined' && YAW_COMBAT_SYNC.isParticipant(app, sync, unit))
                || (sync.targets?.length ? sync.targets : [sync.target]).some(target =>
                    target === unit || app._unitSelectionId(target) === app._unitSelectionId(unit)))
        ) || null;
    },

    turnOrderInfo(app, unit) {
        if (!app.combatState.active || !unit) return null;
        const queue = app.combatState.turnQueue || [];
        const queueIndex = queue.findIndex(entry => entry.unit === unit);
        const sync = this.pendingSyncForUnit(app, unit);
        return {
            order: queueIndex >= 0 ? queueIndex + 1 : null,
            current: queueIndex === app.combatState.currentTurn,
            acted: queueIndex >= 0 && Boolean(queue[queueIndex].actedThisRound),
            sync,
            syncOrder: sync ? sync.resolveAtIndex + 1 : null,
            syncRole: sync ? (sync.participants.includes(unit) ? 'Group' : 'Target') : null
        };
    },

    turnOrderBadge(app, unit) {
        const info = this.turnOrderInfo(app, unit);
        if (!info || (!info.order && !info.syncOrder)) return '';
        const base = info.current ? `Now #${info.order}` : (info.order ? `#${info.order}` : '');
        const acted = info.acted && !info.current ? ' Done' : '';
        const sync = info.sync ? ` ${info.syncRole} ${this.syncActionLabel(app, info.sync.type)} #${info.syncOrder}` : '';
        const bg = info.current ? 'var(--accent-primary)' : (info.sync ? 'var(--accent-warning)' : 'var(--bg-tertiary)');
        const color = info.current || info.sync ? 'var(--bg-primary)' : 'var(--text-secondary)';
        const turnOrderLabel = app._escapeHtml(app._label('combat.turnOrder', 'Turn order'));
        return `<span class="turn-order-badge" title="${turnOrderLabel}" aria-label="${turnOrderLabel} ${app._escapeHtml(base + sync)}" style="font-size:10px;font-weight:800;background:${bg};color:${color};border:1px solid var(--border-default);border-radius:6px;padding:2px 5px;margin-left:4px;white-space:nowrap;">${base}${acted}${sync}</span>`;
    },

    statusText(app, unit) {
        if (!app.combatState.active || !unit) return '';
        const bits = [];
        const info = this.turnOrderInfo(app, unit);
        if (info?.current) {
            bits.push(app._label('combat.status.current', '{name} is the current combat actor at turn {order}.', { name: unit.name, order: info.order }));
        } else if (info?.order) {
            bits.push(app._label(
                info.acted ? 'combat.status.queuedActed' : 'combat.status.queued',
                info.acted ? '{name} is queued at turn {order} and has already acted this round.' : '{name} is queued at turn {order}.',
                { name: unit.name, order: info.order }
            ));
        }
        if (info?.sync) {
            const key = info.syncRole === 'Target' ? 'combat.status.syncTarget' : 'combat.status.syncParticipant';
            const fallback = info.syncRole === 'Target'
                ? '{name} is target of queued group {action} resolving at turn {order}.'
                : '{name} is participant in queued group {action} resolving at turn {order}.';
            bits.push(app._label(key, fallback, { name: unit.name, action: this.syncActionLabel(app, info.sync.type), order: info.syncOrder }));
        }
        if (app.targetSelection && !app._isCorpse(unit)) {
            const action = app.targetSelection.action || 'action';
            if (!app.party.includes(unit)) {
                bits.push(app.canSelectCreatureTarget(unit)
                    ? app._label('combat.status.canTarget', '{name} can be selected as the {action} target.', { name: unit.name, action })
                    : app._label('combat.status.cannotTarget', '{name} cannot be selected as the {action} target.', { name: unit.name, action }));
            } else {
                const actor = app.activeActor || app.player;
                if (actor === unit) bits.push(app._label('combat.status.choosingTarget', '{name} is choosing a {action} target.', { name: unit.name, action }));
            }
        }
        return bits.join(' ');
    },

    sanitize(app, options = {}) {
        if (!app.combatState?.active) return false;
        const preserveTurn = options.preserveTurn !== false;
        // During a direct action, the queue can be repaired before the actor
        // has ever been written into it. Preserve that active actor as the
        // current turn rather than letting a newly inserted faster unit steal
        // the unresolved turn.
        const previousUnit = app.combatState.turnQueue?.[app.combatState.currentTurn]?.unit
            || app.activeActor
            || null;
        const sameUnit = (left, right) => {
            if (left === right) return true;
            const leftId = app._unitSelectionId?.(left) || String(left?.id || left?.name || '');
            const rightId = app._unitSelectionId?.(right) || String(right?.id || right?.name || '');
            return Boolean(leftId && rightId && leftId === rightId);
        };
        const validQueue = (app.combatState.turnQueue || [])
            .filter(entry => entry && app._isCombatQueueUnitValid(entry.unit))
            .filter((entry, index, queue) => !queue.slice(0, index).some(other => sameUnit(other.unit, entry.unit)));
        // A save restore, companion change, or interrupted combat update can leave a
        // living party member out of the current round. Do not hide their agency:
        // restore one ordinary turn for every valid combatant while retaining the
        // existing queue order and removing genuinely invalid entries above.
        const combatants = [
            ...(app.party || []),
            ...(app.creatures || []).filter(unit => unit?.disposition === app.DISPOSITION.ENEMY)
        ].filter(unit => app._isCombatQueueUnitValid(unit));
        for (const unit of combatants) {
            if (validQueue.some(entry => sameUnit(entry.unit, unit))) continue;
            const entry = {
                unit,
                initiative: app._calcInitiative?.(unit) || 0,
                actedThisRound: false
            };
            const insertionIndex = validQueue.findIndex(existing => Number(existing.initiative || 0) < Number(entry.initiative || 0));
            if (insertionIndex < 0) validQueue.push(entry);
            else validQueue.splice(insertionIndex, 0, entry);
        }
        app.combatState.turnQueue = validQueue;
        app.combatState.syncActions = (app.combatState.syncActions || []).map(sync => {
            const participants = (sync.participants || []).filter(unit => app._isCombatQueueUnitValid(unit) && (app.party || []).includes(unit));
            const baseAction = app._syncBaseAction?.(sync.type) || String(sync.type || '').replace(/^sync_/, '');
            const approach = sync.techniqueKey || sync.plan?.subAction || null;
            const selfFeast = baseAction === 'feast' && ['digest', 'release'].includes(approach);
            const targets = (sync.targets?.length ? sync.targets : [sync.target])
                .filter((unit, index, list) => app._isCombatQueueUnitValid(unit)
                    && (selfFeast ? participants.includes(unit) : unit?.disposition === app.DISPOSITION.ENEMY)
                    && list.indexOf(unit) === index);
            const target = targets[0] || null;
            // Queue repair can insert a missing combatant ahead of a prepared
            // group action. The resolution point belongs to the slowest
            // participant, not a stale numeric slot, so rebind it by identity.
            const participantIndexes = participants
                .map(participant => validQueue.findIndex(entry => sameUnit(entry.unit, participant)))
                .filter(index => index >= 0);
            const resolveAtIndex = participantIndexes.length === participants.length
                ? Math.max(...participantIndexes)
                : sync.resolveAtIndex;
            return { ...sync, participants, target, targets, resolveAtIndex };
        }).filter(sync => sync.target && sync.participants.length >= 2 && !sync.resolved);
        if (validQueue.length === 0) {
            app.combatState.currentTurn = 0;
            app.activeActor = null;
        } else if (preserveTurn && previousUnit) {
            const nextIndex = validQueue.findIndex(entry => entry.unit === previousUnit);
            app.combatState.currentTurn = nextIndex >= 0
                ? nextIndex
                : Math.min(Math.max(0, app.combatState.currentTurn || 0), validQueue.length - 1);
        } else {
            app.combatState.currentTurn = Math.min(Math.max(0, app.combatState.currentTurn || 0), validQueue.length - 1);
        }
        app.mode = app.GAME_MODE.COMBAT;
        const current = validQueue[app.combatState.currentTurn]?.unit || null;
        if (current) app.activeActor = current;
        else if (!app._isCombatQueueUnitValid(app.activeActor)) app.activeActor = null;
        return true;
    },

    isCurrent(app, unit) {
        if (!unit || !app.combatState?.active) return false;
        const actor = app.activeActor || this.current(app);
        if (!actor) return false;
        return actor === unit || app._unitSelectionId(actor) === app._unitSelectionId(unit);
    },

    mobilePrompt(app, actor = app._currentCombatActor()) {
        return YAW_MOBILE_COMBAT_TOOLBELT.prompt(app, actor);
    }
};

if (typeof window !== 'undefined') {
    window.YAW_COMBAT_ACTOR_STATE = YAW_COMBAT_ACTOR_STATE;
}
