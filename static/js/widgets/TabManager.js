/**
 * ============================================================================
 * TabManager.js — Управление вкладками и консолью приложения
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Отвечает за две вещи:
 * 1. Переключение вкладок "ТАБЛИЦА" и "СТАТИСТИКА" внизу страницы.
 * 2. Ведение консоли приложения (логирование событий).
 *
 * КОНЦЕПЦИИ JS:
 * - querySelectorAll — поиск нескольких элементов по CSS-селектору
 * - classList — управление CSS-классами элемента
 * - addEventListener — подписка на события
 * - getAttribute — чтение атрибута HTML-элемента
 */


// === ГЛОБАЛЬНЫЙ ОБЪЕКТ TabManager ===
//
// Сразу создаём объект, чтобы другие файлы могли использовать его функции
// ещё до того, как DOMContentLoaded сработает.
window.TabManager = {
    logToConsole: logToConsole,
    clearConsole: clearConsole,
    switchTab: switchTab
};


// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===

document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем вкладки (находим кнопки, вешаем обработчики)
    initTabs();

    // Пишем приветственное сообщение в консоль
    logToConsole('Система инициализирована. Ожидание действий пользователя...');
});


function initTabs() {
    /**
     * Найти все кнопки вкладок и подписаться на их клик.
     *
     * querySelectorAll('.tab-btn') — находит ВСЕ элементы с классом 'tab-btn'.
     * Возвращает NodeList (похоже на массив).
     */
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Перебираем каждую кнопку
    tabButtons.forEach(function(button) {
        // Вешаем обработчик клика
        button.addEventListener('click', function() {
            // 'this' внутри обработчика — это элемент, на который кликнули.
            // Передаём его в функцию switchTab вместе со всеми кнопками и панелями.
            switchTab(this, tabButtons, tabPanes);
        });
    });
}


function switchTab(clickedButton, allButtons, allPanes) {
    /**
     * Переключить активную вкладку.
     *
     * ЛОГИКА:
     * 1. Убрать класс 'active' со всех кнопок и панелей (сброс).
     * 2. Добавить класс 'active' нажатой кнопке.
     * 3. Найти соответствующую панель по атрибуту data-tab.
     * 4. Добавить класс 'active' этой панели.
     *
     * CSS реагирует на класс 'active' и показывает/скрывает элементы.
     */

    // Убираем 'active' со всех кнопок
    allButtons.forEach(function(btn) {
        btn.classList.remove('active');
    });

    // Убираем 'active' со всех панелей
    allPanes.forEach(function(pane) {
        pane.classList.remove('active');
    });

    // Добавляем 'active' нажатой кнопке
    clickedButton.classList.add('active');

    // getAttribute читает значение HTML-атрибута.
    // Например, у кнопки <button data-tab="table"> вернёт "table".
    const tabId = clickedButton.getAttribute('data-tab');

    // Находим панель по ID: "tab-table" или "tab-statistics"
    const targetPane = document.getElementById('tab-' + tabId);
    if (targetPane) {
        targetPane.classList.add('active');
    }
}


function logToConsole(message) {
    /**
     * Добавить сообщение в консоль приложения.
     *
     * Консоль — это <textarea class="console-output"> в index.html.
     * Мы просто дописываем текст в конец и прокручиваем вниз.
     */
    const consoleOutput = document.querySelector('.console-output');
    if (!consoleOutput) return;

    // new Date() — создаёт объект с текущим временем.
    // toLocaleTimeString() — форматирует его в строку "15:30:45".
    const timestamp = new Date().toLocaleTimeString();

    // += означает "добавить в конец существующего текста".
    // \n — символ новой строки (Enter).
    consoleOutput.value += '[' + timestamp + '] ' + message + '\n';

    // Прокручиваем консоль вниз, чтобы видеть новое сообщение.
    // scrollHeight — полная высота содержимого (в пикселях).
    // scrollTop — текущая позиция прокрутки сверху.
    // Приравнивая их, мы прокручиваем в самый низ.
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}


function clearConsole() {
    /**
     * Очистить содержимое консоли.
     */
    const consoleOutput = document.querySelector('.console-output');
    if (consoleOutput) {
        consoleOutput.value = '';  // Пустая строка = очистка
    }
}