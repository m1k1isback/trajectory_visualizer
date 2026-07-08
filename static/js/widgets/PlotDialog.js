const PlotDialog = {
    editingGraphId: null,

    open: function() {
        this.editingGraphId = null;
        this.showDialog();
    },

    openEdit: function(graphId) {
        const graph = PlotManager.graphs[graphId];
        if (!graph) {
            console.error('PlotDialog: график', graphId, 'не найден');
            return;
        }

        this.editingGraphId = graphId;
        this.showDialog(graph);
    },

    showDialog: function(graph) {
        const dialog = document.getElementById('plot-dialog');
        if (!dialog) {
            console.error('PlotDialog: не найден элемент #plot-dialog');
            return;
        }

        this.populateVariableLists();

        const titleInput = document.getElementById('plot-title');
        const windowSelect = document.getElementById('plot-window');
        const ySelect = document.getElementById('plot-y-variables');

        if (graph) {
            // === РЕДАКТИРОВАНИЕ ===
            document.getElementById('plot-x-variable').value = graph.xVariable;
            if (titleInput) titleInput.value = graph.title;

            for (let i = 0; i < ySelect.options.length; i++) {
                ySelect.options[i].selected = graph.yVariables.includes(ySelect.options[i].value);
            }

            if (windowSelect) {
                windowSelect.value = graph.windowId;
            }

            const colorsSection = document.getElementById('curve-colors-section');
            if (colorsSection) colorsSection.style.display = 'block';
            
            this.renderCurveColors(graph);
        } else {
            // === СОЗДАНИЕ НОВОГО ===
            if (titleInput) titleInput.value = '';
            if (windowSelect) {
                windowSelect.value = 'auto';
            }
            
            const colorsSection = document.getElementById('curve-colors-section');
            if (colorsSection) colorsSection.style.display = 'block';
            
            // Показываем подсказку
            const container = document.getElementById('curve-colors-container');
            if (container) {
                container.innerHTML = '<p style="color: var(--text-secondary, #858585); font-size: 12px;">Выберите переменные Y</p>';
            }
        }

        dialog.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    close: function() {
        const dialog = document.getElementById('plot-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.editingGraphId = null;
    },

    populateVariableLists: function() {
        const xSelect = document.getElementById('plot-x-variable');
        const ySelect = document.getElementById('plot-y-variables');

        if (!xSelect || !ySelect) return;

        xSelect.innerHTML = '';
        ySelect.innerHTML = '';

        if (!window.currentDatasetColumns || window.currentDatasetColumns.length === 0) {
            xSelect.innerHTML = '<option>Нет данных</option>';
            ySelect.innerHTML = '<option>Нет данных</option>';
            return;
        }

        window.currentDatasetColumns.forEach(function(col) {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            xSelect.appendChild(option);
        });

        window.currentDatasetColumns.forEach(function(col) {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            ySelect.appendChild(option);
        });
    },

    renderCurveColors: function(graph) {
        const container = document.getElementById('curve-colors-container');
        if (!container) return;

        if (!graph.yVariables || graph.yVariables.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary, #858585); font-size: 12px;">Выберите переменные Y</p>';
            return;
        }

        if (!graph.curveColors) {
            graph.curveColors = {};
        }

        let html = '<div style="margin-top: 4px;">';
        graph.yVariables.forEach(function(varName, index) {
            if (!graph.curveColors[varName]) {
                graph.curveColors[varName] = PlotManager.getCurveColor(index);
            }
            const color = graph.curveColors[varName];

            html += '<div style="display: flex; align-items: center; margin-bottom: 6px;">';
            html += '<input type="color" value="' + color + '" ' +
                        'data-var="' + varName + '" ' +
                        'class="curve-color-picker" ' +
                        'style="width: 32px; height: 24px; border: 1px solid #555; border-radius: 3px; cursor: pointer; margin-right: 8px;">';
            html += '<span style="color: var(--text-primary, #cccccc); font-size: 13px;">' + varName + '</span>';
            html += '</div>';
        });
        html += '</div>';

        container.innerHTML = html;
    },

    /**
     * Обновить отображение цветов на основе текущего выбора в select Y
     */
    updateColorsFromSelect: function() {
        const ySelect = document.getElementById('plot-y-variables');
        if (!ySelect) return;

        const selectedVars = Array.from(ySelect.selectedOptions).map(opt => opt.value);
        const container = document.getElementById('curve-colors-container');
        
        if (selectedVars.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary, #858585); font-size: 12px;">Выберите переменные Y</p>';
            return;
        }

        // Генерируем color picker'ы
        let html = '<div style="margin-top: 4px;">';
        selectedVars.forEach(function(varName, index) {
            const color = PlotManager.getCurveColor(index);
            
            html += '<div style="display: flex; align-items: center; margin-bottom: 6px;">';
            html += '<input type="color" value="' + color + '" ' +
                        'data-var="' + varName + '" ' +
                        'class="curve-color-picker" ' +
                        'style="width: 32px; height: 24px; border: 1px solid #555; border-radius: 3px; cursor: pointer; margin-right: 8px;">';
            html += '<span style="color: var(--text-primary, #cccccc); font-size: 13px;">' + varName + '</span>';
            html += '</div>';
        });
        html += '</div>';

        container.innerHTML = html;
    },

    create: function() {
        const xSelect = document.getElementById('plot-x-variable');
        const ySelect = document.getElementById('plot-y-variables');
        const titleInput = document.getElementById('plot-title');
        const windowSelect = document.getElementById('plot-window');

        if (!xSelect || !ySelect) return;

        const xVariable = xSelect.value;
        const yVariables = Array.from(ySelect.selectedOptions).map(opt => opt.value);
        const title = titleInput.value.trim();
        const windowId = windowSelect ? windowSelect.value : 'auto';

        if (!xVariable || yVariables.length === 0) {
            alert('Выберите хотя бы одну переменную для оси Y');
            return;
        }

        // Собираем выбранные цвета кривых
        const curveColors = {};
        const colorPickers = document.querySelectorAll('.curve-color-picker');
        colorPickers.forEach(function(picker) {
            curveColors[picker.dataset.var] = picker.value;
        });

        const isEditing = this.editingGraphId !== null;
        const editingId = this.editingGraphId;

        this.close();

        if (isEditing) {
            PlotManager.updateGraph(editingId, {
                xVariable: xVariable,
                yVariables: yVariables,
                title: title || yVariables.join(', ') + ' от ' + xVariable,
                windowId: windowId,
                curveColors: curveColors
            });
        } else {
            PlotManager.createPlot(xVariable, yVariables, title, windowId, curveColors);
        }
    },

    handleKeyPress: function(event) {
        if (event.key === 'Escape') {
            const dialog = document.getElementById('plot-dialog');
            if (dialog && dialog.style.display === 'flex') {
                PlotDialog.close();
            }
        }
    },

    handleClickOutside: function(event) {
        const dialog = document.getElementById('plot-dialog');
        if (dialog && event.target === dialog) {
            PlotDialog.close();
        }
    }
};

// Подписываемся на события
document.addEventListener('keydown', function(event) {
    PlotDialog.handleKeyPress(event);
});

document.addEventListener('click', function(event) {
    PlotDialog.handleClickOutside(event);
});

// Подписываемся на изменение select Y
document.addEventListener('DOMContentLoaded', function() {
    const ySelect = document.getElementById('plot-y-variables');
    if (ySelect) {
        ySelect.addEventListener('change', function() {
            PlotDialog.updateColorsFromSelect();
        });
    }
});

window.PlotDialog = PlotDialog;