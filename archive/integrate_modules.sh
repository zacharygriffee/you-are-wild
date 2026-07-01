#!/bin/bash

# Find line number of "//RAND-END"
RAND_END_LINE=$(grep -n "//RAND-END" FightFuckFeed.me.html | tail -1 | cut -d: -f1)

echo "Found RAND-END at line $RAND_END_LINE"

# Create insertion point (before RAND-END)
INSERT_LINE=$((RAND_END_LINE - 1))

# Create temp file with modules
cat > /tmp/modules_to_insert.js << 'MODULECONTENT'

// =============================================
// MODULAR ARCHITECTURE - Loaded modules
// =============================================

// Module loader ensures all modules are available
const MODULE_LOADER = {
    loaded: [],
    
    init: function() {
        // Initialize all modules in order
        if (typeof CONFIG !== 'undefined') this.loaded.push('CONFIG');
        if (typeof UTILS !== 'undefined') this.loaded.push('UTILS');
        if (typeof STATE !== 'undefined') {
            this.loaded.push('STATE');
            // Initialize state system
            console.log('State module loaded');
        }
        if (typeof MAP !== 'undefined') {
            this.loaded.push('MAP');
            console.log('Map module loaded');
        }
        if (typeof COMBAT !== 'undefined') {
            this.loaded.push('COMBAT');
            console.log('Combat module loaded');
        }
        if (typeof UI !== 'undefined') {
            this.loaded.push('UI');
            // Initialize UI
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => UI.init());
            } else {
                UI.init();
            }
        }
        if (typeof SAVE !== 'undefined') {
            this.loaded.push('SAVE');
            console.log('Save module loaded');
        }
        if (typeof TUTORIAL !== 'undefined') {
            this.loaded.push('TUTORIAL');
            // Check if tutorial should show
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    if (TUTORIAL.shouldShow()) {
                        setTimeout(() => TUTORIAL.start(), 1000);
                    }
                });
            } else if (TUTORIAL.shouldShow()) {
                setTimeout(() => TUTORIAL.start(), 1000);
            }
        }
        if (typeof SAVE_UI !== 'undefined') {
            this.loaded.push('SAVE_UI');
        }
        if (typeof KEYBOARD !== 'undefined') {
            this.loaded.push('KEYBOARD');
            KEYBOARD.init();
        }
        if (typeof QUEST !== 'undefined') {
            this.loaded.push('QUEST');
            QUEST.init();
        }
        
        console.log('Modules loaded:', this.loaded.join(', '));
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => MODULE_LOADER.init());

MODULECONTENT

# Insert modules before RAND-END
head -n $INSERT_LINE FightFuckFeed.me.html > /tmp/fff_new.html
cat /tmp/modules_to_insert.js >> /tmp/fff_new.html
tail -n +$RAND_END_LINE FightFuckFeed.me.html >> /tmp/fff_new.html

# Replace original
mv /tmp/fff_new.html FightFuckFeed.me.html

echo "Modules integrated successfully"
echo "New file size: $(wc -l < FightFuckFeed.me.html) lines"
