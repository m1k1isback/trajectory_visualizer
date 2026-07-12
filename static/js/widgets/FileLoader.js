/**
 * ============================================================================
 * FileLoader.js — Загрузка файлов с компьютера на сервер
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Этот файл отвечает за первую и самую важную операцию в приложении —
 * загрузку CSV/TXT файла с компьютера пользователя на сервер.
 *
 * КАК ЭТО РАБОТАЕТ (по шагам):
 * 1. Пользователь нажимает "Файл → Открыть файл..." в меню.
 * 2. Открывается системное окно выбора файла.
 * 3. Пользователь выбирает файл → срабатывает событие 'change'.
 * 4. Мы берём файл, упаковываем в FormData и отправляем на /api/upload.
 * 5. Сервер парсит файл через ядро (DataLoader) и возвращает JSON.
 * 6. Мы получаем JSON и обновляем интерфейс: список переменных, таблицу,
 *    статистику, свойства файла.
 *
 * ВАЖНЫЕ КОНЦЕПЦИИ JS, КОТОРЫЕ ЗДЕСЬ ИСПОЛЬЗУЮТСЯ:
 * - document.addEventListener — подписка на события
 * - async/await — асинхронные операции (загрузка файла занимает время)
 * - fetch() — современный способ делать HTTP-запросы
 * - FormData — формат для отправки файлов
 * - window.xxx — глобальные переменные, видимые из других файлов
 * - innerHTML — замена содержимого HTML-элемента
 * - forEach — перебор элементов массива
 * - template literals (`` ` ``) — удобная вставка переменных в строки
 */


// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
//
// В JavaScript каждая переменная имеет "область видимости".
// Если объявить переменную через 'const' или 'let' внутри функции —
// она будет видна только внутри этой функции.
//
// Но нам нужно, чтобы другие файлы (например, PlotManager.js) могли
// получить доступ к ID загруженного файла и списку колонок.
// Для этого мы "вешаем" переменные на объект window.
// window — это глобальный объект браузера, он виден отовсюду.

// ID последнего загруженного набора данных (Dataset).
// Нужен, чтобы строить графики без повторной загрузки файла.
window.currentDatasetId = null;

// Список всех имён столбцов (h, Vx, Vy, a1, a2, ...).
// Нужен для диалога создания графика и других функций.
window.currentDatasetColumns = null;


// === ТОЧКА ВХОДА: ЖДЁМ ЗАГРУЗКИ HTML ===
//
// Браузер читает HTML сверху вниз. Если наш JS-файл подключён в <head>,
// он выполнится ДО того, как элементы страницы появятся в DOM.
// Поэтому мы подписываемся на событие 'DOMContentLoaded' — оно срабатывает,
// когда весь HTML скачан и дерево элементов построено.
//
// document — это специальный объект, который представляет всю HTML-страницу.
// addEventListener('событие', функция) — говорит: "когда произойдёт событие,
// выполни эту функцию".

