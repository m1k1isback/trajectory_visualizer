/**
 * ThemeManager.js - Переключение между тёмной и светлой темами
 */

const ThemeManager = {
    STORAGE_KEY: 'theme-preference',
    currentTheme: 'dark',
    
    init: function() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === 'light') {
            this.applyTheme('light');
        } else {
            this.applyTheme('dark');
        }
    },
    
    toggle: function() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        localStorage.setItem(this.STORAGE_KEY, newTheme);
        
        if (window.TabManager) {
            TabManager.logToConsole('Тема изменена: ' + (newTheme === 'dark' ? 'тёмная' : 'светлая'));
        }
    },
    
    applyTheme: function(theme) {
        this.currentTheme = theme;
        
        const body = document.body;
        const toggleBtn = document.getElementById('theme-toggle');
        
        if (theme === 'light') {
            body.classList.add('light-theme');
            if (toggleBtn) toggleBtn.textContent = '☀️';
        } else {
            body.classList.remove('light-theme');
            if (toggleBtn) toggleBtn.textContent = '🌙';
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});

window.ThemeManager = ThemeManager;