/**
 * AboutDialog.js - Диалог "О программе"
 */

const AboutDialog = {
    open: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            if (window.TabManager) {
                TabManager.logToConsole('Открыто окно "О программе"');
            }
        }
    },
    
    close: function() {
        const dialog = document.getElementById('about-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            document.body.style.overflow = '';
        }
    },
    
    handleKeyPress: function(event) {
        if (event.key === 'Escape') {
            const dialog = document.getElementById('about-dialog');
            if (dialog && dialog.style.display === 'flex') {
                AboutDialog.close();
            }
        }
    },
    
    handleClickOutside: function(event) {
        const dialog = document.getElementById('about-dialog');
        if (dialog && event.target === dialog) {
            AboutDialog.close();
        }
    }
};

document.addEventListener('keydown', function(event) {
    AboutDialog.handleKeyPress(event);
});

document.addEventListener('click', function(event) {
    AboutDialog.handleClickOutside(event);
});

window.AboutDialog = AboutDialog;