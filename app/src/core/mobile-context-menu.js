/**
 * Mobile context menus for party and creature cards.
 * Keeps mobile sheet rendering and action dispatch out of the core App surface.
 */
const YAW_MOBILE_CONTEXT_MENU = {
  showParty(app, index) {
    const unit = app.party[index];
    if (!unit) return;
    app.closeMobileContextMenu();
    const unitLabel = app._escapeHtml(unit.name || 'party member');
    const role = app._getPartyRole(unit);
    const order = app._getPartyAIOrder(unit);
    const commandControls = {
      stats: 'open-party-stats',
      lead: 'make-leader',
      dismiss: 'dismiss-party-member',
      close: 'close-detail-menu'
    };
    const detailAttrs = 'data-command-surface="detail-management" data-command-mode="exploration"';
    const actionButton = (label, action, extraClass = '') => {
      const exitAttr = action === 'close' ? ' data-command-slot="exit"' : '';
      return `<button class="action-btn${extraClass}" role="menuitem" ${detailAttrs} data-command-control="${app._escapeHtml(commandControls[action] || action)}"${exitAttr} title="${app._escapeHtml(label)}" aria-label="${app._escapeHtml(label)}" onclick="App.mobilePartyContextAction('${action}',${index})">${app._escapeHtml(label)}</button>`;
    };
    const roleOptions = Object.keys(app.PARTY_ROLES).map(key => `<option value="${key}" ${role === key ? 'selected' : ''}>${app._escapeHtml(app._partyRoleLabel(key))}</option>`).join('');
    const orderOptions = Object.keys(app.PARTY_AI_ORDERS).map(key => `<option value="${key}" ${order === key ? 'selected' : ''}>${app._escapeHtml(app._partyAIOrderLabel(key))}</option>`).join('');
    const menuLabel = app._label('ui.partyActions', 'Party actions');
    const roleLabel = app._label('party.role', 'Role');
    const orderLabel = app._label('party.aiOrder', 'AI Order');
    const roleAria = app._label('party.roleFor', 'Party role for {name}', { name: unit.name || 'party member' });
    const orderAria = app._label('party.aiOrderFor', 'AI order for {name}', { name: unit.name || 'party member' });
    const roleDescription = app._partyRoleDescription(role);
    const orderDescription = app._partyAIOrderDescription(order);
    let html = `<div class="mobile-context-menu" id="mobile-context-menu" role="dialog" aria-modal="true" aria-label="${app._escapeHtml(menuLabel)}" aria-labelledby="mobile-context-menu-title" data-command-surface="detail-management" data-command-mode="exploration"><div class="mobile-context-menu-title" id="mobile-context-menu-title">${unit.icon || ''} ${unitLabel}</div><div class="mobile-context-menu-actions" role="menu" data-command-surface="detail-management" data-command-mode="exploration">`;
    html += actionButton(app._label('ui.holdings', 'Holdings'), 'stats');
    if (unit !== app.player && !unit.mc) {
      if (app._getPartyLeader() !== unit) html += actionButton(app._label('party.makeLeader', 'Make Leader'), 'lead');
      html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${app._escapeHtml(roleLabel)}</span><select class="nav-btn" ${detailAttrs} data-command-control="set-party-role" aria-label="${app._escapeHtml(roleAria)}" title="${app._escapeHtml(roleDescription)}" onchange="event.stopPropagation();App.mobilePartyContextSetRole(${index},this.value)">${roleOptions}</select><small>${app._escapeHtml(roleDescription)}</small></label>`;
      html += `<label class="mobile-context-field" onclick="event.stopPropagation()"><span>${app._escapeHtml(orderLabel)}</span><select class="nav-btn" ${detailAttrs} data-command-control="set-party-ai-order" aria-label="${app._escapeHtml(orderAria)}" title="${app._escapeHtml(orderDescription)}" onchange="event.stopPropagation();App.mobilePartyContextSetAIOrder(${index},this.value)">${orderOptions}</select><small>${app._escapeHtml(orderDescription)}</small></label>`;
      html += actionButton(app._label('party.dismiss', 'Dismiss'), 'dismiss', ' danger');
    }
    html += actionButton(app._label('ui.close', 'Close'), 'close');
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    const menu = document.getElementById('mobile-context-menu');
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
