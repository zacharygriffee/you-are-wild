/**
 * YOU ARE WILD STARTUP READINESS
 * Tracks independent asynchronous startup domains without blocking the menu shell.
 */

const YAW_STARTUP_READINESS = {
    domains: new Map(),
    listeners: new Set(),

    _now() {
        return typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
    },

    _mark(name, phase) {
        if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
        try { performance.mark(`yaw-startup:${name}:${phase}`); } catch (error) {}
    },

    _measure(name) {
        if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return;
        try {
            performance.measure(
                `yaw-startup:${name}`,
                `yaw-startup:${name}:start`,
                `yaw-startup:${name}:end`
            );
        } catch (error) {}
    },

    _notify(state) {
        const snapshot = this.snapshot(state.name);
        for (const listener of [...this.listeners]) {
            try { listener(snapshot, this.snapshot()); } catch (error) { console.warn('Startup readiness listener failed:', error); }
        }
    },

    start(name, task, options = {}) {
        const domainName = String(name || '').trim();
        if (!domainName) throw new Error('Startup readiness domain name is required');
        if (typeof task !== 'function') throw new Error(`Startup readiness task for ${domainName} must be a function`);
        const previous = this.domains.get(domainName);
        if (previous?.status === 'pending' && options.force !== true) return previous.promise;
        if (previous?.status === 'ready' && options.force !== true) return previous.promise;

        const state = {
            name: domainName,
            label: String(options.label || previous?.label || domainName),
            blocking: options.blocking !== false,
            timeoutMs: Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
                ? Math.round(options.timeoutMs)
                : (previous?.timeoutMs || 0),
            status: 'pending',
            result: undefined,
            error: null,
            startedAt: this._now(),
            endedAt: null,
            durationMs: null,
            attempts: (previous?.attempts || 0) + 1,
            task,
            promise: null
        };
        this.domains.set(domainName, state);
        this._mark(domainName, 'start');
        this._notify(state);

        const work = Promise.resolve().then(() => task());
        let timeoutId = null;
        const timedWork = state.timeoutMs > 0
            ? Promise.race([
                work,
                new Promise((resolve, reject) => {
                    timeoutId = setTimeout(
                        () => reject(new Error(`${state.label} did not become ready within ${state.timeoutMs}ms`)),
                        state.timeoutMs
                    );
                })
            ])
            : work;
        state.promise = timedWork
            .then(result => this._settle(state, 'ready', result, null))
            .catch(error => this._settle(state, 'error', undefined, error))
            .finally(() => { if (timeoutId !== null) clearTimeout(timeoutId); });
        return state.promise;
    },

    _settle(state, status, result, error) {
        if (this.domains.get(state.name) !== state) return this.snapshot(state.name);
        state.status = status;
        state.result = result;
        state.error = error || null;
        state.endedAt = this._now();
        state.durationMs = Math.max(0, state.endedAt - state.startedAt);
        this._mark(state.name, 'end');
        this._measure(state.name);
        const duration = Math.round(state.durationMs);
        if (status === 'ready') console.info(`[Startup] ${state.name} ready in ${duration}ms`);
        else console.error(`[Startup] ${state.name} failed after ${duration}ms:`, error);
        this._notify(state);
        return this.snapshot(state.name);
    },

    retry(name) {
        const state = this.domains.get(String(name || ''));
        if (!state?.task) return Promise.resolve(null);
        return this.start(state.name, state.task, {
            label: state.label,
            blocking: state.blocking,
            timeoutMs: state.timeoutMs,
            force: true
        });
    },

    state(name) {
        return this.domains.get(String(name || '')) || null;
    },

    isReady(name) {
        return this.state(name)?.status === 'ready';
    },

    async when(names) {
        const list = Array.isArray(names) ? names : [names];
        const states = await Promise.all(list.map(name => {
            const state = this.state(name);
            return state?.promise || Promise.resolve(this.snapshot(name));
        }));
        const failed = states.find(state => state?.status === 'error');
        if (failed) throw failed.error || new Error(`${failed.name} did not become ready`);
        const missing = states.find(state => !state || state.status !== 'ready');
        if (missing) throw new Error(`${missing?.name || 'Startup dependency'} is not ready`);
        return states;
    },

    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    },

    snapshot(name = null) {
        const serialize = state => state ? {
            name: state.name,
            label: state.label,
            blocking: state.blocking,
            timeoutMs: state.timeoutMs,
            status: state.status,
            result: state.result,
            error: state.error,
            startedAt: state.startedAt,
            endedAt: state.endedAt,
            durationMs: state.durationMs,
            attempts: state.attempts
        } : null;
        if (name !== null) return serialize(this.state(name));
        return Object.fromEntries([...this.domains.entries()].map(([key, state]) => [key, serialize(state)]));
    },

    reset() {
        this.domains.clear();
        this.listeners.clear();
    }
};

if (typeof window !== 'undefined') window.YAW_STARTUP_READINESS = YAW_STARTUP_READINESS;
