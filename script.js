// Main Application Script
class AegisShieldApp {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.sensorData = {
            heartRate: 0,
            temperature: 0,
            gasLevel: 0,
            posture: 0,
            fallDetected: false,
            flameDetected: false
        };
        this.dataHistory = [];
        this.charts = {};
        this.lastUpdateTime = 0;
        this.updateCount = 0;
        
        this.initializeApp();
    }

    initializeApp() {
        // Hide loading screen after 2 seconds
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'block';
            this.setupEventListeners();
            this.initializeCharts();
            this.showNotification('System initialized successfully', 'success');
        }, 2000);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Connection controls
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.toggleConnection();
        });

        document.getElementById('reconnectBtn').addEventListener('click', () => {
            this.reconnect();
        });

        document.getElementById('serverIP').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.toggleConnection();
            }
        });

        // Emergency controls
        document.getElementById('emergencyBtn').addEventListener('click', () => {
            this.showEmergencyModal();
        });

        document.getElementById('sosBtn').addEventListener('click', () => {
            this.triggerSOS();
        });

        // Modal controls
        document.getElementById('confirmEmergency').addEventListener('click', () => {
            this.confirmEmergency();
        });

        document.getElementById('cancelEmergency').addEventListener('click', () => {
            this.hideEmergencyModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideEmergencyModal();
        });

        // Chart controls
        document.getElementById('chartType').addEventListener('change', (e) => {
            this.updateChartData(e.target.value);
        });

        // Settings
        document.getElementById('updateInterval').addEventListener('change', this.saveSettings.bind(this));
        document.getElementById('alertThreshold').addEventListener('change', this.saveSettings.bind(this));
        document.getElementById('soundAlerts').addEventListener('change', this.saveSettings.bind(this));
        document.getElementById('autoReconnect').addEventListener('change', this.saveSettings.bind(this));

        // Load settings
        this.loadSettings();
    }

    initializeCharts() {
        // Real-time Chart
        const ctx = document.getElementById('realtimeChart').getContext('2d');
        this.charts.realtime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heart Rate',
                    data: [],
                    borderColor: '#00B4D8',
                    backgroundColor: 'rgba(0, 180, 216, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        min: 50,
                        max: 120,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#B0B0B0'
                        }
                    }
                }
            }
        });

        // Analytics Chart
        const analyticsCtx = document.getElementById('analyticsChart').getContext('2d');
        this.charts.analytics = new Chart(analyticsCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Average Health Score',
                    data: [85, 78, 92, 88, 76, 95, 89],
                    backgroundColor: 'rgba(0, 180, 216, 0.8)',
                    borderColor: '#00B4D8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#FFFFFF'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#B0B0B0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#B0B0B0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    connect() {
        const serverIP = document.getElementById('serverIP').value;
        
        if (!serverIP) {
            this.showNotification('Please enter a server IP address', 'error');
            return;
        }

        this.updateConnectionStatus('connecting', 'Connecting...');

        try {
            this.socket = new WebSocket(serverIP);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus('connected', 'Connected');
                this.showNotification('Connected to sensor server', 'success');
                this.startDataRateCalculation();
            };

            this.socket.onmessage = (event) => {
                this.handleSensorData(event.data);
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', 'Disconnected');
                this.showNotification('Connection lost', 'warning');
                
                // Auto-reconnect if enabled
                if (this.getSetting('autoReconnect')) {
                    setTimeout(() => this.reconnect(), 5000);
                }
            };

            this.socket.onerror = (error) => {
                this.showNotification('Connection error: ' + error, 'error');
                this.updateConnectionStatus('error', 'Connection Failed');
            };

        } catch (error) {
            this.showNotification('Failed to connect: ' + error, 'error');
            this.updateConnectionStatus('error', 'Connection Failed');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.showNotification('Disconnected from server', 'info');
    }

    reconnect() {
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
    }

    handleSensorData(rawData) {
    try {
        const sensorData = JSON.parse(rawData);
        this.sensorData = { ...this.sensorData, ...sensorData };
        this.updateDataRate();
        this.updateDashboard();
        this.processWithAI(sensorData);
        
        // Add to history for charts
        this.dataHistory.push({
            timestamp: new Date(),
            ...sensorData
        });
        
        // Keep only last 100 points
        if (this.dataHistory.length > 100) {
            this.dataHistory.shift();
        }
        
        this.updateCharts();
        this.updateGPSStatus(sensorData); // NEW: Update GPS display
        this.updateExtendedSensors(sensorData); // NEW: Update additional sensors
        
    } catch (error) {
        console.error('Error parsing sensor data:', error);
    }
}

    processWithAI(sensorData) {
        const analysis = aiEngine.analyzeSensorData(sensorData);
        
        // Update health scores
        this.updateHealthScores(analysis);
        
        // Generate insights and recommendations
        this.updateAIInsights(analysis);
        
        // Check for alerts
        this.handleAlerts(analysis.alerts);
    }

    updateDashboard() {
    // Update vital signs (existing)
    document.getElementById('heartRateValue').textContent = Math.round(this.sensorData.heartRate);
    document.getElementById('temperatureValue').textContent = this.sensorData.temperature.toFixed(1);
    document.getElementById('gasLevelValue').textContent = this.sensorData.gasLevel;
    document.getElementById('postureValue').textContent = this.getPostureText(this.sensorData.posture);

    // Update trends (existing)
    this.updateTrends();

    // Update last update time (existing)
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    
    // NEW: Update client count if available
    if (this.sensorData.clientCount !== undefined) {
        const clientElement = document.getElementById('clientCount');
        if (clientElement) {
            clientElement.textContent = this.sensorData.clientCount;
        }
    }
}

    updateHealthScores(analysis) {
        const breakdown = aiEngine.getHealthBreakdown(analysis.overallHealth);
        
        document.getElementById('healthScore').textContent = analysis.overallHealth + '%';
        document.getElementById('cardioScore').style.width = breakdown.cardiovascular + '%';
        document.getElementById('respiratoryScore').style.width = breakdown.respiratory + '%';
        document.getElementById('stressScore').style.width = breakdown.stress + '%';
        
        document.getElementById('cardioValue').textContent = Math.round(breakdown.cardiovascular) + '%';
        document.getElementById('respiratoryValue').textContent = Math.round(breakdown.respiratory) + '%';
        document.getElementById('stressValue').textContent = Math.round(breakdown.stress) + '%';
    }

    updateAIInsights(analysis) {
        const predictionsContainer = document.getElementById('aiPredictions');
        const recommendationsContainer = document.getElementById('recommendations');
        
        // Clear previous content
        predictionsContainer.innerHTML = '';
        recommendationsContainer.innerHTML = '';

        // Add insights
        analysis.insights.forEach(insight => {
            const insightElement = this.createInsightElement(insight);
            predictionsContainer.appendChild(insightElement);
        });

        // Add recommendations
        analysis.recommendations.forEach(rec => {
            const recElement = this.createRecommendationElement(rec);
            recommendationsContainer.appendChild(recElement);
        });
    }

    createInsightElement(insight) {
        const div = document.createElement('div');
        div.className = `insight-item ${insight.severity}`;
        div.innerHTML = `
            <div class="insight-icon">
                <i class="${insight.icon}"></i>
            </div>
            <div class="insight-content">
                <h4>${insight.title}</h4>
                <p>${insight.description}</p>
            </div>
            <div class="insight-severity ${insight.severity}">
                ${insight.severity.toUpperCase()}
            </div>
        `;
        return div;
    }

    createRecommendationElement(recommendation) {
        const div = document.createElement('div');
        div.className = `recommendation-item ${recommendation.priority}`;
        div.innerHTML = `
            <div class="recommendation-icon">
                <i class="${recommendation.icon}"></i>
            </div>
            <div class="recommendation-content">
                <h4>${recommendation.title}</h4>
                <p>${recommendation.description}</p>
            </div>
        `;
        return div;
    }

    handleAlerts(alerts) {
        const alertsList = document.getElementById('alertsList');
        const alertCount = document.getElementById('alertCount');
        
        // Clear previous alerts
        alertsList.innerHTML = '';
        
        if (alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>All systems normal</p>
                </div>
            `;
            alertCount.textContent = '0';
            return;
        }

        alertCount.textContent = alerts.length;

        alerts.forEach(alert => {
            const alertElement = this.createAlertElement(alert);
            alertsList.appendChild(alertElement);
            
            // Show notification for high severity alerts
            if (alert.severity === 'critical' || alert.immediateAction) {
                this.showNotification(alert.title + ': ' + alert.description, 'error');
                
                // Play sound alert if enabled
                if (this.getSetting('soundAlerts')) {
                    this.playAlertSound();
                }
            }
        });
    }

    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.severity}`;
        div.innerHTML = `
            <div class="alert-icon">
                <i class="${alert.icon}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
            </div>
            <div class="alert-time">${new Date().toLocaleTimeString()}</div>
        `;
        return div;
    }

    updateTrends() {
        // This would compare current values with previous values
        // For now, we'll simulate trends
        const trends = {
            heartRate: Math.random() > 0.5 ? 'up' : 'down',
            temperature: Math.random() > 0.5 ? 'up' : 'down',
            gasLevel: Math.random() > 0.5 ? 'up' : 'down',
            posture: 'stable'
        };

        Object.keys(trends).forEach(type => {
            const trendElement = document.getElementById(`${type}Trend`);
            const trend = trends[type];
            
            trendElement.className = `vital-trend ${trend}`;
            trendElement.innerHTML = trend === 'up' ? 
                '<i class="fas fa-arrow-up"></i>' : 
                trend === 'down' ? 
                '<i class="fas fa-arrow-down"></i>' : 
                '<i class="fas fa-minus"></i>';
        });
    }

    updateCharts() {
        if (this.dataHistory.length === 0) return;

        const chartType = document.getElementById('chartType').value;
        const labels = this.dataHistory.map((_, index) => index);
        const data = this.dataHistory.map(item => item[chartType]);

        this.charts.realtime.data.labels = labels;
        this.charts.realtime.data.datasets[0].data = data;
        this.charts.realtime.data.datasets[0].label = this.getChartLabel(chartType);
        this.charts.realtime.update('none');
    }
    updateGPSStatus(sensorData) {
    const gpsStatus = document.getElementById('gpsStatus');
    
    if (sensorData.gpsFixed && sensorData.latitude && sensorData.longitude) {
        gpsStatus.innerHTML = `<i class="fas fa-location-arrow"></i> GPS: ${sensorData.latitude.toFixed(6)}, ${sensorData.longitude.toFixed(6)}`;
        gpsStatus.style.color = 'var(--success)';
    } else {
        gpsStatus.innerHTML = `<i class="fas fa-location-arrow"></i> GPS: Searching... (${sensorData.satellites || 0} sats)`;
        gpsStatus.style.color = 'var(--warning)';
    }
}
updateExtendedSensors(sensorData) {
    // Update additional sensor displays if they exist
    const elements = {
        'humidityValue': sensorData.humidity,
        'stressValue': sensorData.stressLevel,
        'motionValue': sensorData.motionDetected
    };
    
    for (const [elementId, value] of Object.entries(elements)) {
        const element = document.getElementById(elementId);
        if (element) {
            if (typeof value === 'boolean') {
                element.textContent = value ? 'Detected' : 'None';
                element.style.color = value ? 'var(--danger)' : 'var(--success)';
            } else {
                element.textContent = value !== undefined ? value : '--';
            }
        }
    }
    
    // Update system status indicator
    if (sensorData.status) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = sensorData.status;
        
        switch(sensorData.status) {
            case 'NORMAL':
                statusIndicator.style.background = 'var(--success)';
                break;
            case 'WARNING':
                statusIndicator.style.background = 'var(--warning)';
                break;
            case 'EMERGENCY':
                statusIndicator.style.background = 'var(--danger)';
                break;
        }
    }
}

    updateChartData(type) {
        // Chart update is handled in updateCharts()
        this.updateCharts();
    }

    getChartLabel(type) {
        const labels = {
            heartRate: 'Heart Rate (BPM)',
            temperature: 'Temperature (°C)',
            gasLevel: 'Gas Level (PPM)'
        };
        return labels[type] || type;
    }

    getPostureText(posture) {
        const postures = ['Good', 'Fair', 'Poor'];
        return postures[posture] || 'Unknown';
    }

    updateConnectionStatus(status, text) {
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('statusText');
    const connectionStatus = document.getElementById('connectionStatus');
    
    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
    
    const statusElement = connectionStatus.querySelector('span');
    const dot = connectionStatus.querySelector('.status-dot');
    
    statusElement.textContent = text;
    dot.className = `status-dot ${status}`;
    
    // Update connect button
    const connectBtn = document.getElementById('connectBtn');
    if (status === 'connected') {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Disconnect';
        connectBtn.style.background = 'var(--gradient-danger)';
        
        // Show connected notification with IP
        this.showNotification(`Connected to ${this.socket.url}`, 'success');
    } else {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        connectBtn.style.background = 'var(--gradient-primary)';
    }
}

    startDataRateCalculation() {
        this.lastUpdateTime = Date.now();
        this.updateCount = 0;
    }

    updateDataRate() {
        this.updateCount++;
        const now = Date.now();
        const elapsed = (now - this.lastUpdateTime) / 1000;
        
        if (elapsed >= 1) {
            const rate = (this.updateCount / elapsed).toFixed(1);
            document.getElementById('dataRate').textContent = rate + ' Hz';
            this.updateCount = 0;
            this.lastUpdateTime = now;
        }
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    showEmergencyModal() {
        document.getElementById('emergencyModal').classList.add('active');
    }

    hideEmergencyModal() {
        document.getElementById('emergencyModal').classList.remove('active');
    }

    confirmEmergency() {
        // Simulate emergency broadcast
        this.showNotification('Emergency alert broadcasted to response team', 'error');
        this.hideEmergencyModal();
        
        // Add to alert history
        this.addToAlertHistory({
            type: 'manual_emergency',
            title: 'Manual Emergency Triggered',
            description: 'User initiated emergency protocol',
            severity: 'critical',
            timestamp: new Date()
        });
    }

    triggerSOS() {
        this.showNotification('SOS signal broadcasted with location data', 'error');
        
        // Add to alert history
        this.addToAlertHistory({
            type: 'sos_signal',
            title: 'SOS Signal Sent',
            description: 'Emergency SOS broadcast initiated',
            severity: 'critical',
            timestamp: new Date()
        });
    }

    addToAlertHistory(alert) {
        const historyContainer = document.getElementById('alertHistory');
        const alertElement = this.createAlertElement(alert);
        historyContainer.insertBefore(alertElement, historyContainer.firstChild);
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    playAlertSound() {
        // Create a simple alert sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    saveSettings() {
        const settings = {
            updateInterval: document.getElementById('updateInterval').value,
            alertThreshold: document.getElementById('alertThreshold').value,
            soundAlerts: document.getElementById('soundAlerts').checked,
            autoReconnect: document.getElementById('autoReconnect').checked,
            serverIP: document.getElementById('serverIP').value
        };
        
        localStorage.setItem('aegisShieldSettings', JSON.stringify(settings));
        this.showNotification('Settings saved', 'success');
    }

    loadSettings() {
        const saved = localStorage.getItem('aegisShieldSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            document.getElementById('updateInterval').value = settings.updateInterval || '2000';
            document.getElementById('alertThreshold').value = settings.alertThreshold || 'medium';
            document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;
            document.getElementById('autoReconnect').checked = settings.autoReconnect !== false;
            document.getElementById('serverIP').value = settings.serverIP || 'ws://192.168.1.100:81';
        }
    }

    getSetting(key) {
        const saved = localStorage.getItem('aegisShieldSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return settings[key];
        }
        return null;
    }
}

// Additional CSS for AI insights and recommendations
const additionalCSS = `
.insight-item, .recommendation-item {
    background: var(--surface-light);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid var(--primary);
    display: flex;
    align-items: center;
    gap: 1rem;
}

.insight-item.high, .recommendation-item.high {
    border-left-color: var(--danger);
}

.insight-item.medium, .recommendation-item.medium {
    border-left-color: var(--warning);
}

.insight-item.low, .recommendation-item.low {
    border-left-color: var(--success);
}

.insight-icon, .recommendation-icon {
    width: 40px;
    height: 40px;
    background: var(--gradient-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.insight-content, .recommendation-content {
    flex: 1;
}

.insight-content h4, .recommendation-content h4 {
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
}

.insight-content p, .recommendation-content p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
}

.insight-severity {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
}

.insight-severity.critical {
    background: var(--gradient-danger);
}

.insight-severity.high {
    background: var(--danger);
}

.insight-severity.medium {
    background: var(--warning);
}

.insight-severity.low {
    background: var(--success);
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
}

.notification-close:hover {
    background: rgba(255, 255, 255, 0.1);
}
`;

// Add additional CSS to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aegisApp = new AegisShieldApp();
});