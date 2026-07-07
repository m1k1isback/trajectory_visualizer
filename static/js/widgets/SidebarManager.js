/**
 * ============================================================================
 * SidebarManager.js — Управление боковыми панелями
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Скрывает и показывает левую и правую боковые панели.
 * Также обрабатывает горячую клавишу Ctrl+B для левой панели.
 *
 * КОНЦЕПЦИИ JS:
 * - classList.toggle — добавить класс, если его нет; убрать, если есть
 * - classList.contains — проверить, есть ли класс у элемента
 * - addEventListener('keydown') — подписка на нажатие клавиш
 * - event.preventDefault() — отменить стандартное действие браузера
 */


function toggleSidebar(side) {
    /**
     * Переключить видимость боковой панели.
     *
     * ПАРАМЕТРЫ:
     * - side: строка 'left' или 'right'
     *
     * ЛОГИКА:
     * 1. Найти панель и кнопку-триггер по ID.
     * 2. Переключить CSS-класс 'collapsed' у панели.
     * 3. Показать/скрыть кнопку-триггер.
     * 4. Записать событие в консоль.
     */

    if (side === 'left') {
        // === ЛЕВАЯ ПАНЕЛЬ ===
        const sidebar = document.getElementById('sidebar-left');
        const trigger = document.getElementById('sidebar-trigger-left');

        if (sidebar && trigger) {
            // toggle добавляет класс, если его нет, и убирает, если есть.
            // В CSS: .sidebar.collapsed { width: 0; overflow: hidden; }
            sidebar.classList.toggle('collapsed');

            // contains проверяет, есть ли класс у элемента
            if (sidebar.classList.contains('collapsed')) {
                trigger.style.display = 'flex';  // Показываем кнопку-триггер
                if (window.TabManager) TabManager.logToConsole('Левая панель скрыта');
            } else {
                trigger.style.display = 'none';  // Скрываем кнопку-триггер
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
    /**
     * Обработчик нажатия клавиш на клавиатуре.
     *
     * event — объект события, содержит:
     * - event.ctrlKey: true если нажат Ctrl
     * - event.key: строка с именем клавиши ('b', 'a', 'Enter' и т.д.)
     */
    if (event.ctrlKey && event.key === 'b') {
        // preventDefault отменяет стандартное действие браузера.
        // Ctrl+B в браузере обычно открывает панель закладок — мы это отменяем.
        event.preventDefault();
        toggleSidebar('left');
    }
});


// === ЭКСПОРТ ===
// Делаем функцию доступной из HTML (onclick="toggleSidebar('left')")
// и из других JS-файлов.

window.SidebarManager = {
    toggleSidebar: toggleSidebar
};

window.toggleSidebar = toggleSidebar;