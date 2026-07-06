/**
 * TabManager.js - Управление вкладками и консолью
 */

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    logToConsole('Система инициализирована. Ожидание действий пользователя...');
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this, tabButtons, tabPanes);
        });
    });
}

function switchTab(clickedButton, allButtons, allPanes) {
    allButtons.forEach(btn => btn.classList.remove('active'));
    allPanes.forEach(pane => pane.classList.remove('active'));
    
    clickedButton.classList.add('active');
    
    const tabId = clickedButton.getAttribute('data-tab');
    const targetPane = document.getElementById('tab-' + tabId);
    if (targetPane) {
        targetPane.classList.add('active');
    }
}

function logToConsole(message) {
    const consoleOutput = document.querySelector('.console-output');
    if (consoleOutput) {
        const timestamp = new Date().toLocaleTimeString();
        consoleOutput.value += '[' + timestamp + '] ' + message + '\n';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

function clearConsole() {
    const consoleOutput = document.querySelector('.console-output');
    if (consoleOutput) {
        consoleOutput.value = '';
    }
}

window.TabManager = {
    logToConsole: logToConsole,
    clearConsole: clearConsole,
    switchTab: switchTab
};

window.logToConsole = logToConsole;
window.clearConsole = clearConsole;