document.addEventListener('DOMContentLoaded', function() {

    // Ищем на странице элемент с id="file-input".
    // В index.html у нас есть: <input type="file" id="file-input" ...>
    // getElementById возвращает ОДИН элемент (тот, у которого такой ID).
    const fileInput = document.getElementById('file-input');

    // Проверка: а вдруг элемента нет? (например, опечатка в HTML)
    // Если fileInput === null или undefined, то !fileInput === true
    if (!fileInput) {
        // console.error выводит красное сообщение в консоль браузера (F12)
        console.error('FileLoader: не найден input#file-input в HTML');
        return; // Выходим из функции, дальше выполнять нечего
    }

    // Подписываемся на событие 'change' у input'а.
    // 'change' срабатывает, когда пользователь выбирает файл в системном окне.
    // async function — означает, что внутри будут асинхронные операции (await).
    fileInput.addEventListener('change', async function(event) {

        // event — это объект события. Он содержит информацию о том,
        // что произошло. event.target — это элемент, на котором произошло
        // событие (наш input).
        //
        // У input типа "file" есть свойство .files — это список выбранных
        // файлов (FileList). Мы берём первый файл через [0].
        const file = event.target.files[0];

        // Если пользователь нажал "Отмена" в окне выбора файла,
        // то files будет пустым, и file === undefined.
        // Выходим, ничего не делаем.
        if (!file) return;

        // === БЛОК try/catch ===
        //
        // При работе с сетью (fetch) могут возникнуть ошибки:
        // сервер недоступен, файл слишком большой, ошибка парсинга и т.д.
        // try/catch позволяет "поймать" ошибку и обработать её,
        // вместо того чтобы программа упала.
        try {

            // Логируем в консоль приложения начало загрузки.
            // window.TabManager — это объект из TabManager.js.
            // Проверяем через window.TabManager, чтобы не упасть,
            // если TabManager ещё не загружен.
            if (window.TabManager) {
                TabManager.logToConsole(
                    'Загрузка файла: ' + file.name + ' (' + formatBytes(file.size) + ')'
                );
            }

            // === ПОДГОТОВКА ДАННЫХ ДЛЯ ОТПРАВКИ ===
            //
            // Сервер (FastAPI) ожидает файл в формате multipart/form-data.
            // Это тот же формат, что используется при отправке форм на сайтах.
            // FormData — это специальный объект JS для создания таких данных.
            const formData = new FormData();

            // append(ключ, значение) — добавляет поле в форму.
            // Ключ 'file' должен совпадать с именем параметра в FastAPI:
            // file: UploadFile = File(...)
            formData.append('file', file);

            // Добавляем оригинальное имя файла.
            // Без этого сервер увидит только имя временного файла (tmpwobyhrbc).
            formData.append('original_name', file.name);

            // === ОТПРАВКА ЗАПРОСА НА СЕРВЕР ===
            //
            // fetch() — это современный способ делать HTTP-запросы в браузере.
            // Он возвращает Promise (обещание), что ответ когда-нибудь придёт.
            // Ключевое слово 'await' говорит: "подожди, пока ответ не придёт,
            // но не блокируй браузер".
            //
            // Первый аргумент — URL (куда отправляем).
            // Второй аргумент — объект с настройками запроса.
            const response = await fetch('/api/upload', {
                method: 'POST',  // Метод POST = "отправка данных на сервер"
                body: formData   // Тело запроса — наши данные
            });

            // === ПРОВЕРКА ОТВЕТА ===
            //
            // response.ok — это true, если код ответа 200-299 (успех).
            // Если сервер вернул 400 (Bad Request) или 500 (Internal Server Error),
            // response.ok будет false.
            if (!response.ok) {
                // Читаем текст ошибки (не JSON, а просто текст)
                const errorText = await response.text();
                // throw new Error — это способ "выбросить" ошибку.
                // Она будет поймана в блоке catch ниже.
                throw new Error('HTTP ' + response.status + ': ' + errorText);
            }

            // === ПОЛУЧЕНИЕ ДАННЫХ ===
            //
            // response.json() — парсит JSON-строку от сервера в объект JS.
            // Например, сервер вернул: {"name": "trajectory", "row_count": 151}
            // После парсинга мы получим объект: {name: "trajectory", row_count: 151}
            // К полям можно обращаться через точку: result.name, result.row_count
            const result = await response.json();

            // === ПРОВЕРКА ВАЛИДАЦИИ ===
            //
            // Сервер возвращает поле is_valid (true/false).
            // Если файл содержит мусорные данные (неправильные столбцы, NaN,
            // нечисловые значения), валидатор вернёт is_valid: false.
            // Выводим сообщение в консоль, если файл не прошёл проверку.
            if (!result.is_valid) {
                if (window.TabManager) {
                    TabManager.logToConsole('Загружаемый файл не удовлетворяет требованиям', 'error');
                }
            }

            // Сохраняем важные данные в глобальные переменные,
            // чтобы другие файлы могли их использовать.
            window.currentDatasetId = result.dataset_id;
            window.currentDatasetColumns = result.column_names;

            // Логируем успешную загрузку
            if (window.TabManager) {
                TabManager.logToConsole(
                    'Файл "' + result.name + '" загружен: ' +
                    result.row_count + ' строк, ' +
                    result.column_count + ' столбцов'
                );
                TabManager.logToConsole('  Аргумент (X): ' + result.argument_name);
                TabManager.logToConsole('  Переменных (Y): ' + result.variable_names.length);
                TabManager.logToConsole('  Dataset ID: ' + result.dataset_id);
            }

            // Если есть предупреждения валидации — выводим их
            if (result.validation_messages && result.validation_messages.length > 0) {
                result.validation_messages.forEach(function(msg) {
                    const level = msg.severity === 'ERROR' ? 'error' : 'warning';
                    if (window.TabManager) {
                        TabManager.logToConsole('  [' + msg.severity + '] ' + msg.message, level);
                    }
                });
            }

                        // === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ===
            //
            // Вызываем функции, которые рисуют данные на странице.
            // Эти функции описаны ниже в этом же файле.
            // updateFileStructure(result);      // Левая панель — список переменных
            updateFileProperties(result);     // Левая панель — свойства файла
            updateStatistics(result);         // Вкладка "СТАТИСТИКА"
            updateDataTable(result);          // Вкладка "ТАБЛИЦА"

            // === ЗАГРУЗКА ТРАЕКТОРИИ В CESIUM ===
            // После успешной загрузки файла — отображаем траекторию на карте Земли
            if (window.CesiumViewer && CesiumViewer.initialized && window.currentDatasetId) {
                CesiumViewer.loadTrajectoryFromFile(window.currentDatasetId);
            }

        } catch (error) {
            // Сюда мы попадаем, если в блоке try произошла ошибка.
            // error.message — текст ошибки.
            console.error('FileLoader error:', error);
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка загрузки: ' + error.message, 'error');
            }
        }

        // === СБРОС INPUT'А ===
        //
        // Важный момент: если пользователь выберет ТОТ ЖЕ файл второй раз,
        // событие 'change' НЕ сработает, потому что для браузера ничего
        // не изменилось (выбран тот же файл).
        // Чтобы это обойти, мы очищаем значение input'а.
        fileInput.value = '';
    });
});


