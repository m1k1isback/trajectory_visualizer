/**
 * ============================================================================
 * AboutDialog.js — Диалог "О программе"
 * ============================================================================
 *
 * ЧТО ЭТО ЗА ФАЙЛ:
 * Управляет модальным окном "О программе": открытие, закрытие,
 * закрытие по Escape и клику вне диалога.
 *
 * КОНЦЕПЦИИ JS:
 * - style.display — управление видимостью элемента ('flex' / 'none')
 * - document.body.style.overflow — запрет/разрешение прокрутки фона
 * - event.target — элемент, по которому кликнули
 */


const AboutDialog = {
    /**
     * Открыть диалог "О программе".
     */
    open: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            // Показываем диалог (display: flex центрирует содержимое)
            dialog.style.display = 'flex';

            // Запрещаем прокрутку фона, пока диалог открыт.
            // overflow: hidden — всё, что не влезает, обрезается.
            document.body.style.overflow = 'hidden';

            if (window.TabManager) {
                TabManager.logToConsole('Открыто окно "О программе"');
            }
        }
    },

    /**
     * Закрыть диалог "О программе".
     */
    close: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            // Скрываем диалог
            dialog.style.display = 'none';

            // Возвращаем прокрутку фона
            document.body.style.overflow = '';

            if (window.TabManager) {
                TabManager.logToConsole('Закрыто окно "О программе"');
            }
        }
    },

    /**
     * Обработчик нажатия клавиш — закрытие по Escape.
     */
    handleKeyPress: function(event) {
        if (event.key === 'Escape') {
            const dialog = document.getElementById('about-dialog');
            // Проверяем, что диалог сейчас открыт
            if (dialog && dialog.style.display === 'flex') {
                AboutDialog.close();
            }
        }
    },

    /**
     * Обработчик клика — закрытие при клике вне диалога.
     *
     * event.target — это элемент, по которому кликнули.
     * Если кликнули по фону (самому about-dialog), а не по содержимому —
     * закрываем диалог.
     */
    handleClickOutside: function(event) {
        const dialog = document.getElementById('about-dialog');
        if (dialog && event.target === dialog) {
            AboutDialog.close();
        }
    }
};


// Подписываемся на нажатие клавиш
document.addEventListener('keydown', function(event) {
    AboutDialog.handleKeyPress(event);
});

// Подписываемся на клики
document.addEventListener('click', function(event) {
    AboutDialog.handleClickOutside(event);
});


// Экспорт
window.AboutDialog = AboutDialog;