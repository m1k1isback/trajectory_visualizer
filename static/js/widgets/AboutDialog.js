/**
 * AboutDialog.js - Диалог "О программе"
 * 
 * ОТВЕЧАЕТ ЗА:
 * - Открытие/закрытие модального окна "О программе"
 * - Обработку клавиши Escape для закрытия
 * - Закрытие при клике вне диалога
 */

const AboutDialog = {
    /**
     * Открыть диалог "О программе"
     */
    open: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Запретить прокрутку фона
            
            // Логируем если есть TabManager
            if (window.TabManager) {
                TabManager.logToConsole('Открыто окно "О программе"');
            }
        }
    },
    
    /**
     * Закрыть диалог "О программе"
     */
    close: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            document.body.style.overflow = ''; // Вернуть прокрутку
        }
    },
    
    /**
     * Закрыть диалог при нажатии Escape
     */
    handleKeyPress: function(event) {
        if (event.key === 'Escape') {
            const dialog = document.getElementById('about-dialog');
            if (dialog && dialog.style.display === 'flex') {
                AboutDialog.close();
            }
        }
    },
    
    /**
     * Закрыть при клике вне диалога
     */
    handleClickOutside: function(event) {
        const dialog = document.getElementById('about-dialog');
        if (dialog && event.target === dialog) {
            AboutDialog.close();
        }
    }
};

// === СОБЫТИЯ ===

// Обработка клавиши Escape
document.addEventListener('keydown', function(event) {
    AboutDialog.handleKeyPress(event);
});

// Закрытие при клике вне диалога
document.addEventListener('click', function(event) {
    AboutDialog.handleClickOutside(event);
});

// Экспорт
window.AboutDialog = AboutDialog;