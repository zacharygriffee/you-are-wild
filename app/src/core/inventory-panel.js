/**
 * YOU ARE WILD INVENTORY PANEL
 * Player-owned inventory rendering and direct item actions.
 */

const YAW_HOLDINGS = {
    root() {
        return document.getElementById('holdings-window-root');
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
        return { kind: 'ground', tile, items, remains };
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

    renderEquipmentSection(app, section) {
        const equippedLabel = app._escapeHtml(section.label);
        let html = `<section class="holdings-section" data-holding-section="equipped"><div class="holdings-section-title">${equippedLabel}</div>`;
        html += `<div class="holding-entry-meta">${app._equipmentSummary()}</div><div class="holding-entry-actions">`;
        section.entries.forEach(({ slot, label, item }) => {
            if (!item) return;
            const unequipTitle = app._escapeHtml(app._label('inventory.unequipSlot', 'Unequip {slot}', { slot: label }));
            const unequipLabel = app._escapeHtml(`${app._label('inventory.unequip', 'Unequip')} ${label}`);
            html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="unequip-item" title="${unequipTitle}" aria-label="${unequipTitle}" onclick="App.unequipItem('${app._escapeJsString(slot)}')">${unequipLabel}</button>`;
        });
        html += `</div></section>`;
        return html;
    },

    renderPackItem(app, item) {
        const def = app.ITEMS[item.name] || { icon: '?', desc: 'Unknown' };
        const canUse = def.effect === 'heal' || def.effect === 'buff' || def.effect === 'damage';
        const canEquip = app._isEquippable(item);
        const itemKey = app._escapeJsString(item.id);
        const name = app._escapeHtml(item.name || app._label('ui.item', 'item'));
        const useLabel = app._escapeHtml(app._label('inventory.use', 'Use'));
        const equipLabel = app._escapeHtml(app._label('inventory.equip', 'Equip'));
        const dropLabel = app._escapeHtml(app._label('inventory.drop', 'Drop'));
        const useTitle = app._escapeHtml(app._label('inventory.useItem', 'Use {name}', { name: item.name }));
        const equipTitle = app._escapeHtml(app._label('inventory.equipItem', 'Equip {name}', { name: item.name }));
        const dropTitle = app._escapeHtml(app._label('inventory.dropItem', 'Drop {name}', { name: item.name }));
        let html = `<div class="holdings-entry pack-entry" data-holding-kind="pack-item"><div class="holding-entry-main"><div class="holding-entry-name"><span>${app._escapeHtml(def.icon || '?')}</span> ${name}</div>`;
        html += `<div class="holding-entry-meta">${app._escapeHtml(def.type || 'misc')} · ${app._escapeHtml(def.desc || '')}${canEquip ? '<br>' + app._equipmentBonusText(item) : ''}</div></div><div class="holding-entry-actions">`;
        if (canUse) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="use-item" title="${useTitle}" aria-label="${useTitle}" onclick="App.useItem('${itemKey}')">${useLabel}</button>`;
        if (canEquip) html += `<button class="nav-btn" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="equip-item" title="${equipTitle}" aria-label="${equipTitle}" onclick="App.equipItem('${itemKey}')">${equipLabel}</button>`;
        html += `<button class="nav-btn danger" data-command-surface="inventory-detail" data-command-mode="exploration" data-command-control="drop-item" title="${dropTitle}" aria-label="${dropTitle}" onclick="App.dropItem('${itemKey}')">${dropLabel}</button></div></div>`;
        return html;
    },

    renderPackSection(app, section) {
        let html = `<section class="holdings-section" data-holding-section="pack"><div class="holdings-section-title"><span>${app._escapeHtml(section.label)}</span><span>${section.count}/${section.max}</span></div>`;
        html += app._itemListOptions('Inventory');
        const entries = app._filterAndSortItemEntries((app.inventory || []).map((item, index) => ({ item, index })), app.inventoryFilter, app.inventorySort);
        if ((app.inventory || []).length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('inventory.empty', 'Empty.'))}</p>`;
        } else if (entries.length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('inventory.noItemsMatch', 'No items match the current filter.'))}</p>`;
        } else {
            html += `<div class="holdings-entry-grid">${entries.map(({ item }) => this.renderPackItem(app, item)).join('')}</div>`;
        }
        html += `</section>`;
        return html;
    },

    renderContainersSection(app, section, owner = app.player) {
        const holderIndex = Math.max(0, (app.party || []).indexOf(owner));
        const inventoryHtml = YAW_UNIT_CONTAINMENT.renderContainerInventory(app, owner, 'party', holderIndex);
        const summary = section.entries.map(container => `${container.profile.label}: ${container.used}/${container.capacity}`).join(' · ');
        return `<section class="holdings-section" data-holding-section="containers">
            <div class="holdings-section-title"><span>${app._escapeHtml(section.label)}</span><span>${app._escapeHtml(summary || '')}</span></div>
            ${inventoryHtml || `<p class="holding-entry-meta">${app._escapeHtml(app._label('containment.empty', 'No contained creatures.'))}</p>`}
        </section>`;
    },

    renderGroundSection(app, section) {
        const ground = section.ground;
        let html = `<section class="holdings-section" data-holding-section="ground"><div class="holdings-section-title"><span>${app._escapeHtml(section.label)}</span><span>${ground.items.length + ground.remains.length}</span></div>`;
        if (ground.items.length === 0 && ground.remains.length === 0) {
            html += `<p class="holding-entry-meta">${app._escapeHtml(app._label('holdings.groundEmpty', 'Nothing loose here.'))}</p>`;
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
            this.renderEquipmentSection(app, sections.find(section => section.id === 'equipped')),
            this.renderPackSection(app, sections.find(section => section.id === 'pack')),
            this.renderContainersSection(app, sections.find(section => section.id === 'containers'), owner),
            this.renderGroundSection(app, sections.find(section => section.id === 'ground'))
        ].join('');
    },

    renderStatsSection(app, owner = app.player) {
        const unit = app._syncPlayerPartyReference?.() || owner || app.player;
        if (!unit) return '';
        const stats = app._unitDisplayStats(unit);
        const noneText = app._escapeHtml(app._label('party.none', 'None'));
        const perks = (unit.perks || []).map(perk => app._escapeHtml(perk.name)).join(', ') || noneText;
        const bodyParts = (unit.bodyParts || []).map(part => app._escapeHtml(app.BODY_PARTS?.[part]?.label || part)).join(', ') || noneText;
        const bodyTypeLabel = value => ({ clit: 'Body Type A', cock: 'Body Type B', tits: 'Chest Type A', pecs: 'Chest Type B' }[value] || value);
        const safeTier = app._tierValue?.(CONTENT?.preferences?.maxTier ?? 0) < 2;
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
        if (tab === 'equipment') return this.renderEquipmentSection(app, sections.find(section => section.id === 'equipped'));
        if (tab === 'containers') return this.renderContainersSection(app, sections.find(section => section.id === 'containers'), owner);
        if (tab === 'ground') return this.renderGroundSection(app, sections.find(section => section.id === 'ground'));
        return this.renderPackSection(app, sections.find(section => section.id === 'pack'));
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
        const tab = this.tabs().includes(options.tab || app.holdingsWindow?.tab) ? (options.tab || app.holdingsWindow?.tab) : 'stats';
        app.holdingsWindow = {
            tab,
            ownerId: owner?.id || owner?.name || 'player'
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
        return false;
    },

    refresh(app) {
        if (!app.holdingsWindow) return false;
        return this.renderWindow(app, app.player, app.holdingsWindow.tab || 'stats');
    },

    setTab(app, tab) {
        if (!this.tabs().includes(tab)) tab = 'stats';
        if (!app.holdingsWindow) return this.open(app, app.player, { tab });
        app.holdingsWindow.tab = tab;
        delete app.holdingsWindow.detail;
        return this.renderWindow(app, app.player, tab);
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
        app.holdingsWindow = { tab: 'stats', detail: 'perks', ownerId: app.player.id || app.player.name || 'player' };
        app._restoreCenterContextIfPanelDetailLeaked?.();
        app.closeIntentMenu?.();
        app.closePanelDetails?.('party');
        app.closePanelDetails?.('enemies');
        const titleLabel = app._escapeHtml(app._label('perk.choose', 'Choose Perk'));
        const backLabel = app._escapeHtml(app._label('perk.back', 'Back'));
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                <header class="holdings-window-header">
                    <div>
                        <div class="holdings-window-eyebrow">${app._escapeHtml(app._label('holdings.umbrella', 'Character / Holdings'))}</div>
                        <h2 id="holdings-window-title">${titleLabel}</h2>
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
        const count = app.inventory?.length || 0;
        const titleText = app._label('holdings.titleWithInventory', 'Holdings / Inventory ({count}/{max})', { count, max: app.MAX_INVENTORY });
        const closeLabel = app._escapeHtml(app._label('inventory.back', 'Back'));
        const title = app._escapeHtml(titleText);
        const tabButtons = this.tabs().map(tabId => {
            const selected = tab === tabId;
            const label = app._escapeHtml(this.tabLabel(app, tabId));
            return `<button class="nav-btn holdings-tab${selected ? ' selected' : ''}" role="tab" aria-selected="${selected ? 'true' : 'false'}" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="switch-holdings-tab" data-command-slot="${app._escapeHtml(tabId)}" onclick="App.setHoldingsTab('${app._escapeJsString(tabId)}')">${label}</button>`;
        }).join('');
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration" data-command-grammar="holdings-management">
                <header class="holdings-window-header">
                    <div>
                        <div class="holdings-window-eyebrow">${app._escapeHtml(app._label('holdings.umbrella', 'Character / Holdings'))}</div>
                        <h2 id="holdings-window-title">${title}</h2>
                    </div>
                    <button class="nav-btn holdings-close" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeHoldingsWindow()">${closeLabel}</button>
                </header>
                <nav class="holdings-tabs" role="tablist" aria-label="${app._escapeHtml(app._label('holdings.tabs', 'Holdings sections'))}">
                    ${tabButtons}
                </nav>
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
        app.holdingsWindow = { tab: 'containers', detail: 'contained' };
        const closeLabel = app._escapeHtml(app._label('ui.close', 'Close'));
        root.hidden = false;
        root.innerHTML = `
            <div class="holdings-backdrop" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" onclick="App.closeHoldingsWindow()"></div>
            <section class="holdings-window" role="dialog" aria-modal="true" aria-labelledby="holdings-window-title" data-surface-role="holdings-window" data-command-surface="holdings-window" data-command-mode="exploration">
                <header class="holdings-window-header">
                    <div><div class="holdings-window-eyebrow">${app._escapeHtml(this.tabLabel(app, 'containers'))}</div><h2 id="holdings-window-title">${app._escapeHtml(detail.title)}</h2></div>
                    <button class="nav-btn holdings-close" data-command-surface="holdings-window" data-command-mode="exploration" data-command-control="close-holdings" data-command-slot="exit" title="${closeLabel}" aria-label="${closeLabel}" onclick="App.closeHoldingsWindow()">${closeLabel}</button>
                </header>
                <div class="holdings-window-body">${detail.html}</div>
            </section>`;
        document.getElementById('app')?.classList?.add('holdings-window-open');
        this.setUnderlyingInert(true);
        return true;
    }
};

const YAW_INVENTORY_PANEL = {
    show(app) {
        return YAW_HOLDINGS.show(app, app.player, { tab: 'pack' });
    },

    setFilter(app, filter) {
        app.inventoryFilter = ['all', 'consumable', 'equipment', 'valuable', 'material', 'misc'].includes(filter) ? filter : 'all';
        app.showInventory();
    },

    setSort(app, sort) {
        app.inventorySort = ['name', 'type', 'value-desc', 'value-asc'].includes(sort) ? sort : 'name';
        app.showInventory();
    },

    equip(app, itemId) {
        if (!app.player) return;
        const item = app.inventory.find(i => String(i.id) === String(itemId));
        if (!item || !app._isEquippable(item)) return;
        const def = app._getItemDef(item);
        const slot = def.slot;
        app.player.equipment = app.player.equipment || {};
        if (!app.player.equipmentBaseStats) app.player.equipmentBaseStats = app._captureEquipmentBaseStats(app.player);
        const current = app.player.equipment[slot];
        if (current) {
            app.inventory.push(current);
        }
        app.inventory = app.inventory.filter(i => String(i.id) !== String(itemId));
        app.player.equipment[slot] = item;
        app._recalculateEquipment(app.player);
        app.log.push({ text: app._label('inventory.equipped', 'Equipped {name}.', { name: item.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.showInventory();
        app.autoSave();
    },

    unequip(app, slot) {
        if (!app.player?.equipment || !app.player.equipment[slot]) return;
        if (app.inventory.length >= app.MAX_INVENTORY) {
            app.log.push({ text: app._label('inventory.full', 'Inventory is full.'), type: 'discovery' });
            app.renderLog();
            return;
        }
        const item = app.player.equipment[slot];
        app.player.equipment[slot] = null;
        app._recalculateEquipment(app.player);
        app.inventory.push(item);
        app.log.push({ text: app._label('inventory.unequipped', 'Unequipped {name}.', { name: item.name }), type: 'discovery' });
        app.renderLog();
        app.renderParty();
        app.showInventory();
        app.autoSave();
    },

    drop(app, itemId) {
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
        app.autoSave();
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.YAW_HOLDINGS = YAW_HOLDINGS;
    window.YAW_INVENTORY_PANEL = YAW_INVENTORY_PANEL;
}
