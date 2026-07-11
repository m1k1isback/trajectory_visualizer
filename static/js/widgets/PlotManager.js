/**
 * ============================================================================
 * PlotManager.js — Управление графиками через Plotly
 * ============================================================================
 */

// === ПАЛИТРА ЦВЕТОВ ДЛЯ КРИВЫХ ===
const CURVE_COLORS = [
    '#4ec9b0',  // бирюзовый
    '#569cd6',  // синий
    '#ce9178',  // оранжевый
    '#c586c0',  // фиолетовый
    '#dcdcaa',  // жёлтый
    '#f44747',  // красный
    '#9cdcfe',  // голубой
    '#d4d4d4',  // серый
    '#b5cea8',  // зелёный
    '#d16969',  // тёмно-красный
];

// === НАСТРОЙКИ ЦВЕТОВ ДЛЯ РАЗНЫХ ТЕМ ===
const PLOT_THEMES = {
    dark: {
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font_color: '#cccccc',
        gridcolor: '#3c3c3c',
        zerolinecolor: '#3c3c3c',
        axis_title_color: '#cccccc',
    },
    light: {
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#f8f9fa',
        font_color: '#1e1e1e',
        gridcolor: '#e0e0e0',
        zerolinecolor: '#cccccc',
        axis_title_color: '#1e1e1e',
    }
};

