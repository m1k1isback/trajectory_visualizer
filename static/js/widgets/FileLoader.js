/**
 * FileLoader.js - Загрузка файлов на сервер через /api/upload
 */

// Глобальные переменные
window.currentDatasetId = null;
window.currentDatasetColumns = null;

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    
    if (!fileInput) {
        console.error('FileLoader: не найден input#file-input');
        return;
    }
    
    fileInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            log('Загрузка файла: ' + file.name + ' (' + formatBytes(file.size) + ')');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('original_name', file.name);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('HTTP ' + response.status + ': ' + errorText);
            }
            
            const result = await response.json();
            
            window.currentDatasetId = result.dataset_id;
            window.currentDatasetColumns = result.column_names;
            
            log('Файл "' + result.name + '" загружен: ' + result.row_count + ' строк, ' + result.column_count + ' столбцов');
            log('  Аргумент (X): ' + result.argument_name);
            log('  Переменных (Y): ' + result.variable_names.length);
            log('  Dataset ID: ' + result.dataset_id);
            
            if (result.validation_messages && result.validation_messages.length > 0) {
                result.validation_messages.forEach(function(msg) {
                    log('  [' + msg.severity + '] ' + msg.message,
                        msg.severity === 'ERROR' ? 'error' : 'warning');
                });
            }
            
            updateFileStructure(result);
            updateFileProperties(result);
            updateStatistics(result);
            updateDataTable(result);
            
        } catch (error) {
            log('Ошибка загрузки: ' + error.message, 'error');
            console.error(error);
        }
        
        fileInput.value = '';
    });
});

function updateFileStructure(result) {
    const widget = document.getElementById('file-structure-widget');
    if (!widget) return;
    
    let html = '<p><strong>Файл:</strong> ' + result.name + '</p>';
    html += '<p><strong>Аргумент (X):</strong> ' + result.argument_name + '</p>';
    html += '<p><strong>Переменные (Y):</strong> <span style="color: var(--text-secondary, #858585); font-size: 11px;">(клик — добавить на график)</span></p>';
    html += '<ul style="margin: 5px 0; padding-left: 20px; list-style: none;">';
    
    result.variable_names.forEach(function(varName) {
        const unit = result.units && result.units[varName] ? ' [' + result.units[varName] + ']' : '';
        html += '<li style="color: var(--text-primary, #cccccc); font-size: 12px; cursor: pointer; padding: 2px 4px;" ' +
                    'onclick="PlotManager.addCurveToLastGraph(\'' + varName + '\')" ' +
                    'onmouseover="this.style.backgroundColor=\'#2d2d2d\'" ' +
                    'onmouseout="this.style.backgroundColor=\'transparent\'">' +
                    '• ' + varName + unit +
                 '</li>';
    });
    
    html += '</ul>';
    
    widget.innerHTML = html;
}

function updateFileProperties(result) {
    const widget = document.getElementById('file-properties-widget');
    if (!widget) return;
    
    const isValidColor = result.is_valid ? '#4ec9b0' : '#f44747';
    const isValidText = result.is_valid ? 'Да' : 'Нет';
    
    let html = '<table style="width: 100%; font-size: 12px;">';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Строк:</td><td style="text-align: right; color: var(--text-primary, #cccccc);">' + result.row_count + '</td></tr>';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Столбцов:</td><td style="text-align: right; color: var(--text-primary, #cccccc);">' + result.column_count + '</td></tr>';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Валиден:</td><td style="text-align: right; color: ' + isValidColor + ';">' + isValidText + '</td></tr>';
    html += '</table>';
    
    widget.innerHTML = html;
}

function updateStatistics(result) {
    const statsTab = document.getElementById('tab-statistics');
    if (!statsTab || !result.statistics) return;
    
    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
    html += '<tr style="border-bottom: 1px solid var(--border-color, #3c3c3c);">';
    html += '<th style="padding: 6px; text-align: left; color: var(--text-primary, #cccccc);">Столбец</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Min</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Max</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Mean</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">NaN</th>';
    html += '</tr>';
    
    for (const colName in result.statistics) {
        const stats = result.statistics[colName];
        html += '<tr style="border-bottom: 1px solid var(--border-light, #2d2d2d);">';
        html += '<td style="padding: 6px; color: var(--text-primary, #cccccc);">' + colName + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' + formatNumber(stats.min) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' + formatNumber(stats.max) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' + formatNumber(stats.mean) + '</td>';
        
        const nanColor = stats.nan_count > 0 ? '#f44747' : 'var(--text-secondary, #858585)';
        html += '<td style="padding: 6px; text-align: right; color: ' + nanColor + ';">' + stats.nan_count + '</td>';
        
        html += '</tr>';
    }
    
    html += '</table>';
    
    statsTab.innerHTML = html;
}

function updateDataTable(result) {
    const tableTab = document.getElementById('tab-table');
    if (!tableTab || !result.data_sample) return;
    
    let html = '<div style="max-height: 100%; overflow-y: auto;">';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
    
    html += '<tr style="border-bottom: 1px solid var(--border-color, #3c3c3c);">';
    html += '<th style="padding: 6px; text-align: center; color: var(--text-primary, #cccccc); width: 50px; position: sticky; top: 0; background: var(--bg-primary, #1e1e1e);">№</th>';
    result.column_names.forEach(function(col) {
        html += '<th style="padding: 6px; text-align: left; color: var(--text-primary, #cccccc); position: sticky; top: 0; background: var(--bg-primary, #1e1e1e);">' + col + '</th>';
    });
    html += '</tr>';
    
    result.data_sample.forEach(function(row, index) {
        html += '<tr style="border-bottom: 1px solid var(--border-light, #2d2d2d);">';
        html += '<td style="padding: 4px 6px; text-align: center; color: var(--text-secondary, #858585); font-weight: bold;">' + (index + 1) + '</td>';
        
        row.forEach(function(cell) {
            let displayValue = '-';
            if (cell !== null && cell !== undefined) {
                displayValue = formatNumber(cell);
            }
            html += '<td style="padding: 4px 6px; color: var(--text-primary, #cccccc);">' + displayValue + '</td>';
        });
        
        html += '</tr>';
    });
    
    html += '</table>';
    html += '</div>';
    
    tableTab.innerHTML = html;
}

function log(message, type) {
    if (window.TabManager && TabManager.logToConsole) {
        TabManager.logToConsole(message);
    } else {
        console.log(message);
    }
}

function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    if (typeof num !== 'number') return String(num);
    if (Math.abs(num) < 0.001 || Math.abs(num) > 10000) {
        return num.toExponential(3);
    }
    return num.toFixed(3);
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

window.FileLoader = {
    updateFileStructure: updateFileStructure,
    updateFileProperties: updateFileProperties,
    updateStatistics: updateStatistics,
    updateDataTable: updateDataTable,
};