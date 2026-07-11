/**
 * ============================================================================
 * ThemeManager.js — Переключение между тёмной и светлой темами
 * ============================================================================
 */

const ThemeManager = {
    STORAGE_KEY: 'theme-preference',
    currentTheme: 'dark',

    /**
     * Инициализация при загрузке страницы.
     */
    init: function() {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (saved === 'light') {
            this.applyTheme('light');
        } else {
            this.applyTheme('dark');
        }
    },

    /**
     * Переключить тему на противоположную.
     */
    toggle: function() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';

        this.applyTheme(newTheme);

        localStorage.setItem(this.STORAGE_KEY, newTheme);

        if (window.TabManager) {
            const themeName = newTheme === 'dark' ? 'тёмная' : 'светлая';
            TabManager.logToConsole('Тема изменена: ' + themeName);
        }
    },

    /**
     * Применить тему: добавить/убрать класс у body, обновить иконку кнопки.
     */
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

        // Перерисовка графиков
        if (window.PlotManager) {
            setTimeout(function() {
                PlotManager.redrawAllPlots();
            }, 50);
        }

        // Обновление placeholder'ов в окнах
        this.updatePlaceholders();
    },

    /**
     * Обновить placeholder'ы в окнах графиков.
     * Принудительно пересоздаёт элементы чтобы применились новые CSS-переменные.
     */
    updatePlaceholders: function() {
        const placeholders = document.querySelectorAll('.window-placeholder, .cesium-placeholder');
        placeholders.forEach(function(placeholder) {
            const text = placeholder.textContent;
            const className = placeholder.className;
            placeholder.textContent = '';
            setTimeout(function() {
                placeholder.textContent = text;
            }, 10);
        });
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});

// Экспорт
window.ThemeManager = ThemeManager;