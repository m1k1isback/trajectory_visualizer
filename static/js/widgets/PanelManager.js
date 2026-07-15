/**
 * Управление сворачиваемыми панелями
 */

const PanelManager = {
    /**
     * Переключить левую панель (sidebar + console).
     */
    toggleLeftPanel: function() {
        const sidebar = document.getElementById('sidebar-left');
        const trigger = document.getElementById('sidebar-trigger-left');
        const mainContainer = document.querySelector('.main-container');
        
        if (!sidebar || !trigger) return;
        
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            trigger.style.display = 'block';
            if (mainContainer) mainContainer.classList.add('sidebar-hidden');
        } else {
            trigger.style.display = 'none';
            if (mainContainer) mainContainer.classList.remove('sidebar-hidden');
        }
        
        // Перерисовать Cesium если нужно
        if (window.CesiumViewer && CesiumViewer.viewer) {
            setTimeout(() => CesiumViewer.viewer.resize(), 350);
        }
    },

    /**
     * Переключить нижнюю панель (table/stats).
     */
    toggleBottomPanel: function() {
        const bottomPanel = document.getElementById('bottom-panel');
        const mainContainer = document.querySelector('.main-container');
        const toggleBtn = document.getElementById('bottom-panel-toggle');
        
        if (!bottomPanel) return;
        
        bottomPanel.classList.toggle('collapsed');
        
        if (bottomPanel.classList.contains('collapsed')) {
            if (toggleBtn) toggleBtn.innerHTML = '▲';
            if (mainContainer) mainContainer.classList.add('bottom-hidden');
        } else {
            if (toggleBtn) toggleBtn.innerHTML = '▼';
            if (mainContainer) mainContainer.classList.remove('bottom-hidden');
        }
        
        // Перерисовать Cesium
        if (window.CesiumViewer && CesiumViewer.viewer) {
            setTimeout(() => CesiumViewer.viewer.resize(), 350);
        }
    }
};

// Делаем глобальным
window.PanelManager = PanelManager;
window.toggleBottomPanel = PanelManager.toggleBottomPanel;