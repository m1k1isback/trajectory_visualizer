/**
 * ============================================================================
 * WindowManager.js — Управление окнами сцены
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Отвечает за:
 * 1. Закрытие окон графиков (кнопка ×).
 * 2. Очистку окон (кнопка 🗑) — возврат к placeholder и очистка состояния.
 * 3. Автоматическую раскладку окон (grid layout) при изменении количества.
 * 4. Корректное изменение размера Plotly и Cesium при перестройке сетки.
 */


function closeWindow(windowId) {
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');

    if (windowElement) {
        windowElement.classList.add('closed');

        if (window.TabManager) {
            TabManager.logToConsole('Окно "' + windowIdStr + '" закрыто');
        }

        // Пересчитываем раскладку оставшихся окон
        updateSceneLayout();

        // Изменяем размер графиков и Cesium после перестройки grid
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

        if (window.TabManager) {
            TabManager.logToConsole('Окно "' + windowIdStr + '" открыто');
        }

        updateSceneLayout();

        setTimeout(function() {
            resizeVisiblePlots();
        }, 150);
    }
}

/**
 * Изменить размер всех видимых графиков и Cesium (без полной перерисовки).
 */
function resizeVisiblePlots() {
    // 1. Изменяем размер графиков Plotly
    const plotContainers = document.querySelectorAll('[id^="plot-"]');
    plotContainers.forEach(function(container) {
        // Проверка что контейнер видим (не внутри display:none)
        if (container.offsetParent !== null && window.Plotly) {
            Plotly.Plots.resize(container);
        }
    });
    
    // 2. Изменяем размер Cesium, если он виден
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
    /**
     * Очистить окно (вернуть placeholder, но не закрывать).
     * ВАЖНО: Для графиков делегирует задачу PlotManager, чтобы очистить и состояние.
     */
    const windowIdStr = String(windowId);
    const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');
    
    if (!windowElement) {
        console.warn('WindowManager.clearWindow: окно ' + windowIdStr + ' не найдено');
        return;
    }

    // Если это окно графика и есть PlotManager, пусть он корректно всё очистит
    if (windowIdStr !== 'cesium' && window.PlotManager && typeof window.PlotManager.clearWindow === 'function') {
        window.PlotManager.clearWindow(windowIdStr);
        return;
    }

    // Fallback для Cesium или если PlotManager недоступен
    const content = windowElement.querySelector('.window-content');
    if (!content) {
        console.error('WindowManager.clearWindow: .window-content не найдено');
        return;
    }

    if (windowIdStr === 'cesium') {
        content.innerHTML = '<div class="cesium-placeholder">Cesium Viewer</div>';
        // Очищаем сцену Cesium от объектов
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
    /**
     * Пересчитать раскладку окон в зависимости от количества видимых.
     */
    const container = document.getElementById('scene-container');
    if (!container) return;

    const allWindows = container.querySelectorAll('.scene-window');
    const visibleWindows = container.querySelectorAll('.scene-window:not(.closed)');
    const count = visibleWindows.length;

    // Проверяем, открыт ли Cesium
    const cesiumWindow = document.querySelector('[data-window-id="cesium"]');
    const isCesiumOpen = cesiumWindow && !cesiumWindow.classList.contains('closed');

    // Сбрасываем grid-позиции у всех окон перед пересчётом
    allWindows.forEach(function(w) {
        w.style.gridColumn = '';
        w.style.gridRow = '';
    });

    if (count === 4) {
        // Сетка 2x2 (все 4 окна открыты: 3 графика + Cesium)
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';

        if (cesiumWindow) {
            cesiumWindow.style.gridColumn = '2';
            cesiumWindow.style.gridRow = '2';
        }
    } else if (count === 3 && isCesiumOpen) {
        // 3 окна всего (2 графика + Cesium)
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';

        const visibleArray = Array.from(visibleWindows);
        const graphs = visibleArray.filter(function(w) {
            return w.dataset.windowId !== 'cesium';
        });

        if (cesiumWindow) {
            cesiumWindow.style.gridColumn = '2';
            cesiumWindow.style.gridRow = '2';
        }
        if (graphs[0]) {
            graphs[0].style.gridColumn = '1 / 3';  // Растянуть на 2 колонки сверху
            graphs[0].style.gridRow = '1';
        }
        if (graphs[1]) {
            graphs[1].style.gridColumn = '1';
            graphs[1].style.gridRow = '2';
        }
    } else if (count === 3 && !isCesiumOpen) {
        // 3 окна БЕЗ Cesium — первое широкое сверху, два снизу
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';

        const visibleArray = Array.from(visibleWindows);

        if (visibleArray[0]) {
            visibleArray[0].style.gridColumn = '1 / 3';
            visibleArray[0].style.gridRow = '1';
        }
        if (visibleArray[1]) {
            visibleArray[1].style.gridColumn = '1';
            visibleArray[1].style.gridRow = '2';
        }
        if (visibleArray[2]) {
            visibleArray[2].style.gridColumn = '2';
            visibleArray[2].style.gridRow = '2';
        }
    } else if (count === 2) {
        // 2 окна — в ряд
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr';

        const visibleArray = Array.from(visibleWindows);
        visibleArray.forEach(function(w, index) {
            w.style.gridColumn = (index + 1).toString();
            w.style.gridRow = '1';
        });
    } else if (count === 1) {
        // 1 окно — на весь экран
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';

        const visibleArray = Array.from(visibleWindows);
        visibleArray[0].style.gridColumn = '1';
        visibleArray[0].style.gridRow = '1';
    } else if (count === 0) {
        // Все окна закрыты
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';
    }
}

// === ЭКСПОРТ ===
window.WindowManager = {
    closeWindow: closeWindow,
    openWindow: openWindow,
    clearWindow: clearWindow,
    updateSceneLayout: updateSceneLayout,
    resizeVisiblePlots: resizeVisiblePlots
};

// Также экспортируем напрямую для удобства вызова из HTML (onclick="...")
window.closeWindow = closeWindow;
window.openWindow = openWindow;
window.clearWindow = clearWindow;
window.updateSceneLayout = updateSceneLayout;
window.resizeVisiblePlots = resizeVisiblePlots;

// Инициализация раскладки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateSceneLayout();
});