/**
 * PlotManager.js - Управление графиками через Plotly
 */

const PlotManager = {
    graphs: {},
    nextGraphId: 1,
    
    async createPlot(xVariable, yVariables, customTitle) {
        if (!window.currentDatasetId) {
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: нет загруженных данных', 'error');
            }
            return;
        }
        
        const graphId = this.nextGraphId++;
        const title = customTitle || yVariables.join(', ') + ' от ' + xVariable;
        
        const targetWindow = this.findFreeWindow();
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
        
        this.renderPlot(containerId, data, title);
        
        this.graphs[graphId] = {
            id: graphId,
            windowId: targetWindow.dataset.windowId,
            containerId: containerId,
            xVariable: xVariable,
            yVariables: yVariables,
            title: title,
            data: data,
        };
        
        this.updateInspector();
        
        if (window.TabManager) {
            TabManager.logToConsole('График "' + title + '" создан');
        }
    },
    
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
        
        graph.yVariables.push(yVariable);
        
        const data = await this.fetchPlotData(graph.xVariable, graph.yVariables);
        if (!data) return;
        
        graph.data = data;
        
        this.renderPlot(graph.containerId, data, graph.title);
        
        this.updateInspector();
        
        if (window.TabManager) {
            TabManager.logToConsole('Кривая "' + yVariable + '" добавлена на график');
        }
    },
    
    addCurveToLastGraph: function(yVariable) {
        const graphIds = Object.keys(this.graphs);
        
        if (graphIds.length === 0) {
            const xVar = window.currentDatasetColumns ? window.currentDatasetColumns[0] : 'h';
            this.createPlot(xVar, [yVariable]);
            return;
        }
        
        const lastGraphId = graphIds[graphIds.length - 1];
        this.addCurveToGraph(lastGraphId, yVariable);
    },
    
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
    
    renderPlot(containerId, data, title) {
        const traces = data.curves.map(function(curve) {
            return {
                x: data.x,
                y: curve.y,
                type: 'scatter',
                mode: 'lines',
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
    
    updateInspector: function() {
        const widget = document.getElementById('graph-inspector-widget');
        if (!widget) return;
        
        const graphIds = Object.keys(this.graphs);
        
        if (graphIds.length === 0) {
            widget.innerHTML = '<p><span class="placeholder">(нет открытых графиков)</span></p>';
            return;
        }
        
        let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
        
        graphIds.forEach(function(id) {
            const graph = this.graphs[id];
            
            html += '<li style="padding: 8px; border-bottom: 1px solid #2d2d2d; cursor: pointer;" ' +
                        'onmouseover="this.style.backgroundColor=\'#2d2d2d\'" ' +
                        'onmouseout="this.style.backgroundColor=\'transparent\'" ' +
                        'onclick="PlotManager.focusGraph(' + id + ')">';
            
            html += '<div style="font-weight: bold; color: #cccccc; font-size: 12px;">' + graph.title + '</div>';
            html += '<div style="font-size: 11px; color: #858585; margin-top: 4px;">X: ' + graph.xVariable + '</div>';
            html += '<div style="font-size: 11px; color: #858585;">Y: ' + graph.yVariables.join(', ') + '</div>';
            
            html += '<button onclick="event.stopPropagation(); PlotManager.removeGraph(' + id + ')" ' +
                        'style="margin-top: 5px; padding: 2px 8px; background: #f44747; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">Удалить</button>';
            
            html += '</li>';
        }.bind(this));
        
        html += '</ul>';
        
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
            const content = windowElement.querySelector('.window-content');
            content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
        }
        
        delete this.graphs[graphId];
        
        this.updateInspector();
        
        if (window.TabManager) {
            TabManager.logToConsole('График удалён');
        }
    },
    
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
    
    clearWindow: function(windowId) {
        if (window.WindowManager && window.WindowManager.clearWindow) {
            window.WindowManager.clearWindow(windowId);
        }
    },
};

window.PlotManager = PlotManager;