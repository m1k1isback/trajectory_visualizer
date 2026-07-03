// WindowManager.js

function closeWindow(windowId) {
    const windowElement = document.querySelector(`[data-window-id="${windowId}"]`);
    if (windowElement) {
        windowElement.classList.add('closed');
        
        if (window.TabManager) {
            TabManager.logToConsole(`Окно "График ${windowId}" закрыто`);
        }
        
        updateSceneLayout();
    }
}

function updateSceneLayout() {
    const container = document.getElementById('scene-container');
    const allWindows = container.querySelectorAll('.scene-window');
    const visibleWindows = container.querySelectorAll('.scene-window:not(.closed)');
    const count = visibleWindows.length;
    
    // Сбрасываем все стили grid
    allWindows.forEach(w => {
        w.style.gridColumn = '';
        w.style.gridRow = '';
    });
    
    // Пересчитываем layout
    if (count === 4) {
        // 2x2 сетка
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        
        // Модель Земли в правом нижнем углу
        const cesium = document.querySelector('[data-window-id="cesium"]');
        if (cesium) {
            cesium.style.gridColumn = '2';
            cesium.style.gridRow = '2';
        }
    } else if (count === 3) {
        // Одно окно растягивается на 2 колонки
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        
        const visibleArray = Array.from(visibleWindows);
        const cesium = document.querySelector('[data-window-id="cesium"]');
        const graphs = visibleArray.filter(w => w.dataset.windowId !== 'cesium');
        
        if (cesium && !cesium.classList.contains('closed')) {
            cesium.style.gridColumn = '2';
            cesium.style.gridRow = '2';
            
            // Первый график растягивается на всю ширину
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
        // Два окна по половине
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr';
        
        const visibleArray = Array.from(visibleWindows);
        visibleArray.forEach((w, index) => {
            w.style.gridColumn = (index + 1).toString();
            w.style.gridRow = '1';
        });
    } else if (count === 1) {
        // Одно окно на весь экран
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';
        
        const visibleArray = Array.from(visibleWindows);
        visibleArray[0].style.gridColumn = '1';
        visibleArray[0].style.gridRow = '1';
    }
}

window.WindowManager = {
    closeWindow: closeWindow,
    updateSceneLayout: updateSceneLayout
};

document.addEventListener('DOMContentLoaded', function() {
    updateSceneLayout();
});