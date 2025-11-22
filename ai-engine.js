// AI Engine for Advanced Health Monitoring
class AIEngine {
    constructor() {
        this.healthBaseline = {
            heartRate: { min: 60, max: 100, optimal: 72 },
            temperature: { min: 36.0, max: 37.5, optimal: 36.6 },
            gasLevel: { min: 0, max: 1000, optimal: 300 },
            posture: { optimal: 0 } // 0 = Good, 1 = Fair, 2 = Poor
        };
        
        this.healthHistory = [];
        this.patterns = new Map();
        this.insights = [];
        this.recommendations = [];
        
        this.initializeAI();
    }

    initializeAI() {
        console.log('🤖 AI Engine Initialized');
        this.loadHealthPatterns();
        this.generateInitialInsights();
    }

    loadHealthPatterns() {
        // Pre-defined health patterns for AI analysis
        this.patterns.set('stress_pattern', {
            description: 'Elevated heart rate with irregular breathing',
            conditions: (data) => data.heartRate > 85 && data.gasLevel > 600,
            severity: 'medium',
            recommendation: 'Practice deep breathing exercises'
        });

        this.patterns.set('fatigue_pattern', {
            description: 'Consistent low heart rate variability',
            conditions: (data) => this.calculateHeartRateVariability(data) < 20,
            severity: 'low',
            recommendation: 'Consider taking a short break'
        });

        this.patterns.set('fever_pattern', {
            description: 'Elevated body temperature',
            conditions: (data) => data.temperature > 37.2,
            severity: 'high',
            recommendation: 'Monitor temperature and stay hydrated'
        });

        this.patterns.set('poor_posture_pattern', {
            description: 'Extended period of poor posture',
            conditions: (data) => data.posture === 2,
            severity: 'medium',
            recommendation: 'Adjust your sitting position'
        });
    }

    analyzeSensorData(sensorData) {
        const analysis = {
            timestamp: new Date(),
            overallHealth: this.calculateOverallHealth(sensorData),
            riskLevel: this.assessRiskLevel(sensorData),
            patterns: this.detectPatterns(sensorData),
            insights: this.generateInsights(sensorData),
            recommendations: this.generateRecommendations(sensorData),
            alerts: this.checkAlerts(sensorData)
        };

        this.healthHistory.push(analysis);
        
        // Keep only last 1000 records
        if (this.healthHistory.length > 1000) {
            this.healthHistory.shift();
        }

        return analysis;
    }

