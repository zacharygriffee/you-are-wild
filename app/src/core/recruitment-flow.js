/**
 * YOU ARE WILD RECRUITMENT FLOW
 * Shared recruitment scoring, gating, and party transfer behavior.
 */

const YAW_RECRUITMENT_FLOW = {
    subdue(app, target, actor = app.player, options = {}) {
        if (!target || app._isCorpse(target)) return null;
        const wasHostile = target.disposition === app.DISPOSITION.ENEMY;
        target.CPun = 1;
        target.alive = true;
        target.knockedOut = false;
        target.disposition = app.DISPOSITION.FRIENDLY;
        target.willing = true;
        target.recruitReady = true;
        target.subdued = true;
        target.submission = {
            by: app._unitSelectionId?.(actor) || actor?.id || actor?.name || null,
            day: Number(app.dayCount || 0),
            hour: Number(app.timeHour || 0),
            source: options.source || 'fight'
        };
        app._normalizeUnit?.(target, { disposition: app.DISPOSITION.FRIENDLY });
        app._recordQuestDefeat?.(target, actor, 'subdued', {
            wasHostile,
            source: options.source || 'fight'
        });
        return target;
    },

    score(app, actor, target) {
        if (!actor || !target || app._isCorpse(target)) return 0;
        const pleasureRatio = (target.CPle || 0) / Math.max(1, target.MPle || 100);
        let score = Math.floor(pleasureRatio * 100);
        if (target.willing) score += 20;
        if (target.orgasmed) score += 15;
        if (target.disposition === app.DISPOSITION.FRIENDLY) score += 20;
        if (target.disposition === app.DISPOSITION.NEUTRAL) score += 5;
        if (app.settings.sameSpeciesBonus && target.species === actor.species) score += 8;
        score += Math.floor(((actor.cha || 10) + (actor.Flir || 10) + (actor.Fuck || 10) - (target.wis || 10)) / 6);
        if (target.disposition === app.DISPOSITION.ENEMY) score -= 40;
        return score;
    },

    canRecruit(app, actor, target) {
        if (!target || app.party.includes(target)) return false;
        const recruitableDisposition = target.disposition === app.DISPOSITION.FRIENDLY || target.disposition === app.DISPOSITION.NEUTRAL;
        if (!recruitableDisposition) return false;
        if (target.droppedOffCompanion && target.CPun > 0 && !target.knockedOut) return true;
        if (!app._hasBaselineInteractionEligibility(target, 'recruit')) return false;
        const spiritRatio = (target.CPle || 0) / Math.max(1, target.MPle || 100);
        return Boolean(target.recruitReady) || spiritRatio >= 0.85 || this.score(app, actor, target) >= 85;
    },

    fromIndex(app, index) {
        const target = app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY)[index];
        if (!target) return false;
        return app.recruitCreature(target, app._getExplorationActor());
    },

    byId(app, targetId) {
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId));
        if (!target) return false;
        return app.recruitCreature(target, app._getExplorationActor());
    },

    confirm(app, target) {
        if (!target) return false;
        if (!app._guardRecoveryCapability?.('recruitment', { action: 'recruit' })) return false;
        return app.showConfirmDialog({
            title: app._label('action.recruit', 'Recruit'),
            message: app._label('recruit.confirmSubmissive', '{name} is ready to follow. Recruit them to your party?', { name: target.name }),
            confirmLabel: app._label('action.recruit', 'Recruit'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            onConfirm: () => app.recruitCreature(target)
        });
    },

    recruit(app, target, actor = app.player, options = {}) {
        if (!app._guardRecoveryCapability?.('recruitment', { action: 'recruit' })) return false;
        if (app.party.length >= app.MAX_PARTY_SIZE) {
            app.log.push({ text: app._label('recruit.partyFull', 'Party is full! Cannot recruit {name}', { name: target.name }), type: 'combat' });
            app.emitRecruitmentSceneBeat?.(target, actor, 'blocked', 'party-full');
            app.renderLog();
            return false;
        }
        if (!options.force && !this.canRecruit(app, actor, target)) {
            app.log.push({ text: app._label('recruit.notReady', '{name} is not ready to join the party.', { name: target.name }), type: 'discovery' });
            const roleBound = target?.disposition === app.DISPOSITION.MERCHANT || target?.disposition === app.DISPOSITION.QUEST_GIVER;
            app.emitRecruitmentSceneBeat?.(target, actor, 'blocked', roleBound ? 'role-bound' : 'not-ready');
            app.renderLog();
            app.renderCreatures();
            return false;
        }
        const rejoining = Boolean(target.droppedOffCompanion);
        YAW_COMPANION_BEHAVIOR.seedRecruitment(app, target, actor, {
            rejoining,
            source: options.source || target.submission?.source || 'recruitment'
        });
        target.disposition = app.DISPOSITION.PARTY;
        target.ally = true;
        target.obedient = true;
        target.CPun = Math.max(1, target.CPun);
        delete target.droppedOffCompanion;
        delete target.strandedAfterDefeat;
        delete target.droppedOffAt;
        app._normalizeUnit(target, { disposition: app.DISPOSITION.PARTY, ally: true, obedient: true });
        app.party.push(target);
        app.creatures = app.creatures.filter(c => c !== target);
        app._syncCurrentTileCreatures?.();
        app._persistCurrentExplorationTile?.();
        if (rejoining && Array.isArray(app.strandedCompanions)) {
            const targetId = String(app._unitSelectionId?.(target) || target.id || target.name || '');
            app.strandedCompanions = app.strandedCompanions.filter(entry => String(entry?.id || '') !== targetId);
        }
        app.log.push({ text: app._label(rejoining ? 'recruit.rejoined' : 'recruit.joined', rejoining ? '{name} rejoins your party!' : '{name} joins your party!', { name: target.name }), type: 'discovery' });
        app.emitRecruitmentSceneBeat?.(target, actor, 'joined');
        if (!rejoining) app.gainXP(app.BALANCE.recruitXP);
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.showExplorationActions();
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'currentTile', 'worldTiles', 'quests', 'sceneFeed', 'activityLog'], 'recruitment');
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_RECRUITMENT_FLOW = YAW_RECRUITMENT_FLOW;
}
