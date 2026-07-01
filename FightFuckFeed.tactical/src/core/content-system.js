
/**
 * CONTENT TEMPLATE SYSTEM
 * Preference-gated content with template literal rendering
 */

const CONTENT_SYSTEM = {
    // Content rating tiers
    TIERS: {
        SAFE: 0,      // Combat, exploration, no suggestive content
        MATURE: 1,    // Violence, suggestive themes, implied content
        ADULT: 2      // Explicit content (user must opt in)
    },
    
    // Default preferences - ADULT by default
    preferences: {
        maxTier: 2,           // Default: ADULT (show all content)
        voreEnabled: true,    // Vore enabled by default (core mechanic)
        explicitDescriptions: true,  // Explicit by default
        filterTags: []        // User can block specific tags if desired
    },
    
    // Template database (populated by modules)
    templates: {
        // Biome introductions
        biome: {
            forest: {
                safe: (ctx) => `You enter a dense forest. Sunlight filters through the canopy.`,
                mature: (ctx) => `The forest closes around you. Shadows dance between ancient trees. Something watches from the underbrush.`,
                adult: (ctx) => `The forest presses close, humid and thick with the scent of lust and danger. You feel eyes upon you, hungry and wanting.`
            },
            swamp: {
                safe: (ctx) => `A murky swamp stretches before you.`,
                mature: (ctx) => `The swamp waters are dark and still. Mist rises between cypress trees.`,
                adult: (ctx) => `The swamp is warm and wet. Something in the water brushes your leg...`
            },
            plains: {
                safe: (ctx) => `Open grasslands stretch to the horizon.`,
                mature: (ctx) => `Tall grasses sway in the breeze, hiding who knows what. The openness feels exposed.`,
                adult: (ctx) => `The open plains offer no cover for the pleasures or predations that may find you here.`
            },
            cave: {
                safe: (ctx) => `A dark cave entrance yawns before you.`,
                mature: (ctx) => `The cave mouth beckons, cool air washing over you. Distant drips echo in the darkness.`,
                adult: (ctx) => `The cave beckons, darkness promising privacy for whatever desires await within.`
            },
            jungle: {
                safe: (ctx) => `Dense jungle vegetation blocks your path.`,
                mature: (ctx) => `Vines hang like curtains in the humid air. The jungle is alive with unseen creatures.`,
                adult: (ctx) => `The jungle presses against you with wet heat. Vines brush against your skin suggestively.`
            },
            dungeon: {
                safe: (ctx) => `Stone corridors stretch into darkness.`,
                mature: (ctx) => `Iron-barred cells line the walls. The dungeon is cold and oppressive.`,
                adult: (ctx) => `Chains hang from the walls. The dungeon holds captives of many kinds...`
            },
            manor: {
                safe: (ctx) => `A grand manor stands before you.`,
                mature: (ctx) => `The manor's hallways echo with emptiness. Antique furniture gathers dust.`,
                adult: (ctx) => `The manor's bedroom doors stand ajar. Silk sheets and velvet cushions await.`
            },
            beach: {
                safe: (ctx) => `White sand stretches to the ocean.`,
                mature: (ctx) => `Waves lap against the shore. Palm trees sway overhead.`,
                adult: (ctx) => `The warm sand invites you to rest. The water is crystal clear and inviting.`
            },
            road: {
                safe: (ctx) => `A dirt road winds through the landscape.`,
                mature: (ctx) => `Wagon ruts mark the well-traveled path. A weathered signpost points onward.`,
                adult: (ctx) => `The road is lonely. A traveler might stop to share warmth and companionship.`
            },
            cliff: {
                safe: (ctx) => `Rocky outcrops tower above.`,
                mature: (ctx) => `The wind howls at your back. A narrow ledge skirts a dangerous drop.`,
                adult: (ctx) => `The dizzying height makes your heart race. Adrenaline courses through your veins.`
            },
            water: {
                safe: (ctx) => `A river rushes past.`,
                mature: (ctx) => `The water is cool and clear. Fish dart beneath the surface.`,
                adult: (ctx) => `The current pulls at your clothes. The water is warm and inviting...`
            },
            bridge: {
                safe: (ctx) => `A wooden bridge spans the gap.`,
                mature: (ctx) => `The bridge creaks beneath your feet. Rope rails sway in the wind.`,
                adult: (ctx) => `The bridge is precarious. You might need to hold someone close for safety...`
            },
            farm: {
                safe: (ctx) => `Barns and fields stretch to the horizon.`,
                mature: (ctx) => `A windmill turns lazily. Plowed earth shows recent work.`,
                adult: (ctx) => `The hayloft is warm and soft. The stable is private and secluded.`
            },
            indoors: {
                safe: (ctx) => `You enter a cozy building.`,
                mature: (ctx) => `Walls enclose the space. A hearth glows with dying embers.`,
                adult: (ctx) => `The room is warm and intimate. Furniture is arranged for closeness.`
            },
            entrance: {
                safe: (ctx) => `A dark entrance beckons.`,
                mature: (ctx) => `A cave mouth yawns in darkness. An ancient archway frames the way.`,
                adult: (ctx) => `The entrance is tight and dark. You must squeeze through to explore deeper...`
            }
        },
        
        // Encounter introductions
        encounter: {
            generic: {
                safe: (ctx) => `A ${ctx.species} stands before you.`,
                mature: (ctx) => `A ${ctx.species} blocks your path, looking ${ctx.mood || 'curious'}.`,
                adult: (ctx) => `A ${ctx.species} approaches, her intentions clear as she eyes you hungrily.`
            },
            predatory: {
                safe: (ctx) => `You sense danger nearby.`,
                mature: (ctx) => `${ctx.species} eyes you with hunger.`,
                adult: (ctx) => `${ctx.species} licks her lips, sizing you up as potential prey.`
            },
            predatory: {
                safe: (ctx) => `You sense danger nearby.`,
                mature: (ctx) => `${ctx.species} eyes you with hunger.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.species} licks their lips, sizing you up.` : null
            }
        },
        
        // Combat actions
        combat: {
            attack: {
                safe: (ctx) => `${ctx.attacker} strikes ${ctx.defender} for ${ctx.damage} damage!`,
                mature: (ctx) => `${ctx.attacker} ${ctx.verb || 'slams into'} ${ctx.defender}, dealing ${ctx.damage} damage!`,
                adult: (ctx) => ctx.explicit ? `${ctx.attacker} ${ctx.verb} ${ctx.defender} with brutal force!` : null
            },
            defeat: {
                safe: (ctx) => `${ctx.defender} is defeated.`,
                mature: (ctx) => `${ctx.defender} collapses, unable to continue fighting.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.defender} collapses, at your mercy.` : null
            }
        },
        
        // Action outcomes
        action: {
            flee: {
                safe: (ctx) => `You escape successfully.`,
                mature: (ctx) => `You manage to slip away into the ${ctx.terrain || 'wilderness'}.`,
                adult: null
            },
            consume: {
                safe: (ctx) => `You defeat ${ctx.target}.`,
                mature: (ctx) => `${ctx.target} is consumed. You feel stronger.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} slides down your throat, settling in your belly.` : null
            },
            seduce: {
                safe: (ctx) => `${ctx.target} agrees to join you.`,
                mature: (ctx) => `${ctx.target} is swayed by your charms and joins your party.`,
                adult: (ctx) => ctx.explicit ? `${ctx.target} submits to your advances.` : null
            }
        }
    },
    
    // Initialize from storage
    async init() {
        const saved = localStorage.getItem('fff-content-prefs');
        if (saved) {
            try {
                this.preferences = { ...this.preferences, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load content preferences:', e);
            }
        }
    },
    
    // Save preferences
    savePreferences() {
        localStorage.setItem('fff-content-prefs', JSON.stringify(this.preferences));
    },
    
    // Set max content tier
    setMaxTier(tier) {
        this.preferences.maxTier = tier;
        this.savePreferences();
    },
    
    // Toggle specific content
    toggleSetting(setting, value) {
        if (setting in this.preferences) {
            this.preferences[setting] = value !== undefined ? value : !this.preferences[setting];
            this.savePreferences();
        }
    },
    
    // Get content at appropriate tier
    getContent(templatePath, context = {}) {
        const parts = templatePath.split('.');
        const category = parts[0];
        const type = parts[1];
        const variant = parts[2] || 'default';
        
        // Try to get templates
        let templates = this.templates[category]?.[type]?.[variant];
        
        // Fallback to any available variant
        if (!templates && this.templates[category]?.[type]) {
            const variants = Object.keys(this.templates[category][type]);
            if (variants.length > 0) {
                templates = this.templates[category][type][variants[0]];
            }
        }
        
        if (!templates) {
            return `[Missing content: ${templatePath}]`;
        }
        
        // Try tiers - adult first (default), then fallbacks
        const tiers = ['adult', 'mature', 'safe'];
        const maxTier = this.preferences.maxTier;
        
        // If user has explicit enabled and adult exists, prefer it
        if (maxTier >= 2 && this.preferences.explicitDescriptions) {
            const adultTemplate = templates.adult;
            if (adultTemplate && typeof adultTemplate === 'function') {
                return adultTemplate(context);
            }
        }
        
        for (const tierName of tiers) {
            const tier = this.TIERS[tierName.toUpperCase()];
            
            // Skip if above max tier
            if (tier > maxTier) continue;
            
            // Skip if gated content not enabled
            if (tier === this.TIERS.ADULT) {
                if (templates === null) continue;
                if (context.voreEnabled && !this.preferences.voreEnabled) continue;
                if (context.explicit && !this.preferences.explicitDescriptions) continue;
            }
            
            // Get template function
            const template = templates[tierName];
            if (typeof template === 'function') {
                try {
                    return template(context);
                } catch (e) {
                    console.error(`Template error ${templatePath}:`, e);
                    continue;
                }
            }
        }
        
        // Fallback to safe
        const safeTemplate = templates.safe;
        if (typeof safeTemplate === 'function') {
            return safeTemplate(context);
        }
        
        return '[Content unavailable]';
    },
    
    // Quick content helpers
    biomeIntro(biome, context = {}) {
        return this.getContent(`biome.${biome}`, context);
    },
    
    encounter(species, context = {}) {
        return this.getContent(`encounter.generic`, { 
            species, 
            mood: context.mood || 'curious',
            ...context 
        });
    },
    
    combat(action, context = {}) {
        return this.getContent(`combat.${action}`, context);
    },
    
    actionResult(action, context = {}) {
        return this.getContent(`action.${action}`, context);
    },
    
    // Add custom templates from modules
    registerTemplate(category, type, variant, templates) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }
        if (!this.templates[category][type]) {
            this.templates[category][type] = {};
        }
        this.templates[category][type][variant] = templates;
    }
};

// Initialize
CONTENT_SYSTEM.init();

// Make available globally
window.CONTENT = CONTENT_SYSTEM;
