/**
 * FightFuckFeed.me - UI Module
 * Interface rendering, buttons, and display management
 */

const UI = (() => {
    // Element references (cached)
    const elements = {};
    
    // Cache DOM elements
    const init = () => {
        elements.gridContainer = document.getElementById('gridContainer');
        elements.status = document.getElementById('status');
        elements.main = document.getElementById('main');
        elements.actions = document.getElementById('actions');
        elements.log = document.getElementById('log');
        elements.canvas = document.getElementById('myCanvas');
    };
    
    // Button creation helpers
    const createButton = (text, onClick, className = 'btnavl') => {
        const btn = document.createElement('button');
        btn.className = className;
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    };
    
    // Wiki button (WBTN replacement)
    const WBTN = (text, link, selected, style = 'btnavl') => {
        if (selected) {
            style += ' btnact';
        }
        return `<button class="${style} interactive-item" onclick="HeaderSettings('${link}')" tabindex="0">${text}</button>`;
    };
    
    // Render status header
    const renderStatus = (text) => {
        if (elements.status) {
            elements.status.innerHTML = text;
        }
    };
    
    // Render main content
    const renderMain = (content) => {
        if (elements.main) {
            elements.main.innerHTML = content;
        }
    };
    
    // Render action buttons
    const renderActions = (actions) => {
        if (!elements.actions) return;
        
        elements.actions.innerHTML = '';
        
        if (Array.isArray(actions)) {
            actions.forEach(action => {
                const btn = createButton(action.text, action.onClick, action.className);
                elements.actions.appendChild(btn);
            });
        } else if (typeof actions === 'string') {
            elements.actions.innerHTML = actions;
        }
    };
    
    // Render log
    const renderLog = (message, type = 'info') => {
        if (!elements.log) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = message;
        
        elements.log.appendChild(entry);
        elements.log.scrollTop = elements.log.scrollHeight;
        
        // Limit log size
        while (elements.log.children.length > 100) {
            elements.log.removeChild(elements.log.firstChild);
        }
    };
    
    // Clear log
    const clearLog = () => {
        if (elements.log) {
            elements.log.innerHTML = '';
        }
    };
    
    // Map grid rendering
    const renderMapGrid = (visibleRange = 1) => {
        if (!elements.gridContainer) return;
        
        const party = STATE.getParty();
        if (!party) return;
        
        const container = elements.gridContainer;
        container.innerHTML = '';
        
        // Create 3x3 grid centered on player
        const directions = [
            { id: 'northwest', y: -1, x: -1 },
            { id: 'north', y: -1, x: 0 },
            { id: 'northeast', y: -1, x: 1 },
            { id: 'west', y: 0, x: -1 },
            { id: 'center', y: 0, x: 0 },
            { id: 'east', y: 0, x: 1 },
            { id: 'southwest', y: 1, x: -1 },
            { id: 'south', y: 1, x: 0 },
            { id: 'southeast', y: 1, x: 1 }
        ];
        
        // Add edge elements
        const edge = document.createElement('div');
        edge.className = 'grid-edge';
        container.appendChild(edge);
        
        directions.forEach(dir => {
            const tile = document.createElement('div');
            tile.id = `map_${dir.id}`;
            tile.className = dir.id === 'center' ? 'grid-item' : 'grid-item interactive-item';
            
            if (dir.id !== 'center') {
                tile.onclick = () => MAP.Walk(dir.y, dir.x);
            }
            
            const mapTile = MAP.GetMap(party.y + dir.y, party.x + dir.x);
            if (mapTile) {
                tile.style.backgroundColor = MAP.GetMapTileColor(party.y + dir.y, party.x + dir.x);
                if (mapTile.units?.length > 0) {
                    tile.textContent = '⚔️';
                }
            }
            
            container.appendChild(tile);
        });
    };
    
    // Draw minimap on canvas
    const DrawMiniMap = () => {
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const party = STATE.getParty();
        if (!party) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw area around player
        const range = 5;
        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                const tile = MAP.GetMap(party.y + y, party.x + x);
                if (tile && tile.discovered) {
                    const color = MAP.GetMapTileColor(party.y + y, party.x + x);
                    MAP.Draw(ctx, y + range, x + range, color);
                }
            }
        }
        
        // Draw player
        MAP.Draw(ctx, range, range, '#ff0000');
    };
    
    // Draw hostile/peaceful maps
    const DrawHostileMap = () => {
        // Highlight hostile areas
        DrawMiniMap();
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    const DrawPeaceMap = () => {
        // Highlight safe areas
        DrawMiniMap();
        const canvas = elements.canvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    // Modal/dialog system
    const showModal = (content, options = {}) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content ${options.className || ''}">
                ${options.title ? `<h3>${options.title}</h3>` : ''}
                <div class="modal-body">${content}</div>
                ${options.buttons ? `
                    <div class="modal-buttons">
                        ${options.buttons.map(btn => `
                            <button onclick="${btn.action}" class="${btn.className || 'btnavl'}">${btn.text}</button>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        return modal;
    };
    
    // Notification toast
    const showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };
    
    // Loading indicator
    const showLoading = (message = 'Loading...') => {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        loader.id = 'global-loader';
        document.body.appendChild(loader);
    };
    
    const hideLoading = () => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.remove();
    };
    
    return {
        init,
        createButton,
        WBTN,
        renderStatus,
        renderMain,
        renderActions,
        renderLog,
        clearLog,
        renderMapGrid,
        DrawMiniMap,
        DrawHostileMap,
        DrawPeaceMap,
        showModal,
        showToast,
        showLoading,
        hideLoading
    };
})();

window.UI = UI;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', UI.init);
