/**
 * ============================================================================
 * ThemeManager.js — Переключение между тёмной и светлой темами
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Переключает CSS-класс 'light-theme' на элементе <body>.
 * В CSS прописаны правила: body.light-theme .toolbar { background: white; }
 * и т.д. — все элементы перекрашиваются.
 *
 * Также сохраняет выбор пользователя в localStorage,
 * чтобы тема не сбрасывалась при перезагрузке страницы.
 *
 * КОНЦЕПЦИИ JS:
 * - localStorage — хранилище в браузере, данные сохраняются между сессиями
 * - classList.add/remove — добавление/удаление CSS-класса
 * - document.body — ссылка на элемент <body> страницы
 */


const ThemeManager = {
    // Ключ для localStorage (под этим именем сохраняем тему)
    STORAGE_KEY: 'theme-preference',

    // Текущая тема ('dark' или 'light')
    currentTheme: 'dark',

    /**
     * Инициализация при загрузке страницы.
     * Проверяем, есть ли сохранённая тема, и применяем её.
     */
    init: function() {
        // localStorage.getItem(key) — получить значение по ключу.
        // Возвращает строку или null, если ключа нет.
        const saved = localStorage.getItem(this.STORAGE_KEY);

        if (saved === 'light') {
            this.applyTheme('light');
        } else {
            // По умолчанию — тёмная тема
            this.applyTheme('dark');
        }
    },

    /**
     * Переключить тему на противоположную.
     */
    toggle: function() {
        // Тернарный оператор: если текущая 'dark', то новая 'light', и наоборот.
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';

        this.applyTheme(newTheme);

        // localStorage.setItem(key, value) — сохранить значение.
        // Данные сохраняются в браузере и не пропадают при перезагрузке.
        localStorage.setItem(this.STORAGE_KEY, newTheme);

        // Логируем в консоль
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
            // add добавляет класс. В CSS: body.light-theme { ... }
            body.classList.add('light-theme');
            if (toggleBtn) toggleBtn.textContent = '☀️';
        } else {
            // remove убирает класс
            body.classList.remove('light-theme');
            if (toggleBtn) toggleBtn.textContent = '🌙';
        }
    }
};


// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});


// Экспорт
window.ThemeManager = ThemeManager;