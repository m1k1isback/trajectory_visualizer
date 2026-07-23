/**
 * ============================================================================
 * WindowManager.js — Управление окнами сцены (с меню "Вид")
 * ============================================================================
 */

function updateViewMenuCheckbox(windowId, isVisible) {
    const checkbox = document.getElementById('view-win-' + windowId);
    if (checkbox) {
        checkbox.checked = isVisible;
    }
}

function closeWindow(windowId) {
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');

    if (windowElement) {
        windowElement.classList.add('closed');
        updateViewMenuCheckbox(windowIdStr, false);

        if (window.TabManager) {
            TabManager.logToConsole('Окно "' + windowIdStr + '" скрыто');
        }

        updateSceneLayout();

        setTimeout(function() {
            resizeVisiblePlots();
        }, 150);
    }
}

function openWindow(windowId) {
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');
    
    if (windowElement) {
        windowElement.classList.remove('closed');
        updateViewMenuCheckbox(windowIdStr, true);

        if (window.TabManager) {
            TabManager.logToConsole('Окно "' + windowIdStr + '" показано');
        }

        updateSceneLayout();

        setTimeout(function() {
            resizeVisiblePlots();
        }, 150);
    }
}

function toggleWindow(windowId) {
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');
    
    if (windowElement) {
        if (windowElement.classList.contains('closed')) {
            openWindow(windowIdStr);
        } else {
            closeWindow(windowIdStr);
        }
    }
}

function showAllWindows() {
    ['1', '2', '3', 'cesium'].forEach(function(id) {
        openWindow(id);
    });
    if (window.TabManager) {
        TabManager.logToConsole('Все окна показаны');
    }
}

/**
 * Изменить размер всех видимых графиков и Cesium.
 */
function resizeVisiblePlots() {
    const plotContainers = document.querySelectorAll('[id^="plot-"]');
    plotContainers.forEach(function(container) {
        if (container.offsetParent !== null && window.Plotly) {
            Plotly.Plots.resize(container);
        }
    });
    
    if (window.CesiumViewer && CesiumViewer.viewer) {
        const cesiumContainer = document.getElementById('cesium-container');
        if (cesiumContainer && cesiumContainer.offsetParent !== null) {
            CesiumViewer.viewer.resize();
        }
    }
    
    if (window.TabManager) {
        TabManager.logToConsole('Размеры окон обновлены');
    }
}

function clearWindow(windowId) {
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');
    
    if (!windowElement) return;

    if (windowIdStr !== 'cesium' && window.PlotManager && typeof window.PlotManager.clearWindow === 'function') {
        window.PlotManager.clearWindow(windowIdStr);
        return;
    }

    const content = windowElement.querySelector('.window-content');
    if (!content) return;

    if (windowIdStr === 'cesium') {
        content.innerHTML = '<div class="cesium-placeholder">Cesium Viewer</div>';
        if (window.CesiumViewer) {
            CesiumViewer.clear();
        }
    } else {
        content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
    }

    if (window.TabManager) {
        TabManager.logToConsole('Окно "' + windowIdStr + '" очищено');
    }
}

function updateSceneLayout() {
    const container = document.getElementById('scene-container');
    if (!container) return;

    const allWindows = container.querySelectorAll('.scene-window');
    const visibleWindows = container.querySelectorAll('.scene-window:not(.closed)');
    const count = visibleWindows.length;

    const cesiumWindow = document.querySelector('[data-window-id="cesium"]');
    const isCesiumOpen = cesiumWindow && !cesiumWindow.classList.contains('closed');

    allWindows.forEach(function(w) {
        w.style.gridColumn = '';
        w.style.gridRow = '';
    });

    if (count === 4) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        if (cesiumWindow) {
            cesiumWindow.style.gridColumn = '2';
            cesiumWindow.style.gridRow = '2';
        }
    } else if (count === 3 && isCesiumOpen) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        const visibleArray = Array.from(visibleWindows);
        const graphs = visibleArray.filter(function(w) { return w.dataset.windowId !== 'cesium'; });

        if (cesiumWindow) { cesiumWindow.style.gridColumn = '2'; cesiumWindow.style.gridRow = '2'; }
        if (graphs[0]) { graphs[0].style.gridColumn = '1 / 3'; graphs[0].style.gridRow = '1'; }
        if (graphs[1]) { graphs[1].style.gridColumn = '1'; graphs[1].style.gridRow = '2'; }
    } else if (count === 3 && !isCesiumOpen) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        const visibleArray = Array.from(visibleWindows);
        if (visibleArray[0]) { visibleArray[0].style.gridColumn = '1 / 3'; visibleArray[0].style.gridRow = '1'; }
        if (visibleArray[1]) { visibleArray[1].style.gridColumn = '1'; visibleArray[1].style.gridRow = '2'; }
        if (visibleArray[2]) { visibleArray[2].style.gridColumn = '2'; visibleArray[2].style.gridRow = '2'; }
    } else if (count === 2) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr';
        const visibleArray = Array.from(visibleWindows);
        visibleArray.forEach(function(w, index) {
            w.style.gridColumn = (index + 1).toString();
            w.style.gridRow = '1';
        });
    } else if (count === 1) {
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';
        const visibleArray = Array.from(visibleWindows);
        visibleArray[0].style.gridColumn = '1';
        visibleArray[0].style.gridRow = '1';
    } else if (count === 0) {
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';
    }
}

// === ЭКСПОРТ ===
window.WindowManager = {
    closeWindow: closeWindow,
    openWindow: openWindow,
    toggleWindow: toggleWindow,
    showAllWindows: showAllWindows,
    clearWindow: clearWindow,
    updateSceneLayout: updateSceneLayout,
    resizeVisiblePlots: resizeVisiblePlots
};

window.closeWindow = closeWindow;
window.openWindow = openWindow;
window.clearWindow = clearWindow;
window.updateSceneLayout = updateSceneLayout;
window.resizeVisiblePlots = resizeVisiblePlots;

document.addEventListener('DOMContentLoaded', function() {
    updateSceneLayout();
});