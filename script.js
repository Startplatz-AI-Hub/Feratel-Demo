// Feratel Kamera-Statistik - Main Application Script
// Automatisch extrahiert aus index.html

// Verwende Konfiguration aus config.js
const CONFIG = window.appConfig || {};

let currentData = null;
        const OPENAI_API_KEY = window.appConfig ? window.appConfig.OPENAI_API_KEY : ''; // Legacy, nicht mehr verwendet
        const GEMINI_API_KEY = window.appConfig ? window.appConfig.GEMINI_API_KEY : ''; // Neu: Gemini API
        let chartInstances = [];

        // Drag & Drop Funktionalität
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loading = document.getElementById('loading');
        const reportSection = document.getElementById('reportSection');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);

        function handleDragOver(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processFile(files[0]);
            }
        }

        function handleFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                processFile(files[0]);
            }
        }

        function processFile(file) {
            hideMessages();
            
            // Validierung
            if (!file.name.endsWith('.json')) {
                showError('Bitte wählen Sie eine JSON-Datei aus.');
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10 MB
                showError('Die Datei ist zu groß. Maximale Größe: 10 MB.');
                return;
            }

            // Datei lesen
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    validateAndProcessData(jsonData, file);
                } catch (error) {
                    showError('Fehler beim Lesen der JSON-Datei: ' + error.message);
                }
            };
            reader.readAsText(file);
        }

        function validateAndProcessData(data, file) {
            try {
                // Erweiterte Validierung der JSON-Struktur
                if (!data || typeof data !== 'object') {
                    showError('Ungültige JSON-Datei: Keine gültigen Daten gefunden.');
                    return;
                }

                if (!data.reports || !Array.isArray(data.reports) || data.reports.length === 0) {
                    showError('Ungültige JSON-Struktur: "reports" Array fehlt oder ist leer.');
                    return;
                }

                if (!data.cids || !Array.isArray(data.cids) || data.cids.length === 0) {
                    showError('Ungültige JSON-Struktur: "cids" Array fehlt oder ist leer.');
                    return;
                }

                // Validiere Report-Struktur
                const invalidReports = data.reports.filter(report => 
                    !report.datalist || !Array.isArray(report.datalist) || 
                    !report.line1 || !report.m
                );

                if (invalidReports.length > 0) {
                    showError(`${invalidReports.length} Reports haben ungültige Struktur. Prüfen Sie die Datalist-Felder.`);
                    return;
                }

                // Datei-Info anzeigen
                const fileNameEl = document.getElementById('fileName');
                const fileSizeEl = document.getElementById('fileSize');
                const cameraCountEl = document.getElementById('cameraCount');
                
                if (fileNameEl) fileNameEl.textContent = file.name;
                if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
                if (cameraCountEl) cameraCountEl.textContent = data.cids.length;
                
                fileInfo.classList.add('show');

                // Daten speichern und Bericht generieren
                currentData = data;
                showSuccess('JSON-Datei erfolgreich geladen!');
                
                // Nach kurzer Verzögerung Bericht generieren
                setTimeout(() => {
                    generateReport(data);
                }, 1000);
                
            } catch (error) {
                console.error('Validation error:', error);
                showError('Fehler bei der Datenvalidierung: ' + error.message);
            }
        }

        function generateReport(data) {
            try {
                loading.classList.add('show');
                
                setTimeout(() => {
                    try {
                        // Report Header - mit Null-Checks
                        const reportTitleEl = document.getElementById('reportTitle');
                        const reportMetaEl = document.getElementById('reportMeta');
                        const reportContentEl = document.getElementById('reportContent');
                        
                        if (!reportTitleEl || !reportMetaEl || !reportContentEl) {
                            throw new Error('Kritische DOM-Elemente fehlen');
                        }
                        
                        reportTitleEl.textContent = `Kamera-Statistik Bericht - ${data.reports[0].line1}`;
                        
                        reportMetaEl.innerHTML = `
                            Berichtszeitraum: ${formatDate(data.ms)} - ${formatDate(data.me)} | 
                            Anzahl Kameras: ${data.cids.length} | 
                            Generiert am: ${new Date().toLocaleDateString('de-DE')}
                        `;

                        // Report Content generieren
                        const reportContent = generateReportContent(data);
                        reportContentEl.innerHTML = reportContent;

                        // Diagramme erstellen
                        createCharts(data);
                        
                        loading.classList.remove('show');
                        reportSection.classList.add('show');
                        
                    } catch (error) {
                        console.error('Report generation error:', error);
                        loading.classList.remove('show');
                        showError('Fehler beim Generieren des Berichts: ' + error.message);
                    }
                }, 1500);
                
            } catch (error) {
                console.error('Critical report error:', error);
                loading.classList.remove('show');
                showError('Kritischer Fehler: ' + error.message);
            }
        }

        function generateReportContent(data) {
            let html = '';
            
            // Management Summary (KI-generiert)
            html += generateManagementSummary(data);
            
            // Erweiterte Übersicht mit Metriken
            html += generateAdvancedOverview(data);
            
            // Für ALLE Kameras erweiterte Berichte erstellen
            const uniqueCameras = getUniqueCameras(data);
            uniqueCameras.forEach((cameraData, index) => {
                html += generateAdvancedCameraReport(cameraData.latestReport, index, data, cameraData);
            });
            
            // Internationale Reichweite
            html += generateInternationalReach(data);
            
            // Saisonale Trends
            html += generateSeasonalTrends(data);
            
            // Kanal-Verteilung
            html += generateChannelDistribution(data);
            
            // Zusätzliche Statistiken
            if (data.szlist) {
                html += generateAdditionalStats(data.szlist);
            }
            
            return html;
        }

        // KI-generiertes Management Summary
        function generateManagementSummary(data) {
            return `
                <div class="management-summary">
                    <div class="summary-title">
                        <span class="insight-icon">🎯</span>
                        Management Summary
                        <div class="ai-loading" id="ai-loading-summary"></div>
                    </div>
                    <div id="ai-summary-content">
                        <p>KI-Analyse wird generiert...</p>
                    </div>
                    <div class="recommendations" id="ai-recommendations">
                        <!-- KI-generierte Empfehlungen werden hier eingefügt -->
                    </div>
                </div>
            `;
        }

        function generateAdvancedOverview(data) {
            const analytics = calculateAdvancedMetrics(data);
            
            return `
                <div class="chart-container">
                    <h3 class="chart-title">📊 Video-Performance Übersicht</h3>
                    
                    <!-- Begriffserklärung -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 12px;">
                        <strong>Begriffserklärung:</strong><br>
                        <strong>Impressions (Abrufe Gesamt):</strong> Wie oft Ihre Kamera-Seite aufgerufen wurde<br>
                        <strong>Video-Plays (Video-Abrufe):</strong> Wie oft Videos tatsächlich abgespielt wurden
                    </div>
                    
                    <!-- Hauptdiagramme für Abrufe -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                        <div class="chart-container" style="margin: 0;">
                            <h4 class="chart-title">📺 Abrufe Gesamt (Impressions)</h4>
                            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                                Zeigt wie oft Ihre Kamera-Seite besucht wurde
                            </div>
                            <div class="chart" id="overview-total-chart"></div>
                        </div>
                        <div class="chart-container" style="margin: 0;">
                            <h4 class="chart-title">▶️ Video-Abrufe (Plays)</h4>
                            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                                Zeigt wie oft Videos tatsächlich abgespielt wurden
                            </div>
                            <div class="chart" id="overview-video-chart"></div>
                        </div>
                    </div>
                    
                    <!-- Metriken ohne Video-Engagement und Downloads -->
                    <div class="analytics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(analytics.totalVideoAbrufe)}</div>
                            <div class="metric-label">Gesamt Video-Abrufe</div>
                            <div class="metric-trend ${analytics.videoTrend}">${analytics.videoTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(analytics.totalImpressions)}</div>
                            <div class="metric-label">Gesamt Impressions</div>
                            <div class="metric-trend ${analytics.impressionsTrend}">${analytics.impressionsTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${analytics.internationalReach}%</div>
                            <div class="metric-label">Internationale Reichweite</div>
                            <div class="metric-trend ${analytics.internationalTrend}">${analytics.internationalTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${analytics.peakVariance}%</div>
                            <div class="metric-label">Saisonale Varianz</div>
                            <div class="metric-trend ${analytics.varianceTrend}">${analytics.varianceTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${analytics.topCountries}</div>
                            <div class="metric-label">Top-Märkte</div>
                            <div class="metric-trend trend-neutral">🌍 Global vertreten</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${analytics.peakPerformanceDay}</div>
                            <div class="metric-label">Stärkster Tag</div>
                            <div class="peak-indicator">${formatNumber(analytics.peakPerformanceValue)} Abrufe</div>
                        </div>
                    </div>
                </div>
            `;
        }

        function generateAdvancedCameraReport(report, index, allData, cameraData) {
            const cameraAnalytics = analyzeCameraDataAdvanced(report, allData, cameraData);
            const kpiDefinitions = generateKPIDefinitions();
            
            let html = `
                <div class="chart-container">
                    <h3 class="chart-title">📹 ${report.line1} - ${report.line2}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <div class="quality-indicator ${cameraAnalytics.dataQuality}">
                            📊 Datenqualität: ${cameraAnalytics.dataQualityText}
                        </div>
                    </div>
                    
                    <div class="kpi-definitions" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 12px;">
                        <strong>📋 KPI-Definitionen:</strong><br>
                        <strong>Trend-Berechnung:</strong> ${kpiDefinitions.trendCalculation}<br>
                        <strong>Domestic-Märkte:</strong> ${cameraAnalytics.domesticMarkets.join(', ')}
                    </div>
                    
                    <div class="insights-section">
                        <div class="insight-title">
                            <span class="insight-icon">🤖</span>
                            KI-Analyse
                            <div class="ai-loading" id="ai-loading-${index}"></div>
                        </div>
                        <div class="insight-content" id="ai-insight-${index}">
                            <span style="color: #999;">Analyse wird generiert...</span>
                        </div>
                    </div>
                    
                    <!-- Zwei getrennte Diagramme untereinander für bessere Email-Darstellung -->
                    <div style="margin-top: 20px;">
                        <div style="margin-bottom: 30px;">
                            <h4 style="color: #003E7E; font-size: 16px; margin-bottom: 15px;">📊 Impressions (Abrufe Gesamt)</h4>
                            <div class="chart" id="chart-impressions-${index}" style="height: 350px;"></div>
                        </div>
                        <div>
                            <h4 style="color: #003E7E; font-size: 16px; margin-bottom: 15px;">▶️ Video-Abrufe (Plays)</h4>
                            <div class="chart" id="chart-video-${index}" style="height: 350px;"></div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(cameraAnalytics.totalVideoAbrufe)}</div>
                            <div class="metric-label">Video-Abrufe Gesamt</div>
                            <div class="metric-trend ${cameraAnalytics.videoTrend}">${cameraAnalytics.videoTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(cameraAnalytics.totalImpressions)}</div>
                            <div class="metric-label">Impressions Gesamt</div>
                            <div class="metric-trend ${cameraAnalytics.impressionsTrend}">${cameraAnalytics.impressionsTrendText}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${cameraAnalytics.peakDay}</div>
                            <div class="metric-label">Stärkster Tag</div>
                            <div class="peak-indicator">${formatNumber(cameraAnalytics.peakValue)} Abrufe</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${cameraAnalytics.monthsActive}</div>
                            <div class="metric-label">Monate Daten</div>
                            <div class="metric-trend trend-neutral">📅 Zeitraum</div>
                        </div>
                    </div>
                </div>
            `;
            
            return html;
        }

        function generateKPIDefinitions() {
            return {
                videoEngagement: 'Verhältnis Video-Abrufe zu Gesamt-Abrufen pro Monat (Ø über Berichtszeitraum)',
                trendCalculation: 'Vergleich erste vs. zweite Hälfte des Berichtszeitraums (min. 3 Datenpunkte)',
                internationalReach: 'Anteil nicht-domestischer Märkte (dynamisch bestimmt je Standort)',
                seasonalVariance: 'Standardabweichung der monatlichen Werte in % vom Durchschnitt',
                dataQuality: 'Bewertung basierend auf Vollständigkeit und Konsistenz der Datenpunkte'
            };
        }

        function analyzeCameraDataAdvanced(report, allData, cameraData) {
            const basicAnalytics = analyzeCameraData(report, allData);
            const internationalData = analyzeInternationalReach(allData);
            
            // Berechne GESAMTE Video-Abrufe und Impressions für diese Kamera über ALLE Monate
            let totalVideoAbrufe = 0;
            let totalImpressions = 0;
            
            console.log('Analyzing camera:', report.line1, 'with cameraData:', cameraData ? 'Available' : 'Not available');
            
            if (cameraData && cameraData.reports) {
                // KORREKT: Summiere nur die AKTUELLEN Monatswerte, nicht die historischen
                cameraData.reports.forEach(monthReport => {
                    // Verwende nur AbrufeMonatVideo und AbrufeMonatGesamt (aktuelle Monatsdaten)
                    const videoData = monthReport.datalist.find(d => d.key === 'AbrufeMonatVideo');
                    const totalData = monthReport.datalist.find(d => d.key === 'AbrufeMonatGesamt');
                    
                    if (videoData && videoData.values) {
                        totalVideoAbrufe += videoData.values.reduce((sum, v) => sum + v.v, 0);
                    }
                    if (totalData && totalData.values) {
                        totalImpressions += totalData.values.reduce((sum, v) => sum + v.v, 0);
                    }
                });
            } else {
                // Fallback: nur aktueller Monat
                const videoData = report.datalist.find(d => d.key === 'AbrufeMonatVideo');
                const totalData = report.datalist.find(d => d.key === 'AbrufeMonatGesamt');
                
                totalVideoAbrufe = videoData ? videoData.values.reduce((sum, v) => sum + v.v, 0) : 0;
                totalImpressions = totalData ? totalData.values.reduce((sum, v) => sum + v.v, 0) : 0;
            }
            
            // Angepasste, realistischere Schwellenwerte
            const videoTrend = totalVideoAbrufe > 10000 ? 'trend-up' : totalVideoAbrufe > 5000 ? 'trend-neutral' : 'trend-down';
            const videoTrendText = totalVideoAbrufe > 10000 ? '📈 Stark' : totalVideoAbrufe > 5000 ? '📊 Solide' : '📉 Ausbaufähig';
            
            const impressionsTrend = totalImpressions > 50000 ? 'trend-up' : totalImpressions > 20000 ? 'trend-neutral' : 'trend-down';
            const impressionsTrendText = totalImpressions > 50000 ? '📈 Hoch' : totalImpressions > 20000 ? '📊 Mittel' : '📉 Niedrig';
            
            // Berechne Datenqualität
            const monthsActive = cameraData ? cameraData.months : 1;
            const dataQuality = monthsActive >= 12 ? 'high' : monthsActive >= 6 ? 'medium' : 'low';
            const dataQualityText = monthsActive >= 12 ? 'Hoch (≥12 Monate)' : 
                                   monthsActive >= 6 ? 'Mittel (6-11 Monate)' : 'Niedrig (<6 Monate)';
            
            return {
                ...basicAnalytics,
                totalVideoAbrufe,
                totalImpressions,
                videoTrend,
                videoTrendText,
                impressionsTrend,
                impressionsTrendText,
                monthsActive,
                dataQuality,
                dataQualityText,
                domesticMarkets: internationalData.domesticMarkets || ['Deutschland', 'Österreich']
            };
        }

        function generateInternationalReach(data) {
            const countryData = analyzeCountryData(data);
            
            return `
                <div class="chart-container">
                    <h3 class="chart-title">🌍 Internationale Reichweite</h3>
                    
                    <div class="chart" id="country-chart"></div>
                    
                    <div class="insights-section">
                        <div class="insight-title">
                            <span class="insight-icon">🎯</span>
                            Marktanalyse
                            <div class="ai-loading" id="ai-loading-countries"></div>
                        </div>
                        <div class="insight-content" id="ai-insight-countries">
                            Analysiere internationale Märkte...
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        ${countryData.topCountries.map(country => `
                            <div class="metric-card">
                                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                    <span class="country-flag">${getCountryFlag(country.name)}</span>
                                    <strong>${country.name}</strong>
                                </div>
                                <div class="metric-value" style="font-size: 20px;">${formatNumber(country.value)}</div>
                                <div class="metric-trend ${country.trend}">${country.trendText}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function generateSeasonalTrends(data) {
            const seasonalData = analyzeSeasonalTrends(data);
            const dailyVideoAverage = calculateDailyVideoAverage(data);
            
            return `
                <div class="chart-container">
                    <h3 class="chart-title">📈 Saisonale Trends & Peak-Analyse</h3>
                    
                    <!-- Klare Erklärung für Kunden -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #0575BC;">
                        <strong>📋 Was zeigt dieses Diagramm:</strong><br>
                        <span style="color: #272727;">Graue Balken</span> = Normale Monate mit durchschnittlicher Nachfrage<br>
                        <span style="color: #FBE603; background: #FBE603; padding: 1px 4px; border-radius: 2px; color: #272727;">Gelbe Balken</span> = Peak-Monate mit überdurchschnittlich hoher Nachfrage<br>
                        <span style="color: #272727;">Gestrichelte Linie</span> = Durchschnittswert über alle Monate<br><br>
                        <strong>Nutzen:</strong> Planen Sie Marketing-Aktivitäten und Kapazitäten entsprechend der saisonalen Nachfrage-Muster.
                    </div>
                    
                    <div class="chart" id="seasonal-chart"></div>
                    
                    <div class="insights-section">
                        <div class="insight-title">
                            <span class="insight-icon">📊</span>
                            Saisonale Erkenntnisse
                            <div class="ai-loading" id="ai-loading-seasonal"></div>
                        </div>
                        <div class="insight-content" id="ai-insight-seasonal">
                            Analysiere saisonale Muster...
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div class="metric-card">
                            <div class="metric-value" style="font-size: 18px;">${formatNumber(dailyVideoAverage)}</div>
                            <div class="metric-label">Ø Tägliche Video-Abrufe</div>
                            <div class="metric-trend trend-neutral">📊 Durchschnittswert</div>
                            <div style="font-size: 11px; color: #666; margin-top: 5px;">
                                Berechnet über alle verfügbaren Tage
                            </div>
                        </div>
                        ${seasonalData.peaks && seasonalData.peaks.length > 0 ? seasonalData.peaks.map(peak => `
                            <div class="metric-card">
                                <div class="metric-value" style="font-size: 18px;">${formatDate(peak.period)}</div>
                                <div class="metric-label">Peak-Periode</div>
                                <div class="metric-trend trend-up">+${peak.increase}% vs. Durchschnitt</div>
                                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                    ${formatNumber(peak.value)} Abrufe
                                </div>
                            </div>
                        `).join('') : `
                            <div class="metric-card">
                                <div class="metric-value" style="font-size: 16px; color: #666;">Keine Peaks</div>
                                <div class="metric-label">Gleichmäßige Verteilung</div>
                                <div class="metric-trend trend-neutral">📊 Stabile Nachfrage</div>
                            </div>
                        `}
                        <div class="metric-card">
                            <div class="metric-value" style="font-size: 18px;">${seasonalData.totalMonths}</div>
                            <div class="metric-label">Monate analysiert</div>
                            <div class="quality-indicator ${seasonalData.dataQuality}">
                                ${seasonalData.dataQuality === 'high' ? '🏆 Vollständig' : 
                                  seasonalData.dataQuality === 'medium' ? '⚠️ Teilweise' : '📊 Begrenzt'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function generateChannelDistribution(data) {
            const channelData = analyzeChannelData(data);
            
            return `
                <div class="chart-container">
                    <h3 class="chart-title">📺 Kanal-Verteilung & Performance</h3>
                    
                    <div class="chart" id="channel-chart"></div>
                    
                    <div class="insights-section">
                        <div class="insight-title">
                            <span class="insight-icon">💡</span>
                            Kanal-Performance Insights
                            <div class="ai-loading" id="ai-loading-channels"></div>
                        </div>
                        <div class="insight-content" id="ai-insight-channels">
                            Analysiere Kanal-Performance...
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        ${channelData.channels.map(channel => `
                            <div class="metric-card">
                                <div class="metric-value" style="font-size: 18px;">${channel.percentage}%</div>
                                <div class="metric-label">${channel.name}</div>
                                <div class="metric-trend ${channel.trend}">${channel.trendText}</div>
                                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                    ${formatNumber(channel.value)} Abrufe
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function generateCameraReport(report, index) {
            let html = `
                <div class="chart-container">
                    <h3 class="chart-title">${report.line1} - ${report.line2}</h3>
                    <p><strong>Berichtszeitraum:</strong> ${formatDate(report.m)} | 
                       <strong>Downloads:</strong> ${formatNumber(report.downloads)}</p>
                    
                    <div class="chart" id="chart-${index}"></div>
                </div>
            `;
            
            // Tabellen für verschiedene Datenlisten
            report.datalist.forEach((dataItem, dataIndex) => {
                if (dataIndex < 2) { // Nur erste 2 Datenlisten pro Kamera
                    html += `
                        <div class="table-container">
                            <h4 class="chart-title">${dataItem.caption}</h4>
                            <table>
                                <thead>
                                    <tr>
                                        <th>${dataItem.key.includes('Land') ? 'Land' : dataItem.key.includes('Kanal') ? 'Kanal' : 'Zeitraum'}</th>
                                        <th class="number">Wert</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${dataItem.values.slice(0, 10).map(value => `
                                        <tr>
                                            <td>${formatKey(value.k)}</td>
                                            <td class="number">${formatNumber(value.v)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            });
            
            return html;
        }

        function generateAdditionalStats(szlist) {
            let html = `
                <div class="chart-container">
                    <h3 class="chart-title">📈 Zusätzliche Statistiken</h3>
            `;
            
            szlist.forEach((item, index) => {
                if (index < 2) { // Nur erste 2 für Demo
                    html += `
                        <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                            <h4 style="color: #003E7E; margin-bottom: 10px;">${item.caption}</h4>
                            <p style="font-weight: bold; margin-bottom: 5px;">${item.title}</p>
                            ${item.info ? `<p style="font-size: 12px; color: #666; margin-bottom: 15px;">${item.info}</p>` : ''}
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <thead>
                                    <tr style="background: #0575BC; color: white;">
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Monat</th>
                                        <th style="padding: 12px; text-align: right; font-weight: 600;">Views</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${item.details.slice(-6).map((detail, idx) => `
                                        <tr style="border-bottom: 1px solid #e0e0e0; ${idx % 2 === 0 ? 'background: #fafafa;' : 'background: white;'}">
                                            <td style="padding: 10px 12px; color: #272727;">${formatDate(detail.k)}</td>
                                            <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #0575BC;">${formatNumber(detail.v)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            });
            
            html += '</div>';
            return html;
        }

        function createCharts(data) {
            try {
                // Zerstöre bestehende Charts sicher
                chartInstances.forEach(chart => {
                    try {
                        chart.destroy();
                    } catch (e) {
                        console.warn('Chart destroy error:', e);
                    }
                });
                chartInstances = [];
                
                // Erstelle interaktive Charts für ALLE Kameras
                const uniqueCameras = getUniqueCameras(data);
                console.log(`Creating ${uniqueCameras.length} camera charts...`);
                
                uniqueCameras.forEach((cameraData, index) => {
                    try {
                        createInteractiveChart(cameraData.latestReport, index);
                    } catch (error) {
                        console.error(`Failed to create chart ${index}:`, error);
                    }
                });
                
                // Erstelle zusätzliche Analytics-Charts
                setTimeout(() => {
                    try {
                        console.log('Creating overview charts...');
                        createOverviewTotalChart(data);
                        createOverviewVideoChart(data);
                        
                        console.log('Creating additional charts...');
                        createCountryChart(data);
                        console.log('Creating seasonal chart...');
                        createSeasonalChart(data);
                        console.log('Creating channel chart...');
                        createChannelChart(data);
                        
                        console.log(`Total charts created: ${chartInstances.length}`);
                        
                        // Starte KI-Analyse
                        generateAIInsights(data);
                    } catch (error) {
                        console.error('Error creating additional charts:', error);
                        // Starte KI-Analyse trotzdem
                        generateAIInsights(data);
                    }
                }, 500);
                
            } catch (error) {
                console.error('Critical error in createCharts:', error);
                showError('Fehler beim Erstellen der Diagramme: ' + error.message);
            }
        }

        function getUniqueCameras(data) {
            const cameraMap = new Map();
            
            // Gruppiere Reports nach Kamera-ID
            data.reports.forEach(report => {
                const camId = report.cam;
                if (!cameraMap.has(camId)) {
                    cameraMap.set(camId, {
                        camId,
                        reports: [],
                        latestReport: report,
                        totalDownloads: 0,
                        months: 0
                    });
                }
                
                const cameraData = cameraMap.get(camId);
                cameraData.reports.push(report);
                cameraData.totalDownloads += report.downloads || 0;
                cameraData.months = cameraData.reports.length;
                
                // Aktualisiere latest report (neuester Monat)
                if (report.m > cameraData.latestReport.m) {
                    cameraData.latestReport = report;
                }
            });
            
            // Sortiere nach Gesamtperformance
            return Array.from(cameraMap.values())
                .sort((a, b) => b.totalDownloads - a.totalDownloads);
        }

        function createInteractiveChart(report, index) {
            // Erstelle zwei separate Charts für Impressions und Video-Abrufe
            createImpressionsChart(report, index);
            createVideoChart(report, index);
        }
        
        function createImpressionsChart(report, index) {
            const chartElement = document.getElementById(`chart-impressions-${index}`);
            if (!chartElement || !report.datalist.length) return;
            
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // Finde die besten Datensätze für die Visualisierung
            const monthlyData = report.datalist.find(d => d.key.includes('AbrufeJahrGesamt'));
            const videoData = report.datalist.find(d => d.key.includes('AbrufeJahrVideo'));
            
            if (!monthlyData) return;
            
            // Nur Impressions-Daten für dieses Chart
            const datasets = [{
                label: 'Impressions',
                data: monthlyData.values.map(v => v.v),
                borderColor: '#0575BC',
                backgroundColor: 'rgba(5, 117, 188, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0575BC',
                pointBorderColor: '#003E7E',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }];
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthlyData.values.map(v => formatDateShort(v.k)),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                        display: false // Keine Legende nötig - Chart-Titel ist selbsterklärend
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            borderColor: '#FBE603',
                            borderWidth: 2,
                            cornerRadius: 8,
                            displayColors: true,
                            callbacks: {
                                title: function(context) {
                                    return `${report.line1} - ${context[0].label}`;
                                },
                                label: function(context) {
                                    const value = formatNumber(context.parsed.y);
                                    return `${context.dataset.label}: ${value}`;
                                },
                                afterBody: function(context) {
                                    if (context.length > 1 && context[1].dataset.label === 'Video-Abrufe') {
                                        const total = context[0].parsed.y;
                                        const video = context[1].parsed.y;
                                        const engagement = total > 0 ? ((video / total) * 100).toFixed(1) : 0;
                                        return `Video-Engagement: ${engagement}%`;
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(5, 117, 188, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#0575BC',
                                font: {
                                    weight: 'bold'
                                },
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            },
                            title: {
                                display: true,
                                text: 'Impressions',
                                color: '#0575BC',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#272727',
                                maxRotation: 45,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }
        
        function createVideoChart(report, index) {
            const chartElement = document.getElementById(`chart-video-${index}`);
            if (!chartElement || !report.datalist.length) return;
            
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // Finde Video-Daten
            const videoData = report.datalist.find(d => d.key.includes('AbrufeJahrVideo'));
            
            if (!videoData) {
                chartElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Keine Video-Daten verfügbar</div>';
                return;
            }
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: videoData.values.map(v => formatDateShort(v.k)),
                    datasets: [{
                        label: 'Video-Abrufe',
                        data: videoData.values.map(v => v.v),
                        borderColor: '#FBE603',
                        backgroundColor: 'rgba(251, 230, 3, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#FBE603',
                        pointBorderColor: '#f0d000',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            borderColor: '#FBE603',
                            borderWidth: 2,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return `${report.line1} - ${context[0].label}`;
                                },
                                label: function(context) {
                                    return `Video-Abrufe: ${formatNumber(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(251, 230, 3, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#FBE603',
                                font: {
                                    weight: 'bold'
                                },
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            },
                            title: {
                                display: true,
                                text: 'Video-Abrufe',
                                color: '#FBE603',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#272727',
                                maxRotation: 45,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createOverviewTotalChart(data) {
            const chartElement = document.getElementById('overview-total-chart');
            if (!chartElement) return;
            
            // Sammle alle monatlichen Gesamt-Abrufe
            const monthlyData = {};
            data.reports.forEach(report => {
                const totalData = report.datalist.find(d => d.key.includes('Gesamt') && !d.key.includes('Video'));
                if (totalData) {
                    const month = report.m;
                    monthlyData[month] = (monthlyData[month] || 0) + totalData.values.reduce((sum, v) => sum + v.v, 0);
                }
            });
            
            const sortedData = Object.entries(monthlyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, total]) => ({ month, total }));
            
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedData.map(d => formatDateShort(d.month)),
                    datasets: [{
                        label: 'Abrufe Gesamt (Impressions)',
                        data: sortedData.map(d => d.total),
                        borderColor: '#0575BC',
                        backgroundColor: 'rgba(5, 117, 188, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#0575BC',
                        pointBorderColor: '#003E7E',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            callbacks: {
                                label: function(context) {
                                    return `Impressions: ${formatNumber(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#272727',
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            }
                        },
                        x: {
                            ticks: {
                                color: '#272727'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createOverviewVideoChart(data) {
            const chartElement = document.getElementById('overview-video-chart');
            if (!chartElement) return;
            
            // Sammle alle monatlichen Video-Abrufe
            const monthlyData = {};
            data.reports.forEach(report => {
                const videoData = report.datalist.find(d => d.key.includes('Video'));
                if (videoData) {
                    const month = report.m;
                    monthlyData[month] = (monthlyData[month] || 0) + videoData.values.reduce((sum, v) => sum + v.v, 0);
                }
            });
            
            const sortedData = Object.entries(monthlyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, total]) => ({ month, total }));
            
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedData.map(d => formatDateShort(d.month)),
                    datasets: [{
                        label: 'Video-Abrufe (Plays)',
                        data: sortedData.map(d => d.total),
                        borderColor: '#FBE603',
                        backgroundColor: 'rgba(251, 230, 3, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#FBE603',
                        pointBorderColor: '#f0d000',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            callbacks: {
                                label: function(context) {
                                    return `Video-Plays: ${formatNumber(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#272727',
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            }
                        },
                        x: {
                            ticks: {
                                color: '#272727'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createCountryChart(data) {
            const chartElement = document.getElementById('country-chart');
            if (!chartElement) return;
            
            const countryData = analyzeCountryData(data);
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            // Sortiere Länder nach Wert für bessere Darstellung
            const sortedCountries = countryData.topCountries.sort((a, b) => b.value - a.value);
            const totalValue = sortedCountries.reduce((sum, country) => sum + country.value, 0);
            
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedCountries.map(c => c.name),
                    datasets: [{
                        label: 'Abrufe nach Ländern',
                        data: sortedCountries.map(c => c.value),
                        backgroundColor: '#272727', // Einheitliches Anthrazit
                        borderColor: '#1a1a1a',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            borderColor: '#FBE603',
                            borderWidth: 2,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return `${context[0].label} ${getCountryFlag(context[0].label)}`;
                                },
                                label: function(context) {
                                    const value = formatNumber(context.parsed.x);
                                    const percentage = totalValue > 0 ? ((context.parsed.x / totalValue) * 100).toFixed(1) : 0;
                                    return `Abrufe: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(5, 117, 188, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#272727',
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            },
                            title: {
                                display: true,
                                text: 'Anzahl Abrufe',
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#272727',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                callback: function(value, index) {
                                    const country = sortedCountries[index];
                                    return country ? `${getCountryFlag(country.name)} ${country.name}` : '';
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1200,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createSeasonalChart(data) {
            const chartElement = document.getElementById('seasonal-chart');
            if (!chartElement) {
                console.error('Seasonal chart element not found!');
                return;
            }
            
            const seasonalData = analyzeSeasonalTrends(data);
            if (!seasonalData.monthlyData || seasonalData.monthlyData.length === 0) {
                chartElement.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">Keine saisonalen Daten verfügbar</div>';
                return;
            }
            
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            // Verwende berechneten Durchschnitt aus der Analysefunktion
            const avgValue = seasonalData.avgValue;
            
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: seasonalData.monthlyData.map(d => formatDateShort(d.month)),
                    datasets: [{
                        label: 'Monatliche Abrufe',
                        data: seasonalData.monthlyData.map(d => d.total),
                        backgroundColor: seasonalData.monthlyData.map(d => {
                            if (d.isPeak) return '#FBE603'; // Peaks bleiben gelb hervorgehoben
                            return '#272727'; // Normale Monate in Anthrazit
                        }),
                        borderColor: seasonalData.monthlyData.map(d => {
                            if (d.isPeak) return '#f0d000'; // Peak-Rand
                            return '#1a1a1a'; // Anthracite-Rand
                        }),
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    }, {
                        label: 'Durchschnitt',
                        type: 'line',
                        data: seasonalData.monthlyData.map(() => avgValue),
                        borderColor: '#272727',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false, // Keine Legende nötig
                            labels: {
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                },
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            borderColor: '#FBE603',
                            borderWidth: 2,
                            cornerRadius: 8,
                            filter: function(tooltipItem) {
                                return tooltipItem.datasetIndex === 0; // Nur für Balken, nicht für Durchschnittslinie
                            },
                            callbacks: {
                                title: function(context) {
                                    return `${formatDate(seasonalData.monthlyData[context[0].dataIndex].month)}`;
                                },
                                label: function(context) {
                                    const value = formatNumber(context.parsed.y);
                                    const item = seasonalData.monthlyData[context.dataIndex];
                                    const deviation = ((item.total - avgValue) / avgValue * 100).toFixed(1);
                                    return `Abrufe: ${value} (${deviation > 0 ? '+' : ''}${deviation}% vs. Ø)`;
                                },
                                afterLabel: function(context) {
                                    const item = seasonalData.monthlyData[context.dataIndex];
                                    if (item.isPeak) {
                                        return '🎯 Peak-Monat - Kapazitäten erhöhen';
                                    }
                                    if (item.total < avgValue * 0.8) {
                                        return '📉 Schwacher Monat - Marketing verstärken';
                                    }
                                    return '📊 Normaler Monat';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(5, 117, 188, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                },
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            },
                            title: {
                                display: true,
                                text: 'Anzahl Abrufe',
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Monate',
                                color: '#272727',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createChannelChart(data) {
            const chartElement = document.getElementById('channel-chart');
            if (!chartElement) return;
            
            const channelData = analyzeChannelData(data);
            const canvas = document.createElement('canvas');
            chartElement.innerHTML = '';
            chartElement.appendChild(canvas);
            
            // Sortiere Kanäle nach Wert
            const sortedChannels = channelData.channels.sort((a, b) => b.value - a.value);
            
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sortedChannels.map(c => c.name),
                    datasets: [{
                        data: sortedChannels.map(c => c.value),
                        backgroundColor: sortedChannels.map(c => {
                            if (c.name.includes('Kunden')) return '#4CAF50'; // Kundenmedien grün
                            if (c.name.includes('Partnernetzwerk')) return '#0575BC'; // Partnernetzwerk blau
                            if (c.name.includes('Eigenmedien')) return '#FBE603'; // Eigenmedien gelb
                            return '#272727'; // Fallback anthracite
                        }),
                        borderColor: sortedChannels.map(c => {
                            if (c.name.includes('Kunden')) return '#388E3C'; // Kundenmedien dunkelgrün
                            if (c.name.includes('Partnernetzwerk')) return '#003E7E'; // Partnernetzwerk dunkelblau
                            if (c.name.includes('Eigenmedien')) return '#f0d000'; // Eigenmedien dunkelgelb
                            return '#1a1a1a'; // Fallback dunkel-anthracite
                        }),
                        borderWidth: 3,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '40%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#272727',
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                usePointStyle: true,
                                pointStyle: 'circle',
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const dataset = data.datasets[0];
                                            const value = dataset.data[i];
                                            const total = dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            
                                            return {
                                                text: `${label}: ${percentage}%`,
                                                fillStyle: dataset.backgroundColor[i],
                                                strokeStyle: dataset.borderColor[i],
                                                lineWidth: dataset.borderWidth,
                                                pointStyle: 'circle',
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 62, 126, 0.95)',
                            titleColor: '#FBE603',
                            bodyColor: '#FFFFFF',
                            borderColor: '#FBE603',
                            borderWidth: 2,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return `${context[0].label}`;
                                },
                                label: function(context) {
                                    const value = formatNumber(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    return `Abrufe: ${value} (${percentage}%)`;
                                },
                                afterLabel: function(context) {
                                    const channelName = context.label;
                                    if (channelName.includes('Partnernetzwerk')) {
                                        return '🤝 Externes Netzwerk - Hohe Reichweite';
                                    } else if (channelName.includes('Eigenmedien')) {
                                        return '🏠 Eigene Kanäle - Direkte Kontrolle';
                                    } else if (channelName.includes('Kunden')) {
                                        return '👥 Kunden-Integration - B2B Fokus';
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1500,
                        easing: 'easeOutQuart'
                    },
                    interaction: {
                        intersect: false
                    }
                }
            });
            
            chartInstances.push(chart);
        }

        function createSimpleChart(dataList) {
            const values = dataList.values.slice(-12); // Letzte 12 Werte
            const maxValue = Math.max(...values.map(v => v.v));
            
            let html = `<div style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">${dataList.caption}</div>`;
            html += '<div style="display: flex; align-items: end; height: 200px; gap: 5px;">';
            
            values.forEach(value => {
                const height = (value.v / maxValue) * 180;
                const color = '#0575BC';
                html += `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="background-color: ${color}; width: 100%; height: ${height}px; border-radius: 2px 2px 0 0;"></div>
                        <div style="font-size: 10px; margin-top: 5px; transform: rotate(-45deg); white-space: nowrap;">
                            ${formatKey(value.k)}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            return html;
        }

        async function downloadReport() {
            if (!currentData) return;
            
            // Zeige Loading
            const downloadBtn = document.getElementById('downloadBtn');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '📥 Generiere Export...';
            downloadBtn.disabled = true;
            
            try {
                // Debug: Zeige alle Chart-Container im DOM
                const allChartDivs = document.querySelectorAll('.chart[id]');
                console.log('=== EXPORT DEBUG ===');
                console.log('Found chart divs:', allChartDivs.length);
                allChartDivs.forEach(div => {
                    console.log('Chart ID in DOM:', div.id);
                });
                
                // Konvertiere alle Charts zu Bildern
                const chartImages = await captureChartsAsImages();
                
                // Generiere HTML mit eingebetteten Chart-Bildern
                const reportHtml = generateFullReportHtml(chartImages);
                const blob = new Blob([reportHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `Feratel_Kamera_Bericht_${new Date().toISOString().split('T')[0]}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showSuccess('Bericht wurde erfolgreich heruntergeladen!');
                
            } catch (error) {
                console.error('Export error:', error);
                showError('Fehler beim Exportieren des Berichts.');
            } finally {
                // Restore button
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        }

        async function captureChartsAsImages() {
            const chartImages = {};
            
            // Warte kurz, damit alle Charts vollständig gerendert sind
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Methode 1: Erfasse alle Chart-Instanzen
            for (let i = 0; i < chartInstances.length; i++) {
                const chart = chartInstances[i];
                if (chart && chart.canvas) {
                    try {
                        // Stelle sicher, dass Chart vollständig gerendert ist
                        await chart.update('none');
                        const imageData = chart.toBase64Image('image/png', 1.0);
                        const chartId = chart.canvas.parentElement.id;
                        if (chartId && imageData) {
                            chartImages[chartId] = imageData;
                            console.log(`Captured chart from instance: ${chartId}`);
                        }
                    } catch (error) {
                        console.error(`Could not capture chart ${i}:`, error);
                    }
                }
            }
            
            // Methode 2: Direkt alle Canvas-Elemente erfassen (Fallback)
            const allCanvases = document.querySelectorAll('canvas');
            console.log(`Found ${allCanvases.length} canvas elements in DOM`);
            
            for (const canvas of allCanvases) {
                try {
                    const parentDiv = canvas.closest('.chart');
                    if (parentDiv && parentDiv.id && !chartImages[parentDiv.id]) {
                        const imageData = canvas.toDataURL('image/png', 1.0);
                        if (imageData && imageData !== 'data:,') {
                            chartImages[parentDiv.id] = imageData;
                            console.log(`Captured chart from DOM: ${parentDiv.id}`);
                        }
                    }
                } catch (error) {
                    console.error('Could not capture canvas:', error);
                }
            }
            
            console.log(`Total charts captured: ${Object.keys(chartImages).length}`);
            console.log('Captured chart IDs:', Object.keys(chartImages));
            return chartImages;
        }

        function generateFullReportHtml(chartImages = {}) {
            let currentContent = document.getElementById('reportContent').innerHTML;
            const reportTitle = document.getElementById('reportTitle').textContent;
            const reportMeta = document.getElementById('reportMeta').innerHTML;
            
            // Ersetze Canvas-Elemente durch statische Bilder
            console.log('Starting chart replacement with', Object.keys(chartImages).length, 'charts');
            
            Object.entries(chartImages).forEach(([chartId, imageData]) => {
                console.log(`Processing chart replacement for: ${chartId}`);
                
                // Methode 1: Suche nach div mit class="chart" und id
                const chartDivPattern = new RegExp(`<div[^>]*class="chart"[^>]*id="${chartId}"[^>]*>.*?</div>`, 'gs');
                const chartDivPattern2 = new RegExp(`<div[^>]*id="${chartId}"[^>]*class="chart"[^>]*>.*?</div>`, 'gs');
                
                // Versuche verschiedene Patterns
                let replaced = false;
                
                // Pattern 1: class vor id
                if (currentContent.includes(`class="chart" id="${chartId}"`)) {
                    const pattern = `<div class="chart" id="${chartId}">`;
                    const startIdx = currentContent.indexOf(pattern);
                    if (startIdx !== -1) {
                        const endIdx = currentContent.indexOf('</div>', startIdx);
                        if (endIdx !== -1) {
                            const before = currentContent.substring(0, startIdx);
                            const after = currentContent.substring(endIdx + 6);
                            currentContent = before + 
                                `<div class="chart" id="${chartId}">
                                    <img src="${imageData}" alt="Chart" style="width: 100%; height: 380px; object-fit: contain;" />
                                </div>` + after;
                            replaced = true;
                            console.log(`Replaced chart ${chartId} using pattern 1`);
                        }
                    }
                }
                
                // Pattern 2: id vor class
                if (!replaced && currentContent.includes(`id="${chartId}" class="chart"`)) {
                    const pattern = `<div id="${chartId}" class="chart">`;
                    const startIdx = currentContent.indexOf(pattern);
                    if (startIdx !== -1) {
                        const endIdx = currentContent.indexOf('</div>', startIdx);
                        if (endIdx !== -1) {
                            const before = currentContent.substring(0, startIdx);
                            const after = currentContent.substring(endIdx + 6);
                            currentContent = before + 
                                `<div id="${chartId}" class="chart">
                                    <img src="${imageData}" alt="Chart" style="width: 100%; height: 380px; object-fit: contain;" />
                                </div>` + after;
                            replaced = true;
                            console.log(`Replaced chart ${chartId} using pattern 2`);
                        }
                    }
                }
                
                // Pattern 3: Suche nur nach Canvas mit diesem Container
                if (!replaced) {
                    const canvasPattern = new RegExp(`<canvas[^>]*id="[^"]*${chartId}[^"]*"[^>]*>.*?</canvas>`, 'gs');
                    if (canvasPattern.test(currentContent)) {
                        currentContent = currentContent.replace(canvasPattern,
                            `<img src="${imageData}" alt="Chart" style="width: 100%; height: 380px; object-fit: contain;" />`);
                        replaced = true;
                        console.log(`Replaced chart ${chartId} using canvas pattern`);
                    }
                }
                
                if (!replaced) {
                    console.warn(`Could not replace chart: ${chartId}`);
                }
            });
            
            // Spezielle Behandlung für Canvas-Elemente ohne erfasste Bilder
            const canvasRegex = /<canvas[^>]*>.*?<\/canvas>/gs;
            let canvasMatches = currentContent.match(canvasRegex);
            
            if (canvasMatches) {
                console.log(`Found ${canvasMatches.length} remaining canvas elements`);
                
                // Versuche für jedes verbleibende Canvas ein Fallback-Bild zu erstellen
                currentContent = currentContent.replace(canvasRegex, (match, offset) => {
                    // Versuche die Chart-ID aus dem umgebenden Container zu extrahieren
                    const beforeMatch = currentContent.substring(Math.max(0, offset - 100), offset);
                    const idMatch = beforeMatch.match(/id="([^"]+)"/);
                    
                    if (idMatch && chartImages[idMatch[1]]) {
                        console.log(`Found image for canvas with ID: ${idMatch[1]}`);
                        return `<img src="${chartImages[idMatch[1]]}" alt="Chart" style="width: 100%; height: 380px; object-fit: contain;" />`;
                    }
                    
                    // Fallback für nicht erfasste Charts
                    return '<div style="padding: 40px; text-align: center; border: 2px dashed #ccc; border-radius: 8px; color: #666; background: #f9f9f9;">📊 Diagramm im HTML-Export nicht verfügbar<br><small>Bitte öffnen Sie den Bericht im Browser für die vollständige Ansicht</small></div>';
                });
            }
            
            return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <style>
        /* Feratel Export Styles */
        :root {
            --feratel-blue: #0575BC;
            --feratel-yellow: #FBE603;
            --feratel-dark-blue: #003E7E;
            --feratel-light-gray: #F5F5F5;
            --feratel-anthracite: #272727;
            --feratel-white: #FFFFFF;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            color: #272727;
            line-height: 1.6;
        }
        
        .header {
            background: #003E7E;
            color: white;
            padding: 10px 20px;
            font-size: 12px;
            text-align: right;
        }
        
        .main-nav {
            background: white;
            padding: 20px;
            border-bottom: 2px solid #F5F5F5;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .logo {
            height: 60px;
            margin-right: 20px;
        }
        
        .tagline {
            color: #272727;
            font-size: 14px;
            font-style: italic;
        }
        
        .nav-title {
            color: #0575BC;
            font-size: 24px;
            font-weight: bold;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 40px;
        }
        
        .report-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .report-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #FBE603;
        }
        
        .report-title {
            color: #003E7E;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .report-meta {
            color: #666;
            font-size: 14px;
        }
        
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 40px;
        }
        
        .chart-title {
            color: #003E7E;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .metric-value {
            color: #0575BC;
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .metric-label {
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .metric-trend {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .trend-up {
            background: #d4edda;
            color: #155724;
        }
        
        .trend-down {
            background: #f8d7da;
            color: #721c24;
        }
        
        .trend-neutral {
            background: #fff3cd;
            color: #856404;
        }
        
        .insights-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .insight-title {
            color: #003E7E;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .insight-content {
            color: #272727;
            line-height: 1.8;
        }
        
        .insight-highlight {
            background: #FBE603;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .peak-indicator {
            background: #FBE603;
            color: #272727;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .footer {
            background: #003E7E;
            color: white;
            padding: 20px;
            text-align: center;
            margin-top: 40px;
        }
        
        .footer p {
            margin: 5px 0;
            font-size: 12px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        table thead tr {
            background: #0575BC;
            color: white;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        table td {
            padding: 10px 12px;
            color: #272727;
            border-bottom: 1px solid #e0e0e0;
        }
        
        table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        
        table tbody tr:nth-child(odd) {
            background: white;
        }
        
        table td.number, table th.number {
            text-align: right;
        }
        
        .container { max-width: 1200px; padding: 20px 40px; }
        .chart { 
            height: 400px !important; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            margin-bottom: 20px;
        }
        .chart img { 
            max-width: 100%; 
            max-height: 100%; 
            height: auto; 
            object-fit: contain;
            border-radius: 8px;
        }
        .chart-container {
            margin-bottom: 40px !important;
        }
        @media print {
            .chart { page-break-inside: avoid; }
            .metric-card { page-break-inside: avoid; }
            .chart-container { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <span>Feratel Media Technologies AG - Kamera Statistik Bericht</span>
    </div>
    
    <div class="main-nav">
        <div class="container">
            <div class="logo-container">
                <img class="logo" src="https://www.feratel.com/typo3conf/ext/icc_template/Resources/Public/Img/logo-feratel.svg" alt="Feratel Logo" />
                <div class="tagline">Advanced Analytics & Business Intelligence</div>
            </div>
            <div class="nav-title">${reportTitle}</div>
        </div>
    </div>
    
    <div class="container">
        <div class="report-section show">
            <div class="report-header">
                <div class="report-title">${reportTitle}</div>
                <div class="report-meta">${reportMeta}</div>
            </div>
            
            <div class="report-content">
                ${currentContent}
            </div>
                </div>
            </div>

        <div class="footer">
            <p>© 2025 - feratel media technologies AG</p>
            <p>Generiert am: ${new Date().toLocaleString('de-DE')}</p>
            <p>Diagramme als statische Bilder exportiert für optimale Kompatibilität</p>
        </div>
</body>
</html>`;
        }

        function resetForm() {
            currentData = null;
            fileInput.value = '';
            fileInfo.classList.remove('show');
            reportSection.classList.remove('show');
            hideMessages();
            uploadArea.classList.remove('dragover');
        }

        // Hilfsfunktionen
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function formatNumber(num) {
            return new Intl.NumberFormat('de-DE').format(num);
        }

        function formatDate(dateStr) {
            if (dateStr.includes('-')) {
                const [year, month] = dateStr.split('-');
                const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
                return `${monthNames[parseInt(month) - 1]} ${year}`;
            }
            return dateStr;
        }

        function formatDateShort(dateStr) {
            if (dateStr.includes('-')) {
                const [year, month] = dateStr.split('-');
                const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 
                                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
                return `${monthNames[parseInt(month) - 1]} ${year}`;
            }
            return dateStr;
        }

        function formatKey(key) {
            if (key.includes('-')) {
                return formatDate(key);
            }
            return key;
        }

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            successMessage.classList.remove('show');
        }

        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.classList.add('show');
            errorMessage.classList.remove('show');
        }

        function hideMessages() {
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
        }

        function calculateDailyVideoAverage(data) {
            let totalVideoDays = 0;
            let totalVideoAbrufe = 0;
            
            data.reports.forEach(report => {
                const dailyVideoData = report.datalist.find(d => 
                    d.caption.includes('Tagesverlauf') && d.key.includes('Video')
                );
                
                if (dailyVideoData && dailyVideoData.values) {
                    dailyVideoData.values.forEach(day => {
                        totalVideoAbrufe += day.v;
                        totalVideoDays++;
                    });
                }
            });
            
            return totalVideoDays > 0 ? Math.round(totalVideoAbrufe / totalVideoDays) : 0;
        }

        // Präsentations-Validierung - prüft alle kritischen Komponenten
        function validateForPresentation() {
            const issues = [];
            
            // 1. DOM-Elemente prüfen
            const criticalElements = [
                'uploadArea', 'fileInput', 'reportSection', 'reportContent',
                'reportTitle', 'reportMeta', 'loading', 'errorMessage', 'successMessage'
            ];
            
            criticalElements.forEach(id => {
                if (!document.getElementById(id)) {
                    issues.push(`Kritisches Element fehlt: ${id}`);
                }
            });
            
            // 2. CSS-Variablen prüfen
            const computedStyle = getComputedStyle(document.documentElement);
            const feratelBlue = computedStyle.getPropertyValue('--feratel-blue').trim();
            if (!feratelBlue || feratelBlue === '') {
                issues.push('Feratel CSS-Variablen nicht geladen');
            }
            
            // 3. Chart.js Verfügbarkeit
            if (typeof Chart === 'undefined') {
                issues.push('Chart.js Bibliothek nicht geladen');
            }
            
            // 4. API-Key Validierung
            if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 50) {
                issues.push('OpenAI API-Key ungültig oder zu kurz');
            }
            
            if (issues.length > 0) {
                console.error('Präsentations-Validierung fehlgeschlagen:', issues);
                showError('Validierung fehlgeschlagen: ' + issues.join(', '));
                return false;
            }
            
            console.log('✅ Präsentations-Validierung erfolgreich');
            return true;
        }

        // Führe Validierung beim Laden aus
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                validateForPresentation();
            }, 1000);
        });

        // Erweiterte Analysefunktionen
        function calculateAdvancedMetrics(data) {
            // KORREKTE BERECHNUNG: Nur aktuelle Monatswerte summieren, nicht historische Daten
            let totalVideoAbrufe = 0;
            let totalImpressions = 0;
            
            // Map um Duplikate zu vermeiden (Kamera-Monat Kombination)
            const monthlyData = new Map();
            
            data.reports.forEach(report => {
                const key = `${report.cam}-${report.m}`;
                
                // Nur wenn wir diese Kamera-Monat Kombination noch nicht haben
                if (!monthlyData.has(key)) {
                    // Finde die AKTUELLEN Monatsdaten (nicht die historischen)
                    const videoData = report.datalist.find(d => d.key === 'AbrufeMonatVideo');
                    const totalData = report.datalist.find(d => d.key === 'AbrufeMonatGesamt');
                    
                    let monthVideoSum = 0;
                    let monthTotalSum = 0;
                    
                    // Summiere nur die Tageswerte des aktuellen Monats
                    if (videoData && videoData.values) {
                        monthVideoSum = videoData.values.reduce((sum, v) => sum + v.v, 0);
                    }
                    if (totalData && totalData.values) {
                        monthTotalSum = totalData.values.reduce((sum, v) => sum + v.v, 0);
                    }
                    
                    monthlyData.set(key, {
                        video: monthVideoSum,
                        total: monthTotalSum
                    });
                    
                    totalVideoAbrufe += monthVideoSum;
                    totalImpressions += monthTotalSum;
                }
            });
            
            const internationalData = analyzeInternationalReach(data);
            const seasonalVariance = calculateSeasonalVariance(data);
            const topCountries = getTopCountries(data);
            const peakDayData = findPeakPerformanceDay(data);
            const peakDay = peakDayData.date;
            const peakValue = peakDayData.value;
            
            // Berechne Trends für Video-Abrufe (realistischere Schwellenwerte)
            const videoTrend = totalVideoAbrufe > 20000 ? 'trend-up' : totalVideoAbrufe > 10000 ? 'trend-neutral' : 'trend-down';
            const videoTrendText = totalVideoAbrufe > 20000 ? '📈 Stark' : totalVideoAbrufe > 10000 ? '📊 Solide' : '📉 Ausbaufähig';
            
            const impressionsTrend = totalImpressions > 100000 ? 'trend-up' : totalImpressions > 50000 ? 'trend-neutral' : 'trend-down';
            const impressionsTrendText = totalImpressions > 100000 ? '📈 Hoch' : totalImpressions > 50000 ? '📊 Mittel' : '📉 Niedrig';
            
            return {
                totalVideoAbrufe,
                totalImpressions,
                videoTrend,
                videoTrendText,
                impressionsTrend,
                impressionsTrendText,
                internationalReach: internationalData.percentage.toFixed(1).replace('.', ','),
                internationalTrend: internationalData.percentage > 30 ? 'trend-up' : 'trend-neutral',
                internationalTrendText: internationalData.percentage > 30 ? '🌍 Stark international' : '🏠 Hauptsächlich lokal',
                peakVariance: seasonalVariance.toFixed(1).replace('.', ','),
                varianceTrend: seasonalVariance > 50 ? 'trend-up' : 'trend-neutral',
                varianceTrendText: seasonalVariance > 50 ? '📊 Hohe Saisonalität' : '📊 Stabile Nachfrage',
                topCountries: topCountries.join(', '),
                peakPerformanceDay: peakDay,
                peakPerformanceValue: peakValue
            };
        }

        function analyzeCameraData(report, allData) {
            const videoData = report.datalist.find(d => d.key.includes('Video'));
            const totalData = report.datalist.find(d => d.key.includes('Gesamt'));
            
            let engagementRate = 0;
            if (videoData && totalData) {
                const videoTotal = videoData.values.reduce((sum, v) => sum + v.v, 0);
                const overallTotal = totalData.values.reduce((sum, v) => sum + v.v, 0);
                engagementRate = overallTotal > 0 ? ((videoTotal / overallTotal) * 100).toFixed(1).replace('.', ',') : '0';
            }
            
            const dailyData = report.datalist.find(d => d.caption.includes('Tagesverlauf'));
            let peakDay = 'N/A';
            let peakValue = 0;
            if (dailyData && dailyData.values.length > 0) {
                const maxEntry = dailyData.values.reduce((max, entry) => 
                    entry.v > max.v ? entry : max, dailyData.values[0]);
                
                // Formatiere als konkreten Tag, nicht Monat
                if (maxEntry.k.includes('-')) {
                    const date = new Date(maxEntry.k);
                    if (!isNaN(date.getTime())) {
                        peakDay = date.toLocaleDateString('de-DE', { 
                            weekday: 'short', 
                            day: '2-digit',
                            month: 'short' 
                        });
                        peakValue = maxEntry.v;
                    }
                } else {
                    peakDay = maxEntry.k;
                    peakValue = maxEntry.v;
                }
            }
            
            return {
                engagementRate,
                engagementTrend: engagementRate > 15 ? 'trend-up' : 'trend-neutral',
                engagementText: engagementRate > 15 ? '📈 Hoch' : '📊 Normal',
                peakDay,
                peakValue
            };
        }

        function analyzeCountryData(data) {
            const countryStats = {};
            const countryTrends = {};
            
            // Sammle Daten aus allen Reports
            data.reports.forEach((report, index) => {
                const countryData = report.datalist.find(d => d.caption.includes('Länder'));
                if (countryData) {
                    countryData.values.forEach(country => {
                        if (country.k !== 'Andere') {
                            const countryName = country.k.length > 25 ? country.k.substring(0, 25) + '...' : country.k;
                            countryStats[countryName] = (countryStats[countryName] || 0) + country.v;
                            
                            // Berechne Trend (vereinfacht)
                            if (!countryTrends[countryName]) {
                                countryTrends[countryName] = [];
                            }
                            countryTrends[countryName].push(country.v);
                        }
                    });
                }
            });
            
            const sortedCountries = Object.entries(countryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([name, value]) => {
                    // Berechne echten Trend basierend auf den Daten
                    const values = countryTrends[name] || [];
                    let trend = 'trend-neutral';
                    let trendText = '📊 Stabil';
                    
                    if (values.length > 1) {
                        const firstHalf = values.slice(0, Math.ceil(values.length / 2));
                        const secondHalf = values.slice(Math.ceil(values.length / 2));
                        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                        
                        if (secondAvg > firstAvg * 1.1) {
                            trend = 'trend-up';
                            trendText = '📈 Wachsend';
                        } else if (secondAvg < firstAvg * 0.9) {
                            trend = 'trend-down';
                            trendText = '📉 Rückläufig';
                        }
                    }
                    
                    return {
                        name,
                        value,
                        trend,
                        trendText
                    };
                });
            
            return { topCountries: sortedCountries };
        }

        function analyzeSeasonalTrends(data) {
            const monthlyStats = {};
            
            // Sammle alle monatlichen Downloads
            data.reports.forEach(report => {
                const month = report.m;
                if (month) {
                    monthlyStats[month] = (monthlyStats[month] || 0) + (report.downloads || 0);
                }
            });
            
            // Sortiere chronologisch und erstelle Array
            const monthlyData = Object.entries(monthlyStats)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, total]) => ({ month, total, isPeak: false }));
            
            // Berechne Durchschnitt
            const avgValue = monthlyData.length > 0 ? 
                monthlyData.reduce((sum, d) => sum + d.total, 0) / monthlyData.length : 0;
            
            // Bestimme Peak-Monate (20% über Durchschnitt)
            monthlyData.forEach(monthData => {
                monthData.isPeak = monthData.total > avgValue * 1.2;
            });
            
            // Erstelle Peak-Liste mit Prozent-Angaben
            const peaks = monthlyData
                .filter(d => d.isPeak)
                .map(d => ({
                    period: d.month,
                    increase: avgValue > 0 ? Math.round(((d.total - avgValue) / avgValue) * 100) : 0,
                    value: d.total
                }));
            
            return { 
                monthlyData, 
                peaks, 
                avgValue,
                totalMonths: monthlyData.length,
                dataQuality: monthlyData.length >= 12 ? 'high' : monthlyData.length >= 6 ? 'medium' : 'low'
            };
        }

        function analyzeChannelData(data) {
            const channelStats = {};
            const channelTrends = {};
            
            // Sammle chronologische Daten pro Kanal
            data.reports.forEach(report => {
                const channelData = report.datalist.find(d => d.caption.includes('Kanäle'));
                if (channelData) {
                    channelData.values.forEach(channel => {
                        if (!channelStats[channel.k]) {
                            channelStats[channel.k] = 0;
                            channelTrends[channel.k] = [];
                        }
                        channelStats[channel.k] += channel.v;
                        channelTrends[channel.k].push({
                            month: report.m,
                            value: channel.v
                        });
                    });
                }
            });
            
            const totalValue = Object.values(channelStats).reduce((sum, val) => sum + val, 0);
            
            const channels = Object.entries(channelStats).map(([name, value]) => {
                // Berechne echten Trend basierend auf Zeitreihe
                const trendData = channelTrends[name] || [];
                let trend = 'trend-neutral';
                let trendText = '📊 Stabil';
                let trendValue = 0;
                
                if (trendData.length >= 3) {
                    // Sortiere chronologisch
                    trendData.sort((a, b) => a.month.localeCompare(b.month));
                    
                    // Berechne Trend über die letzten 6 vs. ersten 6 Monate
                    const midpoint = Math.floor(trendData.length / 2);
                    const firstHalf = trendData.slice(0, midpoint);
                    const secondHalf = trendData.slice(midpoint);
                    
                    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
                    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
                    
                    trendValue = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100) : 0;
                    
                    if (trendValue > 10) {
                        trend = 'trend-up';
                        trendText = `📈 +${trendValue.toFixed(1).replace('.', ',')}% Wachstum`;
                    } else if (trendValue < -10) {
                        trend = 'trend-down';
                        trendText = `📉 ${trendValue.toFixed(1).replace('.', ',')}% Rückgang`;
                    } else {
                        trendText = `📊 ${trendValue >= 0 ? '+' : ''}${trendValue.toFixed(1).replace('.', ',')}% vs. Vorperiode`;
                    }
                }
                
                return {
                    name,
                    value,
                    percentage: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
                    trend,
                    trendText,
                    trendValue,
                    dataPoints: trendData.length,
                    qualityScore: trendData.length >= 6 ? 'high' : trendData.length >= 3 ? 'medium' : 'low'
                };
            });
            
            return { channels };
        }

        // Diese Funktion wurde entfernt - Video-Engagement wird jetzt korrekt pro Monat berechnet

        function analyzeInternationalReach(data) {
            // Bestimme Domestic-Märkte basierend auf Kamerastandorten
            const domesticMarkets = determineDomesticMarkets(data);
            
            let totalDomestic = 0;
            let totalInternational = 0;
            const countryBreakdown = {};
            
            data.reports.forEach(report => {
                const countryData = report.datalist.find(d => d.caption.includes('Länder'));
                if (countryData) {
                    countryData.values.forEach(country => {
                        if (country.k !== 'Andere') {
                            countryBreakdown[country.k] = (countryBreakdown[country.k] || 0) + country.v;
                            
                            if (domesticMarkets.includes(country.k)) {
                                totalDomestic += country.v;
                            } else {
                                totalInternational += country.v;
                            }
                        }
                    });
                }
            });
            
            const total = totalDomestic + totalInternational;
            const percentage = total > 0 ? (totalInternational / total) * 100 : 0;
            
            return { 
                percentage, 
                totalInternational, 
                totalDomestic, 
                domesticMarkets,
                countryBreakdown,
                total,
                dataQuality: total > 1000 ? 'high' : total > 100 ? 'medium' : 'low'
            };
        }

        function determineDomesticMarkets(data) {
            // Analysiere Kamerastandorte und bestimme Heimatmärkte
            const locationHints = [];
            
            data.reports.forEach(report => {
                const location = report.line1 || '';
                locationHints.push(location.toLowerCase());
            });
            
            // Heuristik basierend auf Kameranamen und Top-Ländern
            const countryStats = {};
            data.reports.forEach(report => {
                const countryData = report.datalist.find(d => d.caption.includes('Länder'));
                if (countryData) {
                    countryData.values.forEach(country => {
                        if (country.k !== 'Andere') {
                            countryStats[country.k] = (countryStats[country.k] || 0) + country.v;
                        }
                    });
                }
            });
            
            const sortedCountries = Object.entries(countryStats)
                .sort(([,a], [,b]) => b - a)
                .map(([name]) => name);
            
            // Standard DACH-Region + dynamische Erweiterung basierend auf Daten
            let domesticMarkets = ['Deutschland', 'Österreich', 'Schweiz'];
            
            // Wenn Top-Land nicht DACH ist, erweitere Domestic-Definition
            if (sortedCountries.length > 0) {
                const topCountry = sortedCountries[0];
                if (!domesticMarkets.includes(topCountry)) {
                    // Wenn Top-Land >50% der Abrufe hat, gilt es als domestic
                    const topCountryShare = countryStats[topCountry] / Object.values(countryStats).reduce((a, b) => a + b, 0);
                    if (topCountryShare > 0.5) {
                        domesticMarkets = [topCountry];
                    }
                }
            }
            
            return domesticMarkets;
        }

        function calculateSeasonalVariance(data) {
            const monthlyValues = data.reports.map(r => r.downloads || 0);
            if (monthlyValues.length < 2) return 0;
            
            const mean = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
            const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyValues.length;
            const standardDeviation = Math.sqrt(variance);
            
            return mean > 0 ? (standardDeviation / mean) * 100 : 0;
        }

        function getTopCountries(data) {
            const countryStats = {};
            
            data.reports.forEach(report => {
                const countryData = report.datalist.find(d => d.caption.includes('Länder'));
                if (countryData) {
                    countryData.values.forEach(country => {
                        if (country.k !== 'Andere') {
                            countryStats[country.k] = (countryStats[country.k] || 0) + country.v;
                        }
                    });
                }
            });
            
            return Object.entries(countryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([name]) => name.split(' ')[0]); // Erste Wort des Landes
        }

        function findPeakPerformanceDay(data) {
            let maxValue = 0;
            let peakDay = 'N/A';
            let peakDate = null;
            
            data.reports.forEach(report => {
                const dailyData = report.datalist.find(d => d.caption.includes('Tagesverlauf'));
                if (dailyData) {
                    dailyData.values.forEach(day => {
                        if (day.v > maxValue) {
                            maxValue = day.v;
                            peakDate = new Date(day.k);
                            if (!isNaN(peakDate.getTime())) {
                                // Bessere Formatierung: "22. Dezember (Sonntag)"
                                const dayName = peakDate.toLocaleDateString('de-DE', { weekday: 'long' });
                                const dayNum = peakDate.getDate();
                                const monthName = peakDate.toLocaleDateString('de-DE', { month: 'long' });
                                peakDay = `${dayNum}. ${monthName} (${dayName})`;
                            } else {
                                peakDay = day.k;
                            }
                        }
                    });
                }
            });
            
            // Gebe sowohl Datum als auch Wert zurück
            return {
                date: peakDay,
                value: maxValue
            };
        }

        function getCountryFlag(countryName) {
            const flags = {
                'Deutschland': '🇩🇪',
                'Österreich': '🇦🇹',
                'Schweiz': '🇨🇭',
                'Niederlande': '🇳🇱',
                'Italien': '🇮🇹',
                'Frankreich': '🇫🇷',
                'Vereinigtes Königreich': '🇬🇧',
                'Vereinigte Staaten': '🇺🇸',
                'Ungarn': '🇭🇺',
                'Tschechien': '🇨🇿',
                'Belgien': '🇧🇪',
                'Polen': '🇵🇱',
                'Kroatien': '🇭🇷'
            };
            
            for (const [country, flag] of Object.entries(flags)) {
                if (countryName.includes(country)) {
                    return flag;
                }
            }
            return '🌍';
        }

        // KI-Integration
        async function generateAIInsights(data) {
            try {
                // Sammle alle Insights für die Management Summary
                const allInsights = {
                    cameras: [],
                    countries: null,
                    seasonal: null,
                    channels: null
                };
                
                // 1. Einzelne Kamera-Insights generieren für ALLE Kameras
                const uniqueCameras = getUniqueCameras(data);
                const cameraPromises = uniqueCameras.map(async (cameraData, index) => {
                    try {
                        const insight = await generateCameraInsight(cameraData.latestReport, index);
                        allInsights.cameras.push({
                            name: cameraData.latestReport.line1,
                            insight: insight
                        });
                    } catch (error) {
                        console.error(`Camera insight ${index} failed:`, error);
                        const analytics = analyzeCameraData(cameraData.latestReport, data);
                        const fallback = `Solide Performance mit ${formatNumber(analytics.totalVideoAbrufe || 0)} Video-Abrufen und konstanter Nutzeraktivität über den Berichtszeitraum.`;
                        updateAIContent(`ai-insight-${index}`, fallback);
                        allInsights.cameras.push({
                            name: cameraData.latestReport.line1,
                            insight: fallback
                        });
                    }
                });
                
                // 2. Zusätzliche Insights parallel generieren
                const countryPromise = generateCountryInsights(data).then(insight => {
                    allInsights.countries = insight;
                }).catch(error => {
                    console.error('Country insights failed:', error);
                    const fallback = 'Starke DACH-Präsenz mit wachsendem internationalen Interesse.';
                    updateAIContent('ai-insight-countries', fallback);
                    allInsights.countries = fallback;
                });
                
                const seasonalPromise = generateSeasonalInsights(data).then(insight => {
                    allInsights.seasonal = insight;
                }).catch(error => {
                    console.error('Seasonal insights failed:', error);
                    const fallback = 'Klare saisonale Muster erkennbar.';
                    updateAIContent('ai-insight-seasonal', fallback);
                    allInsights.seasonal = fallback;
                });
                
                const channelPromise = generateChannelInsights(data).then(insight => {
                    allInsights.channels = insight;
                }).catch(error => {
                    console.error('Channel insights failed:', error);
                    const fallback = 'Multi-Channel-Strategie mit Optimierungspotenzial.';
                    updateAIContent('ai-insight-channels', fallback);
                    allInsights.channels = fallback;
                });
                
                // 3. Warte auf alle Insights
                await Promise.all([...cameraPromises, countryPromise, seasonalPromise, channelPromise]);
                
                // 4. JETZT erst Management Summary generieren mit allen gesammelten Insights
                generateComprehensiveSummary(data, allInsights).catch(error => {
                    console.error('AI Summary failed:', error);
                    updateAIContent('ai-summary-content', generateStaticSummary(analyzeDataForAI(data)));
                });
                
            } catch (error) {
                console.error('Fehler bei KI-Analyse:', error);
                // Fallback zu statischen Insights
                generateStaticInsights(data);
            }
        }

        async function generateComprehensiveSummary(data, allInsights) {
            const summaryData = analyzeDataForAI(data);
            const metrics = calculateAdvancedMetrics(data);
            
            // Erstelle einen umfassenden Prompt mit allen gesammelten Insights
            const prompt = `Du bist ein Datenanalyst bei Feratel. Erstelle eine Executive Summary basierend auf folgenden bereits analysierten Daten:

HAUPTMETRIKEN:
- Zeitraum: ${data.ms} bis ${data.me}
- Video-Abrufe gesamt: ${formatNumber(metrics.totalVideoAbrufe)}
- Impressions gesamt: ${formatNumber(metrics.totalImpressions)}
- Klickrate: ${((metrics.totalVideoAbrufe / metrics.totalImpressions) * 100).toFixed(1).replace('.', ',')}%

BEREITS ANALYSIERTE INSIGHTS:
- Länder: ${allInsights.countries || 'DACH-Region dominiert'}
- Saisonalität: ${allInsights.seasonal || 'Saisonale Schwankungen vorhanden'}
- Kanäle: ${allInsights.channels || 'Multi-Channel-Verteilung'}

AUFGABE:
Erstelle eine KURZE Management Summary mit MAXIMAL 3 kurzen Absätzen:

Absatz 1 (2-3 Sätze): Gesamtperformance mit den wichtigsten Zahlen
Absatz 2 (2-3 Sätze): Haupterkenntnisse (Märkte, Saisonalität, Kanäle)  
Absatz 3 (2-3 Sätze): Die 2-3 wichtigsten Handlungsempfehlungen

WICHTIG:
- KURZ und PRÄGNANT (maximal 150 Wörter gesamt!)
- Klare Absätze mit Zeilenumbrüchen
- Keine verschachtelten Sätze
- Vermeide Prozentzeichen in Fließtext (schreibe "Prozent")
- Auf Deutsch`;

            try {
                const response = await callOpenAI(prompt, 200); // Weniger Tokens für kürzere Summary
                updateAIContent('ai-summary-content', response);
            } catch (error) {
                console.error('Comprehensive Summary Error:', error);
                // Kurzer, klarer Fallback
                const klickrate = ((metrics.totalVideoAbrufe / metrics.totalImpressions) * 100).toFixed(1).replace('.', ',');
                const fallbackSummary = `
                    <p>Die Kameras erreichten <span class="insight-highlight">${formatNumber(metrics.totalVideoAbrufe)} Video-Abrufe</span> und <span class="insight-highlight">${formatNumber(metrics.totalImpressions)} Impressions</span> mit einer Klickrate von ${klickrate} Prozent. Dies zeigt eine ${metrics.totalVideoAbrufe > 20000 ? 'starke' : metrics.totalVideoAbrufe > 10000 ? 'solide' : 'ausbaufähige'} Performance.</p>
                    
                    <p>Die Hauptmärkte sind ${summaryData.topCountries.slice(0, 3).join(', ')}. Die Verteilung zeigt eine ${metrics.internationalReach > 20 ? 'internationale' : 'regionale'} Ausrichtung mit Potenzial für weitere Expansion.</p>
                    
                    <p><strong>Empfehlungen:</strong> Marketing auf Peak-Zeiten fokussieren. Präsenz in Hauptmärkten verstärken. Content-Qualität für höhere Klickraten optimieren.</p>
                `;
                updateAIContent('ai-summary-content', fallbackSummary);
            }
        }

        async function generateAISummary(data) {
            const summaryData = analyzeDataForAI(data);
            const prompt = `Erkläre diese Kamera-Performance in einfachen Worten für einen Kunden:

IHRE KAMERA-DATEN:
- Zeitraum: ${data.ms} bis ${data.me}
- Video-Abrufe: ${formatNumber(summaryData.totalVideoAbrufe)}
- Impressions: ${formatNumber(summaryData.totalImpressions)}
- Hauptmärkte: ${summaryData.topCountries.join(', ')}

Erkläre verständlich:

1. Was diese Zahlen für den Kunden bedeuten
2. Ob die Performance gut oder schlecht ist
3. Was die Besucher-Muster zeigen
4. Einfache Handlungsempfehlungen

Schreibstil: Einfach, verständlich, wie für Nicht-Techniker. Keine Fachbegriffe ohne Erklärung. Deutsch.`;

            try {
                const response = await callOpenAI(prompt, 400); // Mehr Tokens für vollständige Antwort
                const summaryText = typeof response === 'string' ? response : 
                    (response.summary || response.content || 'Analyse wird verarbeitet...');
                
                updateAIContent('ai-summary-content', summaryText);
                
            } catch (error) {
                console.error('AI Summary Error:', error);
                updateAIContent('ai-summary-content', generateStaticSummary(summaryData));
            }
        }

        function generateStaticSummary(summaryData) {
            return `
                <p>Ihre Kameras haben <span class="insight-highlight">${formatNumber(summaryData.totalVideoAbrufe)} Video-Wiedergaben</span> und <span class="insight-highlight">${formatNumber(summaryData.totalImpressions)} Seitenaufrufe</span> im Berichtszeitraum erreicht. Das zeigt starkes Interesse an Ihrem Standort.</p>
                
                <p>Die meisten Besucher kommen aus <span class="insight-highlight">${summaryData.topCountries.join(', ')}</span>. Diese Länder sind Ihre wichtigsten Zielgruppen und sollten bei Marketing-Aktivitäten prioritär behandelt werden.</p>
                
                <div style="margin: 12px 0; padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 4px solid #FBE603; line-height: 1.6;">
                    1. <strong>Saisonale Muster:</strong> Bestimmte Monate zeigen deutlich mehr Interesse. Das sind ideale Zeitpunkte für verstärkte Marketing-Maßnahmen und besondere Angebote.
        </div>
                
                <div style="margin: 12px 0; padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 4px solid #FBE603; line-height: 1.6;">
                    2. <strong>Besucherquellen:</strong> Verschiedene Kanäle bringen unterschiedliche Besucher. Ihre eigene Website (grün markiert) zeigt direktes Interesse, während Partnernetzwerke neue Zielgruppen erschließen.
                </div>
                
                <div style="margin: 12px 0; padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 4px solid #FBE603; line-height: 1.6;">
                    3. <strong>Internationale Chancen:</strong> Besucher aus anderen Ländern zeigen Potenzial für internationale Gäste. Diese Märkte können durch gezielte Bewerbung weiter ausgebaut werden.
                </div>
            `;
        }

        async function generateCameraInsight(report, index) {
            // Hole die vollständigen Kamera-Daten
            const uniqueCameras = getUniqueCameras(currentData);
            const fullCameraData = uniqueCameras[index] || null;
            const cameraData = analyzeCameraDataAdvanced(report, currentData, fullCameraData);
            
            console.log('Camera Data for AI:', {
                name: report.line1,
                videoAbrufe: cameraData.totalVideoAbrufe,
                impressions: cameraData.totalImpressions,
                peakDay: cameraData.peakDay
            });
            
            const klickrate = cameraData.totalImpressions > 0 
                ? ((cameraData.totalVideoAbrufe / cameraData.totalImpressions) * 100).toFixed(1).replace('.', ',')
                : '0,0';
            
            const prompt = `Analysiere diese Kamera-Performance sachlich und vollständig:

KAMERA: ${report.line1} - ${report.line2}
- Video-Abrufe: ${formatNumber(cameraData.totalVideoAbrufe || 0)}
- Impressions: ${formatNumber(cameraData.totalImpressions || 0)}
- Klickrate: ${klickrate}%

Erkläre in 3-4 vollständigen Sätzen:
1. Was die Zahlen konkret bedeuten (gut/mittel/schwach)
2. Was die Klickrate über das Nutzerinteresse aussagt
3. Welche Trends oder Muster erkennbar sind
4. Einen konkreten Verbesserungsvorschlag

Wichtig: Vollständige Sätze, keine Abkürzungen. Direkt und sachlich. Deutsch.`;

            try {
                console.log('Sending prompt to AI:', prompt.substring(0, 200) + '...');
                const response = await callOpenAI(prompt, 250); // Mehr Tokens für vollständige Antwort
                console.log('AI Response received:', response ? 'Success' : 'Empty');
                
                // Prüfe ob Antwort vollständig ist
                if (response && response.length > 100 && !response.includes('...')) {
                updateAIContent(`ai-insight-${index}`, response);
                } else {
                    throw new Error('Incomplete response');
                }
            } catch (error) {
                console.error(`AI Generation failed for camera ${index}:`, error);
                // Verbesserter und vollständiger Fallback-Text
                const performanceLevel = cameraData.totalVideoAbrufe > 10000 ? 'hohe' : 
                                       cameraData.totalVideoAbrufe > 5000 ? 'solide' : 'ausbaufähige';
                const fallbackText = `Die Kamera Performance von ${report.line1} zeigt insgesamt ${formatNumber(cameraData.totalVideoAbrufe || 0)} Video-Abrufe bei ${formatNumber(cameraData.totalImpressions || 0)} Impressions, was einer Klickrate von ${klickrate}% entspricht. Diese ${performanceLevel} Nutzerinteraktion deutet auf ${performanceLevel === 'hohe' ? 'sehr gutes Engagement' : performanceLevel === 'solide' ? 'stabiles Interesse' : 'Optimierungspotenzial'} hin. Die Daten zeigen ${performanceLevel === 'hohe' ? 'eine starke Verbindung zwischen Interesse und tatsächlicher Nutzung' : 'Raum für Verbesserungen bei der Nutzeraktivierung'}. Zur Steigerung der Performance empfiehlt sich die Optimierung der Sichtbarkeit durch gezielte Marketingmaßnahmen in den identifizierten Hauptmärkten.`;
                updateAIContent(`ai-insight-${index}`, fallbackText);
            }
        }

        async function generateCountryInsights(data) {
            const countryData = analyzeCountryData(data);
            const topCountries = countryData.topCountries.slice(0, 5).map(c => c.name).join(', ');
            
            const prompt = `Analysiere die Länder-Verteilung sachlich:

TOP-MÄRKTE: ${topCountries}

Erkläre direkt:
- Was die Länder-Verteilung zeigt
- Welche Marktmuster erkennbar sind
- Wo Expansion sinnvoll wäre

2-3 Sätze, sachlich, ohne Verkaufs-Sprache. Deutsch.`;

            try {
                const response = await callOpenAI(prompt, 120);
                updateAIContent('ai-insight-countries', response);
                return response; // Return für Summary
            } catch (error) {
                const fallback = 'Starke Präsenz in DACH-Region mit wachsendem internationalen Interesse. Potenzial für gezielte Expansion in Benelux-Ländern.';
                updateAIContent('ai-insight-countries', fallback);
                return fallback; // Return für Summary
            }
        }

        async function generateSeasonalInsights(data) {
            const seasonalData = analyzeSeasonalTrends(data);
            const peaks = seasonalData.peaks.map(p => formatDate(p.period)).join(', ');
            
            const prompt = `Analysiere die saisonalen Daten sachlich:

PEAK-MONATE: ${peaks || 'Keine klaren Peaks'}
VARIANZ: ${seasonalData.totalMonths} Monate Daten

Erkläre direkt:
- Was die saisonalen Muster zeigen
- Warum bestimmte Monate stärker sind
- Welche Schlüsse daraus zu ziehen sind

2-3 Sätze, analytisch, ohne Empfehlungs-Floskeln. Deutsch.`;

            try {
                const response = await callOpenAI(prompt, 120);
                updateAIContent('ai-insight-seasonal', response);
                return response; // Return für Summary
            } catch (error) {
                const fallback = 'Klare saisonale Muster erkennbar. Empfehlung: Kapazitäten in Peak-Zeiten erhöhen und Marketing entsprechend ausrichten.';
                updateAIContent('ai-insight-seasonal', fallback);
                return fallback; // Return für Summary
            }
        }

        async function generateChannelInsights(data) {
            const channelData = analyzeChannelData(data);
            const channels = channelData.channels.map(c => `${c.name} (${c.percentage}%)`).join(', ');
            
            const prompt = `Analysiere die Kanal-Performance sachlich:

KANÄLE: ${channels}

Erkläre direkt:
- Was die Verteilung bedeutet
- Welcher Kanal am stärksten performt
- Was die Unterschiede verursacht

2-3 Sätze, analytisch, ohne Marketing-Sprache. Deutsch.`;

            try {
                const response = await callOpenAI(prompt, 120);
                updateAIContent('ai-insight-channels', response);
                return response; // Return für Summary
            } catch (error) {
                const fallback = 'Ausgewogene Kanal-Verteilung mit Potenzial zur Stärkung schwächerer Kanäle. Cross-Channel-Synergien nutzen.';
                updateAIContent('ai-insight-channels', fallback);
                return fallback; // Return für Summary
            }
        }

        async function callOpenAI(prompt, maxTokens = 300) {
            // Wähle API basierend auf Konfiguration
            const useAPI = window.appConfig.USE_API || 'openai';
            
            console.log(`=== AI API AUSWAHL: ${useAPI.toUpperCase()} ===`);
            
            if (useAPI === 'gemini') {
                console.log('Verwende Google Gemini API');
                return callGeminiAI(prompt, maxTokens);
            } else {
                console.log('Verwende OpenAI API');
                return callOpenAIDirectly(prompt, maxTokens);
            }
        }
        
        async function callOpenAIDirectly(prompt, maxTokens = 300) {
            const OPENAI_API_KEY = window.appConfig.OPENAI_API_KEY;
            const OPENAI_MODEL = window.appConfig.OPENAI_MODEL || 'gpt-4o-mini';
            
            if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
                console.error('OpenAI API Key nicht konfiguriert');
                throw new Error('OpenAI API Key fehlt');
            }
            
            console.log('Using OpenAI API');
            console.log('Model:', OPENAI_MODEL);
            
            try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                        model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                                content: 'Du bist ein professioneller Datenanalyst bei Feratel. Schreibe klare, strukturierte Analysen in korrektem Deutsch. Keine Anreden, keine Verabschiedungen, nur präzise Fakten und fundierte Einschätzungen.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                        temperature: 0.7
                    })
                });
                
                const data = await response.json();
                console.log('OpenAI Response Status:', response.status);
                
                if (!response.ok) {
                    console.error('OpenAI API Error:', data);
                    throw new Error(data.error?.message || `HTTP ${response.status}`);
                }
                
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    const content = data.choices[0].message.content;
                    console.log('OpenAI generated content successfully');
                    return content;
                } else {
                    throw new Error('Unerwartete Antwort-Struktur von OpenAI');
                }
            } catch (error) {
                console.error('OpenAI API call failed:', error);
                throw error;
            }
        }
        
        async function callGeminiAI(prompt, maxTokens = 300) {
            const GEMINI_API_KEY = window.appConfig.GEMINI_API_KEY;
            const GEMINI_MODEL = window.appConfig.GEMINI_MODEL || 'gemini-2.5-flash';
            
            console.log('Using Gemini API with key:', GEMINI_API_KEY ? 'Key configured' : 'No key');
            console.log('Gemini Model:', GEMINI_MODEL);
            
            if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
                console.error('Gemini API Key nicht konfiguriert!');
                throw new Error('Bitte konfigurieren Sie den Gemini API Key in config.js');
            }
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Du bist ein professioneller Datenanalyst bei Feratel. Schreibe klare, strukturierte Analysen in korrektem Deutsch. Keine Anreden, keine Verabschiedungen, nur präzise Fakten und fundierte Einschätzungen.\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: maxTokens,
                        topP: 0.8,
                        topK: 40
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_NONE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API Error:', response.status, errorText);
                
                // Parse error for better debugging
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        console.error('Gemini Error Details:', errorData.error);
                        throw new Error(`Gemini API Error: ${errorData.error.message || response.status}`);
                    }
                } catch (e) {
                    // Not JSON error
                }
                throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Gemini Response:', data);
            
            // Gemini Response Format ist anders als OpenAI
            let content = '';
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    content = candidate.content.parts[0].text.trim();
                    console.log('Extracted content from Gemini:', content.substring(0, 100) + '...');
                }
            } else {
                // Fallback für OpenAI Format (falls noch verwendet)
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    content = data.choices[0].message.content.trim();
                    console.log('Using OpenAI format fallback');
                }
            }
            
            if (!content) {
                console.warn('Keine gültige Antwort von AI API erhalten');
                return 'Analyse konnte nicht generiert werden.';
            }
            
            // Prüfe ob die Antwort vollständig ist (nur für OpenAI Format)
            if (data.choices && data.choices[0] && data.choices[0].finish_reason === 'length') {
                console.warn('AI response was truncated, trying with shorter prompt');
                // Versuche nochmal mit kürzerem, fokussierterem Prompt
                const shorterPrompt = prompt.substring(0, prompt.length / 2) + '\n\nKurze, prägnante Antwort auf Deutsch.';
                try {
                    const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Du bist ein Feratel-Experte. Antworte kurz und prägnant auf Deutsch.'
                                },
                                {
                                    role: 'user',
                                    content: shorterPrompt
                                }
                            ],
                            max_tokens: Math.min(150, maxTokens),
                            temperature: 0.7
                        })
                    });
                    
                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json();
                        return retryData.choices[0].message.content.trim();
                    }
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
                
                // Als letzter Ausweg: Schneide den Text sauber ab und füge Punkt hinzu
                const cleanContent = content.replace(/[^\w\s.,!?%-]/g, '');
                const lastSentence = cleanContent.lastIndexOf('.');
                if (lastSentence > cleanContent.length * 0.7) {
                    return cleanContent.substring(0, lastSentence + 1);
                }
                return cleanContent + '.';
            }
            
            return content;
        }

        function analyzeDataForAI(data) {
            const analytics = calculateAdvancedMetrics(data);
            const totalDownloads = data.reports.reduce((sum, report) => sum + (report.downloads || 0), 0);
            
            // Verwende die korrekt berechnete Video-Engagement-Rate
            const videoEngagement = analytics.videoEngagementRate;
            const topCountries = getTopCountries(data);
            const seasonalVariance = calculateSeasonalVariance(data);
            
            return {
                totalDownloads,
                videoEngagement,
                topCountries,
                seasonalVariance
            };
        }

        function updateAIContent(elementId, content) {
            const element = document.getElementById(elementId);
            const loadingElement = document.getElementById(elementId.replace('ai-insight-', 'ai-loading-').replace('ai-summary-content', 'ai-loading-summary'));
            
            if (element) {
                // Stelle sicher, dass content ein String ist und nicht undefined
                let textContent = '';
                if (typeof content === 'string') {
                    textContent = content;
                } else if (content && typeof content === 'object') {
                    textContent = content.content || content.text || JSON.stringify(content);
                } else {
                    textContent = 'Analyse wird verarbeitet...';
                }
                
                // Formatiere den Content mit Feratel-Highlighting
                const formattedContent = formatAIResponse(textContent);
                element.innerHTML = formattedContent;
            }
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }

        function formatAIResponse(text) {
            if (!text || text === 'undefined') return 'Analyse wird verarbeitet...';
            
            // Konvertiere zu String falls nötig
            if (typeof text !== 'string') {
                text = String(text);
            }
            
            // Bereinige den Text zuerst gründlich
            text = cleanTextFromCSS(text);
            
            // Entferne ### und ## Zeichen und andere Markdown
            text = text.replace(/#{1,6}\s*/g, '');
            text = text.replace(/\[object.*?\]/g, '');
            text = text.trim();
            
            // WICHTIG: Verhindere Abschneiden des Texts
            if (!text || text.length < 10) {
                return '<p>Analyse konnte nicht generiert werden.</p>';
            }
            
            let formatted = text;
            
            // 1. Ersetze **text** mit Highlighting
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<span class="insight-highlight">$1</span>');
            
            // 2. Automatisches Highlighting NUR für KPIs und wichtige Zahlen
            const simplePatterns = [
                // Zahlen mit Einheiten (Video-Abrufe, Impressions, etc.)
                /(\d{1,3}(?:\.\d{3})*(?:,\d+)?\s*(?:Video[- ]?Abrufe?|Impressions?|Views?))/gi,
                
                // Prozentangaben NUR mit Zahl davor (nicht einzelne %)
                /(\d{1,3}(?:,\d+)?\s*Prozent)/gi,
                
                // Peak-Tage mit Datum
                /(\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember))/gi
            ];
            
            simplePatterns.forEach(pattern => {
                formatted = formatted.replace(pattern, (match) => {
                    // Verhindere doppeltes Highlighting
                    if (formatted.includes(`<span class="insight-highlight">${match}</span>`)) return match;
                    return `<span class="insight-highlight">${match}</span>`;
                });
            });
            
            // 3. Erkenne nummerierte Listen und formatiere sie richtig
            if (formatted.match(/\d+\.\s/)) {
                // Teile den Text in einzelne Listenpunkte
                const listItems = formatted.split(/(?=\d+\.\s)/);
                const formattedItems = listItems.map(item => {
                    if (item.trim()) {
                        return `<div style="margin: 12px 0; padding: 12px 15px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 4px solid #FBE603; line-height: 1.6;">${item.trim()}</div>`;
                    }
                    return '';
                }).filter(item => item);
                
                return formattedItems.join('');
            }
            
            // 4. Für normalen Text: Teile in gut lesbare Absätze
            if (formatted.length > 150) {
                const sentences = formatted.split(/\.\s+/);
                if (sentences.length > 1) {
                    const paragraphs = [];
                    for (let i = 0; i < sentences.length; i += 2) {
                        const para = sentences.slice(i, i + 2).join('. ').trim();
                        if (para.length > 15) {
                            paragraphs.push(`<p style="margin: 15px 0; line-height: 1.7;">${para}${para.endsWith('.') ? '' : '.'}</p>`);
                        }
                    }
                    if (paragraphs.length > 0) {
                        return paragraphs.join('');
                    }
                }
            }
            
            return `<div style="line-height: 1.7; margin: 10px 0;">${formatted}</div>`;
        }

        function cleanTextFromCSS(text) {
            // Entferne alle CSS-Artefakte und HTML-Reste gründlich
            text = text.replace(/var\([^)]+\)/g, ''); // CSS-Variablen
            text = text.replace(/[{}();]/g, ''); // CSS-Zeichen
            text = text.replace(/\s*-\s*[a-z-]+:\s*/gi, ' '); // CSS-Properties
            text = text.replace(/\s*\.\s*[a-z-]+\s*/gi, ' '); // CSS-Klassen
            text = text.replace(/highlight[">]/gi, ''); // HTML-Reste
            text = text.replace(/padding|margin|color|background|border|font/gi, ''); // CSS-Keywords
            text = text.replace(/-[a-z]+:/gi, ''); // CSS-Properties mit Bindestrich
            text = text.replace(/\s*:\s*[^;]+;/gi, ''); // CSS-Werte
            text = text.replace(/\s*\*\s*/g, ' '); // Sterne
            text = text.replace(/\s*-\s*(?=[a-z])/gi, ' '); // Bindestriche vor Wörtern
            text = text.replace(/\s+/g, ' '); // Mehrfache Leerzeichen
            text = text.replace(/^\s*-\s*/, ''); // Führende Bindestriche
            text = text.replace(/left|right|solid|3px|12px|var|feratel|yellow/gi, ''); // Spezifische CSS-Begriffe
            
            return text.trim();
        }

        function updateAIRecommendations(recommendations) {
            const element = document.getElementById('ai-recommendations');
            if (element && recommendations) {
                // Einfache, saubere Empfehlungsdarstellung
                const cleanRecs = cleanTextFromCSS(recommendations);
                
                // Teile in sinnvolle Empfehlungen auf
                let recs = [];
                
                if (cleanRecs.includes('1.') || cleanRecs.includes('2.')) {
                    // Nummerierte Liste
                    recs = cleanRecs.split(/\d+\./).filter(rec => rec.trim().length > 10);
                } else {
                    // Teile nach Sätzen, aber intelligent
                    const sentences = cleanRecs.split(/\.\s+/);
                    for (let i = 0; i < sentences.length; i += 2) {
                        const combined = sentences.slice(i, i + 2).join('. ').trim();
                        if (combined.length > 20) {
                            recs.push(combined);
                        }
                    }
                }
                
                if (recs.length === 0) {
                    recs = [cleanRecs]; // Fallback: ganzer Text als eine Empfehlung
                }
                
                element.innerHTML = recs.map((rec, index) => {
                    const cleanRec = rec.trim();
                    if (!cleanRec || cleanRec.length < 10) return '';
                    
                    // Einfaches Highlighting für deutsche Zahlen (komplette Zahlen mit Komma)
                    const highlighted = cleanRec.replace(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?\s*(?:Downloads?|Abrufe?|Views?|%))/gi, 
                        '<span class="insight-highlight">$1</span>');
                    
                    return `<div class="recommendation-card">
                        <div class="recommendation-title">
                            💡 Empfehlung ${index + 1}
                        </div>
                        <div style="line-height: 1.6; margin-top: 10px; font-size: 14px;">
                            ${highlighted}${highlighted.endsWith('.') ? '' : '.'}
                        </div>
                    </div>`;
                }).filter(card => card).join('');
            }
        }

        function generateStaticInsights(data) {
            const analytics = calculateAdvancedMetrics(data);
            
            // Fallback-Insights wenn KI nicht verfügbar
            updateAIContent('ai-summary-content', 
                `Starke Performance mit ${formatNumber(analytics.totalDownloads)} Downloads und ${analytics.videoEngagementRate}% Video-Engagement. 
                Internationale Reichweite von ${analytics.internationalReach}% zeigt globales Interesse.`);
            
            data.reports.forEach((report, index) => {
                if (index < 3) {
                    const cameraAnalytics = analyzeCameraData(report, data);
                    updateAIContent(`ai-insight-${index}`, 
                        `Solide Performance mit ${cameraAnalytics.engagementRate}% Video-Engagement. 
                        Peak-Performance am ${cameraAnalytics.peakDay} deutet auf optimale Nutzungszeiten hin.`);
                }
            });
            
            updateAIContent('ai-insight-countries', 
                'Starke DACH-Präsenz mit wachsendem internationalen Interesse. Expansion-Potenzial in Benelux-Märkten.');
            
            updateAIContent('ai-insight-seasonal', 
                'Klare saisonale Muster erkennbar. Kapazitätsplanung und Marketing-Timing entsprechend anpassen.');
            
            updateAIContent('ai-insight-channels', 
                'Ausgewogene Multi-Channel-Strategie mit Optimierungspotenzial in schwächeren Kanälen.');
        }