// ============================================================================
// ФУНКЦИИ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА
// ============================================================================
//
// Все эти функции принимают объект 'result' (данные от сервера) и
// меняют HTML на странице через innerHTML.
//
// innerHTML — это свойство любого HTML-элемента, которое позволяет
// заменить всё его содержимое на новую HTML-строку.
// Например: element.innerHTML = '<p>Привет</p>';


function updateFileStructure(result) {
    /**
     * Обновляет виджет "Структура файлов" в левой панели.
     * Показывает имя файла, аргумент (X) и список переменных (Y).
     * При клике на переменную — она добавляется на последний график.
     */

    // Находим элемент по ID
    const widget = document.getElementById('file-structure-widget');
    if (!widget) return;  // Если не нашли — выходим

    // Собираем HTML-строку по частям.
    // Используем конкатенацию через '+', потому что так надёжнее
    // в старых браузерах (хотя сейчас можно и через template literals ``).
    let html = '<p><strong>Файл:</strong> ' + result.name + '</p>';
    html += '<p><strong>Аргумент (X):</strong> ' + result.argument_name + '</p>';

    // var(--text-secondary, #858585) — это CSS-переменная.
    // Если переменная определена (в теме), используется её значение.
    // Если нет — используется запасное значение #858585.
    // Это нужно для поддержки светлой и тёмной темы.
    html += '<p><strong>Переменные (Y):</strong> ' +
            '<span style="color: var(--text-secondary, #858585); font-size: 11px;">' +
            '(клик — добавить на график)</span></p>';

    // Начинаем список <ul> (unordered list — маркированный список)
    html += '<ul style="margin: 5px 0; padding-left: 20px; list-style: none;">';

    // forEach — метод массива, который перебирает каждый элемент.
    // function(varName) — функция, которая вызывается для каждого элемента.
    // varName — текущий элемент (например, "Vx", "Vy").
    result.variable_names.forEach(function(varName) {
        // Проверяем, есть ли единица измерения для этой переменной.
        // result.units — это объект вида {h: "m", Vx: "m/s", ...}
        // Если units[varName] существует — добавляем " [m/s]"
        const unit = result.units && result.units[varName]
            ? ' [' + result.units[varName] + ']'
            : '';

        // Формируем пункт списка <li>.
        // onclick — обработчик клика. Вызывает PlotManager.addCurveToLastGraph().
        // onmouseover/onmouseout — подсветка при наведении мыши.
        html += '<li style="color: var(--text-primary, #cccccc); font-size: 12px; ' +
                'cursor: pointer; padding: 2px 4px;" ' +
                'onclick="PlotManager.addCurveToLastGraph(\'' + varName + '\')" ' +
                'onmouseover="this.style.backgroundColor=\'#2d2d2d\'" ' +
                'onmouseout="this.style.backgroundColor=\'transparent\'">' +
                '• ' + varName + unit +
                '</li>';
    });

    html += '</ul>';

    // Вставляем готовый HTML в элемент
    widget.innerHTML = html;
}