const PlotManager = {
    graphs: {},
    nextGraphId: 1,

    /**
     * Получить цвет для кривой по её индексу.
     */
    getCurveColor: function(index) {
        return CURVE_COLORS[index % CURVE_COLORS.length];
    },

    /**
     * Назначить цвета всем кривым графика.
     */
    assignCurveColors: function(graph) {
        if (!graph.curveColors) {
            graph.curveColors = {};
        }
        graph.yVariables.forEach(function(varName, index) {
            if (!graph.curveColors[varName]) {
                graph.curveColors[varName] = this.getCurveColor(index);
            }
        }.bind(this));
    },

    /**
     * Определить текущую тему (тёмная или светлая).
     */
    getCurrentTheme: function() {
        if (document.body.classList.contains('light-theme')) {
            return 'light';
        }
        return 'dark';
    },

    /**
     * Получить настройки цветов для текущей темы.
     */
    getPlotTheme: function() {
        const theme = this.getCurrentTheme();
        return PLOT_THEMES[theme];
    },

    /**
     * Создать новый график.
     */
    async createPlot(xVariable, yVariables, customTitle, targetWindowId, curveColors) {
        if (!window.currentDatasetId) {
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: нет загруженных данных', 'error');
            }
            return;
        }

        const graphId = this.nextGraphId++;
        const title = customTitle || yVariables.join(', ') + ' от ' + xVariable;

        let targetWindow;
        if (targetWindowId && targetWindowId !== 'auto') {
            targetWindow = document.querySelector('[data-window-id="' + targetWindowId + '"]');
        } else {
            targetWindow = this.findFreeWindow();
        }

        if (!targetWindow) {
            if (window.TabManager) {
                TabManager.logToConsole('Нет свободных окон для графика', 'warning');
            }
            return;
        }

        const containerId = 'plot-' + targetWindow.dataset.windowId;
        const content = targetWindow.querySelector('.window-content');
        content.innerHTML = '<div id="' + containerId + '" style="width:100%;height:100%;"></div>';

        await new Promise(function(resolve) { setTimeout(resolve, 50); });

        const data = await this.fetchPlotData(xVariable, yVariables);
        if (!data) return;

        this.graphs[graphId] = {
            id: graphId,
            windowId: targetWindow.dataset.windowId,
            containerId: containerId,
            xVariable: xVariable,
            yVariables: yVariables,
            title: title,
            data: data,
            active: true,
            curveColors: curveColors || {}
        };

        this.assignCurveColors(this.graphs[graphId]);
        this.renderPlot(containerId, data, title, this.graphs[graphId].curveColors);

        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + title + '" создан');
        }
    },

    /**
     * Обновить существующий график.
     */
    async updateGraph(graphId, updates) {
        const graph = this.graphs[graphId];
        if (!graph) {
            console.error('PlotManager.updateGraph: график', graphId, 'не найден');
            return;
        }

        if (updates.xVariable) graph.xVariable = updates.xVariable;
        if (updates.yVariables) graph.yVariables = updates.yVariables;
        if (updates.title) graph.title = updates.title;
        if (updates.curveColors) graph.curveColors = updates.curveColors;

        if (updates.windowId && updates.windowId !== graph.windowId) {
            const oldWindow = document.querySelector('[data-window-id="' + graph.windowId + '"]');
            if (oldWindow) {
                const oldContent = oldWindow.querySelector('.window-content');
                oldContent.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            }

            const newWindow = document.querySelector('[data-window-id="' + updates.windowId + '"]');
            if (newWindow) {
                graph.windowId = updates.windowId;
                graph.containerId = 'plot-' + updates.windowId;

                const content = newWindow.querySelector('.window-content');
                content.innerHTML = '<div id="' + graph.containerId + '" style="width:100%;height:100%;"></div>';

                await new Promise(function(resolve) { setTimeout(resolve, 50); });

                const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
                if (data) {
                    graph.data = data;
                    this.renderPlot(graph.containerId, data, graph.title, graph.curveColors);
                }
            }
        } else {
            const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
            if (data) {
                graph.data = data;
                this.renderPlot(graph.containerId, data, graph.title, graph.curveColors);
            }
        }

        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + graph.title + '" обновлён');
        }
    },

    /**
     * Переключить видимость графика (чекбокс в инспекторе).
     */
    toggleGraph: async function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        graph.active = !graph.active;

        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (!windowElement) return;

        const content = windowElement.querySelector('.window-content');

        if (graph.active) {
            Object.keys(this.graphs).forEach(function(otherId) {
                const otherGraph = this.graphs[otherId];
                if (otherId !== String(graphId) && otherGraph.windowId === graph.windowId) {
                    otherGraph.active = false;
                }
            }.bind(this));

            content.innerHTML = '<div id="' + graph.containerId + '" style="width:100%;height:100%;"></div>';

            await new Promise(function(resolve) { setTimeout(resolve, 50); });

            if (graph.data) {
                this.renderPlot(graph.containerId, graph.data, graph.title, graph.curveColors);
            } else {
                const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
                if (data) {
                    graph.data = data;
                    this.renderPlot(graph.containerId, data, graph.title, graph.curveColors);
                }
            }
        } else {
            content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }

        this.updateInspector();
    },

    /**
     * Добавить кривую на последний график.
     */
    addCurveToLastGraph: function(yVariable) {
        const graphIds = Object.keys(this.graphs);

        if (graphIds.length === 0) {
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable], null, 'auto');
            return;
        }

        const lastGraphId = graphIds[graphIds.length - 1];
        const graph = this.graphs[lastGraphId];

        const container = document.getElementById(graph.containerId);
        if (!container) {
            delete this.graphs[lastGraphId];
            this.updateInspector();
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable], null, 'auto');
            return;
        }

        const placeholder = container.querySelector('.window-placeholder, .cesium-placeholder');
        if (placeholder) {
            delete this.graphs[lastGraphId];
            this.updateInspector();
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable], null, 'auto');
            return;
        }

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

        if (graph.yVariables.includes(yVariable)) {
            if (window.TabManager) {
                TabManager.logToConsole('Переменная уже на графике', 'warning');
            }
            return;
        }

        const container = document.getElementById(graph.containerId);
        if (!container) {
            if (window.TabManager) {
                TabManager.logToConsole('Контейнер графика не найден', 'error');
            }
            return;
        }

        graph.yVariables.push(yVariable);

        const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
        if (!data) return;

        graph.data = data;

        this.assignCurveColors(graph);
        this.renderPlot(graph.containerId, data, graph.title, graph.curveColors);

        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('Кривая "' + yVariable + '" добавлена на график');
        }
    },

    /**
     * Загрузить данные для графика с сервера.
     */
    async fetchPlotData(xVariable, yVariables) {
        try {
            const response = await fetch('/api/plots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
     * Отрисовать график через Plotly с учётом цветов кривых и темы.
     */
    renderPlot(containerId, data, title, curveColors) {
        // Получаем настройки для текущей темы
        const theme = this.getPlotTheme();

        const traces = data.curves.map(function(curve, index) {
            let color;
            if (curveColors && curveColors[curve.name]) {
                color = curveColors[curve.name];
            } else {
                color = this.getCurveColor(index);
            }

            return {
                x: data.x,
                y: curve.y,
                type: 'scatter',
                mode: 'lines',
                name: curve.name + (curve.unit ? ' [' + curve.unit + ']' : ''),
                line: {
                    color: color,
                    width: 2
                },
            };
        }.bind(this));

        const layout = {
            title: {
                text: title,
                font: { color: theme.font_color, size: 14 },
            },
            paper_bgcolor: theme.paper_bgcolor,
            plot_bgcolor: theme.plot_bgcolor,
            font: { color: theme.font_color },
            xaxis: {
                title: data.x_name + (data.x_unit ? ' [' + data.x_unit + ']' : ''),
                titlefont: { color: theme.axis_title_color },
                gridcolor: theme.gridcolor,
                zerolinecolor: theme.zerolinecolor,
                tickfont: { color: theme.font_color },
            },
            yaxis: {
                gridcolor: theme.gridcolor,
                zerolinecolor: theme.zerolinecolor,
                tickfont: { color: theme.font_color },
            },
            margin: { l: 60, r: 20, t: 40, b: 50 },
            showlegend: true,
            legend: { font: { color: theme.font_color } },
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
     */
    updateInspector: function() {
        const widget = document.getElementById('graph-inspector-widget');
        if (!widget) return;

        const graphIds = Object.keys(this.graphs);

        if (graphIds.length === 0) {
            widget.innerHTML = '<p style="color: var(--text-secondary, #858585); font-size: 12px; padding: 12px;">' +
                               '<span class="placeholder">(нет открытых графиков)</span></p>';
            return;
        }

        let html = '<div style="padding: 4px 0;">';

        graphIds.forEach(function(id) {
            const graph = this.graphs[id];
            const isChecked = graph.active ? 'checked' : '';

            html += '<div style="display: flex; align-items: center; padding: 8px 10px; ' +
                        'border-bottom: 1px solid var(--border-light, #2d2d2d); ' +
                        'background: ' + (graph.active ? 'var(--bg-tertiary, #2d2d2d)' : 'transparent') + ';">';

            html += '<input type="checkbox" ' + isChecked + ' ' +
                        'onchange="PlotManager.toggleGraph(' + id + ')" ' +
                        'style="margin-right: 10px; cursor: pointer; flex-shrink: 0;">';

            html += '<div style="flex: 1; min-width: 0; cursor: pointer;" ' +
                        'onclick="PlotManager.focusGraph(' + id + ')">';
            html += '<div style="font-weight: bold; color: var(--text-primary, #cccccc); font-size: 12px; ' +
                        'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' +
                        graph.title + '</div>';
            html += '<div style="font-size: 10px; color: var(--text-secondary, #858585); margin-top: 2px;">' +
                        'Окно: ' + graph.windowId + ' · ' +
                        graph.yVariables.length + ' крив.' +
                        '</div>';
            html += '</div>';

            html += '<div style="display: flex; gap: 4px; margin-left: 8px; flex-shrink: 0;">';

            html += '<button onclick="PlotDialog.openEdit(' + id + ')" ' +
                        'title="Настройки" ' +
                        'style="background: transparent; border: none; color: var(--text-secondary, #858585); ' +
                        'cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 3px;" ' +
                        'onmouseover="this.style.color=\'var(--text-primary, #cccccc)\'; this.style.background=\'#3c3c3c\'" ' +
                        'onmouseout="this.style.color=\'var(--text-secondary, #858585)\'; this.style.background=\'transparent\'">' +
                        '</button>';

            html += '<button onclick="PlotManager.removeGraph(' + id + ')" ' +
                        'title="Удалить" ' +
                        'style="background: transparent; border: none; color: var(--text-secondary, #858585); ' +
                        'cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 3px;" ' +
                        'onmouseover="this.style.color=\'#f44747\'; this.style.background=\'#3c3c3c\'" ' +
                        'onmouseout="this.style.color=\'var(--text-secondary, #858585)\'; this.style.background=\'transparent\'">' +
                        '</button>';

            html += '</div>';
            html += '</div>';
        }.bind(this));

        html += '</div>';

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
            windowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * Удалить график.
     */
    removeGraph: function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (windowElement) {
            const content = windowElement.querySelector('.window-content');
            content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }

        delete this.graphs[graphId];

        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + graph.title + '" удалён');
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
     * Очистить конкретное окно.
     */
    clearWindow: function(windowId) {
        const windowIdStr = String(windowId);

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

        if (foundGraph && foundId) {
            delete this.graphs[foundId];

            if (window.TabManager) {
                TabManager.logToConsole('График "' + foundGraph.title + '" очищен');
            }
        }

        this.updateInspector();

        if (window.WindowManager && window.WindowManager.clearWindow) {
            window.WindowManager.clearWindow(windowId);
        }
    },

    /**
     * Перерисовать все активные графики с новой темой.
     * Вызывается при переключении темы.
     */
    redrawAllPlots: function() {
        const graphIds = Object.keys(this.graphs);

        graphIds.forEach(function(id) {
            const graph = this.graphs[id];

            // Перерисовываем только активные графики (которые видны)
            if (graph.active && graph.data) {
                this.renderPlot(graph.containerId, graph.data, graph.title, graph.curveColors);
            }
        }.bind(this));

        if (window.TabManager) {
            TabManager.logToConsole('Графики перерисованы для новой темы');
        }
    },
};

window.PlotManager = PlotManager;