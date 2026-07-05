// PlotManager.js - Отрисовка 2D графиков через Plotly

const PlotManager = {
    async drawPlot(containerId, datasetId, xVariable, yVariables) {
        try {
            const response = await fetch('/api/plots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataset_id: datasetId,
                    x_variable: xVariable || null,
                    y_variables: yVariables,
                }),
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error('HTTP ' + response.status + ': ' + error);
            }
            
            const data = await response.json();
            
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
                    text: data.title,
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
            
            if (window.TabManager) {
                TabManager.logToConsole('График "' + data.title + '" построен');
            }
            
        } catch (error) {
            console.error('PlotManager error:', error);
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка построения графика: ' + error.message, 'error');
            }
        }
    },
    
    async drawInFirstWindow(datasetId, xVariable, yVariables) {
        if (!datasetId) {
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: dataset_id не передан', 'error');
            }
            return;
        }
        
        const windows = document.querySelectorAll('.scene-window:not(.closed)');
        let targetWindow = null;
        
        for (const win of windows) {
            const content = win.querySelector('.window-content');
            const placeholder = content.querySelector('.window-placeholder');
            if (placeholder) {
                targetWindow = win;
                break;
            }
        }
        
        if (!targetWindow && windows.length > 0) {
            targetWindow = windows[0];
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
        
        await this.drawPlot(containerId, datasetId, xVariable, yVariables);
    },
    
        clearWindow: function(windowId) {
        if (window.WindowManager && window.WindowManager.clearWindow) {
            window.WindowManager.clearWindow(windowId);
        } else {
            console.error('WindowManager не загружен');
        }
    },
    
    clearAll: function() {
        const windows = document.querySelectorAll('.scene-window:not(.closed)');
        let clearedCount = 0;
        
        windows.forEach(function(win) {
            const content = win.querySelector('.window-content');
            if (!content) return;
            
            const placeholder = content.querySelector('.window-placeholder, .cesium-placeholder');
            if (placeholder) return;
            
            const isCesium = win.classList.contains('window-cesium');
            
            if (isCesium) {
                content.innerHTML = '<div class="cesium-placeholder">Cesium Viewer</div>';
            } else {
                content.innerHTML = '<div class="window-placeholder">2D/3D визуализация</div>';
            }
            
            clearedCount++;
        });
        
        if (window.TabManager) {
            if (clearedCount > 0) {
                TabManager.logToConsole('Очищено графиков: ' + clearedCount);
            } else {
                TabManager.logToConsole('Нет графиков для очистки');
            }
        }
    },
};

window.PlotManager = PlotManager;