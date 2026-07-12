/**
 * YOU ARE WILD UNIT CONTAINMENT
 * Shared contained-unit snapshots, vital integrity, and containment tick processing.
 */

const YAW_UNIT_CONTAINMENT = {
    defaultContainerProfiles() {
        return {
            stomach: {
                id: 'stomach',
                label: 'Belly',
                safeLabel: 'Belly',
                contentTier: 0,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['stomach', 'containment', 'v1'],
                capacityRule: 'size-plus-appetite',
                tickRule: 'slow-condition-progress',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'capped-restoration',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'digest', 'release'],
                digestionRate: 5,
                slowDigestionRate: 2,
                absorptionRate: 1
            },
            womb: {
                id: 'womb',
                label: 'Inner',
                safeLabel: 'Inner',
                contentTier: 1,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['inner', 'containment', 'compatibility'],
                capacityRule: 'compatibility-half-capacity',
                tickRule: 'compatibility',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'compatibility',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'release']
            },
            balls: {
                id: 'balls',
                label: 'Reserve',
                safeLabel: 'Reserve',
                contentTier: 1,
                ownerType: 'unit',
                accepts: ['contained-unit'],
                tags: ['reserve', 'containment', 'compatibility'],
                capacityRule: 'compatibility-half-capacity',
                tickRule: 'compatibility',
                releaseRule: 'command-before-terminal',
                absorptionRule: 'compatibility',
                terminalRule: 'progress-or-condition-zero',
                actions: ['inspect', 'release']
            }
        };
    },

    defaultFeastVerbProfiles() {
        return {
            swallow: {
                id: 'swallow',
                label: 'Swallow',
                safeLabel: 'Eat',
                contentTier: 0,
                tags: ['swallow', 'intact', 'containment'],
                containerId: 'stomach',
                integrity: 'intact'
            }
        };
    },

    normalizeVitalMax(recordOrUnit) {
        const captured = Number(recordOrUnit?.capturedPun);
        if (Number.isFinite(captured) && captured > 0) return Math.max(1, Math.floor(captured));
        const current = Number(recordOrUnit?.CPun);
        if (Number.isFinite(current) && current > 0) return Math.max(1, Math.floor(current));
        const max = Number(recordOrUnit?.MPun || recordOrUnit?.maxHp || 1);
        return Math.max(1, Math.floor(Number.isFinite(max) ? max : 1));
    },

    ensureRegistries(app) {
        if (!app.feastVerbProfiles || typeof app.feastVerbProfiles !== 'object') {
            app.feastVerbProfiles = { ...this.defaultFeastVerbProfiles(), ...(app.feastVerbProfiles || {}) };
        }
        if (!app.containerProfiles || typeof app.containerProfiles !== 'object') {
            app.containerProfiles = { ...this.defaultContainerProfiles(), ...(app.containerProfiles || {}) };
        }
        return { feastVerbProfiles: app.feastVerbProfiles, containerProfiles: app.containerProfiles };
    },

    registerFeastVerbProfile(app, profile = {}) {
        if (!profile || !profile.id) return null;
        this.ensureRegistries(app);
        app.feastVerbProfiles[profile.id] = { ...(app.feastVerbProfiles[profile.id] || {}), ...profile };
        return app.feastVerbProfiles[profile.id];
    },

    registerContainerProfile(app, profile = {}) {
        if (!profile || !profile.id) return null;
        this.ensureRegistries(app);
        app.containerProfiles[profile.id] = { ...(app.containerProfiles[profile.id] || {}), ...profile };
        return app.containerProfiles[profile.id];
    },

    profile(app, containerId = 'stomach') {
        this.ensureRegistries(app);
        return app.containerProfiles[containerId] || this.defaultContainerProfiles().stomach;
    },

    createPrey(app, target, extra = {}) {
        const containerId = extra.containerId || (extra.inWomb ? 'womb' : extra.inCock ? 'balls' : 'stomach');
        const entryVerb = extra.entryVerb || (containerId === 'stomach' ? 'swallow' : containerId);
        const prey = {
            ...target,
            alive: true,
            inStomach: containerId === 'stomach' && !extra.inWomb && !extra.inCock,
            inWomb: extra.inWomb || false,
            inCock: extra.inCock || false,
            digestionProgress: 0,
            digestionState: 'contained',
            capturedPun: Number.isFinite(target.CPun) ? target.CPun : target.MPun || 1,
            originalStats: this.captureVitalProfile(target),
            statDrain: this.emptyStatDrain(),
            willingSacrifice: extra.willingSacrifice || false,
            forcedFed: extra.forcedFed || false,
            by: extra.by || null
        };
        return this.normalizeRecord(app, extra.holder || null, prey, containerId, { ...extra, entryVerb });
    },

    captureVitalProfile(unit) {
        const stats = ['Figh', 'Feas', 'Flir', 'Fuck', 'Flee', 'Feed', 'str', 'con', 'spd', 'int', 'wis', 'cha'];
        return stats.reduce((profile, stat) => {
            profile[stat] = Number.isFinite(unit?.[stat]) ? unit[stat] : 0;
            return profile;
        }, {});
    },

    emptyStatDrain() {
        return { str: 0, con: 0, spd: 0, int: 0, wis: 0, cha: 0, Figh: 0, Feas: 0, Flir: 0, Fuck: 0, Flee: 0, Feed: 0 };
    },

    ensureStatDrain(prey) {
        prey.statDrain = { ...this.emptyStatDrain(), ...(prey.statDrain || {}) };
        return prey.statDrain;
    },

    normalizedState(prey) {
        if (prey?.state === 'terminal' || prey?.digestionState === 'terminal') return 'terminal';
        if (prey?.state === 'released' || prey?.digestionState === 'released') return 'released';
        if (prey?.state === 'passed' || prey?.digestionState === 'passed') return 'passed';
        if (prey?.state === 'depleted' || prey?.digestionState === 'depleted') return 'depleted';
        if (prey?.state === 'digesting' || prey?.digestionState === 'digesting' || (prey?.digestionProgress || 0) > 0) return 'digesting';
        return prey?.state || 'contained';
    },

    normalizeRecord(app, holder, prey, containerId = 'stomach', defaults = {}) {
        if (!prey || typeof prey !== 'object') return prey;
        const holderId = defaults.holderId || holder?.id || holder?.name || prey.holderId || null;
        const containedId = defaults.containedId || prey.containedId || prey.id || prey.name || null;
        const progress = Number.isFinite(prey.progress) ? prey.progress : Number(prey.digestionProgress || 0);
        const state = this.normalizedState(prey);
        const integrity = prey.integrity || defaults.integrity || (prey.alive === false ? 'damaged' : 'intact');
        const profile = this.profile(app, containerId);
        const clampedProgress = Math.max(0, Math.min(100, progress));
        prey.capturedPun = Number.isFinite(prey.capturedPun) ? Math.max(1, Math.floor(prey.capturedPun)) : this.normalizeVitalMax(prey);
        const vitalMax = Math.max(1, Number(prey.vitalMax || prey.capturedPun || 1));
        const inferredVital = Math.max(0, Math.round(vitalMax * (1 - clampedProgress / 100)));
        prey.holderId = holderId;
        prey.containedId = containedId;
        prey.containerId = prey.containerId || defaults.containerId || containerId;
        prey.entryVerb = prey.entryVerb || defaults.entryVerb || (prey.containerId === 'stomach' ? 'swallow' : prey.containerId);
        prey.state = state;
        prey.integrity = integrity;
        prey.progress = clampedProgress;
        prey.releaseEligible = typeof prey.releaseEligible === 'boolean'
            ? prey.releaseEligible
            : prey.integrity === 'intact' && !['terminal', 'released', 'passed', 'depleted'].includes(state);
        prey.vitalMax = vitalMax;
        prey.vitalRemaining = Number.isFinite(prey.vitalRemaining) ? Math.max(0, Math.min(vitalMax, prey.vitalRemaining)) : inferredVital;
        prey.vitalDamageTaken = Number.isFinite(prey.vitalDamageTaken) ? Math.max(0, prey.vitalDamageTaken) : Math.max(0, vitalMax - prey.vitalRemaining);
        prey.originalStats = prey.originalStats && typeof prey.originalStats === 'object'
            ? { ...this.captureVitalProfile(prey), ...prey.originalStats }
            : this.captureVitalProfile(prey);
        prey.digestionRate = Number.isFinite(prey.digestionRate) ? prey.digestionRate : profile.digestionRate || 5;
        prey.absorptionRate = Number.isFinite(prey.absorptionRate) ? prey.absorptionRate : profile.absorptionRate || 1;
        prey.temporaryStatEffects = Array.isArray(prey.temporaryStatEffects) ? prey.temporaryStatEffects : [];
        prey.modifiers = prey.modifiers && typeof prey.modifiers === 'object' ? prey.modifiers : {};
        prey.tags = Array.isArray(prey.tags) ? Array.from(new Set([...prey.tags, 'containment', prey.entryVerb, prey.integrity])) : ['containment', prey.entryVerb, prey.integrity];
        if ((prey.vitalRemaining <= 0 || prey.progress >= 100) && !['released', 'passed', 'depleted'].includes(prey.state)) {
            prey.state = 'terminal';
            prey.releaseEligible = false;
        }
        prey.digestionProgress = prey.progress;
        prey.digestionState = prey.state === 'terminal' ? 'terminal' : prey.state === 'released' ? 'released' : prey.state === 'depleted' ? 'depleted' : prey.state === 'digesting' ? 'digesting' : 'contained';
        this.ensureStatDrain(prey);
        return prey;
    },

    normalizeContainer(app, holder, containerId = 'stomach') {
        const list = holder?.[containerId] || [];
        for (const prey of list) this.normalizeRecord(app, holder, prey, containerId);
        return list;
    },

    isActiveContained(prey, containerId = 'stomach') {
        if (!prey) return false;
        const state = this.normalizedState(prey);
        if (['terminal', 'released', 'passed', 'depleted'].includes(state)) return false;
        if (containerId === 'stomach' && prey.inStomach === false) return false;
        return prey.alive !== false && prey.CPun !== 0;
    },

    containedCondition(prey) {
        const max = Math.max(1, Number(prey?.MPun || prey?.maxHp || 1));
        const current = Number.isFinite(prey?.CPun) ? prey.CPun : max;
        return { current, max };
    },

    vitalRatio(record) {
        if (!record) return 0;
        const max = Math.max(1, Number(record.vitalMax || record.MPun || record.maxHp || 1));
        const current = Math.max(0, Math.min(max, Number.isFinite(record.vitalRemaining) ? record.vitalRemaining : max));
        return current / max;
    },

    canReleaseFromVitalState(record) {
        if (!record) return false;
        if (['terminal', 'released', 'passed', 'depleted'].includes(this.normalizedState(record))) return false;
        return record.releaseEligible !== false && Number(record.vitalRemaining ?? record.CPun ?? 0) > 0;
    },

    isTerminalVitalState(record) {
        if (!record) return false;
        return record.state === 'terminal'
            || record.digestionState === 'terminal'
            || (Number.isFinite(record.vitalRemaining) && record.vitalRemaining <= 0)
            || (Number.isFinite(record.progress) && record.progress >= 100);
    },

    applyVitalDamage(recordOrUnit, amount = 0, context = {}) {
        if (!recordOrUnit) return null;
        if (!Number.isFinite(recordOrUnit.capturedPun)) recordOrUnit.capturedPun = this.normalizeVitalMax(recordOrUnit);
        const max = Math.max(1, Number(recordOrUnit.vitalMax || recordOrUnit.capturedPun || 1));
        if (!Number.isFinite(recordOrUnit.vitalMax)) recordOrUnit.vitalMax = max;
        if (!Number.isFinite(recordOrUnit.vitalRemaining)) {
            const progress = Number(recordOrUnit.progress ?? recordOrUnit.digestionProgress ?? 0);
            recordOrUnit.vitalRemaining = Math.max(0, Math.round(max * (1 - Math.max(0, Math.min(100, progress)) / 100)));
        }
        if (!recordOrUnit.originalStats) recordOrUnit.originalStats = this.captureVitalProfile(recordOrUnit);
        const damage = Math.max(0, Math.floor(Number(amount) || 0));
        const before = recordOrUnit.vitalRemaining;
        recordOrUnit.vitalRemaining = Math.max(0, before - damage);
        recordOrUnit.vitalDamageTaken = Math.max(0, Number(recordOrUnit.vitalDamageTaken || 0) + (before - recordOrUnit.vitalRemaining));
        if (context.reduceCondition !== false && Number.isFinite(recordOrUnit.CPun)) {
            recordOrUnit.CPun = Math.max(context.minimumCondition || 0, recordOrUnit.CPun - damage);
        }
        if (recordOrUnit.vitalRemaining <= 0) {
            recordOrUnit.releaseEligible = false;
            if (context.terminal !== false) {
                recordOrUnit.state = recordOrUnit.state === 'released' ? 'released' : 'terminal';
                recordOrUnit.digestionState = recordOrUnit.state === 'released' ? 'released' : 'terminal';
            }
        }
        return recordOrUnit;
    },

    releaseFromVitalState(record) {
        if (!record) return null;
        const ratio = Math.max(0.05, this.vitalRatio(record));
        record.CPun = Math.max(1, Math.floor(Number(record.vitalRemaining || 0)));
        record.CPle = 0;
        record.status = record.status || {};
        if (ratio < 0.75) {
            record.status.vitalWeakness = {
                ratio,
                source: 'containment',
                label: 'Vital Weakness'
            };
        }
        record.inStomach = false;
        record.inWomb = false;
        record.inCock = false;
        record.state = 'released';
        record.digestionState = 'released';
        record.releaseEligible = false;
        return record;
    },

    normalizeRemainsRecord(record, defaults = {}) {
        if (!record || typeof record !== 'object') return record;
        record.kind = 'remains';
        record.corpseOf = record.corpseOf || record.sourceId || record.originalId || record.id || record.name || defaults.corpseOf || null;
        record.displayName = record.displayName || record.corpseName || record.name || defaults.displayName || 'Remains';
        record.species = record.species || defaults.species || 'unknown';
        record.size = Math.max(1, Number(record.size || defaults.size || 1));
        const legacyPortions = Number(record.remainingPortions);
        const initialMass = Math.max(0, Math.floor(Number.isFinite(legacyPortions) ? legacyPortions : Math.ceil(record.size)));
        record.edibleMax = Math.max(0, Math.floor(Number.isFinite(Number(record.edibleMax)) ? Number(record.edibleMax) : initialMass));
        record.edibleRemaining = Math.max(0, Math.floor(Number.isFinite(Number(record.edibleRemaining)) ? Number(record.edibleRemaining) : (record.scavenged ? 0 : initialMass)));
        record.portionsRemaining = Math.max(0, Math.floor(Number.isFinite(Number(record.portionsRemaining)) ? Number(record.portionsRemaining) : record.edibleRemaining));
        record.remainingPortions = record.portionsRemaining;
        record.source = record.source || record.corpseCause || defaults.source || 'fight';
        record.decayTurns = record.decayTurns ?? defaults.decayTurns ?? 12;
        record.depleted = Boolean(record.depleted || record.scavenged || record.edibleRemaining <= 0 || record.portionsRemaining <= 0);
        record.scavenged = record.depleted;
        return record;
    },

    applyRemainsScavenge(record, actor, amount = 1, context = {}) {
        if (!record || !actor) return null;
        this.normalizeRemainsRecord(record);
        const consumed = Math.min(record.edibleRemaining, Math.max(1, Math.floor(Number(amount) || 1)));
        if (consumed <= 0) {
            record.depleted = true;
            record.scavenged = true;
            return null;
        }
        record.edibleRemaining = Math.max(0, record.edibleRemaining - consumed);
        record.portionsRemaining = record.edibleRemaining;
        record.remainingPortions = record.edibleRemaining;
        if (record.edibleRemaining <= 0) {
            record.depleted = true;
            record.scavenged = true;
        }
        if (context.applyBenefits !== false) {
            const maxPun = Number.isFinite(Number(actor.MPun)) ? Number(actor.MPun) : (actor.CPun || 0);
            actor.hunger = Math.max(0, (actor.hunger || 0) - 10 * consumed);
            actor.CPun = Math.min(maxPun, (actor.CPun || 0) + 5 * consumed);
        }
        return { actor, consumed, remaining: record.edibleRemaining };
    },

    isDepletedRemains(record) {
        if (!record) return true;
        this.normalizeRemainsRecord(record);
        return record.depleted || record.edibleRemaining <= 0;
    },

    summary(record) {
        if (!record) return '';
        const ratio = Math.round(this.vitalRatio(record) * 100);
        const state = this.normalizedState(record);
        const release = record.releaseEligible && ratio > 0 ? 'releasable' : 'not releasable';
        return `${state} · vitality ${ratio}% · ${release}`;
    },

    containerLabel(app, container = 'stomach') {
        if (container === 'womb') return app._label('capacity.womb', 'Inner');
        if (container === 'balls') return app._label('capacity.balls', 'Reserve');
        return app._label('capacity.stomach', 'Belly');
    },

    visibleContainedEntries(app, holder, container = 'stomach') {
        const list = this.normalizeContainer(app, holder, container) || [];
        return list
            .map((prey, index) => ({ prey, index, state: this.normalizedState(prey) }))
            .filter(entry => !['released', 'passed', 'depleted'].includes(entry.state));
    },

    canManageContainerEntry(app, holder) {
        if (!app?.combatState?.active) return true;
        return holder && holder === app._currentCombatActor?.();
    },

    renderContainerInventory(app, holder, holderType = 'party', holderIndex = 0) {
        if (!app || !holder) return '';
        const containers = ['stomach', 'womb', 'balls'];
        const sections = [];
        const canManage = this.canManageContainerEntry(app, holder);
        const combatBlockTitle = app._label('containment.combatManageCurrentOnly', 'Only the current combat actor can manage contained creatures.');
        for (const container of containers) {
            const entries = this.visibleContainedEntries(app, holder, container);
            const used = app._containerUsed?.(holder, container) ?? 0;
            const capacity = app._containerCapacity?.(holder, container) ?? 0;
            if (!entries.length && container !== 'stomach') continue;
            const label = this.containerLabel(app, container);
            const entryHtml = entries.length
                ? entries.map(({ prey, index, state }) => {
                    const name = prey.name || app._label('containment.unknownPrey', 'Contained creature');
                    const vital = Math.round(this.vitalRatio(prey) * 100);
                    const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
                    const canRelease = canManage && this.canReleaseFromVitalState(prey);
                    const canDigest = canManage && !['terminal', 'released', 'passed', 'depleted'].includes(state);
                    const disabledReason = canManage ? '' : combatBlockTitle;
                    const releaseTitle = canRelease
                        ? app._label('containment.releaseTitle', 'Release {name}', { name })
                        : (disabledReason || app._label('containment.releaseUnavailable', '{name} cannot be released now.', { name }));
                    const digestTitle = canDigest
                        ? app._label('containment.digestTitle', 'Digest {name}', { name })
                        : (disabledReason || app._label('containment.digestUnavailable', '{name} cannot be digested now.', { name }));
                    const releaseDisabled = canRelease ? '' : ' disabled aria-disabled="true"';
                    const digestDisabled = canDigest ? '' : ' disabled aria-disabled="true"';
                    const holderArg = app._escapeJsString(holderType);
                    const containerArg = app._escapeJsString(container);
                    const inspectTitle = app._escapeHtml(app._label('containment.inspectTitle', 'Inspect {name}', { name }));
                    return `<div class="container-inventory-entry" data-contained-id="${app._escapeHtml(prey.containedId || prey.id || prey.name || String(index))}" data-contained-state="${app._escapeHtml(state)}">
                        <div class="container-entry-main">
                            <div class="container-entry-name">${app._escapeHtml(prey.icon || '')} ${app._escapeHtml(name)}</div>
                            <div class="container-entry-meta">${app._escapeHtml(state)} · ${app._escapeHtml(app._label('containment.vitality', 'Vitality'))} ${vital}% · ${app._escapeHtml(app._label('containment.progress', 'Progress'))} ${progress}%</div>
                        </div>
                        <div class="container-entry-actions" data-command-surface="container-inventory" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-grammar="container-management">
                            <button class="action-btn" data-command-control="inspect-contained" title="${inspectTitle}" aria-label="${inspectTitle}" onclick="event.stopPropagation();App.inspectContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.inspect', 'Inspect'))}</button>
                            <button class="action-btn" data-command-control="release-contained" title="${app._escapeHtml(releaseTitle)}" aria-label="${app._escapeHtml(releaseTitle)}"${releaseDisabled} onclick="event.stopPropagation();App.releaseContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.release', 'Release'))}</button>
                            <button class="action-btn" data-command-control="digest-contained" title="${app._escapeHtml(digestTitle)}" aria-label="${app._escapeHtml(digestTitle)}"${digestDisabled} onclick="event.stopPropagation();App.digestContained('${holderArg}',${holderIndex},'${containerArg}',${index})">${app._escapeHtml(app._label('containment.digest', 'Digest'))}</button>
                        </div>
                    </div>`;
                }).join('')
                : `<div class="container-inventory-empty">${app._escapeHtml(app._label('containment.empty', 'No contained creatures.'))}</div>`;
            sections.push(`<section class="container-inventory-section" data-container-id="${app._escapeHtml(container)}">
                <div class="container-inventory-header">
                    <strong>${app._escapeHtml(label)}</strong>
                    <span>${app._escapeHtml(String(used))}/${app._escapeHtml(String(capacity))}</span>
                </div>
                ${entryHtml}
            </section>`);
        }
        if (!sections.length) return '';
        const title = app._escapeHtml(app._label('containment.inventoryTitle', 'Containers'));
        return `<div class="container-inventory" data-command-surface="container-inventory" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-grammar="container-management" aria-label="${title}">
            <div class="container-inventory-title">${title}</div>
            ${sections.join('')}
        </div>`;
    },

    resolveHolder(app, holderType = 'party', holderIndex = 0) {
        const list = holderType === 'creature' ? app.creatures : app.party;
        return { list, holder: list?.[holderIndex] || null };
    },

    refreshAfterContainerCommand(app, holderType = 'party') {
        app.renderParty?.();
        app.renderCreatures?.();
        app.renderLog?.();
        app.renderStoryEvents?.();
        app.refreshHoldingsWindow?.();
        if (app.combatState?.active) {
            const actor = app._currentCombatActor?.() || app.activeActor;
            app.renderDesktopCombatComposer?.(actor);
            app.renderMobileCombatToolbelt?.();
            app.renderSelectionSentence?.();
        }
        if (holderType === 'creature') app.renderCreatures?.();
    },

    containedDetailHtml(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return null;
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return null;
        this.normalizeRecord(app, holder, prey, container);
        const title = `${prey.icon || ''} ${prey.name || app._label('containment.unknownPrey', 'Contained creature')}`;
        const state = this.normalizedState(prey);
        const vital = Math.round(this.vitalRatio(prey) * 100);
        const progress = Math.round(prey.progress ?? prey.digestionProgress ?? 0);
        const containerLabel = this.containerLabel(app, container);
        const backText = app._label('inventory.back', 'Back');
        const releaseText = app._label('containment.release', 'Release');
        const digestText = app._label('containment.digest', 'Digest');
        const backLabel = app._escapeHtml(backText);
        const holderTypeArg = app._escapeJsString(holderType);
        const containerArg = app._escapeJsString(container);
        const releaseAvailable = this.canReleaseFromVitalState(prey);
        const terminal = ['terminal', 'released', 'passed', 'depleted'].includes(state);
        const releaseButton = releaseAvailable
            ? `<button class="nav-btn" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-control="release-contained" title="${app._escapeHtml(app._label('containment.releaseTitle', 'Release {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" aria-label="${app._escapeHtml(app._label('containment.releaseTitle', 'Release {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" onclick="App.releaseContained('${holderTypeArg}',${holderIndex},'${containerArg}',${containedIndex})">${app._escapeHtml(releaseText)}</button>`
            : '';
        const digestButton = !terminal
            ? `<button class="nav-btn" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-control="digest-contained" title="${app._escapeHtml(app._label('containment.digestTitle', 'Digest {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" aria-label="${app._escapeHtml(app._label('containment.digestTitle', 'Digest {name}', { name: prey.name || app._label('containment.unknownPrey', 'Contained creature') }))}" onclick="App.digestContained('${holderTypeArg}',${holderIndex},'${containerArg}',${containedIndex})">${app._escapeHtml(digestText)}</button>`
            : '';
        const html = `<div class="inventory-panel-detail holdings-detail" data-command-surface="container-inspect" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}">
            <h3>${app._escapeHtml(title)}</h3>
            <div class="holdings-section">
                <div class="holdings-section-title">${app._escapeHtml(containerLabel)} · ${app._escapeHtml(holder.name || app._label('ui.unknown', 'Unknown'))}</div>
                <div class="holdings-entry">
                    <div class="holding-entry-main">
                        <strong>${app._escapeHtml(prey.name || app._label('containment.unknownPrey', 'Contained creature'))}</strong>
                        <div class="holding-entry-meta">${app._escapeHtml(state)} · ${app._escapeHtml(app._label('containment.vitality', 'Vitality'))} ${vital}% · ${app._escapeHtml(app._label('containment.progress', 'Progress'))} ${progress}%</div>
                        <div class="holding-entry-meta">${app._escapeHtml(app._label('containment.integrity', 'Integrity'))}: ${app._escapeHtml(prey.integrity || 'intact')} · ${app._escapeHtml(app._label('containment.releaseEligible', 'Release'))}: ${releaseAvailable ? app._escapeHtml(app._label('ui.yes', 'Yes')) : app._escapeHtml(app._label('ui.no', 'No'))}</div>
                    </div>
                </div>
                <div class="holding-entry-actions">${releaseButton}${digestButton}<button class="nav-btn" data-command-surface="container-inspect" data-command-control="back-holdings" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="App.setHoldingsTab ? App.setHoldingsTab('containers') : App.showInventory()">${backLabel}</button></div>
            </div>
        </div>`;
        return { title, html };
    },

    inspectContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        if (app.showContainedHoldingDetail?.(holderType, holderIndex, container, containedIndex)) return true;
        const detail = this.containedDetailHtml(app, holderType, holderIndex, container, containedIndex);
        if (!detail) return false;
        app.showPartyPanelDetail(detail.title, detail.html);
        return true;
    },

    releaseContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return false;
        if (!this.canManageContainerEntry(app, holder)) {
            app.log?.push?.({ text: this.containerLabel(app, container) + ': only the current combat actor can release contained creatures.', type: 'combat' });
            app.renderLog?.();
            return false;
        }
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return false;
        this.normalizeRecord(app, holder, prey, container);
        if (!this.canReleaseFromVitalState(prey)) {
            app.log?.push?.({ text: `${prey.name || 'Contained creature'} cannot be released now.`, type: app.combatState?.active ? 'combat' : 'discovery' });
            this.refreshAfterContainerCommand(app, holderType);
            return false;
        }
        list.splice(containedIndex, 1);
        this.releaseFromVitalState(prey);
        if (!Array.isArray(app.creatures)) app.creatures = [];
        if (!app.creatures.includes(prey)) app.creatures.push(prey);
        this.emitContainmentBeat(app, 'released', holder, prey, {
            deltas: [{ kind: 'state', state: 'released', unit: prey.name }]
        });
        app.log?.push?.({ text: `${prey.name || 'Contained creature'} released from ${holder.name || 'holder'} ${this.containerLabel(app, container)} at reduced condition.`, type: app.combatState?.active ? 'combat' : 'discovery' });
        this.refreshAfterContainerCommand(app, holderType);
        if (app.combatState?.active) app.nextTurn?.();
        return true;
    },

    digestContained(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const { holder } = this.resolveHolder(app, holderType, holderIndex);
        if (!holder) return false;
        if (!this.canManageContainerEntry(app, holder)) {
            app.log?.push?.({ text: this.containerLabel(app, container) + ': only the current combat actor can digest contained creatures.', type: 'combat' });
            app.renderLog?.();
            return false;
        }
        const list = holder[container] || [];
        const prey = list[containedIndex];
        if (!prey) return false;
        this.normalizeRecord(app, holder, prey, container);
        if (['terminal', 'released', 'passed', 'depleted'].includes(this.normalizedState(prey))) {
            app.log?.push?.({ text: `${prey.name || 'Contained creature'} cannot be digested further.`, type: app.combatState?.active ? 'combat' : 'discovery' });
            this.refreshAfterContainerCommand(app, holderType);
            return false;
        }
        prey.progress = 100;
        prey.digestionProgress = 100;
        this.terminalize(app, holder, prey, { key: container });
        app.log?.push?.({ text: `${holder.name || 'Holder'} digests ${prey.name || 'contained creature'} in ${this.containerLabel(app, container)}.`, type: app.combatState?.active ? 'combat' : 'discovery' });
        this.refreshAfterContainerCommand(app, holderType);
        if (app.combatState?.active) app.nextTurn?.();
        return true;
    },

    emitContainmentBeat(app, kind, holder, prey, options = {}) {
        if (!app || typeof app.emitSceneBeat !== 'function' || !prey || !holder) return null;
        const targetName = prey.name || 'the contained creature';
        const holderName = holder.name || 'their holder';
        const summaries = {
            contained: `${targetName} is held in ${holderName}'s stomach.`,
            digesting: `${targetName} weakens while held in ${holderName}'s stomach.`,
            released: `${targetName} is released from ${holderName}'s stomach, weakened but alive.`,
            terminal: `${targetName} is fully digested inside ${holderName}. ${holderName} feels restored.`
        };
        return app.emitSceneBeat({
            mode: app.combatState?.active ? 'combat' : 'adventure',
            action: 'feast',
            subAction: kind === 'terminal' ? 'digest' : kind,
            actors: [holder],
            targets: [prey],
            shape: 'one-to-one',
            tags: ['containment', kind, prey.entryVerb || 'swallow'],
            source: 'containment'
        }, summaries[kind] || summaries.contained, {
            resultKind: kind === 'terminal' ? 'resolved' : kind === 'released' ? 'recovery' : 'state',
            tags: ['containment', kind, prey.entryVerb || 'swallow'],
            source: 'containment',
            deltas: options.deltas || []
        });
    },

    applyTerminalAbsorption(app, holder, prey, config) {
        if (!holder || !prey || prey.absorptionApplied) return [];
        const size = Math.max(1, Number(prey.size || 1));
        const healAmount = Math.max(1, Math.min(12, Math.floor(size * 2)));
        const hungerRelief = Math.max(4, Math.min(35, Math.floor(size * 8)));
        const beforeHp = Number(holder.CPun || 0);
        const beforeHunger = Number(holder.hunger || 0);
        holder.CPun = Math.min(holder.MPun || beforeHp || 1, beforeHp + healAmount);
        holder.hunger = Math.max(0, beforeHunger - hungerRelief);
        const effect = {
            id: `containment-${prey.containedId || prey.name || 'prey'}`,
            source: 'containment',
            stat: 'Feas',
            amount: 1,
            remainingTurns: 6,
            tags: ['temporary', 'containment', config?.key || 'stomach']
        };
        if (!Array.isArray(holder.temporaryStatEffects)) holder.temporaryStatEffects = [];
        holder.temporaryStatEffects.push(effect);
        prey.temporaryStatEffects = [effect];
        prey.absorptionApplied = true;
        return [
            { kind: 'healing', amount: holder.CPun - beforeHp, unit: holder.name },
            { kind: 'hunger', amount: beforeHunger - holder.hunger, unit: holder.name },
            { kind: 'temporary-stat', stat: 'Feas', amount: 1, unit: holder.name }
        ];
    },

    terminalize(app, holder, prey, config) {
        this.normalizeRecord(app, holder, prey, config.key || prey.containerId || 'stomach');
        if (prey.state === 'terminal' && prey.absorptionApplied) return prey;
        prey.state = 'terminal';
        prey.digestionState = 'terminal';
        prey.progress = 100;
        prey.digestionProgress = 100;
        prey.vitalRemaining = 0;
        prey.vitalDamageTaken = Math.max(prey.vitalMax || 1, Number(prey.vitalDamageTaken || 0));
        prey.releaseEligible = false;
        prey.alive = false;
        prey.CPun = 0;
        prey.CPle = 0;
        const deltas = this.applyTerminalAbsorption(app, holder, prey, config);
        if (!prey.terminalSceneBeatEmitted) {
            prey.terminalSceneBeatEmitted = true;
            this.emitContainmentBeat(app, 'terminal', holder, prey, { deltas });
            app?.log?.push?.({ text: `${prey.name} reaches terminal digestion inside ${holder.name}.`, type: 'combat' });
        }
        return prey;
    },

    containerConfigs() {
        return [
            {
                key: 'stomach',
                flag: 'inStomach',
                fastRate: 5,
                slowRate: 2,
                stats: ['str', 'con', 'Figh'],
                advanceContained: true,
                fatalLog: (prey, unit) => `${prey.name} is fully digested inside ${unit.name}.`,
                softLog: (prey, unit) => `${prey.name} is fully softened inside ${unit.name}, ready to be released or kept as endo.`
            },
            {
                key: 'womb',
                flag: 'inWomb',
                fastRate: 3,
                slowRate: 1,
                stats: ['cha', 'Flir', 'Fuck'],
                fatalLog: (prey, unit) => `${prey.name} perishes in ${unit.name}'s inner reserve.`,
                softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s inner reserve.`
            },
            {
                key: 'balls',
                flag: 'inCock',
                fastRate: 3,
                slowRate: 1,
                stats: ['Feas', 'Fuck'],
                fatalLog: (prey, unit) => `${prey.name} dissolves in ${unit.name}'s reserve.`,
                softLog: (prey, unit) => `${prey.name} is fully softened in ${unit.name}'s reserve.`
            }
        ];
    },

    processContainer(app, unit, config) {
        for (const prey of (unit[config.key] || [])) {
            this.normalizeRecord(app, unit, prey, config.key);
            if (this.isTerminalVitalState(prey) && !['released', 'passed', 'depleted'].includes(prey.state)) {
                this.terminalize(app, unit, prey, config);
                continue;
            }
            if (!this.isActiveContained(prey, config.key) || prey[config.flag] === false) continue;
            this.ensureStatDrain(prey);
            if (config.advanceContained && prey.digestionState === 'contained') prey.digestionState = 'digesting';
            const rate = app.settings.slowDigestion ? config.slowRate : config.fastRate;
            prey.progress = Math.min(100, (prey.progress || prey.digestionProgress || 0) + rate);
            prey.digestionProgress = prey.progress;
            prey.state = prey.progress > 0 ? 'digesting' : 'contained';
            prey.digestionState = prey.state;
            const drain = Math.max(1, Math.floor(rate * 0.3));
            for (const stat of config.stats) {
                prey.statDrain[stat] += drain;
            }
            const conditionDrain = Math.max(1, Math.floor(rate * 0.4));
            this.applyVitalDamage(prey, conditionDrain, { source: 'digestion-tick' });
            if (app.settings.statAbsorption) {
                app._absorbStats(unit, rate, config.stats);
            }
            if (!prey.digestingSceneBeatEmitted && prey.progress >= 50) {
                prey.digestingSceneBeatEmitted = true;
                this.emitContainmentBeat(app, 'digesting', unit, prey, {
                    deltas: [{ kind: 'state', state: 'digesting', unit: prey.name }]
                });
            }
            if (prey.progress >= 100 || prey.CPun <= 0 || prey.vitalRemaining <= 0) {
                this.terminalize(app, unit, prey, config);
            }
        }
    },

    process(app, unit) {
        if (typeof MODULE_SYSTEM !== 'undefined' && MODULE_SYSTEM.executeHook) {
            MODULE_SYSTEM.executeHook('onDigestionTick', { unit, app }).catch(() => {});
        }
        for (const config of this.containerConfigs()) {
            this.processContainer(app, unit, config);
        }
    }
};

if (typeof window !== 'undefined') {
    window.YAW_UNIT_CONTAINMENT = YAW_UNIT_CONTAINMENT;
}
