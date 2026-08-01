/**
 * YOU ARE WILD AUDIO RUNTIME
 * Core-owned playback of leased Audio Pack V1 resources.
 */

const YAW_AUDIO_RUNTIME = {
    candidates: new Map(),
    sequence: 0,
    playedAt: new Map(),

    repository() {
        return typeof YAW_MEDIA_REPOSITORY !== 'undefined' ? YAW_MEDIA_REPOSITORY : null;
    },

    _presentation(metadata) {
        return (Array.isArray(metadata?.presentations) ? metadata.presentations : [])
            .find(presentation => presentation?.type === YAW_AUDIO_PACK_V1.PRESENTATION_TYPE) || null;
    },

    async activateModule(moduleValue, options = {}) {
        const moduleId = String(moduleValue || '').trim();
        const repository = options.repository || this.repository();
        if (!moduleId || !repository) return null;
        const metadata = await repository.ownerMetadata(moduleId);
        const presentation = this._presentation(metadata);
        if (!presentation) return null;
        const records = await repository.listOwner(moduleId);
        const resources = records.map(record => record?.descriptor).filter(Boolean);
        const pack = YAW_AUDIO_PACK_V1.normalizePresentation(presentation, { resources });
        const leases = new Map();
        try {
            const resourceIds = [...new Set(Object.values(pack.cues).flat().map(cue => cue.resourceId))];
            for (const resourceId of resourceIds) {
                leases.set(resourceId, await repository.acquire(moduleId, resourceId));
            }
        } catch (error) {
            for (const lease of leases.values()) repository.release(moduleId, lease.leaseId);
            throw error;
        }
        this.deactivateModule(moduleId, { repository });
        this.candidates.set(moduleId, { moduleId, pack, leases, sequence: ++this.sequence });
        return this.status(moduleId);
    },

    deactivateModule(moduleValue, options = {}) {
        const moduleId = String(moduleValue || '').trim();
        const candidate = this.candidates.get(moduleId);
        if (!candidate) return false;
        const repository = options.repository || this.repository();
        for (const lease of candidate.leases.values()) {
            try { repository?.release(moduleId, lease.leaseId); } catch (_error) {}
        }
        this.candidates.delete(moduleId);
        for (const key of [...this.playedAt.keys()]) {
            if (key.startsWith(`${moduleId}:`)) this.playedAt.delete(key);
        }
        return true;
    },

    status(moduleId) {
        const candidate = this.candidates.get(String(moduleId || ''));
        return candidate ? Object.freeze({
            moduleId: candidate.moduleId,
            packId: candidate.pack.id,
            name: candidate.pack.name,
            cueCount: Object.keys(candidate.pack.cues).length
        }) : null;
    },

    resolve(eventValue, context = {}) {
        const event = String(eventValue || '');
        const candidates = [...this.candidates.values()].sort((left, right) => right.sequence - left.sequence);
        for (const candidate of candidates) {
            const variants = candidate.pack.cues[event];
            if (!variants?.length) continue;
            const roll = typeof App !== 'undefined' && App?._worldRoll
                ? App._worldRoll('audio-pack-v1', event, String(context.actorId || ''), String(context.targetId || ''), Number(context.sequence) || 0)
                : 0;
            const cue = variants[Math.min(variants.length - 1, Math.floor(roll * variants.length))];
            const lease = candidate.leases.get(cue.resourceId);
            if (lease?.url) return { candidate, cue, lease, event };
        }
        return null;
    },

    play(event, context = {}) {
        const resolved = this.resolve(event, context);
        if (!resolved) return Object.freeze({ ok: false, played: false, reason: 'unavailable', event: String(event || '') });
        const cooldownKey = `${resolved.candidate.moduleId}:${resolved.event}`;
        const now = Date.now();
        if (now - (this.playedAt.get(cooldownKey) || 0) < resolved.cue.cooldownMs) {
            return Object.freeze({ ok: false, played: false, reason: 'cooldown', event: resolved.event });
        }
        this.playedAt.set(cooldownKey, now);
        if (typeof Audio === 'undefined') {
            return Object.freeze({ ok: true, played: false, reason: 'audio-unavailable', event: resolved.event });
        }
        try {
            const audio = new Audio(resolved.lease.url);
            audio.volume = resolved.cue.volume;
            const promise = audio.play();
            if (promise?.catch) promise.catch(() => {});
            return Object.freeze({ ok: true, played: true, event: resolved.event });
        } catch (_error) {
            return Object.freeze({ ok: false, played: false, reason: 'playback-failed', event: resolved.event });
        }
    }
};

if (typeof window !== 'undefined') window.YAW_AUDIO_RUNTIME = YAW_AUDIO_RUNTIME;
