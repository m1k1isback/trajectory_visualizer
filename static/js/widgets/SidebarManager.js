// SidebarManager.js

function toggleSidebar(side) {
    if (side === 'left') {
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
        const sidebar = document.getElementById('sidebar-right');
        
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            
            if (window.TabManager) {
                const isCollapsed = sidebar.classList.contains('collapsed');
                TabManager.logToConsole(isCollapsed ? 'Правая панель скрыта' : 'Правая панель показана');
            }
        }
    }
}

// Горячая клавиша Ctrl+B
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        toggleSidebar('left');
    }
});

window.SidebarManager = {
    toggleSidebar: toggleSidebar
};