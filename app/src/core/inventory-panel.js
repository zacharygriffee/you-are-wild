/**
 * YOU ARE WILD INVENTORY PANEL
 * Player-owned inventory rendering and direct item actions.
 */

const YAW_HOLDINGS = {
    root() {
        return document.getElementById('holdings-window-root');
    },

    captureReturnFocus() {
        if (typeof document === 'undefined') return null;
        const active = document.activeElement;
        if (!active || active === document.body) return null;
        return {
            control: active.getAttribute?.('data-command-control') || '',
            surface: active.getAttribute?.('data-command-surface') || '',
            slot: active.getAttribute?.('data-command-slot') || ''
        };
    },

    restoreReturnFocus(token = null) {
        if (!token || typeof document === 'undefined') return false;
        const candidates = Array.from(document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
        const visible = candidates.filter(element => {
            if (!element?.isConnected || element.disabled || element.closest?.('#holdings-window-root')) return false;
            const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null;
            const rect = element.getBoundingClientRect?.();
            return (!style || (style.display !== 'none' && style.visibility !== 'hidden'))
                && (!rect || rect.width > 0 || rect.height > 0);
        });
        const exact = element => (!token.control || element.getAttribute('data-command-control') === token.control)
            && (!token.surface || element.getAttribute('data-command-surface') === token.surface)
            && (!token.slot || element.getAttribute('data-command-slot') === token.slot);
        const byControl = element => token.control && element.getAttribute('data-command-control') === token.control;
        const target = visible.find(exact) || visible.find(byControl);
        if (!target?.focus) return false;
        try { target.focus({ preventScroll: true }); } catch (_error) { target.focus(); }
        return true;
    },

    tabs() {
        return ['stats', 'equipment', 'pack', 'containers', 'ground'];
    },

    tabLabel(app, tab) {
        const labels = {
            stats: app._label('ui.stats', 'Stats'),
            equipment: app._label('inventory.equippedSection', 'Equipped'),
            pack: app._label('holdings.pack', 'Pack / Inventory'),
            containers: app._label('holdings.containers', 'Containers'),
            ground: app._label('holdings.ground', 'Here / Ground')
        };
        return labels[tab] || labels.stats;
    },

    ownerId(app, unit = app.player) {
        if (!unit) return 'player';
        const partyIndex = (app.party || []).indexOf(unit);
        if (unit.id != null) return String(unit.id);
        if (partyIndex >= 0) return `party:${partyIndex}`;
        if (unit.name) return `name:${unit.name}`;
        return 'player';
    },

    ownerById(app, ownerId = null) {
        const wanted = ownerId == null ? null : String(ownerId);
        const owners = this.partyOwners(app);
        if (wanted) {
            const match = owners.find((unit, index) => (
                this.ownerId(app, unit) === wanted
                || (unit?.id != null && String(unit.id) === wanted)
                || (`party:${index}` === wanted)
                || (`name:${unit?.name || ''}` === wanted)
            ));
            if (match) return match;
        }
        return app._syncPlayerPartyReference?.() || app.player || owners[0] || null;
    },

    selectedOwner(app) {
        return this.ownerById(app, app.holdingsWindow?.ownerId);
    },

    partyOwners(app) {
        const seen = new Set();
        const owners = [];
        const add = unit => {
            if (!unit || seen.has(unit)) return;
            seen.add(unit);
            owners.push(unit);
        };
        add(app._syncPlayerPartyReference?.() || app.player);
        (app.party || []).forEach(add);
        return owners;
    },

    ownerLabel(app, unit = app.player) {
        if (!unit) return app._label('party.you', 'You');
        const player = app._syncPlayerPartyReference?.() || app.player;
        if (unit === player) return app._label('party.you', 'You');
        return unit.name || app._label('ui.unknown', 'Unknown');
    },

    isPlayerOwner(app, unit = app.player) {
        const player = app._syncPlayerPartyReference?.() || app.player;
        return Boolean(unit && player && (unit === player || this.ownerId(app, unit) === this.ownerId(app, player)));
    },

    ownerSelectableForTab(app, unit = app.player, tab = 'stats') {
        return tab !== 'pack' || this.isPlayerOwner(app, unit);
    },

    ownerForTab(app, owner = app.player, tab = 'stats') {
        if (tab !== 'pack') return owner || app.player;
        return app._syncPlayerPartyReference?.() || app.player || owner;
    },

    setOwner(app, ownerId) {
        const owner = this.ownerById(app, ownerId);
        if (!owner) return false;
        const tab = this.tabs().includes(app.holdingsWindow?.tab) ? app.holdingsWindow.tab : 'stats';
        app.holdingsWindow = {
            ...(app.holdingsWindow || {}),
            tab,
            ownerType: 'party',
            ownerId: this.ownerId(app, owner)
        };
        delete app.holdingsWindow.detail;
        return this.renderWindow(app, owner, tab);
    },

    showForUnit(app, unit, options = {}) {
        return this.show(app, unit || app.player, options);
    },

    renderOwnerSelector(app, owner = app.player) {
        const owners = this.partyOwners(app);
        if (owners.length <= 1) return '';
        const tab = this.tabs().includes(app.holdingsWindow?.tab) ? app.holdingsWindow.tab : 'stats';
        const selectedOwner = this.ownerForTab(app, owner, tab);
        const selectedId = this.ownerId(app, selectedOwner);
        const label = app._escapeHtml(app._label('holdings.owner', 'Owner'));
        const chips = owners.map(unit => {
            const id = this.ownerId(app, unit);
            const selected = id === selectedId;
            const selectable = this.ownerSelectableForTab(app, unit, tab);
            const name = app._escapeHtml(this.ownerLabel(app, unit));
            const icon = app._escapeHtml(unit?.icon || '👤');
            const title = selectable
                ? app._escapeHtml(app._label('holdings.selectOwner', 'Show holdings for {name}', { name: this.ownerLabel(app, unit) }))
                : app._escapeHtml(app._label('holdings.packPlayerOnly', 'Pack inventory is player-only for now. Containers remain available for {name}.', { name: this.ownerLabel(app, unit) }));
            const disabled = selectable ? '' : ' disabled aria-disabled="true"';
            const action = selectable ? ` onclick="App.setHoldingsOwner('${app._escapeJsString(id)}')"` : '';
            return `<button class="holdings-owner-chip${selected ? ' selected' : ''}${selectable ? '' : ' disabled'}" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="select-holdings-owner" data-command-slot="owner" data-owner-selectable="${selectable ? 'true' : 'false'}" aria-pressed="${selected ? 'true' : 'false'}" title="${title}" aria-label="${title}"${disabled}${action}><span aria-hidden="true">${icon}</span><span>${name}</span></button>`;
        }).join('');
        return `<div class="holdings-owner-row" role="group" aria-label="${label}"><span class="holdings-owner-label">${label}</span>${chips}</div>`;
    },

    listPackItems(app, owner = app.player) {
        return (app.inventory || []).map((item, index) => ({
            kind: 'pack-item',
            owner,
            item,
            index,
            id: item?.id ?? index,
            name: item?.name || app._label('ui.item', 'item')
        }));
    },

    listEquipmentSlots(app, owner = app.player) {
        const equipment = owner?.equipment || {};
        return Object.entries(app.EQUIPMENT_SLOTS || {}).map(([slot, label]) => ({
            kind: 'equipment-slot',
            owner,
            slot,
            label,
            item: equipment[slot] || null
        }));
    },

    containerProfile(app, containerId = 'stomach') {
        const profile = YAW_UNIT_CONTAINMENT.profile(app, containerId);
        return {
            ownerType: 'unit',
            accepts: ['contained-unit'],
            actions: ['inspect', 'digest', 'release'],
            visibility: containerId === 'stomach' ? 'default' : 'compatibility',
            ...profile,
            id: profile.id || containerId,
            label: profile.safeLabel || profile.label || this.containerLabel(app, containerId)
        };
    },

    containerLabel(app, containerId = 'stomach') {
        return YAW_UNIT_CONTAINMENT.containerLabel(app, containerId);
    },

    listContainerEntries(app, owner = app.player, containerId = 'stomach') {
        const profile = this.containerProfile(app, containerId);
        const entries = YAW_UNIT_CONTAINMENT.visibleContainedEntries(app, owner, containerId);
        return entries.map(({ prey, index, state }) => ({
            kind: 'contained-unit',
            owner,
            containerId,
            profile,
            entry: prey,
            index,
            state,
            status: this.containerEntryStatus(app, prey),
            actions: this.containerEntryActions(app, owner, containerId, prey)
        }));
    },

    listAllContainerEntries(app, owner = app.player) {
        const ids = new Set(['stomach', 'womb', 'balls', ...Object.keys(app.containerProfiles || {})]);
        return Array.from(ids).map(containerId => ({
            kind: 'container',
            id: containerId,
            profile: this.containerProfile(app, containerId),
            used: app._containerUsed?.(owner, containerId) ?? 0,
            capacity: app._containerCapacity?.(owner, containerId) ?? 0,
            entries: this.listContainerEntries(app, owner, containerId)
        })).filter(section => section.id === 'stomach' || section.entries.length > 0 || section.profile.visibility === 'default');
    },

    containerEntryStatus(app, entry) {
        const state = YAW_UNIT_CONTAINMENT.normalizedState(entry);
        const vital = Math.round(YAW_UNIT_CONTAINMENT.vitalRatio(entry) * 100);
        const progress = Math.round(entry?.progress ?? entry?.digestionProgress ?? 0);
        return {
            state,
            vital,
            progress,
            releaseEligible: YAW_UNIT_CONTAINMENT.canReleaseFromVitalState(entry)
        };
    },

    canReleaseContainerEntry(app, owner, containerId, entry) {
        return YAW_UNIT_CONTAINMENT.canManageContainerEntry(app, owner) && YAW_UNIT_CONTAINMENT.canReleaseFromVitalState(entry);
    },

    canDigestContainer(app, owner, containerId, entry = null) {
        if (!YAW_UNIT_CONTAINMENT.canManageContainerEntry(app, owner)) return false;
        if (!entry) return this.listContainerEntries(app, owner, containerId).some(item => this.canDigestContainer(app, owner, containerId, item.entry));
        return !['terminal', 'released', 'passed', 'depleted'].includes(YAW_UNIT_CONTAINMENT.normalizedState(entry));
    },

    containerEntryActions(app, owner, containerId, entry) {
        return {
            inspect: true,
            release: this.canReleaseContainerEntry(app, owner, containerId, entry),
            digest: this.canDigestContainer(app, owner, containerId, entry)
        };
    },

    groundHoldings(app, tile = app._currentExplorationTile?.()) {
        const items = (Array.isArray(tile?.items) ? tile.items : []).map((item, index) => ({
            kind: 'ground-item',
            item,
            index,
            label: app._tileItemLabel?.(item) || item?.name || String(item || app._label('ui.item', 'item'))
        }));
        const remains = (app.creatures || []).filter(creature => app._isCorpse?.(creature)).map((corpse, index) => ({
            kind: 'remains',
            corpse,
            index,
            id: corpse.id || corpse.name || String(index),
            label: corpse.corpseName || corpse.name || app._label('disposition.remains', 'Remains'),
            edibleRemaining: Number.isFinite(corpse.edibleRemaining) ? corpse.edibleRemaining : app._corpseRemainingPortions?.(corpse),
            scavengeable: app._canScavengeCorpse?.(corpse) || false,
            looted: Boolean(corpse.looted),
            depleted: Boolean(corpse.depleted || corpse.scavenged)
        }));
        const deathBags = (Array.isArray(tile?.deathBags) ? tile.deathBags : []).map((bag, index) => ({
            kind: 'death-bag',
            bag,
            index,
            id: String(bag.id || index),
            itemCount: Array.isArray(bag.items) ? bag.items.length : 0,
            gold: Math.max(0, Number(bag.gold) || 0)
        }));
        return { kind: 'ground', tile, items, remains, deathBags };
    },

    holdingEntryKind(entry) {
        return entry?.kind || 'unknown';
    },

    sections(app, owner = app.player) {
        const ground = this.groundHoldings(app);
        return [
            { id: 'equipped', kind: 'equipment', label: app._label('inventory.equippedSection', 'Equipped'), entries: this.listEquipmentSlots(app, owner) },
            { id: 'pack', kind: 'pack', label: app._label('holdings.pack', 'Pack / Inventory'), entries: this.listPackItems(app, owner), count: app.inventory?.length || 0, max: app.MAX_INVENTORY },
            { id: 'containers', kind: 'containers', label: app._label('holdings.containers', 'Containers'), entries: this.listAllContainerEntries(app, owner) },
            { id: 'ground', kind: 'ground', label: app._label('holdings.ground', 'Here / Ground'), entries: [...ground.items, ...ground.remains], ground }
        ];
    },

    renderEquipmentSection(app, section, owner = app.player) {
        const equippedLabel = app._escapeHtml(section.label);
        const ownerName = this.ownerLabel(app, owner);
        const ownerId = app._escapeJsString(this.ownerId(app, owner));
        const ownerMeta = app._escapeHtml(app._label('holdings.equippedBy', 'Equipped by {name}', { name: ownerName }));
        let html = `<section class="holdings-section" data-holding-section="equipped"><div class="holdings-section-title">${equippedLabel}</div>`;
        html += `<div class="holding-entry-meta">${ownerMeta}: ${app._equipmentSummary(owner)}</div><div class="holding-entry-actions">`;
        const recoveryLocked = YAW_RECOVERY_MODES?.restricts?.(app, 'inventory') === true;
        section.entries.forEach(({ slot, label, item }) => {
            if (!item || recoveryLocked) return;
            const unequipTitle = app._escapeHtml(this.isPlayerOwner(app, owner)
                ? app._label('inventory.unequipSlot', 'Unequip {slot}', { slot: label })
                : app._label('holdings.unequipSlotFromOwner', 'Unequip {slot} from {name}', { slot: label, name: ownerName }));
            const unequipLabel = app._escapeHtml(`${app._label('inventory.unequip', 'Unequip')} ${label}`);
            html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="unequip-item" title="${unequipTitle}" aria-label="${unequipTitle}" onclick="App.unequipItem('${app._escapeJsString(slot)}','${ownerId}')">${unequipLabel}</button>`;
        });
        html += `</div></section>`;
        return html;
    },

    itemTypeLabel(app, type = 'misc') {
        const token = String(type || 'misc').trim().toLowerCase() || 'misc';
        const fallback = token.charAt(0).toUpperCase() + token.slice(1);
        return app._label(`item.category.${token}`, fallback);
    },

    renderPackItem(app, item, owner = app.player) {
        const def = app.ITEMS[item.name] || { icon: '?', desc: app._label('item.unknown', 'Unknown') };
        const canUse = def.effect === 'heal';
        const choosingTarget = canUse && String(app.holdingsWindow?.pendingItemUseId || '') === String(item.id);
        const canEquip = app._isEquippable(item);
        const itemKey = app._escapeJsString(item.id);
        const name = app._escapeHtml(item.name || app._label('ui.item', 'item'));
        const useLabel = app._escapeHtml(app._label('inventory.use', 'Use'));
        const equipLabel = app._escapeHtml(app._label('inventory.equip', 'Equip'));
        const dropLabel = app._escapeHtml(app._label('inventory.drop', 'Drop'));
        const useTitle = app._escapeHtml(app._label('inventory.useItem', 'Use {name}', { name: item.name }));
        const equipTitle = app._escapeHtml(app._label('inventory.equipItem', 'Equip {name}', { name: item.name }));
        const dropTitle = app._escapeHtml(app._label('inventory.dropItem', 'Drop {name}', { name: item.name }));
        const recoveryLocked = YAW_RECOVERY_MODES?.restricts?.(app, 'inventory') === true;
        let html = `<div class="holdings-entry pack-entry" data-holding-kind="pack-item"><div class="holding-entry-main"><div class="holding-entry-name"><span>${app._escapeHtml(def.icon || '?')}</span> ${name}</div>`;
        html += `<div class="holding-entry-meta">${app._escapeHtml(this.itemTypeLabel(app, def.type))} · ${app._escapeHtml(def.desc || '')}${canEquip ? '<br>' + app._equipmentBonusText(item) : ''}</div></div><div class="holding-entry-actions">`;
        if (!recoveryLocked && canUse && !choosingTarget) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="use-item" title="${useTitle}" aria-label="${useTitle}" onclick="App.requestUseItem('${itemKey}')">${useLabel}</button>`;
        if (!recoveryLocked && choosingTarget) {
            const prompt = app._escapeHtml(app._label('inventory.chooseHealingTarget', 'Use {item} on:', { item: item.name }));
            html += `<div class="holding-use-targets" role="group" aria-label="${prompt}"><span class="holding-entry-meta">${prompt}</span>`;
            YAW_HOLDINGS.partyOwners(app).forEach(target => {
                const targetId = app._escapeJsString(YAW_HOLDINGS.ownerId(app, target));
                const targetName = YAW_HOLDINGS.ownerLabel(app, target);
                const current = Math.max(0, Number(target?.CPun) || 0);
                const maximum = Math.max(1, Number(target?.MPun) || current || 1);
                const defeated = current <= 0;
                const full = current >= maximum;
                const disabled = defeated || full;
                const title = defeated
                    ? app._label('inventory.cannotHealTarget', '{name} cannot be healed while defeated.', { name: targetName })
                    : full
                        ? app._label('inventory.fullCondition', '{name} is already at full condition.', { name: targetName })
                        : app._label('inventory.useItemOnTarget', 'Use {item} on {name}', { item: item.name, name: targetName });
                html += `<button class="nav-btn${disabled ? ' disabled' : ''}" data-command-surface="inventory-detail" data-command-mode="${app.combatState?.active ? 'combat' : 'exploration'}" data-command-control="use-item-target" data-command-slot="target" title="${app._escapeHtml(title)}" aria-label="${app._escapeHtml(title)}"${disabled ? ' disabled aria-disabled="true"' : ''} onclick="App.useItem('${itemKey}','${targetId}')">${app._escapeHtml(targetName)} <span class="holding-entry-meta">${current}/${maximum}</span></button>`;
            });
            const cancel = app._escapeHtml(app._label('inventory.cancelUse', 'Cancel'));
            html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="cancel-use-item" data-command-slot="exit" onclick="App.cancelUseItem()">${cancel}</button></div>`;
        }
        if (!recoveryLocked && canEquip) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="equip-item" title="${equipTitle}" aria-label="${equipTitle}" onclick="App.equipItem('${itemKey}')">${equipLabel}</button>`;
        if (!recoveryLocked) html += `<button class="nav-btn danger" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="drop-item" title="${dropTitle}" aria-label="${dropTitle}" onclick="App.dropItem('${itemKey}')">${dropLabel}</button>`;
        html += `</div></div>`;
        return html;
    },

    renderPackSection(app, section, owner = app.player) {
        owner = this.ownerForTab(app, owner, 'pack');
        const packLabel = app._label('holdings.sharedPack', 'Shared Pack');
        let html = `<section class="holdings-section" data-holding-section="pack"><div class="holdings-section-title"><span>${app._escapeHtml(packLabel)}</span><span>${section.count}/${section.max}</span></div>`;
        html += app._itemListOptions('Inventory');
        const entries = app._filterAndSortItemEntries((app.inventory || []).map((item, index) => ({ item, index })), app.inventoryFilter, app.inventorySort);
        if ((app.inventory || []).length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('inventory.empty', 'Empty.'))}</p>`;
        } else if (entries.length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('inventory.noItemsMatch', 'No items match the current filter.'))}</p>`;
        } else {
            html += `<div class="holdings-entry-grid">${entries.map(({ item }) => this.renderPackItem(app, item, owner)).join('')}</div>`;
        }
        html += `</section>`;
        return html;
    },

    renderContainersSection(app, section, owner = app.player) {
        const holderIndex = Math.max(0, (app.party || []).indexOf(owner));
        const inventoryHtml = YAW_UNIT_CONTAINMENT.renderContainerInventory(app, owner, 'party', holderIndex, { showTitle: false });
        const summary = section.entries.map(container => `${container.profile.label}: ${container.used}/${container.capacity}`).join(' · ');
        return `<section class="holdings-section" data-holding-section="containers">
            <div class="holdings-section-title"><span>${app._escapeHtml(section.label)}</span><span>${app._escapeHtml(summary || '')}</span></div>
            ${inventoryHtml || `<p class="holding-entry-meta">${app._escapeHtml(app._label('containment.empty', 'No contained creatures.'))}</p>`}
        </section>`;
    },

    renderGroundSection(app, section) {
        const ground = section.ground;
        let html = `<section class="holdings-section" data-holding-section="ground"><div class="holdings-section-title"><span>${app._escapeHtml(section.label)}</span><span>${ground.items.length + ground.remains.length + ground.deathBags.length}</span></div>`;
        if (ground.items.length === 0 && ground.remains.length === 0 && ground.deathBags.length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('holdings.groundEmpty', 'Nothing loose here.'))}</p>`;
        }
        if (ground.deathBags.length > 0) {
            html += `<div class="holdings-subtitle">${app._escapeHtml(app._label('recovery.deathBags', 'Recovery bags'))}</div>`;
            ground.deathBags.forEach(entry => {
                const id = app._escapeJsString(entry.id);
                const recover = app._escapeHtml(app._label('recovery.collectDeathBag', 'Recover'));
                const meta = app._escapeHtml(app._label('recovery.deathBagContents', '{items} item(s) · {gold} gold', { items: entry.itemCount, gold: entry.gold }));
                html += `<div class="holdings-entry" data-holding-kind="death-bag"><div class="holding-entry-main"><div class="holding-entry-name">${app._escapeHtml(app._label('recovery.deathBag', 'Recovery bag'))}</div><div class="holding-entry-meta">${meta}</div></div><div class="holding-entry-actions"><button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="collect-death-bag" onclick="App.collectDeathBag('${id}');App.showInventory();">${recover}</button></div></div>`;
            });
        }
        if (ground.items.length > 0) {
            const takeTitle = app._escapeHtml(app._label('ui.takeItems', 'Take Items'));
            html += `<div class="holdings-subtitle">${app._escapeHtml(app._label('holdings.tileItems', 'Tile items'))}</div>`;
            html += `<div class="holding-entry-actions"><button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="take-ground-items" title="${takeTitle}" aria-label="${takeTitle}" onclick="App.takeTileItems();App.showInventory();">${takeTitle}</button></div>`;
            ground.items.forEach(entry => {
                html += `<div class="holdings-entry" data-holding-kind="ground-item"><div class="holding-entry-main"><div class="holding-entry-name">${app._escapeHtml(entry.label)}</div><div class="holding-entry-meta">${app._escapeHtml(app._label('holdings.groundItemMeta', 'On the ground. Pick up to move it into Pack.'))}</div></div></div>`;
            });
        }
        if (ground.remains.length > 0) {
            html += `<div class="holdings-subtitle">${app._escapeHtml(app._label('disposition.remains', 'Remains'))}</div>`;
            ground.remains.forEach(entry => {
                const id = app._escapeJsString(entry.id);
                const lootTitle = app._escapeHtml(app._label('action.loot', 'Loot'));
                const scavengeTitle = app._escapeHtml(app._label('action.scavenge', 'Scavenge'));
                const metaParts = [
                    entry.depleted ? app._label('holdings.remainsDepleted', 'depleted') : app._label('holdings.remainsAvailable', 'available'),
                    Number.isFinite(entry.edibleRemaining) ? app._label('holdings.edibleRemaining', '{count} edible', { count: entry.edibleRemaining }) : ''
                ].filter(Boolean);
                html += `<div class="holdings-entry" data-holding-kind="remains"><div class="holding-entry-main"><div class="holding-entry-name">${app._escapeHtml(entry.label)}</div><div class="holding-entry-meta">${app._escapeHtml(metaParts.join(' · '))}</div></div><div class="holding-entry-actions">`;
                if (!entry.looted) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="loot-remains" onclick="App.lootCorpse('${id}');App.showInventory();">${lootTitle}</button>`;
                if (entry.scavengeable) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="scavenge-remains" onclick="App.scavengeCorpse('${id}');App.showInventory();">${scavengeTitle}</button>`;
                html += `</div></div>`;
            });
        }
        html += `</section>`;
        return html;
    },

    render(app, owner = app.player) {
        const sections = this.sections(app, owner);
        return [
            this.renderEquipmentSection(app, sections.find(section => section.id === 'equipped'), owner),
            this.renderPackSection(app, sections.find(section => section.id === 'pack'), owner),
            this.renderContainersSection(app, sections.find(section => section.id === 'containers'), owner),
            this.renderGroundSection(app, sections.find(section => section.id === 'ground'))
        ].join('');
    },

    renderStatsSection(app, owner = app.player) {
        const unit = owner || app._syncPlayerPartyReference?.() || app.player;
        if (!unit) return '';
        const stats = app._unitDisplayStats(unit);
        const noneText = app._escapeHtml(app._label('party.none', 'None'));
        const perks = (unit.perks || []).map(perk => app._escapeHtml(perk.name)).join(', ') || noneText;
        const bodyParts = (unit.bodyParts || []).map(part => app._escapeHtml(app.BODY_PARTS?.[part]?.label || part)).join(', ') || noneText;
        const bodyTypeLabel = value => ({
            clit: app._label('anatomy.adult.vulva', 'Lower Option A'),
            cock: app._label('anatomy.adult.penis', 'Lower Option B'),
            tits: app._label('anatomy.adult.breasts', 'Chest Option A'),
            pecs: app._label('anatomy.adult.pecs', 'Chest Option B')
        }[value] || value);
        const legacyExplicit = app._tierValue?.(CONTENT?.preferences?.maxTier ?? 0) >= 2
            && CONTENT?.preferences?.explicitDescriptions === true;
        const explicitContent = CONTENT?.isCategoryEnabled?.('explicit.sexual') === true || legacyExplicit;
        const safeTier = !explicitContent;
        const levelText = app._escapeHtml(app._label('party.levelSpecies', 'Level {level} {species}', { level: stats.level, species: unit.species }));
        const xpText = app._escapeHtml(app._label('character.xp', 'XP: {xp}/{xpToNext}', { xp: unit.xp || 0, xpToNext: unit.xpToNext || 0 }));
        const pendingCount = unit.pendingPerkChoices || 0;
        const choosePerkLabel = app._escapeHtml(app._label('perk.chooseCount', 'Choose Perk ({count})', { count: pendingCount }));
        const respecLabel = app._escapeHtml(app._label('perk.respec', 'Respec Perks'));
        const debugGrantLabel = app._escapeHtml(app._label('perk.debugGrant', 'Debug +1 Perk Choice'));
        const respecDisabled = (unit.perks || []).length ? '' : ' disabled';
        const perkButton = pendingCount > 0 ? `<button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="open-perk-selection" title="${choosePerkLabel}" aria-label="${choosePerkLabel}" onclick="App.showPerkSelection()">${choosePerkLabel}</button>` : '';
        const bodySummary = safeTier
            ? `${app._escapeHtml(app._label('character.size', 'Size'))}: ${app._escapeHtml(String(unit.size || 1))} · ${app._escapeHtml(app._label('character.appetite', 'Appetite'))}: ${app._escapeHtml(String(unit.appetite || 1))}<br>${app._escapeHtml(app._label('character.bodyParts', 'Body'))}: ${bodyParts}`
            : `${app._escapeHtml(app._label('character.size', 'Size'))}: ${app._escapeHtml(String(unit.size || 1))} · ${app._escapeHtml(app._label('character.appetite', 'Appetite'))}: ${app._escapeHtml(String(unit.appetite || 1))}<br>${app._escapeHtml(app._label('character.parts', 'Parts'))}: ${app._escapeHtml(bodyTypeLabel(unit.parts) || app._label('party.none', 'None'))} · ${app._escapeHtml(app._label('character.chest', 'Chest'))}: ${app._escapeHtml(bodyTypeLabel(unit.chest) || app._label('party.none', 'None'))}<br>${app._escapeHtml(app._label('character.bodyParts', 'Body'))}: ${bodyParts}`;
        const card = (label, body) => `<div class="holdings-stat-card"><strong>${app._escapeHtml(label)}</strong><span>${body}</span></div>`;
        return `<section class="holdings-section holdings-stats-section" data-holding-section="stats">
            <div class="holdings-character-summary">
                <div class="holdings-character-avatar">${app._escapeHtml(unit.icon || '👤')}</div>
                <div><div class="holding-entry-name">${app._escapeHtml(unit.name || app._label('party.you', 'You'))}</div><div class="holding-entry-meta">${levelText} · ${xpText}</div></div>
            </div>
            <div class="holdings-stat-grid">
                ${card(app._label('party.punishment', 'Punishment'), `${stats.CPun}/${stats.MPun}`)}
                ${card(app._label('party.pleasure', 'Spirit'), `${stats.CPle}/${stats.MPle}`)}
                ${card(app._label('character.combatStats', 'Combat Stats'), `Figh: ${stats.Figh} | Feas: ${stats.Feas} | Flir: ${stats.Flir}<br>${app._escapeHtml(app._uiLabel('fuck'))}: ${stats.Fuck} | Flee: ${stats.Flee} | Feed: ${stats.Feed}`)}
                ${card(app._label('party.attributes', 'Attributes'), `STR: ${stats.str} | CON: ${stats.con} | SPD: ${stats.spd}<br>INT: ${stats.int} | WIS: ${stats.wis} | CHA: ${stats.cha}`)}
                ${card(app._label('character.body', 'Body'), bodySummary)}
                ${card(app._label('party.equipment', 'Equipment'), app._equipmentSummary(unit))}
                ${card(app._label('party.perks', 'Perks'), perks)}
                ${card(app._label('character.perkTools', 'Perk Tools'), `<span style="color:var(--text-muted);font-size:12px">${app._escapeHtml(app._label('character.perkToolsHelp', 'Balance/debug controls.'))}</span><br>${perkButton}<button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="respec-perks" title="${respecLabel}" aria-label="${respecLabel}" onclick="App.respecPerks()"${respecDisabled}>${respecLabel}</button><button class="nav-btn" data-command-surface="stats-detail" data-command-mode="exploration" data-command-control="debug-grant-perk" title="${debugGrantLabel}" aria-label="${debugGrantLabel}" onclick="App.debugGrantPerkChoice(1)">${debugGrantLabel}</button>`)}
            </div>
        </section>`;
    },

    renderTabBody(app, owner = app.player, tab = 'stats') {
        const sections = this.sections(app, owner);
        if (tab === 'stats') return this.renderStatsSection(app, owner);
        if (tab === 'equipment') return this.renderEquipmentSection(app, sections.find(section => section.id === 'equipped'), owner);
        if (tab === 'containers') return this.renderContainersSection(app, sections.find(section => section.id === 'containers'), owner);
        if (tab === 'ground') return this.renderGroundSection(app, sections.find(section => section.id === 'ground'));
        return this.renderPackSection(app, sections.find(section => section.id === 'pack'), owner);
    },

    setUnderlyingInert(enabled) {
        const selectors = ['#app > .app-header', '#app > .stage', '#app > .panel-log', '#mobile-actions', '#panel-backdrop'];
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            if (enabled) {
                element.setAttribute('inert', '');
                element.setAttribute('aria-hidden', 'true');
            } else {
                element.removeAttribute('inert');
                element.removeAttribute('aria-hidden');
            }
        });
    },

    show(app, owner = app.player, options = {}) {
        return this.open(app, owner, options);
    },

    open(app, owner = app.player, options = {}) {
        const root = this.root();
        if (!root) return false;
        const returnFocus = app.holdingsWindow?.returnFocus || this.captureReturnFocus();
        owner = owner || this.selectedOwner(app) || app.player;
        const tab = this.tabs().includes(options.tab || app.holdingsWindow?.tab) ? (options.tab || app.holdingsWindow?.tab) : 'stats';
        owner = this.ownerForTab(app, owner, tab);
        app.holdingsWindow = {
            tab,
            ownerType: 'party',
            ownerId: this.ownerId(app, owner),
            returnFocus
        };
        app._restoreCenterContextIfPanelDetailLeaked?.();
        const actions = document.getElementById('scene-actions');
        if (actions) {
            actions.innerHTML = '';
            actions.style.display = 'none';
            actions.hidden = true;
            delete actions.dataset.richHidden;
        }
        app.closeIntentMenu?.();
        app.closePanelDetails?.('party');
        app.closePanelDetails?.('enemies');
        return this.renderWindow(app, owner, tab);
    },

    close(app) {
        const root = this.root();
        const returnFocus = app.holdingsWindow?.returnFocus || null;
        app.holdingsWindow = null;
        app._restoreFocusTrap?.({ restoreFocus: false });
        if (root) {
            root.hidden = true;
            root.innerHTML = '';
        }
        this.setUnderlyingInert(false);
        document.getElementById('app')?.classList?.remove('holdings-window-open');
        if (app.combatState?.active) {
            const actor = app._currentCombatActor?.() || app.activeActor;
            app.renderDesktopCombatComposer?.(actor);
            app.renderMobileCombatToolbelt?.();
            app.renderSelectionSentence?.();
        } else {
            app.renderExplorationActions?.();
            app._renderInteractionState?.({ exploration: true, toolbelt: false });
        }
        this.restoreReturnFocus(returnFocus);
        return false;
    },

    refresh(app) {
        if (!app.holdingsWindow) return false;
        const owner = this.selectedOwner(app);
        return this.renderWindow(app, owner, app.holdingsWindow.tab || 'stats');
    },

    setTab(app, tab) {
        if (!this.tabs().includes(tab)) tab = 'stats';
        if (!app.holdingsWindow) return this.open(app, app.player, { tab });
        app.holdingsWindow.tab = tab;
        delete app.holdingsWindow.detail;
        return this.renderWindow(app, this.ownerForTab(app, this.selectedOwner(app), tab), tab);
    },

    renderPerkSelectionBody(app) {
        const pending = app.player?.pendingPerkChoices || 0;
        const choices = app._availablePerkChoices();
        const filters = app._availablePerkTreeFilters(app.player);
        if (!filters.some(([value]) => value === app.perkTreeFilter)) app.perkTreeFilter = 'all';
        const visibleTrees = Object.entries(app._perkTreesForUnit(app.player)).filter(([treeId]) => app.perkTreeFilter === 'all' || app.perkTreeFilter === treeId);
        const pendingLabel = app._escapeHtml(app._label('perk.pending', 'Pending choices: {count}', { count: pending }));
        const treesLabel = app._escapeHtml(app._label('perk.trees', 'Perk trees'));
        let html = `<div class="perk-selection-detail holdings-perk-selection" data-command-surface="perk-selection-detail" data-command-mode="exploration"><p class="holding-entry-meta">${pendingLabel}</p><div class="action-legend" role="tablist" aria-label="${treesLabel}">`;
        filters.forEach(([value, label]) => {
            const active = app.perkTreeFilter === value ? ' selected' : '';
            const escapedValue = app._escapeHtml(value);
            const filterLabel = app._escapeHtml(label);
            html += `<button class="action-chip${active}" role="tab" aria-selected="${app.perkTreeFilter === value ? 'true' : 'false'}" data-perk-filter="${escapedValue}" data-command-surface="perk-selection-detail" data-command-mode="exploration" data-command-control="filter-perk-tree" title="${filterLabel}" aria-label="${filterLabel}" onclick="App.setPerkTreeFilter('${app._escapeJsString(value)}')">${filterLabel}</button>`;
        });
        html += `</div><div class="holdings-entry-grid holdings-perk-grid">`;
        for (const [treeId, tree] of visibleTrees) {
            html += `<section class="holdings-section option-card" data-perk-tree="${app._escapeHtml(treeId)}"><div class="holdings-section-title">${app._escapeHtml(tree.label)}</div><div style="display:grid;gap:8px;">`;
            choices.filter(perk => perk.tree === treeId).forEach(perk => {
                const disabled = pending <= 0 || !perk.available ? ' disabled' : '';
                const reqTree = perk.requires?.tree ? app._perkTreesForUnit(app.player)[perk.requires.tree]?.label || perk.requires.tree : null;
                const req = perk.requires ? (perk.requires.perk ? ` Requires ${perk.requires.perk}.` : ` Requires ${perk.requires.count || 1} ${reqTree} perk${(perk.requires.count || 1) === 1 ? '' : 's'}.`) : '';
                const chooseTitle = app._escapeHtml(app._label('perk.chooseNamed', 'Choose {name}', { name: perk.name }));
                html += `<button class="nav-btn" data-command-surface="perk-selection-detail" data-command-mode="exploration" data-command-control="choose-perk" data-command-intent="choosePerk" title="${chooseTitle}" aria-label="${chooseTitle}" ${disabled} onclick="App.choosePerk('${app._escapeJsString(perk.id)}')"><strong>${app._escapeHtml(perk.name)}</strong> <span style="color:var(--text-muted);font-size:11px">[${app._escapeHtml(perk.treeLabel)}]</span><br><span style="font-size:11px;color:var(--text-muted)">${app._escapeHtml(perk.desc)}${app._escapeHtml(req)}</span></button>`;
            });
            html += `</div></section>`;
        }
        return `${html}</div></div>`;
    },

    showPerkSelection(app) {
        const root = this.root();
        if (!root || !app.player) return false;
        app.holdingsWindow = {
            ...(app.holdingsWindow || {}),
            tab: 'stats',
            detail: 'perks',
            ownerId: app.player.id || app.player.name || 'player',
            returnFocus: app.holdingsWindow?.returnFocus || this.captureReturnFocus()
        };
        app._restoreCenterContextIfPanelDetailLeaked?.();
        app.closeIntentMenu?.();
        app.closePanelDetails?.('party');
        app.closePanelDetails?.('enemies');
        const titleLabel = app._escapeHtml(app._label('perk.choose', 'Choose Perk'));
        const descriptionLabel = app._escapeHtml(app._label('holdings.perkDescription', 'Choose an available perk, or return to character stats.'));
        const backLabel = app._escapeHtml(app._label('perk.back', 'Back'));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" aria-describedby="holdings-window-description" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                <header class="holdings-window-header">
                    <div>
                        <div class="holdings-window-eyebrow">${app._escapeHtml(app._label('holdings.umbrella', 'Character / Holdings'))}</div>
                        <h2 id="holdings-window-title">${titleLabel}</h2>
                        <p id="holdings-window-description" class="holding-entry-meta">${descriptionLabel}</p>
                    </div>
                    <div class="holdings-window-actions">
                        <button class="nav-btn" data-command-surface="perk-selection-detail" data-command-mode="exploration" data-command-control="back-to-stats" data-command-slot="exit" title="${backLabel}" aria-label="${backLabel}" onclick="App.showCharacterStats()">${backLabel}</button>
                        <button class="nav-btn holdings-close" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeHoldingsWindow()">${closeLabel}</button>
                    </div>
                </header>
                <div class="holdings-window-body inventory-panel-detail holdings-panel-detail" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                    ${this.renderPerkSelectionBody(app)}
                </div>
            </section>`;
        document.getElementById('app')?.classList?.add('holdings-window-open');
        this.setUnderlyingInert(true);
        const dialog = root.querySelector('.holdings-window');
        app._activateFocusTrap?.(dialog, { close: () => app.closeHoldingsWindow() });
        try { root.querySelector('.holdings-close')?.focus({ preventScroll: true }); } catch (e) { root.querySelector('.holdings-close')?.focus(); }
        return true;
    },

    renderWindow(app, owner = app.player, tab = 'stats') {
        const root = this.root();
        if (!root) return false;
        const requestedOwner = owner || this.selectedOwner(app) || app.player;
        owner = this.ownerForTab(app, requestedOwner, tab);
        const storedOwner = tab === 'pack' ? requestedOwner : owner;
        app.holdingsWindow = {
            ...(app.holdingsWindow || {}),
            tab,
            ownerType: 'party',
            ownerId: this.ownerId(app, storedOwner)
        };
        const count = app.inventory?.length || 0;
        const titleText = app._label('holdings.titleWithInventory', 'Holdings / Inventory ({count}/{max})', { count, max: app.MAX_INVENTORY });
        const closeLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const title = app._escapeHtml(titleText);
        const description = app._escapeHtml(app._label('holdings.windowDescription', 'Review and manage character stats, equipment, pack, and containers.'));
        const tabButtons = this.tabs().map(tabId => {
            const selected = tab === tabId;
            const label = app._escapeHtml(this.tabLabel(app, tabId));
            return `<button class="nav-btn holdings-tab${selected ? ' selected' : ''}" role="tab" aria-selected="${selected ? 'true' : 'false'}" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="switch-holdings-tab" data-command-slot="${app._escapeHtml(tabId)}" onclick="App.setHoldingsTab('${app._escapeJsString(tabId)}')">${label}</button>`;
        }).join('');
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" aria-describedby="holdings-window-description" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                <header class="holdings-window-header">
                    <div>
                        <div class="holdings-window-eyebrow">${app._escapeHtml(app._label('holdings.umbrella', 'Character / Holdings'))}</div>
                        <h2 id="holdings-window-title">${title}</h2>
                        <p id="holdings-window-description" class="holding-entry-meta">${description}</p>
                    </div>
                    <button class="nav-btn holdings-close" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeHoldingsWindow()">${closeLabel}</button>
                </header>
                <div class="holdings-control-shelf" data-surface-role="holdings-controls">
                    <nav class="holdings-tabs" role="tablist" aria-label="${app._escapeHtml(app._label('holdings.tabs', 'Holdings sections'))}">
                        ${tabButtons}
                    </nav>
                    ${this.renderOwnerSelector(app, owner)}
                </div>
                <div class="holdings-window-body inventory-panel-detail holdings-panel-detail" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                    ${this.renderTabBody(app, owner, tab)}
                </div>
            </section>`;
        document.getElementById('app')?.classList?.add('holdings-window-open');
        this.setUnderlyingInert(true);
        const dialog = root.querySelector('.holdings-window');
        app._activateFocusTrap?.(dialog, { close: () => app.closeHoldingsWindow() });
        try { root.querySelector('.holdings-close')?.focus({ preventScroll: true }); } catch (e) { root.querySelector('.holdings-close')?.focus(); }
        return true;
    },

    showContainedDetail(app, holderType = 'party', holderIndex = 0, container = 'stomach', containedIndex = 0) {
        const detail = YAW_UNIT_CONTAINMENT.containedDetailHtml(app, holderType, holderIndex, container, containedIndex);
        const root = this.root();
        if (!detail || !root) return false;
        const owner = holderType === 'party' ? (app.party || [])[Number(holderIndex)] : this.selectedOwner(app);
        app.holdingsWindow = {
            ...(app.holdingsWindow || {}),
            tab: 'containers',
            detail: 'contained',
            ownerType: 'party',
            ownerId: this.ownerId(app, owner || app.player),
            returnFocus: app.holdingsWindow?.returnFocus || this.captureReturnFocus()
        };
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        const description = app._escapeHtml(app._label('holdings.containedDescription', 'Review this contained creature and its available actions.'));
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" aria-describedby="holdings-window-description" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration">
                <header class="holdings-window-header">
                    <div><div class="holdings-window-eyebrow">${app._escapeHtml(this.tabLabel(app, 'containers'))}</div><h2 id="holdings-window-title">${app._escapeHtml(detail.title)}</h2><p id="holdings-window-description" class="holding-entry-meta">${description}</p></div>
                    <button class="nav-btn holdings-close" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeHoldingsWindow()">${closeLabel}</button>
                </header>
                <div class="holdings-window-body">${detail.html}</div>
            </section>`;
        document.getElementById('app')?.classList?.add('holdings-window-open');
        this.setUnderlyingInert(true);
        const dialog = root.querySelector('.holdings-window');
        app._activateFocusTrap?.(dialog, { close: () => app.closeHoldingsWindow() });
        try { root.querySelector('.holdings-close')?.focus({ preventScroll: true }); } catch (e) { root.querySelector('.holdings-close')?.focus(); }
        return true;
    }
};

const YAW_INVENTORY_PANEL = {
    show(app) {
        const owner = YAW_HOLDINGS.selectedOwner(app) || app.player;
        return YAW_HOLDINGS.show(app, owner, { tab: 'pack' });
    },

    setFilter(app, filter) {
        app.inventoryFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
        YAW_HOLDINGS.refresh(app) || app.showInventory();
    },

    setSort(app, sort) {
        app.inventorySort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
        YAW_HOLDINGS.refresh(app) || app.showInventory();
    },

    requestUse(app, itemId) {
        if (YAW_RECOVERY_MODES?.restricts?.(app, 'inventory')) return false;
        const item = (app.inventory || []).find(entry => String(entry?.id) === String(itemId));
        if (!item || app._getItemDef(item).effect !== 'heal') return false;
        if (YAW_HOLDINGS.partyOwners(app).length <= 1) return this.use(app, itemId);
        if (!app.holdingsWindow) YAW_HOLDINGS.show(app, app.player, { tab: 'pack' });
        app.holdingsWindow = {
            ...(app.holdingsWindow || {}),
            pendingItemUseId: String(itemId)
        };
        YAW_HOLDINGS.refresh(app);
        return true;
    },

    cancelUse(app) {
        if (!app.holdingsWindow?.pendingItemUseId) return false;
        delete app.holdingsWindow.pendingItemUseId;
        YAW_HOLDINGS.refresh(app);
        return true;
    },

    use(app, itemId, targetId = null) {
        if (YAW_RECOVERY_MODES?.restricts?.(app, 'inventory')) return false;
        const index = (app.inventory || []).findIndex(item => String(item?.id) === String(itemId));
        if (index < 0) return false;
        const item = app.inventory[index];
        const def = app._getItemDef(item);
        if (def.effect !== 'heal') return false;
        const player = app._syncPlayerPartyReference?.() || app.player;
        const target = targetId == null
            ? player
            : YAW_HOLDINGS.partyOwners(app).find(unit => YAW_HOLDINGS.ownerId(app, unit) === String(targetId));
        if (!player || player.CPun <= 0 || app.defeatState?.pending) {
            const text = app._label('inventory.cannotHealDefeated', 'A healing item cannot replace defeat recovery.');
            app.log.push({ text, type: 'heal' });
            app.renderLog?.();
            return false;
        }
        if (!target || Number(target.CPun) <= 0) {
            const text = app._label('inventory.cannotHealTarget', '{name} cannot be healed while defeated.', {
                name: target?.name || app._label('ui.unknown', 'Unknown')
            });
            app.log.push({ text, type: 'heal' });
            app.renderLog?.();
            return false;
        }
        const inCombat = Boolean(app.combatState?.active);
        if (inCombat) {
            const actor = app._currentCombatActor?.() || app.activeActor;
            if (actor !== player) {
                const text = app._label('inventory.notPlayerTurn', 'Healing items can only be used on your combat turn.');
                app.log.push({ text, type: 'heal' });
                app.renderLog?.();
                return false;
            }
        }
        const current = Math.max(0, Number(target.CPun) || 0);
        const maximum = Math.max(1, Number(target.MPun) || current || 1);
        if (current >= maximum) {
            const text = app._label('inventory.fullCondition', '{name} is already at full condition.', { name: YAW_HOLDINGS.ownerLabel(app, target) });
            app.log.push({ text, type: 'heal' });
            app.renderLog?.();
            return false;
        }
        const requested = Math.max(1, Math.floor(Number(def.healAmount ?? def.value) || 1));
        const healed = Math.min(requested, maximum - current);
        target.CPun = current + healed;
        app.inventory.splice(index, 1);
        const actorName = YAW_HOLDINGS.ownerLabel(app, player);
        const targetName = YAW_HOLDINGS.ownerLabel(app, target);
        const text = target === player
            ? app._label('inventory.healed', '{name} uses {item} and recovers {amount} condition.', {
                name: actorName,
                item: item.name || app._label('ui.item', 'item'),
                amount: healed
            })
            : app._label('inventory.healedTarget', '{actor} uses {item} on {target}, restoring {amount} condition.', {
                actor: actorName,
                item: item.name || app._label('ui.item', 'item'),
                target: targetName,
                amount: healed
            });
        if (app.holdingsWindow) delete app.holdingsWindow.pendingItemUseId;
        app.log.push({ text, type: 'heal' });
        app._addTileEvent?.(text, 'heal');
        app.showToast?.({ text, type: 'heal', importance: 'notable', dedupeKey: `inventory-heal:${String(item.id || item.name)}` });
        if (inCombat) app._emitCombatAction?.('use_item', player, target, text);
        else app.emitStoryResult?.({ mode: 'adventure', actors: [player], targets: [target], action: 'use-item', subAction: 'heal' }, text, {
            resultKind: 'healing',
            deltas: [{ kind: 'healing', amount: healed, unit: target.name }]
        });
        app.renderLog?.();
        app.renderParty?.();
        app.renderCenterPresence?.();
        YAW_HOLDINGS.refresh(app);
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'combat', 'sceneFeed', 'activityLog'], 'inventory-use-heal');
        app.autoSave?.();
        if (inCombat) {
            app.closeHoldingsWindow?.();
            app.nextTurn?.();
        }
        return true;
    },

    equip(app, itemId, ownerId = null) {
        if (YAW_RECOVERY_MODES?.restricts?.(app, 'inventory')) return false;
        // Pack UI is player-only for now. ownerId remains as a legacy/internal compatibility seam
        // until companion equipment gets a deliberate management flow separate from Pack.
        const owner = YAW_HOLDINGS.ownerById(app, ownerId || app.holdingsWindow?.ownerId);
        if (!owner) return;
        const item = app.inventory.find(i => String(i.id) === String(itemId));
        if (!item || !app._isEquippable(item)) return;
        const def = app._getItemDef(item);
        const slot = def.slot;
        owner.equipment = owner.equipment || {};
        if (!owner.equipmentBaseStats) owner.equipmentBaseStats = app._captureEquipmentBaseStats(owner);
        const current = owner.equipment[slot];
        if (current) {
            app.inventory.push(current);
        }
        app.inventory = app.inventory.filter(i => String(i.id) !== String(itemId));
        owner.equipment[slot] = item;
        app._recalculateEquipment(owner);
        const logText = YAW_HOLDINGS.isPlayerOwner(app, owner)
            ? app._label('inventory.equipped', 'Equipped {name}.', { name: item.name })
            : app._label('holdings.equippedToOwner', 'Equipped {item} to {name}.', { item: item.name, name: YAW_HOLDINGS.ownerLabel(app, owner) });
        app.log.push({ text: logText, type: 'discovery' });
        app.renderLog();
        app.renderParty();
        YAW_HOLDINGS.open(app, owner, { tab: app.holdingsWindow?.tab || 'pack' });
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'activityLog'], 'inventory-equip');
        app.autoSave();
    },

    unequip(app, slot, ownerId = null) {
        if (YAW_RECOVERY_MODES?.restricts?.(app, 'inventory')) return false;
        const owner = YAW_HOLDINGS.ownerById(app, ownerId || app.holdingsWindow?.ownerId);
        if (!owner?.equipment || !owner.equipment[slot]) return;
        if (app.inventory.length >= app.MAX_INVENTORY) {
            app.log.push({ text: app._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        const item = owner.equipment[slot];
        owner.equipment[slot] = null;
        app._recalculateEquipment(owner);
        app.inventory.push(item);
        const logText = YAW_HOLDINGS.isPlayerOwner(app, owner)
            ? app._label('inventory.unequipped', 'Unequipped {name}.', { name: item.name })
            : app._label('holdings.unequippedFromOwner', 'Unequipped {item} from {name}.', { item: item.name, name: YAW_HOLDINGS.ownerLabel(app, owner) });
        app.log.push({ text: logText, type: 'discovery' });
        app.renderLog();
        app.renderParty();
        YAW_HOLDINGS.open(app, owner, { tab: app.holdingsWindow?.tab || 'equipment' });
        app.markAutoSaveDirty?.(['manifest', 'player', 'party', 'inventory', 'holdings', 'activityLog'], 'inventory-unequip');
        app.autoSave();
    },

    drop(app, itemId) {
        if (YAW_RECOVERY_MODES?.restricts?.(app, 'inventory')) return false;
        const index = app.inventory.findIndex(item => String(item?.id) === String(itemId));
        if (index === -1) return false;
        const tile = app._currentExplorationTile();
        if (!tile) return false;
        const [item] = app.inventory.splice(index, 1);
        if (!Array.isArray(tile.items)) tile.items = [];
        tile.items.push(app._cloneTileValue(item));
        app._persistCurrentExplorationTile(tile);
        const droppedText = app._label('log.droppedTileItem', 'Dropped {item}.', { item: app._tileItemLabel(item) });
        app.log.push({ text: droppedText, type: 'loot' });
        app._addTileEvent(droppedText, 'loot');
        app.showInventory();
        app.renderExplorationActions();
        app.renderLog();
        app.markAutoSaveDirty?.(['manifest', 'inventory', 'holdings', 'currentTile', 'worldTiles', 'activityLog'], 'inventory-drop');
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_HOLDINGS = YAW_HOLDINGS;
    window.YAW_INVENTORY_PANEL = YAW_INVENTORY_PANEL;
}
