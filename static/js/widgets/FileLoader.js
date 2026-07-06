/**
 * FileLoader.js - Загрузка файлов на сервер через /api/upload
 *
 * ЭТОТ ФАЙЛ ОТВЕЧАЕТ ЗА:
 * - Слушает выбор файла пользователем (input[type="file"])
 * - Отправляет файл на сервер через fetch() с методом POST
 * - Получает JSON с данными от сервера
 * - Обновляет интерфейс: структура файла, свойства, статистика, таблица
 *
 * ПОТОК ДАННЫХ:
 * 1. Пользователь нажимает "Файл → Открыть файл..."
 * 2. Открывается системный диалог выбора файла
 * 3. Пользователь выбирает CSV/TXT файл
 * 4. Срабатывает обработчик события 'change'
 * 5. Создаём FormData с файлом
 * 6. Отправляем POST-запрос на /api/upload
 * 7. Получаем JSON с результатами парсинга
 * 8. Обновляем виджеты в интерфейсе
 *
 * СВЯЗЬ С ДРУГИМИ ФАЙЛАМИ:
 * - templates/index.html — содержит input#file-input
 * - api/files.py — принимает файл на сервере и парсит через ядро
 * - TabManager.js — логирует события в консоль приложения
 * - PlotManager.js — строит графики по клику на переменную
 */

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===

// Идентификатор последнего загруженного набора данных (Dataset)
// Нужен для построения графиков без повторной загрузки файла
window.currentDatasetId = null;

// Список всех столбцов загруженного файла
// Нужен для диалога создания графика и других функций
window.currentDatasetColumns = null;

// === ОБРАБОТЧИК ЗАГРУЗКИ ФАЙЛА ===

// Ждём полной загрузки DOM (все HTML-элементы готовы)
document.addEventListener('DOMContentLoaded', function() {
    // Находим скрытый input для выбора файла
    const fileInput = document.getElementById('file-input');

    // Проверяем, что элемент существует
    if (!fileInput) {
        console.error('FileLoader: не найден input#file-input в HTML');
        return;
    }

    // Подписываемся на событие 'change' — срабатывает когда пользователь выбрал файл
    fileInput.addEventListener('change', async function(event) {
        // Получаем первый выбранный файл (может быть несколько, но мы берём один)
        const file = event.target.files[0];

        // Если файл не выбран (пользователь нажал "Отмена") — выходим
        if (!file) return;

        try {
            // Логируем начало загрузки в консоль приложения
            log('Загрузка файла: ' + file.name + ' (' + formatBytes(file.size) + ')');

            // Создаём FormData с файлом и оригинальным именем
            const formData = new FormData();
            formData.append('file', file);
            formData.append('original_name', file.name);  // ← ДОБАВИТЬ ЭТУ СТРОКУ

            // Отправляем POST-запрос на сервер
            const response = await fetch('/api/upload', {
                method: 'POST',              // Метод POST (отправка данных)
                body: formData,              // Тело запроса — FormData с файлом
                // Заголовки Content-Type устанавливаются автоматически для FormData
            });

            // Проверяем статус ответа
            if (!response.ok) {
                // Если статус не 2xx (например, 400 или 500) — читаем текст ошибки
                const errorText = await response.text();
                throw new Error('HTTP ' + response.status + ': ' + errorText);
            }

            // Парсим JSON-ответ от сервера
            const result = await response.json();

            // Сохраняем идентификатор dataset для будущих запросов (графики и т.д.)
            window.currentDatasetId = result.dataset_id;

            // Сохраняем список всех столбцов
            window.currentDatasetColumns = result.column_names;

            // Логируем успешную загрузку
            log('Файл "' + result.name + '" загружен: ' + result.row_count + ' строк, ' + result.column_count + ' столбцов');
            log('  Аргумент (X): ' + result.argument_name);
            log('  Переменных (Y): ' + result.variable_names.length);
            log('  Dataset ID: ' + result.dataset_id);

            // Если есть предупреждения валидации — выводим их
            if (result.validation_messages && result.validation_messages.length > 0) {
                result.validation_messages.forEach(function(msg) {
                    log('  [' + msg.severity + '] ' + msg.message,
                        msg.severity === 'ERROR' ? 'error' : 'warning');
                });
            }

            // Обновляем интерфейс
            updateFileStructure(result);     // Левая панель — список переменных
            updateFileProperties(result);    // Левая панель — свойства файла
            updateStatistics(result);        // Вкладка "СТАТИСТИКА"
            updateDataTable(result);         // Вкладка "ТАБЛИЦА"

        } catch (error) {
            // Обработка ошибок (сетевые, серверные, парсинг JSON)
            log('Ошибка загрузки: ' + error.message, 'error');
            console.error(error);  // Также выводим в консоль браузера для отладки
        }

        // Сбрасываем значение input, чтобы можно было загрузить тот же файл снова
        // (иначе событие 'change' не сработает при повторном выборе того же файла)
        fileInput.value = '';
    });
});

