
/**
 * EXAMPLE CONTENT PACKS
 * Demonstrating tiered content system
 */

// Base Game Content Pack (included by default)
const BASE_CONTENT_PACK = {
    manifest: {
        id: 'content_base_game',
        name: 'Core World',
        version: '1.0.0',
        author: 'FFFme Team',
        description: 'Base biomes, encounters, and content',
        type: 'content_pack',
        contentRating: 'MATURE',
        isCore: true
    },
    
    install() {
        // Biome introductions
        CONTENT.registerTemplate('biome', 'jungle', 'default', {
            safe: (ctx) => `Dense jungle surrounds you. Vines hang from towering trees.`,
            mature: (ctx) => `The jungle presses close, humid and alive. Something moves in the canopy above.`,
            adult: null
        });
        
        CONTENT.registerTemplate('biome', 'swamp', 'default', {
            safe: (ctx) => `Murky waters stretch through twisted trees.`,
            mature: (ctx) => `The swamp exhales mist. Unseen creatures ripple the surface.`,
            adult: null
        });
        
        // Encounter types
        CONTENT.registerTemplate('encounter', 'ambush', 'default', {
            safe: (ctx) => `${ctx.species} attacks by surprise!`,
            mature: (ctx) => `A ${ctx.species} lunges from ${ctx.hidingSpot || 'the shadows'}!`,
            adult: (ctx) => ctx.explicit ? `${ctx.species} pounces, pinning you!` : null
        });
        
        // Combat outcomes
        CONTENT.registerTemplate('combat', 'grapple', 'default', {
            safe: (ctx) => `${ctx.attacker} grabs ${ctx.defender}.`,
            mature: (ctx) => `${ctx.attacker} wrestles with ${ctx.defender}, trying to overpower them.`,
            adult: (ctx) => ctx.voreEnabled ? `${ctx.attacker} wraps around ${ctx.defender}, constricting tight.` : null
        });
        
        console.log('Base content pack installed');
    }
};

// Extended Adult Content Pack (optional)
const ADULT_CONTENT_PACK = {
    manifest: {
        id: 'content_adult_extended',
        name: 'Extended Descriptions',
        version: '1.0.0',
        author: 'Community',
        description: 'Additional explicit content for adult players',
        type: 'content_pack',
        contentRating: 'ADULT',
        requiresOptIn: ['explicitDescriptions', 'voreEnabled']
    },
    
    install() {
        // These only render if user opts in
        
        CONTENT.registerTemplate('action', 'consume', 'detailed', {
            safe: null,  // Don\'t override
            mature: null,
            adult: (ctx) => ctx.voreEnabled ? 
                `${ctx.target} slips past your jaws, sliding down your throat in one smooth motion. You feel them settle in your stomach, becoming part of you.` : null
        });
        
        CONTENT.registerTemplate('action', 'seduce', 'detailed', {
            safe: null,
            mature: null,
            adult: (ctx) => ctx.explicit ? 
                `You draw ${ctx.target} close, your intentions clear. They melt into your embrace, submitting completely.` : null
        });
        
        CONTENT.registerTemplate('encounter', 'intimate', 'default', {
            safe: null,
            mature: null,
            adult: (ctx) => ctx.explicit ? 
                `The ${ctx.species} approaches with obvious interest, their gaze lingering on your form.` : null
        });
        
        console.log('Adult content pack installed');
    }
};

// Species Flavor Pack
const SPECIES_FLAVOR_PACK = {
    manifest: {
        id: 'content_species_flavor',
        name: 'Species Flavor Text',
        version: '1.0.0',
        author: 'Community',
        description: 'Unique descriptions for each species type',
        type: 'content_pack',
        contentRating: 'MATURE'
    },
    
    install() {
        // Naga-specific content
        CONTENT.registerTemplate('species', 'naga', 'encounter', {
            safe: (ctx) => `A naga slithers into view, serpentine lower body coiling.`,
            mature: (ctx) => `The naga's tail circles lazily, upper body poised and predatory. She assesses you with calculating eyes.`,
            adult: (ctx) => ctx.explicit ? `The naga's forked tongue flickers, tasting your scent on the air. Her coils tighten with interest.` : null
        });
        
        // Dragon-specific content
        CONTENT.registerTemplate('species', 'dragon', 'encounter', {
            safe: (ctx) => `A dragon lands before you, wings folding.`,
            mature: (ctx) => `Heat radiates from the dragon as she settles, ancient eyes weighing your worth.`,
            adult: (ctx) => ctx.explicit ? `The dragon's muscular form looms, tail curling possessively around her territory.` : null
        });
        
        // Slime-specific content
        CONTENT.registerTemplate('species', 'slime', 'encounter', {
            safe: (ctx) => `A slime creature bubbles into form.`,
            mature: (ctx) => `The slime shifts, forming a curvaceous shape as it advances.`,
            adult: (ctx) => ctx.explicit ? `The slime's translucent body molds into inviting shapes, ready to envelop.` : null
        });
        
        console.log('Species flavor pack installed');
    }
};

// Install base content automatically
BASE_CONTENT_PACK.install();

// Make packs available for manual install
window.CONTENT_PACKS = {
    base: BASE_CONTENT_PACK,
    adult: ADULT_CONTENT_PACK,
    species: SPECIES_FLAVOR_PACK
};
