/**
 * WindowManager.js - Управление окнами сцены
 */

function closeWindow(windowId) {
    const windowElement = document.querySelector('[data-window-id="' + windowId + '"]');
    if (windowElement) {
        windowElement.classList.add('closed');
        
        if (window.TabManager) {
            TabManager.logToConsole('Окно "График ' + windowId + '" закрыто');
        }
        
        updateSceneLayout();
    }
}

function clearWindow(windowId) {
    const windowElement = document.querySelector('[data-window-id="' + windowId + '"]');
    if (!windowElement) {
        console.error('WindowManager.clearWindow: окно ' + windowId + ' не найдено');
        return;
    }
    
    const content = windowElement.querySelector('.window-content');
    if (!content) {
        console.error('WindowManager.clearWindow: .window-content не найдено');
        return;
    }
    
    const isCesium = windowElement.classList.contains('window-cesium');
    
    if (isCesium) {
        content.innerHTML = '<div class="cesium-placeholder">Cesium Viewer</div>';
    } else {
        content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
    }
    
    if (window.TabManager) {
        TabManager.logToConsole('Окно "График ' + windowId + '" очищено');
    }
}

function updateSceneLayout() {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const allWindows = container.querySelectorAll('.scene-window');
    const visibleWindows = container.querySelectorAll('.scene-window:not(.closed)');
    const count = visibleWindows.length;
    
    allWindows.forEach(function(w) {
        w.style.gridColumn = '';
        w.style.gridRow = '';
    });
    
    if (count === 4) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        
        const cesium = document.querySelector('[data-window-id="cesium"]');
        if (cesium) {
            cesium.style.gridColumn = '2';
            cesium.style.gridRow = '2';
        }
    } else if (count === 3) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        
        const visibleArray = Array.from(visibleWindows);
        const cesium = document.querySelector('[data-window-id="cesium"]');
        const graphs = visibleArray.filter(function(w) {
            return w.dataset.windowId !== 'cesium';
        });
        
        if (cesium && !cesium.classList.contains('closed')) {
            cesium.style.gridColumn = '2';
            cesium.style.gridRow = '2';
            
            if (graphs[0]) {
                graphs[0].style.gridColumn = '1 / 3';
                graphs[0].style.gridRow = '1';
            }
            if (graphs[1]) {
                graphs[1].style.gridColumn = '1';
                graphs[1].style.gridRow = '2';
            }
        }
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
    }
}

window.WindowManager = {
    closeWindow: closeWindow,
    clearWindow: clearWindow,
    updateSceneLayout: updateSceneLayout
};

window.closeWindow = closeWindow;
window.clearWindow = clearWindow;
window.updateSceneLayout = updateSceneLayout;

document.addEventListener('DOMContentLoaded', function() {
    updateSceneLayout();
});