// === ФУНКЦИИ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ===

function updateFileStructure(result) {
    /**
     * Обновить виджет "Структура файлов" в левой панели.
     *
     * ПОКАЗЫВАЕТ:
     * - Имя файла
     * - Аргумент (X) — первый столбец
     * - Список переменных (Y) — кликабельные, добавляют кривую на график
     */
    const widget = document.getElementById('file-structure-widget');
    if (!widget) return;  // Если виджет не найден — выходим

    let html = '<p><strong>Файл:</strong> ' + result.name + '</p>';
    html += '<p><strong>Аргумент (X):</strong> ' + result.argument_name + '</p>';
    html += '<p><strong>Переменные (Y):</strong> <span style="color:#858585;font-size:11px;">(клик — добавить на график)</span></p>';

    // Список переменных
    html += '<ul style="margin: 5px 0; padding-left: 20px; list-style: none;">';

    result.variable_names.forEach(function(varName) {
        // Получаем единицу измерения (если есть)
        const unit = result.units && result.units[varName]
            ? ' [' + result.units[varName] + ']'
            : '';

        // Создаём элемент списка с обработчиком клика
        // При клике вызываем PlotManager.addCurveToLastGraph()
        html += '<li style="color: #cccccc; font-size: 12px; cursor: pointer; padding: 2px 4px;" ' +
                    'onclick="PlotManager.addCurveToLastGraph(\'' + varName + '\')" ' +
                    'onmouseover="this.style.backgroundColor=\'#2d2d2d\'" ' +
                    'onmouseout="this.style.backgroundColor=\'transparent\'">' +
                    '• ' + varName + unit +
                 '</li>';
    });

    html += '</ul>';

    // Вставляем HTML в виджет
    widget.innerHTML = html;
}

function updateFileProperties(result) {
    /**
     * Обновить виджет "Свойства файла" в левой панели.
     *
     * ПОКАЗЫВАЕТ:
     * - Количество строк
     * - Количество столбцов
     * - Статус валидации (Да/Нет)
     */
    const widget = document.getElementById('file-properties-widget');
    if (!widget) return;

    // Определяем цвет для статуса валидации
    const isValidColor = result.is_valid ? '#4ec9b0' : '#f44747';
    const isValidText = result.is_valid ? 'Да' : 'Нет';

    // Формируем таблицу со свойствами
    let html = '<table style="width: 100%; font-size: 12px;">';
    html += '<tr><td style="color: #858585; padding: 2px;">Строк:</td><td style="text-align: right;">' + result.row_count + '</td></tr>';
    html += '<tr><td style="color: #858585; padding: 2px;">Столбцов:</td><td style="text-align: right;">' + result.column_count + '</td></tr>';
    html += '<tr><td style="color: #858585; padding: 2px;">Валиден:</td><td style="text-align: right; color: ' + isValidColor + ';">' + isValidText + '</td></tr>';
    html += '</table>';

    widget.innerHTML = html;
}

function updateStatistics(result) {
    /**
     * Обновить вкладку "СТАТИСТИКА".
     *
     * ПОКАЗЫВАЕТ ТАБЛИЦУ:
     * - Столбец
     * - Min, Max, Mean
     * - Количество NaN (красным если > 0)
     */
    const statsTab = document.getElementById('tab-statistics');
    if (!statsTab || !result.statistics) return;

    // Начинаем таблицу
    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';

    // Заголовок таблицы
    html += '<tr style="border-bottom: 1px solid #3c3c3c;">';
    html += '<th style="padding: 6px; text-align: left; color: #cccccc;">Столбец</th>';
    html += '<th style="padding: 6px; text-align: right; color: #cccccc;">Min</th>';
    html += '<th style="padding: 6px; text-align: right; color: #cccccc;">Max</th>';
    html += '<th style="padding: 6px; text-align: right; color: #cccccc;">Mean</th>';
    html += '<th style="padding: 6px; text-align: right; color: #cccccc;">NaN</th>';
    html += '</tr>';

    // Проходим по статистике каждого столбца
    for (const colName in result.statistics) {
        const stats = result.statistics[colName];

        // Строка таблицы
        html += '<tr style="border-bottom: 1px solid #2d2d2d;">';
        html += '<td style="padding: 6px; color: #cccccc;">' + colName + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: #cccccc;">' + formatNumber(stats.min) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: #cccccc;">' + formatNumber(stats.max) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: #cccccc;">' + formatNumber(stats.mean) + '</td>';

        // Количество NaN — красным если есть пропуски
        const nanColor = stats.nan_count > 0 ? '#f44747' : '#858585';
        html += '<td style="padding: 6px; text-align: right; color: ' + nanColor + ';">' + stats.nan_count + '</td>';

        html += '</tr>';
    }

    html += '</table>';

    statsTab.innerHTML = html;
}

