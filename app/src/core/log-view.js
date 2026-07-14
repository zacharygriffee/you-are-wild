/**
 * YOU ARE WILD LOG VIEW
 * Combat/discovery log filtering, layout state, export, and rendering.
 */

const YAW_LOG_VIEW = {
    currentCombatMeta(app, extra = {}) {
        if (!app.combatState?.active) return {};
        const entry = app.combatState.turnQueue?.[app.combatState.currentTurn] || null;
        const actor = extra.actor || entry?.unit || null;
        return {
            round: app.combatState.round || 1,
            turnIndex: (app.combatState.currentTurn ?? 0) + 1,
            actorId: actor ? (actor.id || actor.name || null) : null,
            actorName: actor?.name || null,
            phase: extra.phase || (actor ? 'turn' : 'combat')
        };
    },

    push(app, entry, type = 'discovery', meta = {}) {
        const next = typeof entry === 'string' ? { text: entry, type } : { ...(entry || {}) };
        next.type = next.type || type;
        const needsCombatMeta = next.type === 'combat' && app.combatState?.active;
        const full = needsCombatMeta ? { ...this.currentCombatMeta(app, meta), ...next, ...meta } : { ...next, ...meta };
        app.log.push(full);
        if (meta?.toast) this.showToast(app, { text: full.text, type: full.type, ...meta.toast });
        return full;
    },

    timestamp(app, entry, indexFromEnd = 0) {
        if (entry?.round && entry?.turnIndex) {
            const actor = entry.actorName ? ` · ${entry.actorName}` : '';
            return `R${entry.round} T${entry.turnIndex}${actor}`;
        }
        if (entry?.round && app.combatState?.round) {
            const diff = Math.max(0, app.combatState.round - entry.round);
            if (diff === 0) return 'this round';
            return diff === 1 ? '1 round ago' : `${diff} rounds ago`;
        }
        if (indexFromEnd <= 0) return 'just now';
        return indexFromEnd === 1 ? '1 turn ago' : `${indexFromEnd} turns ago`;
    },

    categoryMeta(app, type = 'discovery') {
        return app.LOG_CATEGORIES[type] || { label: type || 'Discovery', icon: '•' };
    },

    filteredEntries(app) {
        const filter = app.logFilter || 'all';
        const query = (app.logSearch || '').trim().toLowerCase();
        return (app.log || []).filter(entry => {
            if (filter !== 'all' && (entry.type || 'discovery') !== filter) return false;
            if (query && !String(entry.text || '').toLowerCase().includes(query)) return false;
            return true;
        });
    },

    allowedFilters() {
        return ['all', 'combat', 'discovery', 'loot', 'heal'];
    },

    normalizePreferences(app, input = {}) {
        const prefs = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
        const filter = this.allowedFilters().includes(prefs.filter) ? prefs.filter : 'all';
        const search = typeof prefs.search === 'string' ? prefs.search.slice(0, 120) : '';
        const hasCollapsedPreference = Object.prototype.hasOwnProperty.call(prefs, 'collapsed');
        const collapsed = hasCollapsedPreference ? prefs.collapsed === true : true;
        const expanded = prefs.expanded === true && !collapsed;
        return { filter, search, collapsed, expanded };
    },

    applyPreferences(app, preferences = {}) {
        const normalized = this.normalizePreferences(app, preferences);
        app.logFilter = normalized.filter;
        app.logSearch = normalized.search;
        app.logCollapsed = normalized.collapsed;
        app.logExpanded = normalized.expanded;
        return normalized;
    },

    preferencesForStorage(app) {
        return this.applyPreferences(app, {
            filter: app.logFilter,
            search: app.logSearch,
            collapsed: app.logCollapsed,
            expanded: app.logExpanded
        });
    },

    loadPreferences(app) {
        try {
            const prefs = JSON.parse(app._getStoredValue('logView') || '{}');
            const normalized = this.applyPreferences(app, prefs);
            app._setStoredValue('logView', JSON.stringify(normalized));
        } catch(e) {
            const normalized = this.applyPreferences(app, {});
            app._setStoredValue('logView', JSON.stringify(normalized));
        }
        this.applyLayoutState(app);
    },

    savePreferences(app) {
        app._setStoredValue('logView', JSON.stringify(this.preferencesForStorage(app)));
    },

    applyLayoutState(app) {
        const root = document.getElementById('app');
        if (root?.classList) {
            root.classList.toggle('log-collapsed', Boolean(app.logCollapsed));
            root.classList.toggle('log-expanded', Boolean(app.logExpanded));
        }
        const collapseBtn = document.getElementById('log-toggle-collapse');
        const expandBtn = document.getElementById('log-toggle-expand');
        if (collapseBtn) {
            const label = app.logCollapsed ? app._label('ui.log.restore', 'Restore') : app._label('ui.log.minimize', 'Minimize');
            collapseBtn.textContent = label;
            collapseBtn.title = label;
            collapseBtn.setAttribute('aria-label', label);
            collapseBtn.classList?.toggle('active', Boolean(app.logCollapsed));
            collapseBtn.setAttribute('aria-pressed', String(Boolean(app.logCollapsed)));
        }
        if (expandBtn) {
            const label = app.logExpanded ? app._label('ui.log.restore', 'Restore') : app._label('ui.log.expand', 'Expand');
            expandBtn.textContent = label;
            expandBtn.title = label;
            expandBtn.setAttribute('aria-label', label);
            expandBtn.classList?.toggle('active', Boolean(app.logExpanded));
            expandBtn.setAttribute('aria-pressed', String(Boolean(app.logExpanded)));
        }
    },

    toggleCollapsed(app) {
        app.logCollapsed = !app.logCollapsed;
        if (app.logCollapsed) app.logExpanded = false;
        this.savePreferences(app);
        this.render(app);
    },

    toggleExpanded(app) {
        app.logExpanded = !app.logExpanded;
        if (app.logExpanded) app.logCollapsed = false;
        this.savePreferences(app);
        this.render(app);
    },

    toggleActivityLog(app) {
        const mobileLog = document.getElementById('mobile-activity-log');
        const mobileVisible = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 700px)')?.matches);
        if (mobileVisible && mobileLog) {
            mobileLog.open = !mobileLog.open;
            if (mobileLog.open && typeof mobileLog.focus === 'function') mobileLog.focus();
            return mobileLog.open;
        }
        this.toggleCollapsed(app);
        return !app.logCollapsed;
    },

    setFilter(app, filter = 'all') {
        app.logFilter = this.allowedFilters().includes(filter) ? filter : 'all';
        this.savePreferences(app);
        this.render(app);
    },

    setSearch(app, value = '') {
        app.logSearch = typeof value === 'string' ? value : '';
        this.savePreferences(app);
        this.render(app);
    },

    export(app) {
        const lines = this.filteredEntries(app).map((entry, index, arr) => {
            const indexFromEnd = arr.length - 1 - index;
            return `[${entry.type || 'discovery'} | ${this.timestamp(app, entry, indexFromEnd)}] ${entry.text}`;
        });
        const text = lines.join('\n');
        if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && document?.createElement) {
            try {
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity-log-${Date.now()}.txt`;
                if (typeof a.click === 'function') a.click();
                URL.revokeObjectURL(url);
            } catch(e) {}
        }
        return text;
    },

    renderEntry(app, entry, indexFromEnd = 0) {
        const type = entry.type || 'discovery';
        const meta = this.categoryMeta(app, type);
        let cn = 'log-entry';
        if (type) cn += ` ${type}`;
        return `<div class="${cn}" role="status"><span class="log-time">${app._escapeHtml(this.timestamp(app, entry, indexFromEnd))}</span><span class="log-category" aria-label="${app._escapeHtml(meta.label)}"><span aria-hidden="true">${app._escapeHtml(meta.icon)}</span> ${app._escapeHtml(meta.label)}</span>${app._escapeHtml(entry.text)}</div>`;
    },

    render(app) {
        const container = document.getElementById('log-content');
        const filtered = this.filteredEntries(app);
        const entries = filtered.slice(-20).reverse().map((e, visibleIndex) => this.renderEntry(app, e, visibleIndex)).join('');
        if (container) container.innerHTML = entries || `<div class="log-entry text-muted">${app._escapeHtml(app._label('log.noEntriesMatchFilter', 'No log entries match the current filter.'))}</div>`;
        document.querySelectorAll?.('.log-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.logFilter === (app.logFilter || 'all'));
        });
        const search = document.getElementById('log-search');
        if (search && search.value !== (app.logSearch || '')) search.value = app.logSearch || '';
        const mobileLog = document.getElementById('mobile-log-summary');
        if (mobileLog) {
            const latest = app.log[app.log.length - 1];
            mobileLog.textContent = latest ? latest.text : app._label('ui.welcomeLog', 'Welcome to You Are Wild');
        }
        const mobileList = document.getElementById('mobile-log-list');
        if (mobileList) {
            const recent = (app.log || []).slice(-5).reverse();
            mobileList.innerHTML = recent.length
                ? recent.map((entry, visibleIndex) => this.renderEntry(app, entry, visibleIndex)).join('')
                : `<div class="log-entry text-muted">${app._escapeHtml(app._label('ui.welcomeLog', 'Welcome to You Are Wild'))}</div>`;
        }
        const collapsedSummary = document.getElementById('log-collapsed-summary');
        if (collapsedSummary) {
            const latest = app.log[app.log.length - 1];
            collapsedSummary.textContent = latest ? latest.text : app._label('ui.welcomeLog', 'Welcome to You Are Wild');
        }
        this.applyLayoutState(app);
        this.renderToasts(app);
    },

    clear(app) {
        app.log = [];
        this.render(app);
    },

    normalizeToast(app, input = {}) {
        const toast = input && typeof input === 'object' ? input : {};
        const text = String(toast.text || '').trim();
        if (!text) return null;
        const allowedTypes = ['danger', 'quest', 'loot', 'blocked', 'system'];
        const type = allowedTypes.includes(toast.type) ? toast.type : 'system';
        const importance = toast.importance || 'normal';
        const persistent = toast.persistent === true || importance === 'major';
        return {
            id: toast.id || `toast_${Date.now()}_${++app.toastSeq}`,
            text,
            type,
            importance,
            persistent,
            dedupeKey: toast.dedupeKey || `${type}:${text}`,
            createdAt: Date.now()
        };
    },

    showToast(app, input = {}) {
        const toast = this.normalizeToast(app, input);
        if (!toast) return null;
        app.toasts = Array.isArray(app.toasts) ? app.toasts : [];
        const existingIndex = app.toasts.findIndex(entry => entry.dedupeKey === toast.dedupeKey);
        if (existingIndex >= 0) app.toasts.splice(existingIndex, 1);
        app.toasts.push(toast);
        while (app.toasts.length > 2) {
            const removable = app.toasts.findIndex(entry => !entry.persistent);
            app.toasts.splice(removable >= 0 ? removable : 0, 1);
        }
        this.renderToasts(app);
        if (!toast.persistent && typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
            window.setTimeout(() => this.dismissToast(app, toast.id), 6000);
        }
        return toast;
    },

    dismissToast(app, toastId) {
        app.toasts = (app.toasts || []).filter(toast => String(toast.id) !== String(toastId));
        this.renderToasts(app);
        return app.toasts.length;
    },

    clearToasts(app, options = {}) {
        const includePersistent = options.includePersistent !== false;
        app.toasts = includePersistent ? [] : (app.toasts || []).filter(toast => toast.persistent);
        this.renderToasts(app);
        return app.toasts.length;
    },

    renderToasts(app) {
        const container = document.getElementById('toast-stack');
        if (!container) return '';
        const closeLabel = app._escapeHtml(app._label('ui.toast.dismiss', 'Dismiss notification'));
        const html = (app.toasts || []).map(toast => {
            const type = app._escapeHtml(toast.type || 'system');
            const text = app._escapeHtml(toast.text);
            const id = app._escapeHtml(toast.id);
            return `<div class="toast toast-${type}" role="status" data-toast-id="${id}"><span class="toast-text">${text}</span><button class="toast-dismiss" data-command-surface="toast" data-command-mode="system" data-command-control="dismiss-toast" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.dismissToast('${id}')">×</button></div>`;
        }).join('');
        container.innerHTML = html;
        container.hidden = !html;
        return html;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_LOG_VIEW = YAW_LOG_VIEW;
}
