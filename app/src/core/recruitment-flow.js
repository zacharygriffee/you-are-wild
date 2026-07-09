/**
 * YOU ARE WILD RECRUITMENT FLOW
 * Shared recruitment scoring, gating, and party transfer behavior.
 */

const YAW_RECRUITMENT_FLOW = {
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
        if (!app._hasBaselineInteractionEligibility(target, 'recruit')) return false;
        const spiritRatio = (target.CPle || 0) / Math.max(1, target.MPle || 100);
        return spiritRatio >= 0.85 || this.score(app, actor, target) >= 85;
    },

    fromIndex(app, index) {
        const target = app.creatures.filter(c => c.disposition !== app.DISPOSITION.ENEMY)[index];
        if (!target) return false;
        return app.recruitCreature(target, app._getExplorationActor());
    },

    byId(app, targetId) {
        const target = app.creatures.find(c => String(c.id || c.name) === String(targetId));
        if (!this.canRecruit(app, app._getExplorationActor(), target)) return false;
        return app.recruitCreature(target, app._getExplorationActor());
    },

    confirm(app, target) {
        if (!target) return false;
        return app.showConfirmDialog({
            title: app._label('action.recruit', 'Recruit'),
            message: app._label('recruit.confirmSubmissive', '{name} is ready to follow. Recruit them to your party?', { name: target.name }),
            confirmLabel: app._label('action.recruit', 'Recruit'),
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            onConfirm: () => app.recruitCreature(target)
        });
    },

    recruit(app, target, actor = app.player, options = {}) {
        if (app.party.length >= app.MAX_PARTY_SIZE) {
            app.log.push({ text: app._label('recruit.partyFull', 'Party is full! Cannot recruit {name}', { name: target.name }), type: 'combat' });
            app.renderLog();
            return false;
        }
        if (!options.force && !this.canRecruit(app, actor, target)) {
            app.log.push({ text: app._label('recruit.notReady', '{name} is not ready to join the party.', { name: target.name }), type: 'discovery' });
            app.renderLog();
            app.renderCreatures();
            return false;
        }
        target.disposition = app.DISPOSITION.PARTY;
        target.ally = true;
        target.obedient = true;
        target.CPun = Math.max(1, target.CPun);
        app._normalizeUnit(target, { disposition: app.DISPOSITION.PARTY, ally: true, obedient: true });
        app.party.push(target);
        app.creatures = app.creatures.filter(c => c !== target);
        app.log.push({ text: app._label('recruit.joined', '{name} joins your party!', { name: target.name }), type: 'discovery' });
        app.gainXP(app.BALANCE.recruitXP);
        app.renderParty();
        app.renderCreatures();
        app.renderLog();
        app.showExplorationActions();
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_RECRUITMENT_FLOW = YAW_RECRUITMENT_FLOW;
}
