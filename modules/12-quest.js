/**
 * FightFuckFeed.me - QUEST Module
 * Quest system with objectives and tracking
 */

const QUEST = (() => {
    // Quest types
    const TYPES = {
        EXPLORATION: 'exploration',
        COMBAT: 'combat',
        COLLECTION: 'collection',
        RELATIONSHIP: 'relationship'
    };
    
    // Active quests
    let activeQuests = [];
    let completedQuests = [];
    
    // Initialize
    const init = () => {
        loadQuests();
        STATE.on('move', checkExplorationQuests);
        STATE.on('encounterEnd', checkCombatQuests);
        STATE.on('relationshipImproved', checkRelationshipQuests);
    };
    
    // Load quests from save
    const loadQuests = () => {
        const data = UTILS.storage.get('questData');
        if (data) {
            activeQuests = data.active || [];
            completedQuests = data.completed || [];
        }
    };
    
    // Save quests
    const saveQuests = () => {
        UTILS.storage.set('questData', {
            active: activeQuests,
            completed: completedQuests
        });
    };
    
    // Generate a new quest
    const generateQuest = (type = null) => {
        if (!type) {
            type = UTILS.randomChoice(Object.values(TYPES));
        }
        
        const templates = {
            [TYPES.EXPLORATION]: [
                { title: 'Explorer', desc: 'Discover 5 new tiles', target: 5, current: 0 },
                { title: 'Cartographer', desc: 'Visit a Cave', target: 1, current: 0 },
                { title: 'Jungle Trek', desc: 'Explore the Jungle', target: 1, current: 0 }
            ],
            [TYPES.COMBAT]: [
                { title: 'Hunter', desc: 'Win 3 battles', target: 3, current: 0 },
                { title: 'Predator', desc: 'Consume 5 enemies', target: 5, current: 0 },
                { title: 'Survivor', desc: 'Survive 10 encounters', target: 10, current: 0 }
            ],
            [TYPES.COLLECTION]: [
                { title: 'Collector', desc: 'Recruit 3 allies', target: 3, current: 0 },
                { title: 'Diverse Party', desc: 'Have 5 different species', target: 5, current: 0 }
            ],
            [TYPES.RELATIONSHIP]: [
                { title: 'Charmer', desc: 'Romance 3 characters', target: 3, current: 0 },
                { title: 'Companion', desc: 'Max relationship with 1 ally', target: 1, current: 0 }
            ]
        };
        
        const template = UTILS.randomChoice(templates[type]);
        const quest = {
            id: UTILS.NewID(),
            type,
            ...template,
            rewards: { exp: template.target * 10 },
            accepted: Date.now()
        };
        
        activeQuests.push(quest);
        saveQuests();
        
        UI.showToast(`New Quest: ${quest.title}`, 'info', 3000);
        STATE.emit('questAccepted', quest);
        
        return quest;
    };
    
    // Update quest progress
    const updateProgress = (type, amount = 1) => {
        let updated = false;
        
        activeQuests.forEach(quest => {
            if (quest.type === type && quest.current < quest.target) {
                quest.current = Math.min(quest.current + amount, quest.target);
                updated = true;
                
                if (quest.current >= quest.target) {
                    completeQuest(quest);
                }
            }
        });
        
        if (updated) saveQuests();
    };
    
    // Complete a quest
    const completeQuest = (quest) => {
        activeQuests = activeQuests.filter(q => q.id !== quest.id);
        quest.completed = Date.now();
        completedQuests.push(quest);
        
        saveQuests();
        UI.showToast(`Quest Complete: ${quest.title}! +${quest.rewards.exp} EXP`, 'success', 5000);
        STATE.emit('questCompleted', quest);
    };
    
    // Check quest triggers
    const checkExplorationQuests = () => updateProgress(TYPES.EXPLORATION);
    const checkCombatQuests = () => updateProgress(TYPES.COMBAT);
    const checkRelationshipQuests = () => updateProgress(TYPES.RELATIONSHIP);
    
    // Get active quests
    const getActive = () => activeQuests;
    const getCompleted = () => completedQuests;
    
    // Render quest log
    const renderQuestLog = () => {
        let html = '<div class="quest-log">';
        
        if (activeQuests.length === 0) {
            html += '<p>No active quests. Visit a town to find new ones!</p>';
        } else {
            html += '<h3>Active Quests</h3><ul>';
            activeQuests.forEach(q => {
                const percent = (q.current / q.target) * 100;
                html += `<li>
                    <strong>${q.title}</strong>: ${q.desc}
                    <div class="quest-progress">
                        <div class="quest-bar" style="width: ${percent}%"></div>
                        <span>${q.current}/${q.target}</span>
                    </div>
                </li>`;
            });
            html += '</ul>';
        }
        
        if (completedQuests.length > 0) {
            html += `<h3>Completed (${completedQuests.length})</h3>`;
        }
        
        html += '</div>';
        return html;
    };
    
    return {
        TYPES,
        init,
        generateQuest,
        updateProgress,
        completeQuest,
        getActive,
        getCompleted,
        renderQuestLog
    };
})();

window.QUEST = QUEST;
