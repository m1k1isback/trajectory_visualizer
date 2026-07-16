/**
 * ============================================================================
 * CesiumViewer.js — ОФФЛАЙН версия с tooltip и цветами
 * ============================================================================
 */

const CesiumViewer = {
    viewer: null,
    containerId: 'cesium-container',
    initialized: false,
    trajectoryCounter: 0,
    trajectoryColors: {},

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
            
            // Добавляем tooltip
            this.setupTooltip();

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
        controller.inertiaSpin = 0.0;
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
     * Настроить tooltip при наведении.
     */
    setupTooltip: function() {
        if (!this.viewer) return;

        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        const tooltip = document.createElement('div');
        tooltip.id = 'cesium-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: none;
            z-index: 10000;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        document.body.appendChild(tooltip);

        let hoveredEntity = null;

        handler.setInputAction(function(movement) {
            const pickedObjects = this.viewer.scene.drillPick(movement.endPosition);
            let foundTrajectory = null;

            if (pickedObjects && pickedObjects.length > 0) {
                for (let i = 0; i < pickedObjects.length; i++) {
                    const primitive = pickedObjects[i].primitive;
                    // Проверяем entity или primitive
                    const entity = pickedObjects[i].id;
                    
                    if (entity && entity.trajectoryData) {
                        foundTrajectory = entity;
                        break;
                    }
                    if (primitive && primitive.id && primitive.id.trajectoryData) {
                        foundTrajectory = primitive.id;
                        break;
                    }
                }
            }

            if (foundTrajectory && foundTrajectory !== hoveredEntity) {
                hoveredEntity = foundTrajectory;
                const data = foundTrajectory.trajectoryData;
                
                tooltip.innerHTML = '<strong>' + (data.fileName || 'Траектория') + '</strong><br>' +
                                   'Точек: ' + (data.pointCount || 0);
                tooltip.style.display = 'block';
                tooltip.style.left = (movement.endPosition.x + 15) + 'px';
                tooltip.style.top = (movement.endPosition.y + 15) + 'px';
            } else if (!foundTrajectory && hoveredEntity) {
                hoveredEntity = null;
                tooltip.style.display = 'none';
            } else if (hoveredEntity) {
                tooltip.style.left = (movement.endPosition.x + 15) + 'px';
                tooltip.style.top = (movement.endPosition.y + 15) + 'px';
            }

        }.bind(this), Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction(function() {
            tooltip.style.display = 'none';
            hoveredEntity = null;
        }, Cesium.ScreenSpaceEventType.MOUSE_LEAVE);

        console.log('[CesiumViewer] Tooltip настроен');
    },

    /**
     * Получить цвет для траектории.
     */
    getTrajectoryColor: function(datasetId) {
        // Используем палитру из PlotManager если есть
        const curveColors = window.CURVE_COLORS || [
            '#4ec9b0', '#569cd6', '#ce9178', '#c586c0', '#dcdcaa',
            '#f44747', '#9cdcfe', '#d4d4d4', '#b5cea8', '#d16969'
        ];

        if (this.trajectoryColors[datasetId]) {
            return this.trajectoryColors[datasetId];
        }

        const colorIndex = Object.keys(this.trajectoryColors).length % curveColors.length;
        const hexColor = curveColors[colorIndex];
        const cesiumColor = Cesium.Color.fromCssColorString(hexColor);
        
        this.trajectoryColors[datasetId] = cesiumColor;
        
        return cesiumColor;
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
                // Очищаем старые
                this.clearTrajectories();

                // Получаем цвет
                const color = this.getTrajectoryColor(datasetId);
                const dataset = window.datasets[datasetId];
                const fileName = dataset ? dataset.name : 'Траектория';

                // Создаем polyline
                const entity = this.viewer.entities.add({
                    id: 'trajectory-' + datasetId,
                    trajectoryData: {
                        fileName: fileName,
                        pointCount: data.points,
                        datasetId: datasetId
                    },
                    polyline: {
                        positions: data.trajectory.map(pos => 
                            new Cesium.Cartesian3(pos.x, pos.y, pos.z)
                        ),
                        width: 3,
                        material: color,
                        clampToGround: false
                    }
                });

                // Добавляем невидимые точки для picking (каждую 5-ю точку)
                const step = Math.max(1, Math.floor(data.trajectory.length / 50));
                
                for (let i = 0; i < data.trajectory.length; i += step) {
                    const pos = data.trajectory[i];
                    this.viewer.entities.add({
                        id: 'trajectory-' + datasetId + '-point-' + i,
                        position: new Cesium.Cartesian3(pos.x, pos.y, pos.z),
                        point: {
                            pixelSize: 15,  // Большой размер для удобного picking
                            color: Cesium.Color.TRANSPARENT,  // Невидимый
                            outlineColor: Cesium.Color.TRANSPARENT,
                            outlineWidth: 0,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        },
                        trajectoryData: {
                            fileName: fileName,
                            pointCount: data.points,
                            datasetId: datasetId
                        }
                    });
                }

                // Зум на траекторию
                setTimeout(function() {
                    this.viewer.zoomTo(entity);
                }.bind(this), 300);

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

    /**
     * Удалить траекторию.
     */
    removeTrajectory: function(trajectoryId) {
        if (!this.viewer) return;
        
        // Удаляем основную траекторию
        const entity = this.viewer.entities.getById(trajectoryId);
        if (entity) {
            this.viewer.entities.remove(entity);
        }

        // Удаляем picking точки
        let i = 0;
        while (true) {
            const point = this.viewer.entities.getById(trajectoryId + '-point-' + i);
            if (!point) break;
            this.viewer.entities.remove(point);
            i++;
        }

        console.log('[CesiumViewer] Траектория удалена:', trajectoryId);
    },

    /**
     * Очистить траектории.
     */
    clearTrajectories: function() {
        if (!this.viewer) return;
        this.viewer.entities.removeAll();
    },

    /**
     * Добавить кнопки управления.
     */
    addControlButtons: function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (container.querySelector('.cesium-controls')) return;

        const div = document.createElement('div');
        div.className = 'cesium-controls';
        div.style.cssText = 
            'position: absolute; top: 10px; right: 10px; z-index: 1000; ' +
            'display: flex; flex-direction: column; gap: 5px; ' +
            'pointer-events: none;';

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
                'pointer-events: auto;';
            button.onclick = btn.action;
            div.appendChild(button);
        });

        container.appendChild(div);
        console.log('[CesiumViewer] Кнопки управления добавлены');
    },

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

    resize: function() {
        if (this.viewer) this.viewer.resize();
    },

    clear: function() {
        if (!this.viewer) return;
        this.viewer.entities.removeAll();
        this.trajectoryCounter = 0;
        this.trajectoryColors = {};
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => CesiumViewer.init(), 500);
});

window.CesiumViewer = CesiumViewer;