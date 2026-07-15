/**
 * ============================================================================
 * TabManager.js — Управление вкладками и консолью приложения
 * ============================================================================
 */

window.TabManager = {
    logToConsole: logToConsole,
    clearConsole: clearConsole,
    switchTab: switchTab
};

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    logToConsole('Система инициализирована. Ожидание действий пользователя...', 'info');
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            switchTab(this, tabButtons, tabPanes);
        });
    });
}

function switchTab(clickedButton, allButtons, allPanes) {
    allButtons.forEach(function(btn) {
        btn.classList.remove('active');
    });

    allPanes.forEach(function(pane) {
        pane.classList.remove('active');
    });

    clickedButton.classList.add('active');
    const tabId = clickedButton.getAttribute('data-tab');
    const targetPane = document.getElementById('tab-' + tabId);
    if (targetPane) {
        targetPane.classList.add('active');
    }
}

function logToConsole(message, type = 'info') {
    // Ищем НОВЫЙ элемент консоли (div, а не textarea)
    const consoleContent = document.getElementById('console-content');
    if (!consoleContent) {
        console.warn('TabManager: Элемент #console-content не найден!');
        return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const p = document.createElement('p');
    p.textContent = '[' + timestamp + '] ' + message;

    // Добавляем класс для цвета в зависимости от типа сообщения
    if (type === 'error') {
        p.classList.add('log-error');
    } else if (type === 'warning') {
        p.classList.add('log-warning');
    } else {
        p.classList.add('log-info');
    }

    consoleContent.appendChild(p);
    
    // Автопрокрутка вниз
    consoleContent.scrollTop = consoleContent.scrollHeight;
}

function clearConsole() {
    const consoleContent = document.getElementById('console-content');
    if (consoleContent) {
        consoleContent.innerHTML = ''; // Очищаем div
        logToConsole('Консоль очищена', 'info');
    }
}