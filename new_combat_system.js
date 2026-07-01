// Combat System - Turn-based with Initiative Queue
combatState: {
    active: false,
    turnQueue: [],
    currentTurn: 0,
    round: 1
},

startCombat(enemies) {
    this.enemies = enemies;
    this.combatState.active = true;
    this.combatState.round = 1;
    
    const allCombatants = [
        ...this.party.map((u, i) => ({ ...u, index: i, type: 'ally' })),
        ...enemies.map((u, i) => ({ ...u, index: i, type: 'enemy' }))
    ];
    
    this.combatState.turnQueue = allCombatants
        .map(c => ({ ...c, initiative: (c.stats?.spd || 10) + Math.random() * 10 }))
        .sort((a, b) => b.initiative - a.initiative);
    
    this.combatState.currentTurn = 0;
    
    this.log.push({ 
        text: `Combat! Order: ${this.combatState.turnQueue.map(u => u.name).join(', ')}`,
        type: 'combat'
    });
    
    this.updateScene(`Round 1`, `Combat started!`, true);
    this.renderParty();
    this.renderEnemies();
    this.processTurn();
},

processTurn() {
    if (!this.combatState.active) return;
    
    const queue = this.combatState.turnQueue;
    const current = queue[this.combatState.currentTurn];
    
    if (!current || current.hp <= 0) {
        this.nextTurn();
        return;
    }
    
    document.getElementById('scene-title').textContent = 
        `Round ${this.combatState.round} - ${current.name}'s turn`;
    
    if (current.type === 'ally' && current.name === 'You') {
        this.showPlayerActions();
    } else if (current.type === 'ally') {
        this.allyTurn(current);
    } else {
        this.enemyTurn(current);
    }
},

showPlayerActions() {
    const canTargetEnemies = this.enemies.length > 0;
    const canTargetAllies = this.party.length > 1;
    
    let html = '';
    if (canTargetEnemies) {
        html += `<button class="action-btn primary" onclick="App.selectTarget('attack')">⚔️ Attack</button>`;
        html += `<button class="action-btn" onclick="App.selectTarget('seduce')">💕 Seduce</button>`;
        html += `<button class="action-btn" onclick="App.selectTarget('consume')">🍽️ Consume</button>`;
    }
    if (canTargetAllies) {
        html += `<button class="action-btn" onclick="App.showAllyMenu()">👥 Ally</button>`;
    }
    html += `<button class="action-btn" onclick="App.attemptFlee()">🏃 Flee</button>`;
    
    document.getElementById('scene-actions').innerHTML = html;
},

selectTarget(action) {
    let html = `<h3>Select target to ${action}</h3>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">`;
    
    this.enemies.forEach((e, i) => {
        if (e.hp <= 0) return;
        html += `<button class="option-card" onclick="App.executeAction('${action}', ${i})">`;
        html += `<div style="font-size:32px">${e.icon}</div>`;
        html += `<div style="color:var(--text-primary);font-weight:600">${e.name}</div>`;
        html += `<div style="color:var(--text-muted);font-size:12px">HP: ${e.hp}/${e.maxHp}</div>`;
        html += `</button>`;
    });
    
    html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.processTurn()">Cancel</button>`;
    document.getElementById('scene-description').innerHTML = html;
},

executeAction(action, enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return;
    
    const player = this.player;
    let result = '';
    
    switch(action) {
        case 'attack':
            const dmg = (player.stats?.str || 10) + Math.floor(Math.random() * 10);
            enemy.hp -= dmg;
            result = `You hit ${enemy.name} for ${dmg} damage!`;
            if (enemy.hp <= 0) {
                result += ` ${enemy.name} defeated!`;
                this.enemies = this.enemies.filter(e => e.hp > 0);
            }
            break;
        case 'seduce':
            const success = (player.stats?.cha || 10) + Math.random() * 10 > (enemy.stats?.wis || 10);
            if (success) {
                result = `${enemy.name} joins you!`;
                this.party.push({...enemy, hp: enemy.maxHp, tags: ['Lover']});
                this.enemies = this.enemies.filter(e => e !== enemy);
            } else {
                result = `${enemy.name} resists!`;
            }
            break;
        case 'consume':
            if (enemy.hp < enemy.maxHp * 0.3 || player.stats.str > enemy.stats.con) {
                result = `You devour ${enemy.name}!`;
                player.hp = Math.min(player.maxHp, player.hp + 20);
                player.stats.str += 1;
                this.enemies = this.enemies.filter(e => e !== enemy);
            } else {
                result = `${enemy.name} is too strong to consume!`;
            }
            break;
    }
    
    this.log.push({ text: result, type: 'combat' });
    this.renderLog();
    this.renderEnemies();
    this.renderParty();
    
    if (this.enemies.length === 0) {
        this.endCombat(true);
    } else {
        this.nextTurn();
    }
},

showAllyMenu() {
    let html = `<h3>Select Ally</h3>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">`;
    
    this.party.forEach((ally, i) => {
        if (ally.name === 'You') return;
        html += `<button class="option-card" onclick="App.allyAction(${i})">`;
        html += `<div style="font-size:32px">${ally.icon}</div>`;
        html += `<div style="color:var(--text-primary);font-weight:600">${ally.name}</div>`;
        html += `<div style="color:var(--text-muted);font-size:12px">HP: ${ally.hp}/${ally.maxHp}</div>`;
        html += `</button>`;
    });
    
    html += `</div><button class="nav-btn" style="margin-top:12px" onclick="App.processTurn()">Cancel</button>`;
    document.getElementById('scene-description').innerHTML = html;
},