function updateDataTable(result) {
    /**
     * Обновить вкладку "ТАБЛИЦА".
     *
     * ПОКАЗЫВАЕТ ВСЕ СТРОКИ ДАННЫХ С КОЛОНКОЙ НОМЕРОВ.
     *
     * ВАЖНО: Обёрнуто в div с max-height и overflow-y: auto,
     * чтобы таблица не занимала весь экран при большом количестве строк.
     */
    const tableTab = document.getElementById('tab-table');
    if (!tableTab || !result.data_sample) return;

    // Обёртка с прокруткой — чтобы таблица не ломала вёрстку
    let html = '<div style="max-height: 100%; overflow-y: auto;">';

    // Начинаем таблицу
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';

    // Заголовок таблицы (с колонкой номеров)
    html += '<tr style="border-bottom: 1px solid #3c3c3c;">';
    html += '<th style="padding: 6px; text-align: center; color: #cccccc; width: 50px; position: sticky; top: 0; background: #1e1e1e;">№</th>';
    result.column_names.forEach(function(col) {
        html += '<th style="padding: 6px; text-align: left; color: #cccccc; position: sticky; top: 0; background: #1e1e1e;">' + col + '</th>';
    });
    html += '</tr>';

    // Строки данных с номерами
    result.data_sample.forEach(function(row, index) {
        html += '<tr style="border-bottom: 1px solid #2d2d2d;">';

        // Номер строки (index начинается с 0, поэтому +1)
        html += '<td style="padding: 4px 6px; text-align: center; color: #858585; font-weight: bold;">' + (index + 1) + '</td>';

        // Ячейки строки
        row.forEach(function(cell) {
            let displayValue = '-';  // По умолчанию прочерк (для null/undefined)
            if (cell !== null && cell !== undefined) {
                displayValue = formatNumber(cell);
            }
            html += '<td style="padding: 4px 6px; color: #cccccc;">' + displayValue + '</td>';
        });

        html += '</tr>';
    });

    html += '</table>';
    html += '</div>';  // Закрываем обёртку с прокруткой

    tableTab.innerHTML = html;
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function log(message, type) {
    /**
     * Записать сообщение в консоль приложения.
     *
     * Если TabManager загружен — используем его.
     * Иначе — выводим в консоль браузера.
     *
     * ПАРАМЕТРЫ:
     * - message: строка с сообщением
     * - type: тип сообщения ('info', 'error', 'warning') — пока не используется,
     *         но зарезервирован для будущего расширения
     */
    if (window.TabManager && TabManager.logToConsole) {
        TabManager.logToConsole(message);
    } else {
        console.log(message);
    }
}

function formatNumber(num) {
    /**
     * Форматировать число для отображения в таблице.
     *
     * ПРАВИЛА:
     * - null/undefined → '-'
     * - Не число → строковое представление
     * - Очень маленькие (<0.001) или очень большие (>10000) → экспоненциальная форма (1.234e+4)
     * - Остальные → 3 знака после запятой (1.234)
     */
    if (num === null || num === undefined) return '-';
    if (typeof num !== 'number') return String(num);

    if (Math.abs(num) < 0.001 || Math.abs(num) > 10000) {
        return num.toExponential(3);  // 1.234e+4
    }

    return num.toFixed(3);  // 1.234
}

function formatBytes(bytes) {
    /**
     * Форматировать размер файла в читаемом виде.
     *
     * ПРИМЕРЫ:
     * - 500 → "500 Б"
     * - 1500 → "1.5 КБ"
     * - 1500000 → "1.4 МБ"
     */
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// === ЭКСПОРТ ===
// Делаем функции доступными из других файлов (если понадобится)

window.FileLoader = {
    updateFileStructure: updateFileStructure,
    updateFileProperties: updateFileProperties,
    updateStatistics: updateStatistics,
    updateDataTable: updateDataTable,
};