function updateFileProperties(result) {
    /**
     * Обновляет виджет "Свойства файла" в левой панели.
     * Показывает количество строк, столбцов и статус валидации.
     */
    const widget = document.getElementById('file-properties-widget');
    if (!widget) return;

    // Определяем цвет для статуса валидации.
    // Тернарный оператор: условие ? значение_если_да : значение_если_нет
    const isValidColor = result.is_valid ? '#4ec9b0' : '#f44747';
    const isValidText = result.is_valid ? 'Да' : 'Нет';

    let html = '<table style="width: 100%; font-size: 12px;">';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Строк:</td>' +
            '<td style="text-align: right; color: var(--text-primary, #cccccc);">' +
            result.row_count + '</td></tr>';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Столбцов:</td>' +
            '<td style="text-align: right; color: var(--text-primary, #cccccc);">' +
            result.column_count + '</td></tr>';
    html += '<tr><td style="color: var(--text-secondary, #858585); padding: 2px;">Валиден:</td>' +
            '<td style="text-align: right; color: ' + isValidColor + ';">' +
            isValidText + '</td></tr>';
    html += '</table>';

    widget.innerHTML = html;
}


function updateStatistics(result) {
    /**
     * Обновляет вкладку "СТАТИСТИКА".
     * Показывает таблицу: Столбец | Min | Max | Mean | NaN
     */
    const statsTab = document.getElementById('tab-statistics');
    if (!statsTab || !result.statistics) return;

    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';

    // Заголовок таблицы
    html += '<tr style="border-bottom: 1px solid var(--border-color, #3c3c3c);">';
    html += '<th style="padding: 6px; text-align: left; color: var(--text-primary, #cccccc);">Столбец</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Min</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Max</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">Mean</th>';
    html += '<th style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">NaN</th>';
    html += '</tr>';

    // for...in — перебирает ключи объекта.
    // result.statistics — это объект вида {h: {min: ..., max: ...}, Vx: {...}, ...}
    for (const colName in result.statistics) {
        const stats = result.statistics[colName];

        html += '<tr style="border-bottom: 1px solid var(--border-light, #2d2d2d);">';
        html += '<td style="padding: 6px; color: var(--text-primary, #cccccc);">' + colName + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' +
                formatNumber(stats.min) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' +
                formatNumber(stats.max) + '</td>';
        html += '<td style="padding: 6px; text-align: right; color: var(--text-primary, #cccccc);">' +
                formatNumber(stats.mean) + '</td>';

        // Если NaN > 0 — красим в красный, иначе в серый
        const nanColor = stats.nan_count > 0 ? '#f44747' : 'var(--text-secondary, #858585)';
        html += '<td style="padding: 6px; text-align: right; color: ' + nanColor + ';">' +
                stats.nan_count + '</td>';

        html += '</tr>';
    }

    html += '</table>';
    statsTab.innerHTML = html;
}


