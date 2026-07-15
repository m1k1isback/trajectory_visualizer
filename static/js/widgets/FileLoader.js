/**
 * ============================================================================
 * FileLoader.js — Загрузка файлов и управление данными
 * ============================================================================
 */

const FileLoader = {
    async handleFile(file) {
    if (!file) return;

    if (window.TabManager) {
        TabManager.logToConsole('Загрузка файла: ' + file.name);
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('original_name', file.name);  // ← ПЕРЕДАЁМ ИМЯ ФАЙЛА

        console.log('[FileLoader] Отправляю файл:', file.name);
        
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        console.log('[FileLoader] Статус:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[FileLoader] Ошибка:', errorText);
            throw new Error('HTTP ' + response.status + ': ' + errorText);
        }

        const result = await response.json();
        console.log('[FileLoader] Получен ответ:', result);

        // === СОХРАНЕНИЕ ДАННЫХ ===
        if (!window.datasets) {
            window.datasets = {};
        }
        
        // Обработка дубликатов имён
        let finalName = result.name;
        let counter = 1;
        while (Object.values(window.datasets).some(d => d.name === finalName)) {
            finalName = result.name + ' (' + counter + ')';
            counter++;
        }
        result.name = finalName;
        
        window.datasets[result.dataset_id] = result;
        window.activeDatasetId = result.dataset_id;
        window.currentDatasetId = result.dataset_id;
        window.currentDatasetColumns = result.column_names || [];
        
        if (window.TabManager) {
            TabManager.logToConsole(
                'Файл "' + result.name + '" загружен (всего: ' + 
                Object.keys(window.datasets).length + ')'
            );
        }
        
        this.updateFileProperties(result);
        this.updateStatistics(result);
        this.updateDataTable(result);
        
        if (window.FileTabManager) {
            FileTabManager.updateTabs();
        }
        
        if (window.CesiumViewer && CesiumViewer.initialized) {
            CesiumViewer.loadTrajectoryFromFile(result.dataset_id);
        }

    } catch (error) {
        console.error('[FileLoader] ОШИБКА:', error);
        if (window.TabManager) {
            TabManager.logToConsole('Ошибка загрузки: ' + error.message, 'error');
        }
    }
},
    /**
     * Обновить свойства файла в левой панели.
     */
    updateFileProperties: function(result) {
        const widget = document.getElementById('file-properties-widget');
        if (!widget) return;

        let html = '<p><strong>Имя:</strong> ' + result.name + '</p>';
        html += '<p><strong>Строк:</strong> ' + result.row_count + '</p>';
        html += '<p><strong>Столбцов:</strong> ' + result.column_count + '</p>';
        html += '<p><strong>Валиден:</strong> ' + (result.is_valid ? 'Да' : 'Нет') + '</p>';

        if (result.invalid_values && result.invalid_values.length > 0) {
            html += '<p style="color: var(--warning-color, #dcdcaa);"><strong>Нечисловых значений:</strong> ' + 
                    result.invalid_values.length + '</p>';
        }

        if (result.malformed_rows && result.malformed_rows.length > 0) {
            html += '<p style="color: var(--warning-color, #dcdcaa);"><strong>Некорректных строк:</strong> ' + 
                    result.malformed_rows.length + '</p>';
        }

        widget.innerHTML = html;
    },

    /**
     * Обновить статистику.
     */
    updateStatistics: function(result) {
        const tabStats = document.getElementById('tab-statistics');
        if (!tabStats) return;

        if (!result.statistics || result.statistics.length === 0) {
            tabStats.innerHTML = '<div class="tab-placeholder">Статистика недоступна</div>';
            return;
        }

        let html = '<table class="statistics-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">';
        html += '<thead><tr style="background: var(--bg-tertiary, #2d2d2d);">';
        html += '<th style="padding: 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: left;">Переменная</th>';
        html += '<th style="padding: 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">Min</th>';
        html += '<th style="padding: 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">Max</th>';
        html += '<th style="padding: 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">Среднее</th>';
        html += '<th style="padding: 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">Std</th>';
        html += '</tr></thead><tbody>';

        result.statistics.forEach(function(stat) {
            html += '<tr>';
            html += '<td style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c);">' + stat.name + '</td>';
            html += '<td style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">' + 
                    (stat.min !== null ? stat.min.toFixed(4) : 'N/A') + '</td>';
            html += '<td style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">' + 
                    (stat.max !== null ? stat.max.toFixed(4) : 'N/A') + '</td>';
            html += '<td style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">' + 
                    (stat.mean !== null ? stat.mean.toFixed(4) : 'N/A') + '</td>';
            html += '<td style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">' + 
                    (stat.std !== null ? stat.std.toFixed(4) : 'N/A') + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        tabStats.innerHTML = html;
    },

    /**
     * Обновить таблицу данных.
     */
    updateDataTable: function(result) {
    const tabTable = document.getElementById('tab-table');
    if (!tabTable) return;

    if (!result.data || result.data.length === 0) {
        tabTable.innerHTML = '<div class="tab-placeholder">Таблица данных (загрузите файл)</div>';
        return;
    }

    let html = '<div style="overflow: auto; max-height: 100%;">';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: monospace;">';
    
    // Заголовок
    html += '<thead><tr style="background: var(--bg-tertiary, #2d2d2d); position: sticky; top: 0;">';
    html += '<th style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c);">#</th>';
    result.column_names.forEach(function(col) {
        html += '<th style="padding: 4px 6px; border: 1px solid var(--border-color, #3c3c3c); white-space: nowrap;">' + col + '</th>';
    });
    html += '</tr></thead><tbody>';

    // ВСЕ данные (без ограничения!)
    result.data.forEach(function(row, i) {
        html += '<tr>';
        html += '<td style="padding: 2px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right; color: var(--text-secondary, #858585);">' + 
                (i + 1) + '</td>';
        row.forEach(function(val) {
            const displayVal = (val === null || val === undefined || isNaN(val)) ? 'NaN' : val;
            html += '<td style="padding: 2px 6px; border: 1px solid var(--border-color, #3c3c3c); text-align: right;">' + 
                    displayVal + '</td>';
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    tabTable.innerHTML = html;
}
};

window.FileLoader = FileLoader;

// Обработчик выбора файла
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                FileLoader.handleFile(file);
            }
            // Сброс input чтобы можно было загрузить тот же файл повторно
            e.target.value = '';
        });
    }

    // Горячая клавиша Ctrl+O
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'o') {
            event.preventDefault();
            document.getElementById('file-input').click();
        }
    });
});