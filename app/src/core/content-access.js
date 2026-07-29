/**
 * YOU ARE WILD CONTENT ACCESS
 * Versioned local acknowledgement for Mature and explicit content.
 *
 * This is an offline-compatible preference/consent boundary. It is not proof
 * of identity or jurisdictional age verification. Account-confirmed access is
 * owned by the optional server service and is deliberately not persisted here.
 */

const YAW_CONTENT_ACCESS = {
    SCHEMA: 'yaw-content-access-v1',
    POLICY_VERSION: 1,
    MINIMUM_AGE: 18,
    SENSITIVE_CATEGORIES: new Set(['explicit.sexual']),
    _sessionRecord: null,

    _emptyRecord() {
        return {
            schema: this.SCHEMA,
            policyVersion: this.POLICY_VERSION,
            minimumAge: this.MINIMUM_AGE,
            grants: {
                mature: null,
                categories: {}
            }
        };
    },

    _normalizeTimestamp(value) {
        if (typeof value !== 'string' || value.length > 40) return null;
        const timestamp = Date.parse(value);
        if (!Number.isFinite(timestamp)) return null;
        return new Date(timestamp).toISOString();
    },

    _normalizeRecord(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
        if (input.schema !== this.SCHEMA || Number(input.policyVersion) !== this.POLICY_VERSION) return null;
        if (Number(input.minimumAge) !== this.MINIMUM_AGE) return null;
        const record = this._emptyRecord();
        const matureAt = this._normalizeTimestamp(input.grants?.mature?.confirmedAt);
        if (matureAt) record.grants.mature = { confirmedAt: matureAt };
        const categories = input.grants?.categories;
        if (categories && typeof categories === 'object' && !Array.isArray(categories)) {
            for (const [id, grant] of Object.entries(categories)) {
                if (!this.SENSITIVE_CATEGORIES.has(id)) continue;
                const confirmedAt = this._normalizeTimestamp(grant?.confirmedAt);
                if (confirmedAt) record.grants.categories[id] = { confirmedAt };
            }
        }
        return record;
    },

    _storedRecord(app) {
        try {
            const raw = app?._getStoredValue?.('contentAccess');
            if (!raw) return null;
            return this._normalizeRecord(JSON.parse(raw));
        } catch (error) {
            console.warn('Content access acknowledgement load failed', error);
            return null;
        }
    },

    record(app) {
        const stored = this._storedRecord(app);
        if (stored) {
            this._sessionRecord = stored;
            return stored;
        }
        return this._normalizeRecord(this._sessionRecord) || this._emptyRecord();
    },

    _persist(app, record) {
        const normalized = this._normalizeRecord(record) || this._emptyRecord();
        this._sessionRecord = normalized;
        try {
            app?._setStoredValue?.('contentAccess', JSON.stringify(normalized));
            return true;
        } catch (error) {
            console.warn('Content access acknowledgement is session-only', error);
            return false;
        }
    },

    clear(app) {
        this._sessionRecord = null;
        try {
            app?._removeStoredValue?.('contentAccess');
        } catch (error) {
            console.warn('Content access acknowledgement clear failed', error);
        }
    },

    normalizeRequirements(input = {}) {
        const rating = String(input.rating || 'safe').trim().toLowerCase();
        const categories = [...new Set((Array.isArray(input.categories) ? input.categories : [])
            .map(value => String(value || '').trim())
            .filter(id => this.SENSITIVE_CATEGORIES.has(id)))].sort();
        const mature = rating === 'mature' || rating === 'adult' || categories.length > 0;
        if (rating === 'adult' && !categories.includes('explicit.sexual')) categories.push('explicit.sexual');
        return {
            rating: mature ? 'mature' : 'safe',
            categories: [...new Set(categories)].sort()
        };
    },

    requirementsForManifest(manifest = {}) {
        const requiredCategories = (Array.isArray(manifest.contentCategories) ? manifest.contentCategories : [])
            .filter(category => category?.required !== false)
            .map(category => category?.id);
        return this.normalizeRequirements({
            rating: manifest.contentRating || 'safe',
            categories: requiredCategories
        });
    },

    requirementsForManifests(manifests = []) {
        let rating = 'safe';
        const categories = new Set();
        for (const manifest of manifests) {
            const requirements = this.requirementsForManifest(manifest);
            if (requirements.rating === 'mature') rating = 'mature';
            requirements.categories.forEach(id => categories.add(id));
        }
        return this.normalizeRequirements({ rating, categories: [...categories] });
    },

    hasLocalGrant(app, input = {}) {
        const requirements = this.normalizeRequirements(input);
        const record = this.record(app);
        if (requirements.rating === 'mature' && !record.grants.mature) return false;
        return requirements.categories.every(id => Boolean(record.grants.categories[id]));
    },

    grantLocal(app, input = {}) {
        const requirements = this.normalizeRequirements(input);
        const record = this.record(app);
        const confirmedAt = new Date().toISOString();
        if (requirements.rating === 'mature' && !record.grants.mature) {
            record.grants.mature = { confirmedAt };
        }
        for (const id of requirements.categories) {
            if (!record.grants.categories[id]) record.grants.categories[id] = { confirmedAt };
        }
        const persisted = this._persist(app, record);
        return {
            granted: true,
            mode: persisted ? 'local-acknowledgement' : 'session-acknowledgement',
            requirements,
            record: this.snapshot(app)
        };
    },

    snapshot(app) {
        const record = this.record(app);
        return {
            schema: this.SCHEMA,
            policyVersion: this.POLICY_VERSION,
            minimumAge: this.MINIMUM_AGE,
            mode: this._storedRecord(app) ? 'local-acknowledgement' : (record.grants.mature ? 'session-acknowledgement' : 'none'),
            ratings: record.grants.mature ? ['mature'] : [],
            categories: Object.keys(record.grants.categories).sort()
        };
    },

    _copyForMessage(app, requirements, options = {}) {
        const subject = String(options.subject || '').slice(0, 120);
        const subjectLine = subject
            ? `\n\n${app._label('contentAccess.requestedBy', 'Requested by: {subject}', { subject })}`
            : '';
        if (requirements.categories.includes('explicit.sexual')) {
            return {
                title: app._label('contentAccess.explicitTitle', 'Enable explicit content?'),
                message: app._label(
                    'contentAccess.explicitMessage',
                    'This optional content may include sexually explicit fictional material. You must be 18 or older and legally permitted to access it.{subject}',
                    { subject: subjectLine }
                ),
                confirmLabel: app._label('contentAccess.explicitConfirm', 'I am 18 or older — Enable')
            };
        }
        return {
            title: app._label('contentAccess.matureTitle', 'Enable Mature content?'),
            message: app._label(
                'contentAccess.matureMessage',
                'Mature content may include intense violence, horror, coercion warnings, permanent defeat, and sexual themes supplied by installed modules. You must be 18 or older and legally permitted to access it.{subject}',
                { subject: subjectLine }
            ),
            confirmLabel: app._label('contentAccess.matureConfirm', 'I am 18 or older — Continue')
        };
    },

    request(app, input = {}, options = {}) {
        const requirements = this.normalizeRequirements(input);
        if (this.hasLocalGrant(app, requirements)) {
            return typeof options.onGranted === 'function'
                ? options.onGranted(this.snapshot(app))
                : true;
        }
        const copy = this._copyForMessage(app, requirements, options);
        return app.showConfirmDialog({
            title: copy.title,
            message: copy.message,
            confirmLabel: copy.confirmLabel,
            cancelLabel: app._label('ui.cancel', 'Cancel'),
            onConfirm: () => {
                const result = this.grantLocal(app, requirements);
                return typeof options.onGranted === 'function' ? options.onGranted(result.record) : true;
            },
            onCancel: () => (
                typeof options.onCancel === 'function' ? options.onCancel() : false
            )
        });
    },

    ensure(app, input = {}, options = {}) {
        const requirements = this.normalizeRequirements(input);
        if (this.hasLocalGrant(app, requirements)) return Promise.resolve(true);
        return new Promise(resolve => {
            this.request(app, requirements, {
                ...options,
                onGranted: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    },

    reconcilePreferences(app) {
        if (typeof CONTENT === 'undefined' || !CONTENT?.preferences) return [];
        const revoked = [];
        const posture = CONTENT.preferences.posture
            || (Number(CONTENT.preferences.maxTier) >= 1 ? 'mature' : 'sfw');
        if (posture === 'mature' && !this.hasLocalGrant(app, { rating: 'mature' })) {
            CONTENT.setPosture?.('sfw');
            revoked.push('mature');
        }
        for (const id of [...(CONTENT.preferences.enabledCategories || [])]) {
            if (!this.SENSITIVE_CATEGORIES.has(id)) continue;
            if (this.hasLocalGrant(app, { rating: 'mature', categories: [id] })) continue;
            CONTENT.setCategoryEnabled?.(id, false);
            revoked.push(id);
        }
        if (revoked.length && app?._setStoredValue) {
            app._setStoredValue('contentPrefs', JSON.stringify(CONTENT.preferences));
        }
        return revoked;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_CONTENT_ACCESS = YAW_CONTENT_ACCESS;
}
