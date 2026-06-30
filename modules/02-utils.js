/**
 * FightFuckFeed.me - UTILS Module
 * Utility functions and helpers
 */

const UTILS = (() => {
    // ID generation
    let idCounter = 0;
    const NewID = () => ++idCounter;
    
    // Random utilities
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomBool = (probability = 0.5) => Math.random() < probability;
    
    // String utilities
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const formatText = (template, ...values) => {
        return template.replace(/\{(\d+)\}/g, (match, index) => values[index] ?? match);
    };
    
    // Array utilities
    const shuffle = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    
    // Debounce for performance
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    
    // Throttle for performance
    const throttle = (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    // LocalStorage with error handling
    const storage = {
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage get error:', e);
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Storage set error:', e);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Storage remove error:', e);
                return false;
            }
        }
    };
    
    // Date/time utilities
    const getEasterDate = (year) => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    };
    
    // Validation utilities
    const isValidCoordinate = (x, y) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y);
    const isInBounds = (x, y, width, height) => x >= 0 && x < width && y >= 0 && y < height;
    
    return {
        NewID,
        randomInt,
        randomChoice,
        randomBool,
        capitalize,
        formatText,
        shuffle,
        debounce,
        throttle,
        storage,
        getEasterDate,
        isValidCoordinate,
        isInBounds
    };
})();

window.UTILS = UTILS;
