/**
 * ============================================================================
 * PlotDialog.js — Диалог создания/редактирования графика
 * ============================================================================
 */

const PlotDialog = {
    currentGraphId: null,

    /**
     * Открыть диалог создания нового графика.
     */
    open: function() {
        this.currentGraphId = null;
        document.getElementById('plot-dialog-title').textContent = 'Создание графика';

        this.populateVariables();
        this.populateWindows();

        document.getElementById('plot-title').value = '';
        document.getElementById('plot-x-variable').value = '';

        // Сбросить выделение Y
        var ySelect = document.getElementById('plot-y-variables');
        Array.from(ySelect.options).forEach(function(opt) { opt.selected = false; });

        // Показать секцию стилей (пустую пока не выбраны переменные)
        this.refreshCurveStyles([]);

        document.getElementById('plot-dialog').style.display = 'flex';

        // Слушать изменение выбора Y для обновления секции стилей
        var self = this;
        ySelect.onchange = function() {
            var selected = Array.from(ySelect.selectedOptions).map(function(o) { return o.value; });
            self.refreshCurveStyles(selected);
        };
    },

    /**
     * Открыть диалог редактирования существующего графика.
     */
    openEdit: function(graphId) {
        var graph = PlotManager.graphs[graphId];
        if (!graph) return;

        this.currentGraphId = graphId;
        document.getElementById('plot-dialog-title').textContent = 'Редактирование графика';

        this.populateVariables();
        this.populateWindows();

        document.getElementById('plot-x-variable').value = graph.xVariable;

        var ySelect = document.getElementById('plot-y-variables');
        Array.from(ySelect.options).forEach(function(opt) {
            opt.selected = graph.yVariables.includes(opt.value);
        });

        document.getElementById('plot-title').value = graph.title || '';
        document.getElementById('plot-window').value = graph.windowId;

        // Показать секцию стилей с текущими настройками
        this.refreshCurveStyles(graph.yVariables, graph);

        document.getElementById('plot-dialog').style.display = 'flex';

        var self = this;
        ySelect.onchange = function() {
            var selected = Array.from(ySelect.selectedOptions).map(function(o) { return o.value; });
            self.refreshCurveStyles(selected, graph);
        };
    },

    /**
     * Закрыть диалог.
     */
    close: function() {
        document.getElementById('plot-dialog').style.display = 'none';
        this.currentGraphId = null;
    },

    /**
     * Заполнить выпадающие списки переменных.
     */
    populateVariables: function() {
        var xSelect = document.getElementById('plot-x-variable');
        var ySelect = document.getElementById('plot-y-variables');

        xSelect.innerHTML = '';
        ySelect.innerHTML = '';

        if (!window.currentDatasetColumns || currentDatasetColumns.length === 0) {
            xSelect.innerHTML = '<option value="">(нет данных)</option>';
            ySelect.innerHTML = '<option value="">(нет данных)</option>';
            return;
        }

        currentDatasetColumns.forEach(function(col) {
            xSelect.innerHTML += '<option value="' + col + '">' + col + '</option>';
            ySelect.innerHTML += '<option value="' + col + '">' + col + '</option>';
        });
    },

    /**
     * Заполнить список окон.
     */
    populateWindows: function() {
        var windowSelect = document.getElementById('plot-window');
        windowSelect.innerHTML = '<option value="auto">Автоматически (первое свободное)</option>';

        var windows = document.querySelectorAll('.scene-window:not(.closed)');
        windows.forEach(function(win) {
            var id = win.dataset.windowId;
            var title = win.querySelector('.window-title').textContent;
            windowSelect.innerHTML += '<option value="' + id + '">' + title + '</option>';
        });
    },

    /**
     * Обновить секцию настройки стилей кривых.
     */
    refreshCurveStyles: function(variables, graph) {
        var section = document.getElementById('curve-colors-section');
        var container = document.getElementById('curve-colors-container');

        if (variables.length === 0) {
            section.style.display = 'block';
            container.innerHTML = '<p style="color: var(--text-secondary, #858585); font-size: 11px; padding: 8px; margin: 0;">Выберите переменные для оси Y</p>';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = '';

        var curveColors = graph ? (graph.curveColors || {}) : {};
        var lineStyles = graph ? (graph.lineStyles || {}) : {};
        var lineWidths = graph ? (graph.lineWidths || {}) : {};
        var markerSymbols = graph ? (graph.markerSymbols || {}) : {};
        var markerSizes = graph ? (graph.markerSizes || {}) : {};
        var markerSteps = graph ? (graph.markerSteps || {}) : {};

        variables.forEach(function(varName, index) {
            var color = curveColors[varName] || PlotManager.getCurveColor(index);
            var ls = lineStyles[varName] || 'solid';
            var lw = lineWidths[varName] || 2;
            var ms = markerSymbols[varName] || 'none';
            var msz = markerSizes[varName] || 6;
            var mst = markerSteps[varName] || 1;

            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom: 10px; padding: 10px; background: var(--bg-primary, #1e1e1e); border-radius: 4px; border-left: 3px solid ' + color + ';';

            row.innerHTML =
                '<div style="font-size: 13px; font-weight: bold; color: var(--text-primary, #ccc); margin-bottom: 8px;">' + varName + '</div>' +
                '<div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 6px 10px; align-items: center;">' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Цвет:</label>' +
                    '<input type="color" data-var="' + varName + '" data-type="color" value="' + color + '" style="width: 100%; height: 26px; border: none; cursor: pointer; border-radius: 3px;">' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Стиль:</label>' +
                    '<select data-var="' + varName + '" data-type="lineStyle" style="padding: 3px; background: var(--bg-input, #3c3c3c); color: var(--text-primary, #ccc); border: 1px solid var(--border-color, #3c3c3c); border-radius: 3px; font-size: 11px;">' +
                        '<option value="solid"' + (ls === 'solid' ? ' selected' : '') + '>Сплошная ──</option>' +
                        '<option value="dash"' + (ls === 'dash' ? ' selected' : '') + '>Пунктир - -</option>' +
                        '<option value="dot"' + (ls === 'dot' ? ' selected' : '') + '>Точки ···</option>' +
                        '<option value="dashdot"' + (ls === 'dashdot' ? ' selected' : '') + '>Штрих-пунктир ·─</option>' +
                    '</select>' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Толщина:</label>' +
                    '<input type="number" data-var="' + varName + '" data-type="lineWidth" value="' + lw + '" min="0.5" max="10" step="0.5" style="padding: 3px; background: var(--bg-input, #3c3c3c); color: var(--text-primary, #ccc); border: 1px solid var(--border-color, #3c3c3c); border-radius: 3px; font-size: 11px;">' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Маркер:</label>' +
                    '<select data-var="' + varName + '" data-type="markerSymbol" style="padding: 3px; background: var(--bg-input, #3c3c3c); color: var(--text-primary, #ccc); border: 1px solid var(--border-color, #3c3c3c); border-radius: 3px; font-size: 11px;">' +
                        '<option value="none"' + (ms === 'none' ? ' selected' : '') + '>Нет</option>' +
                        '<option value="circle"' + (ms === 'circle' ? ' selected' : '') + '>● Круг</option>' +
                        '<option value="square"' + (ms === 'square' ? ' selected' : '') + '>■ Квадрат</option>' +
                        '<option value="diamond"' + (ms === 'diamond' ? ' selected' : '') + '>◆ Ромб</option>' +
                        '<option value="triangle-up"' + (ms === 'triangle-up' ? ' selected' : '') + '>▲ Треугольник</option>' +
                        '<option value="cross"' + (ms === 'cross' ? ' selected' : '') + '>✕ Крест</option>' +
                        '<option value="x"' + (ms === 'x' ? ' selected' : '') + '>✗ Икс</option>' +
                    '</select>' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Размер:</label>' +
                    '<input type="number" data-var="' + varName + '" data-type="markerSize" value="' + msz + '" min="2" max="20" step="1" style="padding: 3px; background: var(--bg-input, #3c3c3c); color: var(--text-primary, #ccc); border: 1px solid var(--border-color, #3c3c3c); border-radius: 3px; font-size: 11px;">' +

                    '<label style="font-size: 11px; color: var(--text-secondary, #858585);">Каждый N-й:</label>' +
                    '<input type="number" data-var="' + varName + '" data-type="markerStep" value="' + mst + '" min="1" max="100" step="1" title="Показывать маркер через каждые N точек" style="padding: 3px; background: var(--bg-input, #3c3c3c); color: var(--text-primary, #ccc); border: 1px solid var(--border-color, #3c3c3c); border-radius: 3px; font-size: 11px;">' +

                '</div>';

            container.appendChild(row);
        });
    },

    /**
     * Собрать все настройки из формы.
     */
    collectStyles: function() {
        var curveColors = {};
        var lineStyles = {};
        var lineWidths = {};
        var markerSymbols = {};
        var markerSizes = {};
        var markerSteps = {};

        var inputs = document.getElementById('curve-colors-container').querySelectorAll('input, select');
        inputs.forEach(function(input) {
            var v = input.dataset.var;
            var t = input.dataset.type;
            var val = input.value;
            if (!v || !t) return;

            if (t === 'color') curveColors[v] = val;
            else if (t === 'lineStyle') lineStyles[v] = val;
            else if (t === 'lineWidth') lineWidths[v] = parseFloat(val) || 2;
            else if (t === 'markerSymbol') markerSymbols[v] = val;
            else if (t === 'markerSize') markerSizes[v] = parseInt(val) || 6;
            else if (t === 'markerStep') markerSteps[v] = parseInt(val) || 1;
        });

        return {
            curveColors: curveColors,
            lineStyles: lineStyles,
            lineWidths: lineWidths,
            markerSymbols: markerSymbols,
            markerSizes: markerSizes,
            markerSteps: markerSteps
        };
    },

    /**
     * Создать или обновить график.
     */
    create: function() {
        var xVariable = document.getElementById('plot-x-variable').value;
        var ySelect = document.getElementById('plot-y-variables');
        var yVariables = Array.from(ySelect.selectedOptions).map(function(o) { return o.value; });
        var title = document.getElementById('plot-title').value || null;
        var windowId = document.getElementById('plot-window').value;

        if (!xVariable) {
            if (window.TabManager) TabManager.logToConsole('Выберите переменную для оси X', 'error');
            return;
        }
        if (yVariables.length === 0) {
            if (window.TabManager) TabManager.logToConsole('Выберите хотя бы одну переменную для оси Y', 'error');
            return;
        }

        var styles = this.collectStyles();
        var targetWindow = windowId !== 'auto' ? windowId : 'auto';

        if (this.currentGraphId) {
            PlotManager.updateGraph(this.currentGraphId, {
                xVariable: xVariable,
                yVariables: yVariables,
                title: title,
                windowId: targetWindow,
                curveColors: styles.curveColors,
                lineStyles: styles.lineStyles,
                lineWidths: styles.lineWidths,
                markerSymbols: styles.markerSymbols,
                markerSizes: styles.markerSizes,
                markerSteps: styles.markerSteps
            });
        } else {
            PlotManager.createPlot(
                xVariable, yVariables, title, targetWindow,
                styles.curveColors, styles.lineStyles, styles.lineWidths,
                styles.markerSymbols, styles.markerSizes, styles.markerSteps
            );
        }

        this.close();
    }
};

window.PlotDialog = PlotDialog;