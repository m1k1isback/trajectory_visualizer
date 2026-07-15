/**
 * ============================================================================
 * SidebarManager.js — Управление боковыми и нижней панелями
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Скрывает и показывает левую, правую и нижнюю панели.
 * Левая панель скрывается вместе с консолью.
 * Нижняя панель сворачивается в заголовок, освобождая место для сцены.
 * Также обрабатывает горячую клавишу Ctrl+B для левой панели.
 */

function toggleSidebar(side) {
    if (side === 'left') {
        const leftColumn = document.getElementById('left-column');
        const trigger = document.getElementById('sidebar-trigger-left');

        if (leftColumn && trigger) {
            leftColumn.classList.toggle('collapsed');

            if (leftColumn.classList.contains('collapsed')) {
                trigger.style.display = 'flex';
                if (window.TabManager) TabManager.logToConsole('Левая панель и консоль скрыты');
            } else {
                trigger.style.display = 'none';
                if (window.TabManager) TabManager.logToConsole('Левая панель и консоль показаны');
            }
            
            setTimeout(() => {
                if (window.CesiumViewer && CesiumViewer.viewer) {
                    CesiumViewer.viewer.resize();
                }
            }, 350);
        }
    } else if (side === 'right') {
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

            setTimeout(() => {
                if (window.CesiumViewer && CesiumViewer.viewer) {
                    CesiumViewer.viewer.resize();
                }
            }, 350);
        }
    }
}

function toggleBottomPanel() {
    const bottomPanel = document.getElementById('bottom-panel');
    const toggleBtn = document.getElementById('bottom-panel-toggle');

    if (bottomPanel) {
        const isCollapsed = bottomPanel.classList.toggle('collapsed');
        
        // ЖЁСТКО меняем стрелку через JavaScript
        if (toggleBtn) {
            toggleBtn.textContent = isCollapsed ? '▲' : '▼';
        }

        setTimeout(() => {
            if (window.CesiumViewer && CesiumViewer.viewer) {
                CesiumViewer.viewer.resize();
            }
        }, 350);
    }
}

// === ГОРЯЧАЯ КЛАВИША Ctrl+B ===
document.addEventListener('keydown', function(event) {
    // event.key === 'и' добавлен для поддержки русской раскладки клавиатуры
    if (event.ctrlKey && (event.key === 'b' || event.key === 'и')) {
        event.preventDefault();
        toggleSidebar('left');
    }
});

// === ЭКСПОРТ ===
window.SidebarManager = {
    toggleSidebar: toggleSidebar,
    toggleBottomPanel: toggleBottomPanel
};

window.toggleSidebar = toggleSidebar;
window.toggleBottomPanel = toggleBottomPanel;