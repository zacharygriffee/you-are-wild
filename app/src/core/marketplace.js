
/**
 * BUILT-IN CONTENT PACK HANDLES
 * Registers baseline content and optional local packs behind content-policy checks.
 * The sample module catalog lives in src/ui/market-screen.js.
 */

// Base Game Content Pack (included by default)
const BASE_CONTENT_PACK = {
    manifest: {
        id: 'content_base_game',
        name: 'Core World',
        version: '1.0.0',
        author: 'You Are Wild Team',
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
            adult: null
        });
        
        // Combat outcomes
        CONTENT.registerTemplate('combat', 'grapple', 'default', {
            safe: (ctx) => `${ctx.attacker} grabs ${ctx.defender}.`,
            mature: (ctx) => `${ctx.attacker} wrestles with ${ctx.defender}, trying to overpower them.`,
            adult: null
        });
        
        console.log('Base content pack installed');
    }
};

// Species Flavor Pack
const SPECIES_FLAVOR_PACK = {
    manifest: {
        id: 'content_species_flavor',
        name: 'Species Flavor Text',
        version: '1.0.0',
        author: 'You Are Wild Team',
        description: 'Optional species-specific encounter descriptions',
        type: 'content_pack',
        contentRating: 'MATURE'
    },
    
    install() {
        // Naga-specific content
        CONTENT.registerTemplate('species', 'naga', 'encounter', {
            safe: (ctx) => `A naga slithers into view, serpentine lower body coiling.`,
            mature: (ctx) => `The naga's tail circles lazily, upper body poised and predatory. She assesses you with calculating eyes.`,
            adult: null
        });
        
        // Dragon-specific content
        CONTENT.registerTemplate('species', 'dragon', 'encounter', {
            safe: (ctx) => `A dragon lands before you, wings folding.`,
            mature: (ctx) => `Heat radiates from the dragon as she settles, ancient eyes weighing your worth.`,
            adult: null
        });
        
        // Slime-specific content
        CONTENT.registerTemplate('species', 'slime', 'encounter', {
            safe: (ctx) => `A slime creature bubbles into form.`,
            mature: (ctx) => `The slime shifts, forming a curvaceous shape as it advances.`,
            adult: null
        });
        
        console.log('Species flavor pack installed');
    }
};

function contentPackRatingTier(contentRating) {
    return { safe: 0, mature: 1, adult: 2 }[String(contentRating || 'safe').trim().toLowerCase()] ?? 0;
}

function currentContentPackPolicy() {
    if (typeof CONTENT === 'undefined' || !CONTENT?.preferences) {
        return { maxTier: 0, explicitDescriptions: false };
    }
    return {
        maxTier: Math.max(0, Math.min(2, Number(CONTENT.preferences.maxTier) || 0)),
        explicitDescriptions: !!CONTENT.preferences.explicitDescriptions
    };
}

function contentPackBlockReason(pack) {
    const manifest = pack?.manifest || {};
    if (manifest.isCore) return null;

    const rating = String(manifest.contentRating || 'safe').trim().toLowerCase();
    const requiredTier = contentPackRatingTier(rating);
    const policy = currentContentPackPolicy();
    if (requiredTier > policy.maxTier) {
        return `Content pack rating ${rating} requires a higher content tier`;
    }
    if (rating === 'adult' && !policy.explicitDescriptions) {
        return 'Content pack rating adult requires explicit descriptions to be enabled';
    }
    return null;
}

function installContentPack(pack) {
    const reason = contentPackBlockReason(pack);
    if (reason) throw new Error(reason);
    pack.install();
    return { ...pack.manifest };
}

function contentPackHandle(pack) {
    return {
        manifest: { ...pack.manifest },
        canInstall() {
            return contentPackBlockReason(pack) === null;
        },
        blockReason() {
            return contentPackBlockReason(pack);
        },
        install() {
            return installContentPack(pack);
        }
    };
}

// Install base content automatically
installContentPack(BASE_CONTENT_PACK);

// Make packs available for manual install
window.CONTENT_PACKS = {
    base: contentPackHandle(BASE_CONTENT_PACK),
    species: contentPackHandle(SPECIES_FLAVOR_PACK),
    install(packId) {
        const pack = {
            base: BASE_CONTENT_PACK,
            species: SPECIES_FLAVOR_PACK
        }[packId];
        if (!pack) throw new Error(`Unknown content pack: ${packId}`);
        return installContentPack(pack);
    }
};
