/**
 * Mobile context menus for party and creature cards.
 * Keeps mobile sheet rendering and action dispatch out of the core App surface.
 */
const YAW_MOBILE_CONTEXT_MENU = {
  showParty(app, index) {
    const unit = app.party[index];
    if (!unit) return;
    app.closeMobileContextMenu();
    const fallbackName = app._label('unit.partyMember', 'party member');
    const unitName = unit.name || fallbackName;
    const dialogTitle = app._label('ui.partyActionsFor', 'Party actions for {name}', { name: unitName });
    const dialogDescription = app._label('ui.partyActionsDescription', "Manage {name}'s holdings, party role, and companion actions.", { name: unitName });
    const behavior = app._getCompanionBehavior(unit);
    const commandControls = {
      stats: 'open-party-stats',
      lead: 'make-leader',
      dropoff: 'drop-off-party-member',
      dismiss: 'dismiss-party-member',
      close: 'close-detail-menu'
    };
    const detailAttrs = 'data-command-surface="detail-management" data-command-mode="exploration"';
    const actionButton = (label, action, extraClass = '') => {
      const exitAttr = action === 'close' ? ' data-command-slot="exit"' : '';
      return `<button class="action-btn${extraClass}" role="menuitem" ${detailAttrs} data-command-control="${app._escapeHtml(commandControls[action] || action)}"${exitAttr} title="${app._escapeHtml(label)}" aria-label="${app._escapeHtml(label)}" onclick="App.mobilePartyContextAction('${action}',${index})">${app._escapeHtml(label)}</button>`;
    };
    const dutyOptions = Object.keys(app.PARTY_DUTIES).map(key => `<option value="${key}" ${behavior.duty === key ? 'selected' : ''}>${app._escapeHtml(app._companionDutyLabel(key))}</option>`).join('');
    const stanceOptions = Object.keys(app.PARTY_STANCES).map(key => `<option value="${key}" ${behavior.stance === key ? 'selected' : ''}>${app._escapeHtml(app._companionStanceLabel(key))}</option>`).join('');
    const controlOptions = Object.keys(app.PARTY_CONTROLS).map(key => `<option value="${key}" ${behavior.control === key ? 'selected' : ''}>${app._escapeHtml(app._companionControlLabel(key))}</option>`).join('');
    const dutyDescription = `${app._companionDutyDescription(behavior.duty)} ${app._label('party.tradeoff', 'Tradeoff')}: ${app._companionDutyTradeoff(behavior.duty)}`;
    let html = `<div class="mobile-context-menu" id="mobile-context-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-context-menu-title" aria-describedby="mobile-context-menu-description" data-command-surface="detail-management" data-command-mode="exploration"><div class="mobile-context-menu-title" id="mobile-context-menu-title">${unit.icon || ''} ${app._escapeHtml(dialogTitle)}</div><p class="mobile-context-menu-description" id="mobile-context-menu-description">${app._escapeHtml(dialogDescription)}</p><div class="mobile-context-menu-actions" role="menu" aria-label="${app._escapeHtml(dialogTitle)}" data-command-surface="detail-management" data-command-mode="exploration">`;
    html += actionButton(app._label('ui.holdings', 'Holdings'), 'stats');
    if (unit !== app.player && !unit.mc) {
      if (app._getPartyLeader() !== unit) html += actionButton(app._label('party.makeLeader', 'Make Leader'), 'lead');
      html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${app._escapeHtml(app._label('party.duty', 'Duty'))}</span><select class="nav-btn" ${detailAttrs} data-command-control="set-companion-duty" aria-label="${app._escapeHtml(app._label('party.dutyFor', 'Duty for {name}', { name: unitName }))}" title="${app._escapeHtml(dutyDescription)}" onchange="event.stopPropagation();App.mobilePartyContextSetBehavior(${index},'duty',this.value)">${dutyOptions}</select><small>${app._escapeHtml(dutyDescription)}</small></label>`;
      html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${app._escapeHtml(app._label('party.stance', 'Stance'))}</span><select class="nav-btn" ${detailAttrs} data-command-control="set-companion-stance" aria-label="${app._escapeHtml(app._label('party.stanceFor', 'Stance for {name}', { name: unitName }))}" title="${app._escapeHtml(app._companionStanceDescription(behavior.stance))}" onchange="event.stopPropagation();App.mobilePartyContextSetBehavior(${index},'stance',this.value)">${stanceOptions}</select><small>${app._escapeHtml(app._companionStanceDescription(behavior.stance))}</small></label>`;
      html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${app._escapeHtml(app._label('party.control', 'Control'))}</span><select class="nav-btn" ${detailAttrs} data-command-control="set-companion-control" aria-label="${app._escapeHtml(app._label('party.controlFor', 'Control for {name}', { name: unitName }))}" title="${app._escapeHtml(app._companionControlDescription(behavior.control))}" onchange="event.stopPropagation();App.mobilePartyContextSetBehavior(${index},'control',this.value)">${controlOptions}</select><small>${app._escapeHtml(app._companionControlDescription(behavior.control))}</small></label>`;
      html += actionButton(app._label('party.dropOff', 'Drop Off'), 'dropoff');
      html += actionButton(app._label('party.dismiss', 'Dismiss'), 'dismiss', ' danger');
    }
    html += actionButton(app._label('ui.close', 'Close'), 'close');
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    const menu = document.getElementById('mobile-context-menu');
    YAW_INTENT_MENU.setUnderlyingInert(true);
    app._activateFocusTrap(menu, { close: () => app.closeMobileContextMenu() });
    app._activateOutsideContextDismiss(menu);
  },
  partyAction(app, action, index) {
    app._haptic(8);
    if (action === 'close') {
      app.closeMobileContextMenu();
      return;
    }
    app.closeMobileContextMenu();
    if (action === 'stats') return app.showPartyMemberStats(index);
    if (action === 'lead') return app.setPartyLeader(index);
    if (action === 'dropoff') return app.dropOffPartyMember(index);
    if (action === 'dismiss') return app.dismissPartyMember(index);
  },
  setPartyRole(app, index, role) {
    app._haptic(8);
    app.setPartyRole(index, role);
    if (app.party[index] && document.getElementById('mobile-context-menu')) {
      app.showMobilePartyContext(index);
    }
  },
  setPartyAIOrder(app, index, order) {
    app._haptic(8);
    app.setPartyAIOrder(index, order);
    if (app.party[index] && document.getElementById('mobile-context-menu')) {
      app.showMobilePartyContext(index);
    }
  },
  setBehavior(app, index, field, value) {
    app._haptic(8);
    if (field === 'duty') app.setCompanionDuty(index, value);
    if (field === 'stance') app.setCompanionStance(index, value);
    if (field === 'control') app.setCompanionControl(index, value);
    if (app.party[index] && document.getElementById('mobile-context-menu')) {
      app.showMobilePartyContext(index);
    }
  },
  showCreature(app, targetId) {
    const target = app._resolveCreatureRef(targetId);
    if (!target) return;
    if (app.combatState?.active) return false;
    app.toggleExplorationTarget('creature', app._explorationTargetUnitId('creature', target));
    return false;
  },
  creatureAction(app, action, targetId) {
    if (action === 'close') {
      app.closeMobileContextMenu();
      return false;
    }
    return app.selectIntent('creature', targetId, action, 'mobile-context');
  },
};

if (typeof window !== 'undefined') {
  window.YAW_MOBILE_CONTEXT_MENU = YAW_MOBILE_CONTEXT_MENU;
}
