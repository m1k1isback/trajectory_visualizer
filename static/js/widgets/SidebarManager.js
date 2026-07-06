/**
 * SidebarManager.js - Управление боковыми панелями (левая и правая)
 *
 * ЭТОТ ФАЙЛ:
 * - Скрывает/показывает левую панель (инспектор графиков, структура файлов, свойства)
 * - Скрывает/показывает правую панель (настройки, свойства объектов)
 * - Обрабатывает горячую клавишу Ctrl+B для левой панели
 *
 * КАК РАБОТАЕТ:
 * 1. Пользователь нажимает кнопку "" или "▶" на панели
 * 2. Вызывается toggleSidebar('left') или toggleSidebar('right')
 * 3. Функция добавляет/убирает CSS-класс 'collapsed' у панели
 * 4. CSS реагирует на класс 'collapsed' и скрывает панель
 * 5. Появляется/исчезает кнопка-триггер для возврата панели
 */

// === ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ПАНЕЛИ ===

function toggleSidebar(side) {
    /**
     * Переключить видимость боковой панели.
     *
     * ПАРАМЕТРЫ:
     * - side: строка 'left' или 'right' - какую панель переключить
     */
    
    if (side === 'left') {
        // === ЛЕВАЯ ПАНЕЛЬ ===
        const sidebar = document.getElementById('sidebar-left');
        const trigger = document.getElementById('sidebar-trigger-left');
        
        if (sidebar && trigger) {
            sidebar.classList.toggle('collapsed');
            
            if (sidebar.classList.contains('collapsed')) {
                trigger.style.display = 'flex';
                if (window.TabManager) TabManager.logToConsole('Левая панель скрыта');
            } else {
                trigger.style.display = 'none';
                if (window.TabManager) TabManager.logToConsole('Левая панель показана');
            }
        }
    } else if (side === 'right') {
        // === ПРАВАЯ ПАНЕЛЬ ===
        const sidebar = document.getElementById('sidebar-right');
        const trigger = document.getElementById('sidebar-trigger-right');
        
        if (sidebar && trigger) {
            sidebar.classList.toggle('collapsed');
            
            if (sidebar.classList.contains('collapsed')) {
                trigger.style.display = 'flex';
                if (window.TabManager) TabManager.logToConsole('Правая панель скрыта');
            } else {
                trigger.style.display = 'none';
                if (window.TabManager) TabManager.logToConsole('Правая панель показана');
            }
        }
    }
}

// === ГОРЯЧАЯ КЛАВИША Ctrl+B ===

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        toggleSidebar('left');
    }
});

// === ЭКСПОРТ ===

window.SidebarManager = {
    toggleSidebar: toggleSidebar
};

window.toggleSidebar = toggleSidebar;