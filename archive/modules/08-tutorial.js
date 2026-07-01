/**
 * FightFuckFeed.me - TUTORIAL Module
 * Interactive tutorial system for new players
 */

const TUTORIAL = (() => {
    // Tutorial steps
    const STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to FightFuckFeed.me',
            content: 'This is a pred-focused sandbox text adventure. Explore, encounter monstergirls, and grow stronger through consumption and relationships.',
            highlight: null,
            position: 'center'
        },
        {
            id: 'movement',
            title: 'Moving Around',
            content: 'Click the grid squares around you to move. The center shows your current location. You can move in 8 directions (including diagonals).',
            highlight: '#gridContainer',
            position: 'bottom'
        },
        {
            id: 'encounters',
            title: 'Encounters',
            content: 'When you move into a tile with enemies, you\'ll enter an encounter. You can Fight, Fuck (romance), Feed (consume), or Flee.',
            highlight: '#main',
            position: 'top'
        },
        {
            id: 'actions',
            title: 'Actions',
            content: 'During encounters, select actions from the action panel. Different actions have different outcomes based on your stats.',
            highlight: '#actions',
            position: 'top'
        },
        {
            id: 'saving',
            title: 'Saving Your Game',
            content: 'Use the wiki menu to save your progress. You have 3 save slots. The game also auto-saves periodically.',
            highlight: null,
            position: 'center'
        },
        {
            id: 'wiki',
            title: 'Wiki & Help',
            content: 'The built-in wiki contains information about species, mechanics, and your discovered content. Check it when you need help!',
            highlight: null,
            position: 'center'
        }
    ];
    
    let currentStep = 0;
    let isActive = false;
    let overlay = null;
    let tooltip = null;
    
    // Check if tutorial should show
    const shouldShow = () => {
        const completed = UTILS.storage.get('tutorialCompleted');
        const dismissed = UTILS.storage.get('tutorialDismissed');
        return !completed && !dismissed;
    };
    
    // Start tutorial
    const start = () => {
        if (isActive) return;
        currentStep = 0;
        isActive = true;
        createOverlay();
        showStep();
        STATE.emit('tutorialStart');
    };
    
    // Create overlay
    const createOverlay = () => {
        overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-tooltip">
                <div class="tutorial-header">
                    <h3 class="tutorial-title"></h3>
                    <button class="tutorial-close">&times;</button>
                </div>
                <div class="tutorial-content"></div>
                <div class="tutorial-progress">
                    <span class="tutorial-step-counter"></span>
                    <div class="tutorial-buttons">
                        <button class="tutorial-prev btn">Previous</button>
                        <button class="tutorial-next btnact">Next</button>
                        <button class="tutorial-skip btn">Skip Tutorial</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listeners
        overlay.querySelector('.tutorial-close').onclick = dismiss;
        overlay.querySelector('.tutorial-prev').onclick = prevStep;
        overlay.querySelector('.tutorial-next').onclick = nextStep;
        overlay.querySelector('.tutorial-skip').onclick = dismiss;
        
        // Close on backdrop click
        overlay.querySelector('.tutorial-backdrop').onclick = (e) => {
            if (e.target === e.currentTarget) dismiss();
        };
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);
    };
    
    // Handle keyboard
    const handleKeydown = (e) => {
        if (!isActive) return;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'Enter':
                nextStep();
                break;
            case 'ArrowLeft':
                prevStep();
                break;
            case 'Escape':
                dismiss();
                break;
        }
    };
    
    // Show current step
    const showStep = () => {
        const step = STEPS[currentStep];
        if (!step) {
            complete();
            return;
        }
        
        // Update content
        const title = overlay.querySelector('.tutorial-title');
        const content = overlay.querySelector('.tutorial-content');
        const counter = overlay.querySelector('.tutorial-step-counter');
        const prevBtn = overlay.querySelector('.tutorial-prev');
        const nextBtn = overlay.querySelector('.tutorial-next');
        
        title.textContent = step.title;
        content.innerHTML = step.content;
        counter.textContent = `Step ${currentStep + 1} of ${STEPS.length}`;
        
        // Update buttons
        prevBtn.disabled = currentStep === 0;
        prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
        
        if (currentStep === STEPS.length - 1) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }
        
        // Position and highlight
        positionTooltip(step);
        highlightElement(step.highlight);
        
        STATE.emit('tutorialStep', { step: currentStep, data: step });
    };
    
    // Position tooltip
    const positionTooltip = (step) => {
        const tooltip = overlay.querySelector('.tutorial-tooltip');
        
        if (step.position === 'center' || !step.highlight) {
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const target = document.querySelector(step.highlight);
        if (!target) {
            // Fall back to center
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        switch (step.position) {
            case 'bottom':
                tooltip.style.top = `${rect.bottom + 10}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'top':
                tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'left':
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
            case 'right':
                tooltip.style.top = `${rect.top + rect.height / 2}px`;
                tooltip.style.left = `${rect.right + 10}px`;
                tooltip.style.transform = 'translateY(-50%)';
                break;
        }
    };
    
    // Highlight element
    const highlightElement = (selector) => {
        // Remove existing highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (!selector) return;
        
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('tutorial-highlight');
        }
    };
    
    // Next step
    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            currentStep++;
            showStep();
        } else {
            complete();
        }
    };
    
    // Previous step
    const prevStep = () => {
        if (currentStep > 0) {
            currentStep--;
            showStep();
        }
    };
    
    // Dismiss tutorial
    const dismiss = () => {
        UTILS.storage.set('tutorialDismissed', true);
        cleanup();
        STATE.emit('tutorialDismiss');
    };
    
    // Complete tutorial
    const complete = () => {
        UTILS.storage.set('tutorialCompleted', true);
        UTILS.storage.set('tutorialVersion', '1.0');
        cleanup();
        
        // Show completion message
        UI.showToast('Tutorial completed! Check the wiki if you need help.', 'success', 5000);
        
        STATE.emit('tutorialComplete');
    };
    
    // Cleanup
    const cleanup = () => {
        isActive = false;
        document.removeEventListener('keydown', handleKeydown);
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    };
    
    // Reset tutorial (for testing)
    const reset = () => {
        UTILS.storage.remove('tutorialCompleted');
        UTILS.storage.remove('tutorialDismissed');
        UTILS.storage.remove('tutorialVersion');
        currentStep = 0;
    };
    
    // Get current step
    const getCurrentStep = () => currentStep;
    
    // Check if active
    const getIsActive = () => isActive;
    
    return {
        STEPS,
        shouldShow,
        start,
        nextStep,
        prevStep,
        dismiss,
        complete,
        reset,
        getCurrentStep,
        getIsActive
    };
})();

window.TUTORIAL = TUTORIAL;
