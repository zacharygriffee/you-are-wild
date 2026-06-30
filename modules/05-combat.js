/**
 * FightFuckFeed.me - COMBAT Module
 * Battle system, actions, and encounter handling
 */

const COMBAT = (() => {
    // Action types
    const ACTIONS = {
        FIGHT: 'fight',
        FUCK: 'fuck',
        FEED: 'feed',
        FLEE: 'flee',
        TALK: 'talk'
    };
    
    // Current encounter state
    let currentEncounter = null;
    
    // Select dom/sub for encounter
    const SelectDom = (entry) => {
        STATE.set('pick1', entry);
        STATE.emit('domSelected', entry);
    };
    
    const SelectSub = (entry) => {
        STATE.set('pick2', entry);
        STATE.emit('subSelected', entry);
    };
    
    // Select primary action
    const SelectAction = (entry) => {
        STATE.set('action', entry);
        
        const actionMap = {
            'fight': ACTIONS.FIGHT,
            'fuck': ACTIONS.FUCK,
            'feed': ACTIONS.FEED,
            'flee': ACTIONS.FLEE,
            'talk': ACTIONS.TALK
        };
        
        const action = actionMap[entry] ?? entry;
        STATE.emit('actionSelected', action);
        
        // Process immediate actions
        if (action === ACTIONS.FLEE) {
            attemptFlee();
        }
    };
    
    // Select secondary action
    const SelectAction2 = (entry) => {
        STATE.set('action2', entry);
        STATE.emit('action2Selected', entry);
    };
    
    // Lethal check for dangerous actions
    const LethalCheck = (dom) => {
        const encounter = STATE.getEncounter();
        if (!encounter) return false;
        
        // Check if action would be lethal
        const isLethal = encounter.lethal || dom?.lethal;
        
        if (isLethal) {
            STATE.emit('lethalWarning', { dom, encounter });
        }
        
        return isLethal;
    };
    
    const CheckActionTwo = () => {
        const action2 = STATE.get('action2');
        return action2 !== -1 && action2 !== '';
    };
    
    const RenderActionTwo = () => {
        // Render secondary action options
        const action2 = STATE.get('action2');
        return {
            selected: action2,
            canConfirm: CheckActionTwo()
        };
    };
    
    // Feeding mechanics
    const CanNommed = (pick1, pick2) => {
        if (pick1 === -1 || pick2 === -1) return false;
        
        const party = STATE.getParty();
        const units = party.units;
        
        if (!units[pick1] || !units[pick2]) return false;
        
        // Check size/power difference
        const dom = units[pick1];
        const sub = units[pick2];
        
        return dom.Feed >= sub.size && dom.willing !== 'NEVER';
    };
    
    const CanCocked = (pick1, pick2) => {
        if (pick1 === -1 || pick2 === -1) return false;
        
        const party = STATE.getParty();
        const units = party.units;
        
        if (!units[pick1] || !units[pick2]) return false;
        
        const dom = units[pick1];
        const sub = units[pick2];
        
        return dom.male && dom.cocksize >= sub.size && dom.willing !== 'NEVER';
    };
    
    // Attempt to flee
    const attemptFlee = () => {
        const encounter = STATE.getEncounter();
        const party = STATE.getParty();
        
        // Flee chance based on speed comparison
        const partySpeed = party.units[0]?.speed ?? 5;
        const enemySpeed = encounter.hostile?.speed ?? 5;
        
        const fleeChance = 0.5 + (partySpeed - enemySpeed) * 0.1;
        const success = Math.random() < fleeChance;
        
        if (success) {
            STATE.emit('fleeSuccess', { encounter });
            endEncounter();
        } else {
            STATE.emit('fleeFail', { encounter });
            // Enemy gets free attack
        }
        
        return success;
    };
    
    // Execute combat action
    const executeAction = () => {
        const action = STATE.get('action');
        const pick1 = STATE.get('pick1');
        const pick2 = STATE.get('pick2');
        
        const result = {
            action,
            pick1,
            pick2,
            success: false,
            message: ''
        };
        
        switch (action) {
            case ACTIONS.FIGHT:
                result.success = executeFight(pick1, pick2);
                break;
            case ACTIONS.FUCK:
                result.success = executeFuck(pick1, pick2);
                break;
            case ACTIONS.FEED:
                result.success = executeFeed(pick1, pick2);
                break;
            case ACTIONS.TALK:
                result.success = executeTalk(pick1, pick2);
                break;
        }
        
        STATE.emit('actionExecuted', result);
        return result;
    };
    
    const executeFight = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        if (!dom || !sub) return false;
        
        // Combat calculation
        const damage = Math.max(1, dom.attack - (sub.defense ?? 0));
        sub.hp = (sub.hp ?? 10) - damage;
        
        if (sub.hp <= 0) {
            // Defeated
            STATE.emit('unitDefeated', { winner: dom, loser: sub });
        }
        
        return true;
    };
    
    const executeFuck = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        if (!dom || !sub) return false;
        
        // Relationship mechanics
        sub.relationship = (sub.relationship ?? 0) + 1;
        dom.fuckValue = (dom.fuckValue ?? 0) + CONFIG.fuckValue;
        
        STATE.emit('relationshipImproved', { dom, sub });
        
        return true;
    };
    
    const executeFeed = (domIdx, subIdx) => {
        if (!CanNommed(domIdx, subIdx)) return false;
        
        const party = STATE.getParty();
        const dom = party.units[domIdx];
        const sub = party.units[subIdx];
        
        // Remove sub from party
        party.units.splice(subIdx, 1);
        
        // Buff dom
        dom.Feed = (dom.Feed ?? 0) + CONFIG.eatValue;
        dom.fullness = (dom.fullness ?? 0) + sub.size;
        
        STATE.emit('unitConsumed', { predator: dom, prey: sub });
        
        return true;
    };
    
    const executeTalk = (domIdx, subIdx) => {
        const party = STATE.getParty();
        const sub = party.units[subIdx];
        
        if (!sub) return false;
        
        // Dialogue system
        const dialogue = generateDialogue(sub);
        STATE.emit('dialogue', { speaker: sub, text: dialogue });
        
        return true;
    };
    
    const generateDialogue = (unit) => {
        const lines = [
            `${unit.name} looks at you curiously.`,
            `"Greetings, traveler," ${unit.name} says.`,
            `${unit.name} seems ${UTILS.randomChoice(['friendly', 'cautious', 'interested'])}.`,
        ];
        return UTILS.randomChoice(lines);
    };
    
    // Start encounter
    const startEncounter = (encounterData) => {
        currentEncounter = encounterData;
        STATE.set('E', encounterData);
        STATE.set('pick1', -1);
        STATE.set('pick2', -1);
        STATE.set('action', -1);
        STATE.set('action2', -1);
        
        STATE.emit('encounterStart', encounterData);
    };
    
    // End encounter
    const endEncounter = () => {
        currentEncounter = null;
        STATE.set('E', {});
        STATE.emit('encounterEnd');
    };
    
    return {
        ACTIONS,
        SelectDom,
        SelectSub,
        SelectAction,
        SelectAction2,
        LethalCheck,
        CheckActionTwo,
        RenderActionTwo,
        CanNommed,
        CanCocked,
        executeAction,
        executeFight,
        executeFuck,
        executeFeed,
        executeTalk,
        attemptFlee,
        startEncounter,
        endEncounter
    };
})();

window.COMBAT = COMBAT;
