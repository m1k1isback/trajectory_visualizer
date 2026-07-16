/**
 * ============================================================================
 * FileTabManager.js — Управление вкладками файлов в нижней панели
 * ============================================================================
 */

const FileTabManager = {
    /**
     * Обновить вкладки файлов в нижней панели.
     */
    updateTabs: function() {
        const tabsContainer = document.getElementById('file-tabs-container');
        if (!tabsContainer) return;
        
        const datasets = window.datasets || {};
        const activeId = window.activeDatasetId;
        
        let html = '';
        
        Object.keys(datasets).forEach(function(id) {
            const dataset = datasets[id];
            const isActive = id === activeId ? 'active' : '';
            
            html += '<div class="file-tab ' + isActive + '" data-dataset-id="' + id + '">';
            html += '<span class="file-tab-name" onclick="FileTabManager.switchFile(\'' + id + '\')">' + 
                    dataset.name + '</span>';
            html += '<button class="file-tab-close" onclick="event.stopPropagation(); FileTabManager.removeFile(\'' + id + '\')" title="Удалить">×</button>';
            html += '</div>';
        });
        
        // Кнопка добавления нового файла
        html += '<button class="file-tab-add" onclick="document.getElementById(\'file-input\').click()" title="Загрузить файл">+</button>';
        
        tabsContainer.innerHTML = html;
    },
    
    /**
     * Переключить активный файл.
     */
    switchFile: function(datasetId) {
        if (!window.datasets[datasetId]) return;
        
        window.activeDatasetId = datasetId;
        window.currentDatasetId = datasetId;
        window.currentDatasetColumns = window.datasets[datasetId].column_names;
        
        // Обновляем вкладки
        this.updateTabs();
        
        // Обновляем таблицу и статистику для активного файла
        const result = window.datasets[datasetId];
        if (window.FileLoader) {
            FileLoader.updateFileProperties(result);
            FileLoader.updateStatistics(result);
            FileLoader.updateDataTable(result);
        }
        
        // Обновляем свойства файла в левой панели
        if (window.PropertyPanel) {
            PropertyPanel.update(result);
        }
        
        if (window.TabManager) {
            TabManager.logToConsole('Активный файл: ' + result.name);
        }
    },
    
    /**
     * Удалить файл.
     */
    removeFile: function(datasetId) {
    const datasets = window.datasets || {};
    const dataset = datasets[datasetId];
    
    if (!dataset) return;
    
    // Проверяем есть ли графики этого файла
    const hasGraphs = Object.values(window.PlotManager.graphs || {}).some(g => g.dataset_id === datasetId);
    
    let confirmMsg = 'Удалить файл "' + dataset.name + '"?';
    if (hasGraphs) {
        confirmMsg += '\n\nВНИМАНИЕ: Будут удалены все графики этого файла!';
    }
    
    if (!confirm(confirmMsg)) return;
    
    // Удаляем графики этого файла
    if (hasGraphs && window.PlotManager) {
        // Используем новую функцию removeGraphsByDataset
        if (PlotManager.removeGraphsByDataset) {
            PlotManager.removeGraphsByDataset(datasetId);
        } else {
            // Fallback если функция еще не добавлена
            Object.keys(window.PlotManager.graphs).forEach(function(graphId) {
                const graph = window.PlotManager.graphs[graphId];
                if (graph.dataset_id === datasetId) {
                    window.PlotManager.removeGraph(graphId);
                }
            });
        }
    }
    
    // === ДОБАВЛЕНО: Удаляем траекторию из Cesium ===
    if (window.CesiumViewer) {
        CesiumViewer.removeTrajectory('trajectory-' + datasetId);
        // Также удаляем цвет из хранилища
        if (CesiumViewer.trajectoryColors) {
            delete CesiumViewer.trajectoryColors[datasetId];
        }
    }
    
    // Удаляем из datasets
    delete window.datasets[datasetId];
    
    // Если удалили активный — переключаемся на другой
    if (window.activeDatasetId === datasetId) {
        const remainingIds = Object.keys(window.datasets);
        if (remainingIds.length > 0) {
            this.switchFile(remainingIds[0]);
        } else {
            window.activeDatasetId = null;
            window.currentDatasetId = null;
            window.currentDatasetColumns = null;
        }
    }
    
    // Обновляем вкладки
    this.updateTabs();
    
    if (window.TabManager) {
        TabManager.logToConsole('Файл "' + dataset.name + '" удалён');
    }
}
};

window.FileTabManager = FileTabManager;