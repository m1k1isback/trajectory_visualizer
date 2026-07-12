/**
 * ============================================================================
 * CesiumViewer.js — ОФФЛАЙН версия с текстурой Земли
 * ============================================================================
 */

const CesiumViewer = {
    viewer: null,
    containerId: 'cesium-container',
    initialized: false,

    /**
     * Инициализировать Cesium Viewer.
     */
    init: function() {
        console.log('[CesiumViewer] Начинаю инициализацию...');

        if (this.initialized) {
            console.log('[CesiumViewer] Уже инициализирован');
            return;
        }

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('[CesiumViewer] КОНТЕЙНЕР НЕ НАЙДЕН: #' + this.containerId);
            return;
        }

        console.log('[CesiumViewer] Контейнер найден:', container);

        if (typeof Cesium === 'undefined') {
            console.error('[CesiumViewer] Cesium.js НЕ ЗАГРУЖЕН!');
            return;
        }

        console.log('[CesiumViewer] Cesium загружен');

        try {
            // Создаём Viewer
            this.viewer = new Cesium.Viewer(this.containerId, {
                animation: false,
                timeline: false,
                baseLayerPicker: false,
                fullscreenButton: false,
                vrButton: false,
                geocoder: false,
                homeButton: false,
                infoBox: false,
                sceneModePicker: false,
                selectionIndicator: false,
                navigationHelpButton: false,
                creditsDisplay: false,
                baseLayer: false,
                sceneMode: Cesium.SceneMode.SCENE3D,
                backgroundColor: Cesium.Color.BLACK,
                skyBox: false,
                skyAtmosphere: false,
            });

            console.log('[CesiumViewer] Viewer создан');

            // Добавляем текстуру Земли
            const earthProvider = new Cesium.SingleTileImageryProvider({
                url: '/static/images/earth_texture.jpg',
                rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
            });

            this.viewer.imageryLayers.addImageryProvider(earthProvider);
            console.log('[CesiumViewer] Текстура Земли добавлена');

            // Настраиваем сцену
            this.configureViewer();

            // Фиксируем высоту
            container.style.height = '100%';
            container.style.overflow = 'hidden';
            container.style.position = 'relative';

            this.initialized = true;

            if (window.TabManager) {
                TabManager.logToConsole('Cesium Viewer инициализирован');
            }

            console.log('[CesiumViewer] Инициализация завершена успешно!');
        } catch (error) {
            console.error('[CesiumViewer] ОШИБКА:', error);
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка Cesium: ' + error.message, 'error');
            }
        }
    },

    /**
     * Настроить внешний вид Viewer.
     */
    configureViewer: function() {
        const scene = this.viewer.scene;
        const globe = scene.globe;
        const camera = this.viewer.camera;

        console.log('[CesiumViewer] Настраиваю сцену и управление...');

        // Отключаем лишнее
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = false;
        if (scene.fog) scene.fog.enabled = false;
        if (scene.sun) scene.sun.show = false;
        if (scene.moon) scene.moon.show = false;
        if (scene.skyBox) scene.skyBox.show = false;

        // Настраиваем глобус
        if (globe) {
            globe.show = true;
            globe.showGroundAtmosphere = false;
            globe.enableLighting = false;
        }

        // === ВАЖНО: ВКЛЮЧАЕМ УПРАВЛЕНИЕ ===
        const controller = scene.screenSpaceCameraController;
        
        // Включаем ВСЕ виды управления
        controller.enableRotate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableTranslate = true;
        
        // Чувствительность
        controller.zoomFactor = 0.5;
        controller.inertiaSpin = 0.0;  // Отключаем инерцию для отзывчивости
        controller.inertiaTranslate = 0.0;
        controller.inertiaZoom = 0.0;
        
        // Расстояния
        controller.minimumZoomDistance = 65000;
        controller.maximumZoomDistance = 50000000;

        // Устанавливаем камеру
        camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 25000000),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                roll: 0
            }
        });

        // Добавляем кнопки
        this.addControlButtons();

        console.log('[CesiumViewer] Управление включено:', {
            rotate: controller.enableRotate,
            zoom: controller.enableZoom,
            tilt: controller.enableTilt
        });

        // Обработчик размера
        window.addEventListener('resize', () => {
            if (this.viewer) this.viewer.resize();
        });
    },

    /**
     * Добавить кнопки управления.
     */
        /**
     * Добавить кнопки управления.
     */
    addControlButtons: function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Проверяем нет ли уже кнопок
        if (container.querySelector('.cesium-controls')) return;

        const div = document.createElement('div');
        div.className = 'cesium-controls';
        // ВАЖНО: pointer-events: none на контейнере, чтобы клики проходили сквозь
        div.style.cssText = 
            'position: absolute; top: 10px; right: 10px; z-index: 1000; ' +
            'display: flex; flex-direction: column; gap: 5px; ' +
            'pointer-events: none;';  // Контейнер пропускает клики

        const buttons = [
            { icon: '🏠', title: 'Домой', action: () => this.goHome() },
            { icon: '+', title: 'Приблизить', action: () => this.zoomIn() },
            { icon: '🔍-', title: 'Отдалить', action: () => this.zoomOut() },
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.style.cssText = 
                'background: rgba(30,30,30,0.8); border: 1px solid rgba(255,255,255,0.2); ' +
                'color: white; padding: 8px; border-radius: 4px; cursor: pointer; ' +
                'font-size: 16px; width: 40px; height: 40px; z-index: 1001; ' +
                'pointer-events: auto;';  // ВАЖНО: кнопки получают клики
            button.onclick = btn.action;
            div.appendChild(button);
        });

        container.appendChild(div);
        console.log('[CesiumViewer] Кнопки управления добавлены');
    },

    /**
     * Домой.
     */
    goHome: function() {
        if (!this.viewer) return;
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 25000000),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                roll: 0
            },
            duration: 1.5
        });
    },

    /**
     * Приблизить.
     */
    zoomIn: function() {
        if (!this.viewer) return;
        const camera = this.viewer.camera;
        const height = camera.positionCartographic.height;
        camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                Cesium.Math.toDegrees(camera.positionCartographic.longitude),
                Cesium.Math.toDegrees(camera.positionCartographic.latitude),
                Math.max(height * 0.6, 7000000)
            ),
            duration: 1
        });
    },

    /**
     * Отдалить.
     */
    zoomOut: function() {
        if (!this.viewer) return;
        const camera = this.viewer.camera;
        const height = camera.positionCartographic.height;
        camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                Cesium.Math.toDegrees(camera.positionCartographic.longitude),
                Cesium.Math.toDegrees(camera.positionCartographic.latitude),
                Math.min(height * 1.5, 50000000)
            ),
            duration: 1
        });
    },

    /**
     * Добавить траекторию.
     */
    addTrajectory: function(positions, options) {
        if (!this.viewer) {
            console.error('[CesiumViewer] Viewer не инициализирован');
            return null;
        }

        const opts = options || {};
        const color = opts.color || Cesium.Color.GREEN;
        const width = opts.width || 3;
        const id = opts.id || 'trajectory-' + Date.now();

        const cartesianPositions = positions.map(pos => 
            new Cesium.Cartesian3(pos.x, pos.y, pos.z)
        );

        const polyline = this.viewer.entities.add({
            id: id,
            polyline: {
                positions: cartesianPositions,
                width: width,
                material: color,
            }
        });

        console.log('[CesiumViewer] Траектория добавлена:', id);
        this.viewer.zoomTo(polyline);

        return polyline;
    },

    /**
     * Удалить траекторию.
     */
    removeTrajectory: function(id) {
        if (!this.viewer) return;
        const entity = this.viewer.entities.getById(id);
        if (entity) {
            this.viewer.entities.remove(entity);
        }
    },

    /**
     * Очистить траектории.
     */
    clearTrajectories: function() {
        if (!this.viewer) return;
        this.viewer.entities.removeAll();
    },

    /**
     * Загрузить траекторию из файла.
     */
    loadTrajectoryFromFile: async function(datasetId) {
        try {
            console.log('[CesiumViewer] Запрос траектории:', datasetId);
            
            const response = await fetch('/api/cesium/trajectory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset_id: datasetId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка');
            }

            const data = await response.json();
            console.log('[CesiumViewer] Получено точек:', data.points);

            if (data.trajectory && data.trajectory.length > 0) {
                this.clearTrajectories();
                this.addTrajectory(data.trajectory, {
                    color: Cesium.Color.GREEN,
                    width: 3,
                    id: 'main-trajectory'
                });
                
                if (window.TabManager) {
                    TabManager.logToConsole('Траектория: ' + data.points + ' точек');
                }
            }
        } catch (error) {
            console.error('[CesiumViewer] Ошибка:', error);
            if (window.TabManager) {
                TabManager.logToConsole('Ошибка: ' + error.message, 'error');
            }
        }
    },

    resize: function() {
        if (this.viewer) this.viewer.resize();
    },

    clear: function() {
        if (!this.viewer) return;
        this.viewer.entities.removeAll();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => CesiumViewer.init(), 500);
});

window.CesiumViewer = CesiumViewer;