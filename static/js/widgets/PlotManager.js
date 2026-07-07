/**
 * ============================================================================
 * PlotManager.js — Управление графиками через Plotly
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Отвечает за:
 * 1. Создание новых графиков (запрос данных с сервера + отрисовка).
 * 2. Добавление кривых на существующие графики.
 * 3. Хранение реестра всех открытых графиков.
 * 4. Обновление инспектора графиков (левая панель).
 * 5. Очистку графиков.
 *
 * КОНЦЕПЦИИ JS:
 * - async/await — асинхронные запросы к серверу
 * - fetch + JSON.stringify — отправка JSON на сервер
 * - Object.keys() — получить список ключей объекта
 * - map() — преобразовать массив (каждый элемент → новый элемент)
 * - Plotly.newPlot() — вызов сторонней библиотеки
 * - bind(this) — сохранить контекст 'this' внутри forEach
 */


const PlotManager = {
    // === ХРАНИЛИЩЕ ГРАФИКОВ ===
    // Ключ: ID графика (строка), Значение: объект с данными графика.
    // Пример: { "1": { id: 1, title: "Vx от h", yVariables: ["Vx"], ... } }
    graphs: {},

    // Счётчик для генерации уникальных ID
    nextGraphId: 1,


    /**
     * Создать новый график.
     *
     * ПАРАМЕТРЫ:
     * - xVariable: имя переменной для X (например, "h")
     * - yVariables: массив имён переменных для Y (например, ["Vx", "Vy"])
     * - customTitle: пользовательский заголовок (или null для авто)
     */
    async createPlot(xVariable, yVariables, customTitle) {
        // Проверяем, что файл загружен
        if (!window.currentDatasetId) {
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: нет загруженных данных', 'error');
            }
            return;
        }

        // Генерируем уникальный ID и увеличиваем счётчик
        const graphId = this.nextGraphId++;

        // Формируем заголовок, если не указан
        const title = customTitle || yVariables.join(', ') + ' от ' + xVariable;

        // Находим свободное окно
        const targetWindow = this.findFreeWindow();
        if (!targetWindow) {
            if (window.TabManager) {
                TabManager.logToConsole('Нет свободных окон для графика', 'warning');
            }
            return;
        }

        // Создаём контейнер для графика внутри окна
        const containerId = 'plot-' + targetWindow.dataset.windowId;
        const content = targetWindow.querySelector('.window-content');
        content.innerHTML = '<div id="' + containerId + '" style="width:100%;height:100%;"></div>';

        // Ждём 50мс, чтобы браузер успел отрисовать новый div
        await new Promise(function(resolve) { setTimeout(resolve, 50); });

        // Загружаем данные с сервера
        const data = await this.fetchPlotData(xVariable, yVariables);
        if (!data) return;  // Если ошибка — выходим

        // Рисуем график через Plotly
        this.renderPlot(containerId, data, title);

        // Сохраняем в реестр
        this.graphs[graphId] = {
            id: graphId,
            windowId: targetWindow.dataset.windowId,
            containerId: containerId,
            xVariable: xVariable,
            yVariables: yVariables,
            title: title,
            data: data,
        };

        // Обновляем инспектор графиков (левая панель)
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + title + '" создан');
        }
    },


    /**
     * Добавить кривую на последний график.
     * Используется при клике по переменной в левой панели.
     * Если последнего графика нет или его контейнер удалён — создаёт новый.
     */
    addCurveToLastGraph: function(yVariable) {
        const graphIds = Object.keys(this.graphs);

        // Если нет графиков — создаём новый
        if (graphIds.length === 0) {
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable]);
            return;
        }

        // Берём последний график
        const lastGraphId = graphIds[graphIds.length - 1];
        const graph = this.graphs[lastGraphId];

        // Проверяем, существует ли ещё контейнер графика в DOM
        const container = document.getElementById(graph.containerId);
        if (!container) {
            // Контейнер удалён (окно очищено) — удаляем график из реестра и создаём новый
            console.log('PlotManager: контейнер графика', graph.containerId, 'не найден, создаю новый');
            delete this.graphs[lastGraphId];
            this.updateInspector();

            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable]);
            return;
        }

        // Проверяем, не пустое ли окно (может быть placeholder)
        const placeholder = container.querySelector('.window-placeholder, .cesium-placeholder');
        if (placeholder) {
            // Окно пустое — создаём новый график
            console.log('PlotManager: окно пустое (placeholder), создаю новый график');
            delete this.graphs[lastGraphId];
            this.updateInspector();

            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable]);
            return;
        }

        // Всё ок — добавляем кривую на существующий график
        this.addCurveToGraph(lastGraphId, yVariable);
    },


    /**
     * Добавить кривую на существующий график.
     */
    async addCurveToGraph(graphId, yVariable) {
        const graph = this.graphs[graphId];
        if (!graph) {
            if (window.TabManager) {
                TabManager.logToConsole('График не найден', 'error');
            }
            return;
        }

        // Проверяем, что переменная ещё не добавлена
        // includes — метод массива, возвращает true если элемент есть
        if (graph.yVariables.includes(yVariable)) {
            if (window.TabManager) {
                TabManager.logToConsole('Переменная уже на графике', 'warning');
            }
            return;
        }

        // Проверяем, существует ли контейнер
        const container = document.getElementById(graph.containerId);
        if (!container) {
            if (window.TabManager) {
                TabManager.logToConsole('Контейнер графика не найден. Возможно, окно было очищено.', 'error');
            }
            return;
        }

        // Добавляем переменную в список
        graph.yVariables.push(yVariable);

        // Перезагружаем данные (теперь с новой переменной)
        const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
        if (!data) return;

        graph.data = data;

        // Перерисовываем график
        this.renderPlot(graph.containerId, data, graph.title);

        // Обновляем инспектор
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('Кривая "' + yVariable + '" добавлена на график');
        }
    },


    /**
     * Загрузить данные для графика с сервера.
     * Возвращает JSON от /api/plots/create или null при ошибке.
     */
    async fetchPlotData(xVariable, yVariables) {
        try {
            const response = await fetch('/api/plots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // JSON.stringify превращает объект JS в JSON-строку
                body: JSON.stringify({
                    dataset_id: window.currentDatasetId,
                    x_variable: xVariable,
                    y_variables: yVariables,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error('HTTP ' + response.status + ': ' + error);
            }

            return await response.json();
        } catch (error) {
            console.error('PlotManager error:', error);
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка загрузки данных: ' + error.message, 'error');
            }
            return null;
        }
    },


    /**
     * Отрисовать график через Plotly.
     *
     * Plotly.newPlot(containerId, traces, layout, config) —
     * основная функция библиотеки Plotly.
     * - containerId: ID div-элемента, куда рисовать
     * - traces: массив кривых (данные)
     * - layout: настройки внешнего вида
     * - config: настройки поведения (зум, тулбар и т.д.)
     */
    renderPlot(containerId, data, title) {
        // map — метод массива, который преобразует каждый элемент.
        // Для каждой кривой из data.curves создаём объект trace для Plotly.
        const traces = data.curves.map(function(curve) {
            return {
                x: data.x,
                y: curve.y,
                type: 'scatter',   // Тип: scatter (точки/линии)
                mode: 'lines',     // Режим: соединить линиями
                name: curve.name + (curve.unit ? ' [' + curve.unit + ']' : ''),
                line: { width: 2 },
            };
        });

        const layout = {
            title: {
                text: title,
                font: { color: '#cccccc', size: 14 },
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#cccccc' },
            xaxis: {
                title: data.x_name + (data.x_unit ? ' [' + data.x_unit + ']' : ''),
                gridcolor: '#3c3c3c',
                zerolinecolor: '#3c3c3c',
            },
            yaxis: {
                gridcolor: '#3c3c3c',
                zerolinecolor: '#3c3c3c',
            },
            margin: { l: 60, r: 20, t: 40, b: 50 },
            showlegend: true,
            legend: { font: { color: '#cccccc' } },
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        };

        Plotly.newPlot(containerId, traces, layout, config);
    },


    /**
     * Найти свободное окно для графика.
     * Сначала ищем окно с placeholder (пустое), потом берём первое.
     */
    findFreeWindow: function() {
        const windows = document.querySelectorAll('.scene-window:not(.closed)');

        for (const win of windows) {
            const content = win.querySelector('.window-content');
            const placeholder = content.querySelector('.window-placeholder');
            if (placeholder) {
                return win;
            }
        }

        if (windows.length > 0) {
            return windows[0];
        }

        return null;
    },


    /**
     * Обновить инспектор графиков (левая панель).
     * Показывает список всех открытых графиков с кнопкой "Удалить".
     */
    updateInspector: function() {
        const widget = document.getElementById('graph-inspector-widget');
        if (!widget) return;

        const graphIds = Object.keys(this.graphs);

        if (graphIds.length === 0) {
            widget.innerHTML = '<p><span class="placeholder">(нет открытых графиков)</span></p>';
            return;
        }

        let html = '<ul style="list-style: none; padding: 0; margin: 0;">';

        // bind(this) нужен, чтобы внутри forEach 'this' ссылался на PlotManager,
        // а не на глобальный объект.
        graphIds.forEach(function(id) {
            const graph = this.graphs[id];

            html += '<li style="padding: 8px; border-bottom: 1px solid #2d2d2d; cursor: pointer;" ' +
                        'onmouseover="this.style.backgroundColor=\'#2d2d2d\'" ' +
                        'onmouseout="this.style.backgroundColor=\'transparent\'" ' +
                        'onclick="PlotManager.focusGraph(' + id + ')">';

            html += '<div style="font-weight: bold; color: #cccccc; font-size: 12px;">' +
                    graph.title + '</div>';
            html += '<div style="font-size: 11px; color: #858585; margin-top: 4px;">X: ' +
                    graph.xVariable + '</div>';
            html += '<div style="font-size: 11px; color: #858585;">Y: ' +
                    graph.yVariables.join(', ') + '</div>';

            // event.stopPropagation() нужен, чтобы клик по кнопке "Удалить"
            // не срабатывал как клик по всему li (который вызывает focusGraph).
            html += '<button onclick="event.stopPropagation(); PlotManager.removeGraph(' + id + ')" ' +
                        'style="margin-top: 5px; padding: 2px 8px; background: #f44747; ' +
                        'color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">' +
                        'Удалить</button>';

            html += '</li>';
        }.bind(this));

        html += '</ul>';

        widget.innerHTML = html;
    },


    /**
     * Сфокусироваться на графике (прокрутить к нему).
     */
    focusGraph: function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (windowElement) {
            // scrollIntoView — встроенный метод браузера, прокручивает элемент в видимую область
            windowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },


    /**
     * Удалить график.
     */
    removeGraph: function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        // Очищаем окно
        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (windowElement) {
            const content = windowElement.querySelector('.window-content');
            content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }

        // Удаляем из реестра. Оператор delete удаляет свойство объекта.
        delete this.graphs[graphId];

        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График удалён');
        }
    },


    /**
     * Очистить все графики.
     */
    clearAll: function() {
        const graphIds = Object.keys(this.graphs);

        graphIds.forEach(function(id) {
            const graph = this.graphs[id];
            const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
            if (windowElement) {
                const content = windowElement.querySelector('.window-content');
                content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            }
        }.bind(this));

        this.graphs = {};
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('Все графики очищены');
        }
    },


    /**
     * Очистить конкретное окно (делегирование в WindowManager).
     */
    clearWindow: function(windowId) {
        // windowId может быть числом или строкой, приводим к строке
        const windowIdStr = String(windowId);

        // Ищем график в этом окне
        const graphIds = Object.keys(this.graphs);
        let foundGraph = null;
        let foundId = null;

        for (let i = 0; i < graphIds.length; i++) {
            const id = graphIds[i];
            const graph = this.graphs[id];

            if (graph && String(graph.windowId) === windowIdStr) {
                foundGraph = graph;
                foundId = id;
                break;
            }
        }

        // Если нашли график — удаляем его
        if (foundGraph && foundId) {
            delete this.graphs[foundId];

            if (window.TabManager) {
                TabManager.logToConsole('График "' + foundGraph.title + '" очищен');
            }
        }

        // Обновляем инспектор
        this.updateInspector();

        // Очищаем окно
        if (window.WindowManager && window.WindowManager.clearWindow) {
            window.WindowManager.clearWindow(windowId);
        }
    },
};


// Экспорт
window.PlotManager = PlotManager;