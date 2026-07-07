/**
 * ============================================================================
 * WindowManager.js — Управление окнами сцены
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Отвечает за:
 * 1. Закрытие окон графиков (кнопка ×).
 * 2. Очистку окон (кнопка ) — возврат к placeholder.
 * 3. Автоматическую раскладку окон (grid layout) при изменении количества.
 *
 * КОНЦЕПЦИИ JS:
 * - querySelector — поиск одного элемента по CSS-селектору
 * - querySelectorAll — поиск нескольких элементов
 * - classList.add/remove/toggle/contains — управление CSS-классами
 * - Array.from() — превратить NodeList в настоящий массив
 * - filter() — отфильтровать элементы массива по условию
 * - forEach — перебор элементов
 */


function closeWindow(windowId) {
    /**
     * Закрыть окно (добавить класс 'closed', оно исчезнет из раскладки).
     */
    // Ищем окно по атрибуту data-window-id.
    // Селектор '[data-window-id="1"]' ищет элемент с таким атрибутом.
    const windowElement = document.querySelector('[data-window-id="' + windowId + '"]');

    if (windowElement) {
        // Добавляем класс 'closed'. В CSS: .scene-window.closed { display: none; }
        windowElement.classList.add('closed');

        if (window.TabManager) {
            TabManager.logToConsole('Окно "График ' + windowId + '" закрыто');
        }

        // Пересчитываем раскладку оставшихся окон
        updateSceneLayout();
    }
}


function clearWindow(windowId) {
    /**
     * Очистить окно (вернуть placeholder, но не закрывать).
     */
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

    // Проверяем, является ли окно окном Cesium (у него другой placeholder)
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
    /**
     * Пересчитать раскладку окон в зависимости от количества видимых.
     *
     * ЛОГИКА:
     * - 4 окна: сетка 2x2
     * - 3 окна: одно широкое сверху, два снизу + Cesium
     * - 2 окна: два в ряд
     * - 1 окно: одно на весь экран
     */
    const container = document.getElementById('scene-container');
    if (!container) return;

    // Находим все окна и только видимые (без класса 'closed')
    const allWindows = container.querySelectorAll('.scene-window');
    const visibleWindows = container.querySelectorAll('.scene-window:not(.closed)');
    const count = visibleWindows.length;

    // Сбрасываем grid-позиции у всех окон
    allWindows.forEach(function(w) {
        w.style.gridColumn = '';
        w.style.gridRow = '';
    });

    if (count === 4) {
        // Сетка 2x2
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

        // Array.from() превращает NodeList в массив, чтобы использовать filter
        const visibleArray = Array.from(visibleWindows);
        const cesium = document.querySelector('[data-window-id="cesium"]');

        // filter оставляет только элементы, для которых функция вернула true
        const graphs = visibleArray.filter(function(w) {
            return w.dataset.windowId !== 'cesium';
        });

        if (cesium && !cesium.classList.contains('closed')) {
            cesium.style.gridColumn = '2';
            cesium.style.gridRow = '2';

            if (graphs[0]) {
                graphs[0].style.gridColumn = '1 / 3';  // Растянуть на 2 колонки
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


// === ЭКСПОРТ ===
// Делаем функции доступными из HTML (onclick="closeWindow(1)")
// и из других JS-файлов.

window.WindowManager = {
    closeWindow: closeWindow,
    clearWindow: clearWindow,
    updateSceneLayout: updateSceneLayout
};

// Также экспортируем напрямую для удобства
window.closeWindow = closeWindow;
window.clearWindow = clearWindow;
window.updateSceneLayout = updateSceneLayout;


// Инициализация раскладки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateSceneLayout();
});