allyAction(allyIndex) {
    const ally = this.party[allyIndex];
    if (!ally) return;
    
    let html = `<h3>Act on ${ally.name}</h3>`;
    html += `<div style="display:flex;flex-direction:column;gap:12px;">`;
    html += `<button class="action-btn" onclick="App.executeAllyAction('consume', ${allyIndex})">🍽️ Consume</button>`;
    html += `<button class="action-btn" onclick="App.executeAllyAction('seduce', ${allyIndex})">💕 Seduce</button>`;
    html += `<button class="action-btn" onclick="App.executeAllyAction('inspect', ${allyIndex})">👁️ Inspect</button>`;
    html += `<button class="nav-btn" style="margin-top:8px" onclick="App.showAllyMenu()">Back</button>`;
    html += `</div>`;
    document.getElementById('scene-description').innerHTML = html;
},

executeAllyAction(action, allyIndex) {
    const ally = this.party[allyIndex];
    if (!ally) return;
    
    let result = '';
    switch(action) {
        case 'consume':
            this.party.splice(allyIndex, 1);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
            this.player.stats.str += 2;
            result = `You consumed ${ally.name}. Power grows!`;
            break;
        case 'seduce':
            ally.tags = ally.tags.filter(t => !['Angry'].includes(t));
            ally.tags.push('Lover');
            result = `${ally.name} is devoted to you.`;
            break;
        case 'inspect':
            result = `${ally.name}: ${ally.species}, HP ${ally.hp}/${ally.maxHp}, STR ${ally.stats?.str}, SPD ${ally.stats?.spd}`;
            break;
    }
    
    this.log.push({ text: result, type: 'discovery' });
    this.renderLog();
    this.renderParty();
    
    if (this.combatState.active) this.nextTurn();
    else this.updateScene('Exploring', null, false);
},

allyTurn(ally) {
    if (this.enemies.length === 0) { this.nextTurn(); return; }
    const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const dmg = (ally.stats?.str || 8) + Math.floor(Math.random() * 8);
    target.hp -= dmg;
    
    this.log.push({ text: `${ally.name} attacks ${target.name} for ${dmg}!`, type: 'combat' });
    if (target.hp <= 0) {
        this.log.push({ text: `${target.name} defeated!`, type: 'combat' });
        this.enemies = this.enemies.filter(e => e.hp > 0);
    }
    
    this.renderEnemies();
    this.renderLog();
    
    if (this.enemies.length === 0) this.endCombat(true);
    else setTimeout(() => this.nextTurn(), 800);
},

enemyTurn(enemy) {
    const targets = this.party.filter(p => p.hp > 0);
    if (targets.length === 0) return;
    
    const target = targets[Math.random() < 0.7 || targets.length === 1 ? 0 : Math.floor(Math.random() * targets.length)];
    const roll = Math.random();
    let result = '';
    
    if (roll < 0.6) {
        const dmg = (enemy.stats?.str || 8) + Math.floor(Math.random() * 8);
        target.hp -= dmg;
        result = `${enemy.name} hits ${target.name} for ${dmg}!`;
    } else if (roll < 0.8) {
        const dmg = Math.floor((enemy.stats?.str || 8) * 1.2);
        target.hp -= dmg;
        result = `${enemy.name} grapples ${target.name} for ${dmg}!`;
    } else {
        result = `${enemy.name} circles ${target.name}.`;
    }
    
    this.log.push({ text: result, type: 'combat' });
    
    if (target.hp <= 0) {
        if (target.name === 'You') {
            this.log.push({ text: 'You fall! Game Over!', type: 'combat' });
            setTimeout(() => { if (confirm('Game Over?')) location.reload(); }, 1000);
            return;
        } else {
            this.log.push({ text: `${target.name} falls!`, type: 'combat' });
            this.party = this.party.filter(p => p.name !== target.name);
        }
    }
    
    this.renderParty();
    this.renderLog();
    
    setTimeout(() => this.nextTurn(), 800);
},

nextTurn() {
    this.combatState.currentTurn++;
    if (this.combatState.currentTurn >= this.combatState.turnQueue.length) {
        this.combatState.currentTurn = 0;
        this.combatState.round++;
        this.log.push({ text: `--- Round ${this.combatState.round} ---`, type: 'combat' });
    }
    this.processTurn();
},

endCombat(victory) {
    this.combatState.active = false;
    this.combatState.turnQueue = [];
    this.combatState.currentTurn = 0;
    if (victory) {
        this.log.push({ text: 'Victory!', type: 'discovery' });
        this.updateScene('Victory', 'Enemies defeated!', false);
    }
    this.renderLog();
    this.showExplorationActions();
},

showExplorationActions() {
    document.getElementById('scene-actions').innerHTML = `
        <button class="action-btn" onclick="App.explore()"><span class="action-icon">🔍</span>Explore</button>
        <button class="action-btn" onclick="App.rest()"><span class="action-icon">🏕️</span>Rest</button>
    `;
    document.getElementById('scene-description').textContent = 'You travel through the wilderness...';
},
