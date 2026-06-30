/**
 * FightFuckFeed.me - Module Loader
 * Loads all IIFE modules in correct order
 */

// Module loading order:
// 1. CONFIG - Constants and configuration
// 2. UTILS - Helper functions
// 3. STATE - State management
// 4. MAP - World and navigation
// 5. COMBAT - Battle system
// 6. UI - Interface rendering
// 7. SAVE - Persistence

console.log('FFFme Modules Loaded:');
console.log('- CONFIG: Game constants');
console.log('- UTILS: Helper functions');
console.log('- STATE: State management');
console.log('- MAP: World generation');
console.log('- COMBAT: Battle system');
console.log('- UI: Interface rendering');
console.log('- SAVE: Save/load system');

// Global error handler for module errors
window.addEventListener('error', (e) => {
    if (e.message?.includes('CONFIG') || 
        e.message?.includes('UTILS') || 
        e.message?.includes('STATE') ||
        e.message?.includes('MAP') ||
        e.message?.includes('COMBAT') ||
        e.message?.includes('UI') ||
        e.message?.includes('SAVE')) {
        console.error('Module Error:', e.message);
    }
});
