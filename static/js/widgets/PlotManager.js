/**
 * ============================================================================
 * PlotManager.js — Управление графиками через Plotly (с поддержкой нескольких файлов)
 * ============================================================================
 */

// === ПАЛИТРА ЦВЕТОВ ДЛЯ КРИВЫХ ===
const CURVE_COLORS = [
    '#4ec9b0',
    '#569cd6',
    '#ce9178',
    '#c586c0',
    '#dcdcaa',
    '#f44747',
    '#9cdcfe',
    '#d4d4d4',
    '#b5cea8',
    '#d16969',
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

    getCurveColor: function(index) {
        return CURVE_COLORS[index % CURVE_COLORS.length];
    },

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

    getCurrentTheme: function() {
        if (document.body.classList.contains('light-theme')) {
            return 'light';
        }
        return 'dark';
    },

    getPlotTheme: function() {
        return PLOT_THEMES[this.getCurrentTheme()];
    },

    /**
     * Создать новый график.
     * datasetId — ID файла-источника (последний параметр)
     */
    async createPlot(xVariable, yVariables, customTitle, targetWindowId, curveColors, lineStyles, lineWidths, markerSymbols, markerSizes, markerSteps, datasetId) {
        // Если datasetId не передан — используем активный
        if (!datasetId) {
            datasetId = window.currentDatasetId;
        }

        const dataset = window.datasets[datasetId];
        if (!dataset) {
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: файл не найден', 'error');
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

        // Передаем datasetId в fetchPlotData
        const data = await this.fetchPlotData(xVariable, yVariables, datasetId);
        if (!data) return;

        this.graphs[graphId] = {
            id: graphId,
            windowId: targetWindow.dataset.windowId,
            containerId: containerId,
            dataset_id: datasetId,        // ← Сохраняем ID файла
            dataset_name: dataset.name,   // ← Сохраняем имя файла
            xVariable: xVariable,
            yVariables: yVariables,
            title: title,
            data: data,
            active: true,
            curveColors: curveColors || {},
            lineStyles: lineStyles || {},
            lineWidths: lineWidths || {},
            markerSymbols: markerSymbols || {},
            markerSizes: markerSizes || {},
            markerSteps: markerSteps || {}
        };

        this.assignCurveColors(this.graphs[graphId]);
        this.renderPlot(containerId, data, title, this.graphs[graphId]);
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + title + '" создан [' + dataset.name + ']');
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
        if (updates.lineStyles) graph.lineStyles = updates.lineStyles;
        if (updates.lineWidths) graph.lineWidths = updates.lineWidths;
        if (updates.markerSymbols) graph.markerSymbols = updates.markerSymbols;
        if (updates.markerSizes) graph.markerSizes = updates.markerSizes;
        if (updates.markerSteps) graph.markerSteps = updates.markerSteps;

        // Если меняется файл — обновляем dataset_id и dataset_name
        if (updates.dataset_id && updates.dataset_id !== graph.dataset_id) {
            const newDataset = window.datasets[updates.dataset_id];
            if (newDataset) {
                graph.dataset_id = updates.dataset_id;
                graph.dataset_name = newDataset.name;
            }
        }

        if (updates.windowId && updates.windowId !== graph.windowId) {
            const oldWindow = document.querySelector('[data-window-id="' + graph.windowId + '"]');
            if (oldWindow) {
                oldWindow.querySelector('.window-content').innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            }

            const newWindow = document.querySelector('[data-window-id="' + updates.windowId + '"]');
            if (newWindow) {
                graph.windowId = updates.windowId;
                graph.containerId = 'plot-' + updates.windowId;
                const content = newWindow.querySelector('.window-content');
                content.innerHTML = '<div id="' + graph.containerId + '" style="width:100%;height:100%;"></div>';
                await new Promise(function(resolve) { setTimeout(resolve, 50); });
                const data = await this.fetchPlotData(graph.xVariable, graph.yVariables, graph.dataset_id);
                if (data) {
                    graph.data = data;
                    this.renderPlot(graph.containerId, data, graph.title, graph);
                }
            }
        } else {
            const data = await this.fetchPlotData(graph.xVariable, graph.yVariables, graph.dataset_id);
            if (data) {
                graph.data = data;
                this.renderPlot(graph.containerId, data, graph.title, graph);
            }
        }

        this.updateInspector();
        if (window.TabManager) {
            TabManager.logToConsole('График "' + graph.title + '" обновлён');
        }
    },

    toggleGraph: async function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        graph.active = !graph.active;
        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (!windowElement) return;

        const content = windowElement.querySelector('.window-content');

        if (graph.active) {
            Object.keys(this.graphs).forEach(function(otherId) {
                if (otherId !== String(graphId) && this.graphs[otherId].windowId === graph.windowId) {
                    this.graphs[otherId].active = false;
                }
            }.bind(this));

            content.innerHTML = '<div id="' + graph.containerId + '" style="width:100%;height:100%;"></div>';
            await new Promise(function(resolve) { setTimeout(resolve, 50); });

            if (graph.data) {
                this.renderPlot(graph.containerId, graph.data, graph.title, graph);
            } else {
                const data = await this.fetchPlotData(graph.xVariable, graph.yVariables, graph.dataset_id);
                if (data) {
                    graph.data = data;
                    this.renderPlot(graph.containerId, data, graph.title, graph);
                }
            }
        } else {
            content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }

        this.updateInspector();
    },

    addCurveToLastGraph: function(yVariable) {
        const graphIds = Object.keys(this.graphs);

        if (graphIds.length === 0) {
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable], null, 'auto', null, null, null, null, null, null, window.currentDatasetId);
            return;
        }

        const lastGraphId = graphIds[graphIds.length - 1];
        const graph = this.graphs[lastGraphId];
        const container = document.getElementById(graph.containerId);

        if (!container || container.querySelector('.window-placeholder, .cesium-placeholder')) {
            delete this.graphs[lastGraphId];
            this.updateInspector();
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable], null, 'auto', null, null, null, null, null, null, window.currentDatasetId);
            return;
        }

        this.addCurveToGraph(lastGraphId, yVariable);
    },

    async addCurveToGraph(graphId, yVariable) {
        const graph = this.graphs[graphId];
        if (!graph) return;
        if (graph.yVariables.includes(yVariable)) return;

        const container = document.getElementById(graph.containerId);
        if (!container) return;

        graph.yVariables.push(yVariable);
        // Используем dataset_id конкретного графика
        const data = await this.fetchPlotData(graph.xVariable, graph.yVariables, graph.dataset_id);
        if (!data) return;

        graph.data = data;
        this.assignCurveColors(graph);
        this.renderPlot(graph.containerId, data, graph.title, graph);
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('Кривая "' + yVariable + '" добавлена');
        }
    },

    /**
     * Загрузить данные для графика с сервера.
     * datasetId — ID файла-источника
     */
    async fetchPlotData(xVariable, yVariables, datasetId) {
        try {
            const response = await fetch('/api/plots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataset_id: datasetId,  // ← Используем переданный ID
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

    renderPlot(containerId, data, title, graph) {
        const theme = this.getPlotTheme();
        const curveColors = graph.curveColors || {};
        const lineStyles = graph.lineStyles || {};
        const lineWidths = graph.lineWidths || {};
        const markerSymbols = graph.markerSymbols || {};
        const markerSizes = graph.markerSizes || {};
        const markerSteps = graph.markerSteps || {};

        const traces = data.curves.map(function(curve, index) {
            const color = curveColors[curve.name] || this.getCurveColor(index);
            const lineStyle = lineStyles[curve.name] || 'solid';
            const lineWidth = lineWidths[curve.name] || 2;
            const markerSymbol = markerSymbols[curve.name] || 'none';
            const markerSize = markerSizes[curve.name] || 6;
            const markerStep = markerSteps[curve.name] || 1;

            const trace = {
                x: data.x,
                y: curve.y,
                type: 'scatter',
                mode: 'lines',
                name: curve.name + (curve.unit ? ' [' + curve.unit + ']' : ''),
                line: {
                    color: color,
                    width: lineWidth,
                    dash: lineStyle
                },
            };

            if (markerSymbol !== 'none') {
                trace.mode = 'lines+markers';
                const totalPoints = data.x.length;
                const sizes = new Array(totalPoints).fill(0);

                for (let i = 0; i < totalPoints; i += markerStep) {
                    sizes[i] = markerSize;
                }

                trace.marker = {
                    symbol: markerSymbol,
                    size: sizes,
                    color: color,
                    line: { color: color, width: 1 }
                };
            }

            return trace;
        }.bind(this));

        const layout = {
            title: { text: title, font: { color: theme.font_color, size: 14 } },
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

    findFreeWindow: function() {
        const windows = document.querySelectorAll('.scene-window:not(.closed)');
        for (const win of windows) {
            const placeholder = win.querySelector('.window-content .window-placeholder');
            if (placeholder) return win;
        }
        return windows.length > 0 ? windows[0] : null;
    },

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
            
            // ← ДОБАВЛЕНО: Отображение имени файла
            html += '<div style="font-size: 10px; color: var(--text-secondary, #858585); margin-top: 2px;">' +
                        'Окно: ' + graph.windowId + ' · ' + graph.yVariables.length + ' крив. · ' + 
                        (graph.dataset_name || 'Неизвестный файл') +
                        '</div>';
            html += '</div>';

            html += '<div style="display: flex; gap: 4px; margin-left: 8px; flex-shrink: 0;">';

            html += '<button onclick="PlotDialog.openEdit(' + id + ')" ' +
                        'title="Настройки" ' +
                        'style="background: transparent; border: none; color: var(--text-secondary, #858585); ' +
                        'cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 3px; ' +
                        'display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;">' +
                        '⚙</button>';

            html += '<button onclick="PlotManager.removeGraph(' + id + ')" ' +
                        'title="Удалить" ' +
                        'style="background: transparent; border: none; color: var(--text-secondary, #858585); ' +
                        'cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 3px; ' +
                        'display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<polyline points="3 6 5 6 21 6"></polyline>' +
                        '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
                        '<line x1="10" y1="11" x2="10" y2="17"></line>' +
                        '<line x1="14" y1="11" x2="14" y2="17"></line>' +
                        '</svg>' +
                        '</button>';

            html += '</div>';
            html += '</div>';
        }.bind(this));

        html += '</div>';
        widget.innerHTML = html;
    },

    focusGraph: function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;
        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (windowElement) {
            windowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    removeGraph: function(graphId) {
        const graph = this.graphs[graphId];
        if (!graph) return;

        const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
        if (windowElement) {
            windowElement.querySelector('.window-content').innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }

        delete this.graphs[graphId];
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('График "' + graph.title + '" удалён');
        }
    },

    clearAll: function() {
        Object.keys(this.graphs).forEach(function(id) {
            const graph = this.graphs[id];
            const windowElement = document.querySelector('[data-window-id="' + graph.windowId + '"]');
            if (windowElement) {
                windowElement.querySelector('.window-content').innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            }
        }.bind(this));

        this.graphs = {};
        this.updateInspector();

        if (window.TabManager) {
            TabManager.logToConsole('Все графики очищены');
        }
    },

    clearWindow: function(windowId) {
        const windowIdStr = String(windowId);
        let foundGraph = null;
        let foundId = null;

        Object.keys(this.graphs).forEach(function(id) {
            if (String(this.graphs[id].windowId) === windowIdStr) {
                foundGraph = this.graphs[id];
                foundId = id;
            }
        }.bind(this));

        if (foundGraph && foundId) {
            delete this.graphs[foundId];
            if (window.TabManager) {
                TabManager.logToConsole('График "' + foundGraph.title + '" очищен');
            }
        }

        this.updateInspector();

        const windowElement = document.querySelector('[data-window-id="' + windowIdStr + '"]');
        if (windowElement) {
            const content = windowElement.querySelector('.window-content');
            if (content) {
                content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'window-content';
                placeholder.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
                windowElement.appendChild(placeholder);
            }
        }
    },

    redrawAllPlots: function() {
        Object.keys(this.graphs).forEach(function(id) {
            const graph = this.graphs[id];
            if (graph.active && graph.data) {
                this.renderPlot(graph.containerId, graph.data, graph.title, graph);
            }
        }.bind(this));

        if (window.TabManager) {
            TabManager.logToConsole('Графики перерисованы для новой темы');
        }
    },
};

window.PlotManager = PlotManager;