function updateDataTable(result) {
    /**
     * Обновляет вкладку "ТАБЛИЦА".
     * Показывает ВСЕ строки данных с колонкой номеров.
     * Обёрнуто в div с прокруткой, чтобы таблица не ломала вёрстку.
     */
    const tableTab = document.getElementById('tab-table');
    if (!tableTab || !result.data_sample) return;

    // Обёртка с прокруткой — чтобы таблица не занимала весь экран
    let html = '<div style="max-height: 100%; overflow-y: auto;">';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';

    // Заголовок таблицы (sticky — "прилипает" к верху при прокрутке)
    html += '<tr style="border-bottom: 1px solid var(--border-color, #3c3c3c);">';
    html += '<th style="padding: 6px; text-align: center; color: var(--text-primary, #cccccc); ' +
            'width: 50px; position: sticky; top: 0; background: var(--bg-primary, #1e1e1e);">№</th>';

    result.column_names.forEach(function(col) {
        html += '<th style="padding: 6px; text-align: left; color: var(--text-primary, #cccccc); ' +
                'position: sticky; top: 0; background: var(--bg-primary, #1e1e1e);">' + col + '</th>';
    });
    html += '</tr>';

    // Строки данных. forEach с двумя аргументами: (элемент, индекс).
    // index начинается с 0, поэтому для номера строки пишем (index + 1).
    result.data_sample.forEach(function(row, index) {
        html += '<tr style="border-bottom: 1px solid var(--border-light, #2d2d2d);">';

        // Номер строки
        html += '<td style="padding: 4px 6px; text-align: center; ' +
                'color: var(--text-secondary, #858585); font-weight: bold;">' +
                (index + 1) + '</td>';

        // Ячейки строки
        row.forEach(function(cell) {
            let displayValue = '-';  // По умолчанию прочерк
            if (cell !== null && cell !== undefined) {
                displayValue = formatNumber(cell);
            }
            html += '<td style="padding: 4px 6px; color: var(--text-primary, #cccccc);">' +
                    displayValue + '</td>';
        });

        html += '</tr>';
    });

    html += '</table>';
    html += '</div>';  // Закрываем обёртку

    tableTab.innerHTML = html;
}


// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================


function log(message, type) {
    /**
     * Записать сообщение в консоль приложения.
     * Если TabManager загружен — используем его, иначе — console.log.
     */
    if (window.TabManager && TabManager.logToConsole) {
        TabManager.logToConsole(message);
    } else {
        console.log(message);
    }
}


function formatNumber(num) {
    /**
     * Форматировать число для отображения.
     *
     * ПРАВИЛА:
     * - null/undefined → '-'
     * - Не число → строковое представление
     * - Очень маленькие (<0.001) или очень большие (>10000) → экспоненциальная форма
     * - Остальные → 3 знака после запятой
     */
    if (num === null || num === undefined) return '-';
    if (typeof num !== 'number') return String(num);

    // Math.abs() — абсолютное значение (модуль числа)
    if (Math.abs(num) < 0.001 || Math.abs(num) > 10000) {
        return num.toExponential(3);  // Например: 1.234e+4
    }

    return num.toFixed(3);  // Например: 1.234
}


function formatBytes(bytes) {
    /**
     * Форматировать размер файла в читаемом виде.
     * 500 → "500 Б", 1500 → "1.5 КБ", 1500000 → "1.4 МБ"
     */
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}


// === ЭКСПОРТ ===
//
// Делаем функции доступными из других файлов.
// window.FileLoader = {...} — создаёт глобальный объект FileLoader,
// у которого есть методы updateFileStructure и т.д.
// Другие файлы могут вызывать: FileLoader.updateDataTable(result)

window.FileLoader = {
    updateFileStructure: updateFileStructure,
    updateFileProperties: updateFileProperties,
    updateStatistics: updateStatistics,
    updateDataTable: updateDataTable,
};