    calculateOverallHealth(sensorData) {
        let score = 100;

        // Heart Rate Score (40% weight)
        const hrScore = this.calculateParameterScore(
            sensorData.heartRate,
            this.healthBaseline.heartRate.min,
            this.healthBaseline.heartRate.max,
            this.healthBaseline.heartRate.optimal
        );
        score -= (100 - hrScore) * 0.4;

        // Temperature Score (30% weight)
        const tempScore = this.calculateParameterScore(
            sensorData.temperature,
            this.healthBaseline.temperature.min,
            this.healthBaseline.temperature.max,
            this.healthBaseline.temperature.optimal
        );
        score -= (100 - tempScore) * 0.3;

        // Gas Level Score (20% weight)
        const gasScore = this.calculateParameterScore(
            sensorData.gasLevel,
            this.healthBaseline.gasLevel.min,
            this.healthBaseline.gasLevel.max,
            this.healthBaseline.gasLevel.optimal
        );
        score -= (100 - gasScore) * 0.2;

        // Posture Score (10% weight)
        const postureScore = sensorData.posture === 0 ? 100 : 
                           sensorData.posture === 1 ? 70 : 30;
        score -= (100 - postureScore) * 0.1;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    calculateParameterScore(value, min, max, optimal) {
        if (value >= min && value <= max) {
            const distanceFromOptimal = Math.abs(value - optimal);
            const allowedRange = (max - min) / 2;
            return Math.max(0, 100 - (distanceFromOptimal / allowedRange) * 50);
        }
        return 0;
    }

    assessRiskLevel(sensorData) {
        let riskScore = 0;

        if (sensorData.heartRate > 120 || sensorData.heartRate < 50) riskScore += 3;
        else if (sensorData.heartRate > 100 || sensorData.heartRate < 60) riskScore += 2;
        else if (sensorData.heartRate > 90 || sensorData.heartRate < 65) riskScore += 1;

        if (sensorData.temperature > 38.0 || sensorData.temperature < 35.0) riskScore += 3;
        else if (sensorData.temperature > 37.5 || sensorData.temperature < 35.5) riskScore += 2;

        if (sensorData.gasLevel > 800) riskScore += 2;
        else if (sensorData.gasLevel > 600) riskScore += 1;

        if (sensorData.posture === 2) riskScore += 1;

        if (sensorData.fallDetected) riskScore += 3;
        if (sensorData.flameDetected) riskScore += 3;

        if (riskScore >= 5) return 'critical';
        if (riskScore >= 3) return 'high';
        if (riskScore >= 2) return 'medium';
        return 'low';
    }

    detectPatterns(sensorData) {
        const detectedPatterns = [];

        for (const [patternName, pattern] of this.patterns) {
            if (pattern.conditions(sensorData)) {
                detectedPatterns.push({
                    name: patternName,
                    description: pattern.description,
                    severity: pattern.severity,
                    recommendation: pattern.recommendation
                });
            }
        }

        return detectedPatterns;
    }

    generateInsights(sensorData) {
        const insights = [];

        // Heart Rate Insights
        if (sensorData.heartRate > 100) {
            insights.push({
                type: 'heart_rate_high',
                title: 'Elevated Heart Rate',
                description: 'Your heart rate is above normal range. This could indicate physical exertion or stress.',
                severity: 'medium',
                icon: 'fas fa-heartbeat'
            });
        } else if (sensorData.heartRate < 60) {
            insights.push({
                type: 'heart_rate_low',
                title: 'Low Heart Rate',
                description: 'Your heart rate is below normal range. This is common in well-trained athletes.',
                severity: 'low',
                icon: 'fas fa-heart'
            });
        }

        // Temperature Insights
        if (sensorData.temperature > 37.2) {
            insights.push({
                type: 'temperature_high',
                title: 'Elevated Temperature',
                description: 'Your body temperature is slightly elevated. Monitor for signs of fever.',
                severity: 'medium',
                icon: 'fas fa-thermometer-full'
            });
        }

        // Gas Level Insights
        if (sensorData.gasLevel > 600) {
            insights.push({
                type: 'air_quality_poor',
                title: 'Poor Air Quality',
                description: 'Gas levels are elevated. Consider moving to better ventilated area.',
                severity: 'high',
                icon: 'fas fa-wind'
            });
        }

        // Posture Insights
        if (sensorData.posture === 2) {
            insights.push({
                type: 'posture_poor',
                title: 'Poor Posture Detected',
                description: 'Your posture needs adjustment for better ergonomics.',
                severity: 'low',
                icon: 'fas fa-user-slouch'
            });
        }

        // Add trend-based insights
        const trendInsights = this.analyzeTrends();
        insights.push(...trendInsights);

        return insights;
    }

    analyzeTrends() {
        if (this.healthHistory.length < 10) return [];

        const recentData = this.healthHistory.slice(-10);
        const trends = [];

        // Check for consistent health decline
        const healthScores = recentData.map(d => d.overallHealth);
        if (this.isConsistentDecline(healthScores)) {
            trends.push({
                type: 'health_decline',
                title: 'Health Trend Declining',
                description: 'Your overall health score has been consistently decreasing.',
                severity: 'medium',
                icon: 'fas fa-chart-line-down'
            });
        }

        return trends;
    }

    isConsistentDecline(scores) {
        let declineCount = 0;
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] < scores[i - 1]) declineCount++;
        }
        return declineCount >= scores.length * 0.7; // 70% decline rate
    }

    generateRecommendations(sensorData) {
        const recommendations = [];

        // Basic health recommendations
        if (sensorData.heartRate > 90) {
            recommendations.push({
                type: 'relaxation',
                title: 'Take a Break',
                description: 'Your heart rate suggests you might be stressed. Consider taking a 5-minute break.',
                priority: 'high',
                icon: 'fas fa-coffee'
            });
        }

        if (sensorData.temperature > 37.0) {
            recommendations.push({
                type: 'hydration',
                title: 'Stay Hydrated',
                description: 'Drink water to help regulate your body temperature.',
                priority: 'medium',
                icon: 'fas fa-tint'
            });
        }

        if (sensorData.gasLevel > 500) {
            recommendations.push({
                type: 'ventilation',
                title: 'Improve Ventilation',
                description: 'Air quality could be better. Open a window or move to fresh air.',
                priority: 'high',
                icon: 'fas fa-fan'
            });
        }

        if (sensorData.posture !== 0) {
            recommendations.push({
                type: 'posture_correction',
                title: 'Adjust Posture',
                description: 'Sit up straight with your back supported for better ergonomics.',
                priority: 'low',
                icon: 'fas fa-user-check'
            });
        }

        // Add preventive recommendations
        recommendations.push({
            type: 'preventive',
            title: 'Regular Movement',
            description: 'Take short walking breaks every hour to maintain circulation.',
            priority: 'medium',
            icon: 'fas fa-walking'
        });

        return recommendations;
    }

    checkAlerts(sensorData) {
        const alerts = [];

        // Critical alerts
        if (sensorData.fallDetected) {
            alerts.push({
                type: 'fall_detected',
                title: 'Fall Detected!',
                description: 'A fall has been detected. Please check if assistance is needed.',
                severity: 'critical',
                immediateAction: true,
                icon: 'fas fa-exclamation-triangle'
            });
        }

        if (sensorData.flameDetected) {
            alerts.push({
                type: 'flame_detected',
                title: 'Fire Hazard!',
                description: 'Flame detected in the vicinity. Please evacuate if necessary.',
                severity: 'critical',
                immediateAction: true,
                icon: 'fas fa-fire'
            });
        }

        // Health alerts
        if (sensorData.heartRate > 130 || sensorData.heartRate < 45) {
            alerts.push({
                type: 'heart_rate_extreme',
                title: 'Critical Heart Rate',
                description: 'Heart rate is at dangerous levels. Seek medical attention if symptoms persist.',
                severity: 'high',
                immediateAction: false,
                icon: 'fas fa-heart-crack'
            });
        }

        if (sensorData.temperature > 39.0 || sensorData.temperature < 34.0) {
            alerts.push({
                type: 'temperature_extreme',
                title: 'Dangerous Body Temperature',
                description: 'Body temperature is at critical levels. Medical attention may be required.',
                severity: 'high',
                immediateAction: false,
                icon: 'fas fa-temperature-high'
            });
        }

        return alerts;
    }

    calculateHeartRateVariability(data) {
        // Simplified HRV calculation
        // In a real implementation, this would analyze RR intervals
        return Math.random() * 50 + 30; // Simulated value
    }

    getHealthBreakdown(overallHealth) {
        return {
            cardiovascular: Math.min(100, overallHealth + (Math.random() * 20 - 10)),
            respiratory: Math.min(100, overallHealth + (Math.random() * 15 - 7)),
            stress: Math.min(100, 100 - (Math.random() * 30)) // Stress is inverse
        };
    }

    predictHealthTrend() {
        if (this.healthHistory.length < 5) return 'stable';
        
        const recentScores = this.healthHistory.slice(-5).map(h => h.overallHealth);
        const trend = this.calculateTrend(recentScores);
        
        if (trend > 2) return 'improving';
        if (trend < -2) return 'declining';
        return 'stable';
    }

    calculateTrend(scores) {
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = scores.length;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += scores[i];
            sumXY += i * scores[i];
            sumX2 += i * i;
        }
        
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }
}

// Initialize AI Engine
const aiEngine = new AIEngine();