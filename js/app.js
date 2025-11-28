// ==============================
// Application Leaflet VTT - App.js avec Bottom Sheet
// ==============================

// === Configuration Générale ===
const config = {
    defaultCenter: [48.64822242034096, 0.6728590452275891],
    defaultZoom: 13,
    gpxPath: 'data/',
    difficultyColors: {
        'vert': 'green',
        'bleu': 'blue',
        'rouge': 'red',
        'noir': 'black'
    },
    trackColors: {
        'vert': '#2ECC71',
        'bleu': '#3498DB',
        'rouge': '#E74C3C',
        'noir': '#2C3E50'
    },
    zoomSettings: {
        padding: [30, 30],
        maxZoom: 15,
        animate: true,
        duration: 0.8,
        easeLinearity: 0.3
    }
};

// === Données de parcours ===
const allRoutes = [
    { name: "Le Tremblay", file: "parcours1.gpx", distance: 10, difficulty: "vert" },
    { name: "Le long du fer", file: "parcours2.gpx", distance: 18, difficulty: "bleu" },
    { name: "Le camp retranché de St Gilles", file: "parcours3.gpx", distance: 10, difficulty: "bleu" },
    { name: "L'Etoile du Perche et ses Etangs", file: "parcours4.gpx", distance: 28, difficulty: "bleu" },
    { name: "La Clairière de Bresolettes", file: "parcours5.gpx", distance: 31, difficulty: "bleu" },
    { name: "Les ruines du château de Gannes", file: "parcours6.gpx", distance: 28, difficulty: "bleu" },
    { name: "La butte aux loups", file: "parcours7.gpx", distance: 49, difficulty: "rouge" },
    { name: "La vue sur le Perche", file: "parcours8.gpx", distance: 52, difficulty: "rouge" },
    { name: "Les 10 villages", file: "parcours9.gpx", distance: 89, difficulty: "noir" },
];

// === Initialisation de la carte ===
const map = L.map('map', {zoomControl: false}).setView(config.defaultCenter, config.defaultZoom);

// Définir les fonds de carte
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' });
const topo = L.tileLayer('https://{s}.tile.opentomap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenTopoMap (CC-BY-SA)' });
const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: '&copy; Google Maps' });
const googleTopo = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: 'Map data ©2024 Google' });

const baseMaps = { "OpenStreetMap": osm, "Carto Light": carto, "OpenTopoMap": topo, "Satellite": googleSat, "Topographique": googleTopo };

L.control.layers(baseMaps).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomright', metric: true, imperial: false }).addTo(map);

let currentLayer = null;
let hoverMarker = null;
let elevationChart = null;
let elevationChartMobile = null;
let userLocationMarker = null;
let userLocationCircle = null;
let watchId = null;

// === Gestion de la géolocalisation ===
const locateBtn = document.getElementById('locate-btn');
let isTracking = false;

function updateUserLocation(lat, lng, accuracy) {
    if (!userLocationMarker) {
        userLocationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            weight: 3
        }).addTo(map);
        
        userLocationCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
    } else {
        userLocationMarker.setLatLng([lat, lng]);
        userLocationCircle.setLatLng([lat, lng]);
        userLocationCircle.setRadius(accuracy);
    }
}

locateBtn.addEventListener('click', () => {
    if (!isTracking) {
        if ('geolocation' in navigator) {
            locateBtn.classList.add('bg-blue-500');
            locateBtn.querySelector('.material-icons').classList.add('text-white');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    updateUserLocation(latitude, longitude, accuracy);
                    map.setView([latitude, longitude], 15, { animate: true });
                    isTracking = true;
                    
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            const { latitude, longitude, accuracy } = position.coords;
                            updateUserLocation(latitude, longitude, accuracy);
                        },
                        (error) => {
                            console.error('Erreur:', error);
                            showToast('Impossible de vous localiser.', 'error');
                        },
                        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                    );
                },
                (error) => {
                    showToast('Vérifiez que vous avez autorisé la géolocalisation.', 'info');
                    locateBtn.classList.remove('bg-blue-500');
                    locateBtn.querySelector('.material-icons').classList.remove('text-white');
                }
            );
        } else {
            showToast('Géolocalisation non supportée.', 'error');
        }
    } else {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
            userLocationMarker = null;
        }
        if (userLocationCircle) {
            map.removeLayer(userLocationCircle);
            userLocationCircle = null;
        }
        locateBtn.classList.remove('bg-blue-500');
        locateBtn.querySelector('.material-icons').classList.remove('text-white');
        isTracking = false;
    }
});

// === Gestion du panneau mobile ===
const routePanel = document.getElementById('route-panel');
const openPanelBtn = document.getElementById('open-panel-btn');
const closePanelBtn = document.getElementById('close-panel-btn');
const openPanelBtn2 = document.getElementById('open-panel-btn-2'); // NOUVEL ÉLÉMENT

// Fonction pour ouvrir le panneau
const openPanel = () => routePanel.classList.remove('hidden');

// Attacher l'événement au bouton d'origine et au nouveau bouton
openPanelBtn.addEventListener('click', openPanel);
if (openPanelBtn2) { // Vérification de l'existence du nouveau bouton
    openPanelBtn2.addEventListener('click', openPanel);
}
closePanelBtn.addEventListener('click', () => routePanel.classList.add('hidden'));


// === Gestion du Bottom Sheet (Mise à jour pour un swipe intuitif) ===
const bottomSheet = document.getElementById('bottom-sheet');
const bottomSheetHandle = document.getElementById('bottom-sheet-handle');
const closeBottomSheet = document.getElementById('close-bottom-sheet');

let sheetState = 'collapsed'; // collapsed, expanded, fullscreen
let startY = 0;
let currentY = 0;
let isDragging = false;
let hasDragged = false;

function setSheetState(state) {
    bottomSheet.classList.remove('collapsed', 'expanded', 'fullscreen');
    bottomSheet.classList.add(state);
    sheetState = state;
}

// Gestion du touch pour le swipe (APPLIQUÉ AU CONTENEUR ENTIER)
bottomSheet.addEventListener('touchstart', (e) => {
    isDragging = true;
    hasDragged = false;
    startY = e.touches[0].clientY;
    bottomSheet.style.transition = 'none';
});

bottomSheet.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    // Empêcher le scroll de la page si c'est un glissement vertical suffisant
    if (Math.abs(deltaY) > 5) {
        e.preventDefault();
        hasDragged = true;
    }
    
    // Limiter le mouvement (Maintien de la logique originale d'affichage temporaire)
    if (deltaY > 0) { // Vers le bas
        const maxDelta = window.innerHeight * 0.7;
        const clampedDelta = Math.min(deltaY, maxDelta);
        bottomSheet.style.transform = `translateY(calc(${getTransformValue(sheetState)} + ${clampedDelta}px))`;
    } else { // Vers le haut
        const maxDelta = window.innerHeight * 0.5;
        const clampedDelta = Math.max(deltaY, -maxDelta);
        bottomSheet.style.transform = `translateY(calc(${getTransformValue(sheetState)} + ${clampedDelta}px))`;
    }
});

bottomSheet.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    
    isDragging = false;
    bottomSheet.style.transition = '';
    
    const deltaY = currentY - startY;
    const threshold = 50; // Seuil de glissement minimum

    let targetState = sheetState;
    
    if (hasDragged) {
        if (deltaY > threshold) {
            // Swipe vers le bas (réduire l'état)
            if (sheetState === 'fullscreen') {
                targetState = 'expanded';
            } else if (sheetState === 'expanded') {
                targetState = 'collapsed';
            }
        } else if (deltaY < -threshold) {
            // Swipe vers le haut (augmenter l'état)
            if (sheetState === 'collapsed') {
                targetState = 'expanded';
            } else if (sheetState === 'expanded') {
                targetState = 'fullscreen';
            }
        }
        setSheetState(targetState); // Appliquer le nouvel état
    } 
    
    bottomSheet.style.transform = '';
});

function getTransformValue(state) {
    switch(state) {
        case 'collapsed': return 'calc(100% - 60px)';
        case 'expanded': return '35%';
        case 'fullscreen': return '0';
        default: return 'calc(100% - 60px)';
    }
}

// Click sur le handle pour toggle (SIMPLIFIÉ : toggle entre collapsed et expanded)
bottomSheetHandle.addEventListener('click', () => {
    if (sheetState === 'collapsed') {
        setSheetState('expanded');
    } else { // Si expanded ou fullscreen, on collapse
        setSheetState('collapsed');
    }
});

// Bouton fermer
closeBottomSheet.addEventListener('click', () => {
    setSheetState('collapsed');
});

// Click sur la carte pour réduire le bottom sheet
map.on('click', () => {
    if (window.innerWidth < 1024 && sheetState !== 'collapsed') {
        setSheetState('collapsed');
    }
});

// === Chargement d'un fichier GPX ===
function smooth(data, windowSize = 5) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize);
        const end = Math.min(data.length - 1, i + windowSize);
        const subset = data.slice(start, end + 1);
        const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
        result.push(avg);
    }
    return result;
}

function loadGPX(filename, difficulty) {
    // Cacher le message d'état vide
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.opacity = '0';
        setTimeout(() => {
            emptyState.style.display = 'none';
        }, 300);
    }
    
    document.getElementById('loader').classList.remove('hidden');
    if (currentLayer) map.removeLayer(currentLayer);
    if (hoverMarker) map.removeLayer(hoverMarker);
    if (elevationChart) elevationChart.destroy();
    if (elevationChartMobile) elevationChartMobile.destroy();
    
    // Afficher les panneaux d'élévation
    if (window.innerWidth >= 1024) {
        document.getElementById('elevation-panel').classList.remove('hidden');
    }
    
    // Ouvrir le bottom sheet sur mobile
    if (window.innerWidth < 1024) {
        setSheetState('expanded');
    }

    const trackColor = config.trackColors[difficulty];
    const gpxLayer = new L.GPX(config.gpxPath + filename, {
        async: true,
        marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
        polyline_options: { color: trackColor, weight: 5 },
        parseElements: ['track', 'route']
    }).on('loaded', function (e) {
        document.getElementById('loader').classList.add('hidden');
        const polylineLayer = e.target.getLayers().find(l => l instanceof L.Polyline);
        if (!polylineLayer) {
            console.warn("Aucune couche de trace GPX trouvée.");
            return;
        }
        map.fitBounds(e.target.getBounds(), { padding: config.zoomSettings.padding });
        const points = polylineLayer.getLatLngs();
        const rawElevations = points.map(p => p.meta?.ele ?? p.alt ?? 0);
        const elevationDisplay = smooth(rawElevations, 5);
        let totalDistance = 0, elevationGain = 0, maxSlope = 0, elevationMin = Infinity, elevationMax = -Infinity, elevationLoss = 0;
        const chartData = [];
        for (let i = 0; i < points.length; i++) {
            const curr = points[i];
            elevationMin = Math.min(elevationMin, rawElevations[i]);
            elevationMax = Math.max(elevationMax, rawElevations[i]);
            if (i > 0) {
                const prev = points[i - 1];
                const dist = prev.distanceTo(curr);
                totalDistance += dist;
                const deltaAlt = rawElevations[i] - rawElevations[i - 1];
                if (deltaAlt > 0) elevationGain += deltaAlt;
                else elevationLoss += Math.abs(deltaAlt);
                if (dist > 3 && deltaAlt > 0) {
                    const slope = deltaAlt / dist;
                    if (slope > maxSlope) maxSlope = slope;
                }
            }
            chartData.push({ x: totalDistance / 1000, y: elevationDisplay[i] });
        }
        const totalDistanceKm = totalDistance / 1000;
        
        // Nouvelle structure HTML des stats
        const statsHTML = `
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-green-500 mr-1 text-base">arrow_upward</span>D+ (Gain)</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationGain)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-red-500 mr-1 text-base">arrow_downward</span>D- (Perte)</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationLoss)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-blue-500 mr-1 text-base">arrow_upward</span>Alt. Max</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationMax)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-blue-500 mr-1 text-base">arrow_downward</span>Alt. Min</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationMin)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-purple-500 mr-1 text-base">route</span>Distance</p><p class="text-xl font-bold text-gray-800">${totalDistanceKm.toFixed(2)} km</p></div>
        `;
        
        document.getElementById('route-stats').innerHTML = statsHTML;
        document.getElementById('route-stats-mobile').innerHTML = statsHTML;
        
        renderElevationChart(chartData, points, trackColor, totalDistanceKm);
    }).addTo(map);
    currentLayer = gpxLayer;
    
    // Gestion des boutons de téléchargement (desktop + mobile)
    const setupDownloadButtons = () => {
        const url = config.gpxPath + filename;
        const downloadAction = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Fichier GPX téléchargé !', 'success'); // Remplacement de l'alerte
        };
        const shareAction = () => {
            navigator.clipboard.writeText(window.location.href);
            showToast('Lien du parcours copié !', 'info'); // Remplacement de l'alerte
        };
        
        document.getElementById('download-gpx').onclick = downloadAction;
        document.getElementById('share-link').onclick = shareAction;
        document.getElementById('download-gpx-mobile').onclick = downloadAction;
        document.getElementById('share-link-mobile').onclick = shareAction;
    };
    
    setupDownloadButtons();
}

// === Rendu du graphique d'élévation ===
function renderElevationChart(chartData, latlngs, trackColor, totalDistance) {
    const chartConfig = {
        type: 'line',
        data: { datasets: [{ data: chartData, borderColor: trackColor, backgroundColor: trackColor + '26', borderWidth: 2, pointRadius: 0, tension: 0.2, fill: 'origin' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', position: 'bottom', min: 0, max: totalDistance, ticks: { callback: val => `${val.toFixed(1)} km`, color: '#6b7280', maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false } },
                y: { ticks: { callback: val => `${val} m`, color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false } }
            },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1f2937', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 8,
                callbacks: {
                    label: ctx => {
                        const index = ctx.dataIndex;
                        const currentElevation = ctx.parsed.y;
                        let slope = 0;
                        if (index > 0) {
                            const prevElevation = chartData[index - 1].y;
                            const prevDistance = chartData[index - 1].x;
                            const currentDistance = chartData[index].x;
                            const elevationChange = currentElevation - prevElevation;
                            const distanceInMeters = (currentDistance - prevDistance) * 1000;
                            if (distanceInMeters > 0) slope = (elevationChange / distanceInMeters) * 100;
                        }
                        let tooltipText = [`Altitude: ${Math.round(currentElevation)} m`];
                        if (index > 0) tooltipText.push(`Pente: ${slope.toFixed(1)} %`);
                        return tooltipText;
                    }
                }
            }},
            interaction: { intersect: false, mode: 'index' }
        }
    };
    
    // Chart desktop
    const canvas = document.getElementById('elevation-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (elevationChart) elevationChart.destroy();
        elevationChart = new Chart(ctx, chartConfig);
        
        canvas.addEventListener('mousemove', (event) => {
            const elements = elevationChart.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
            if (elements.length > 0) {
                const latlng = latlngs[elements[0].index];
                if (!hoverMarker) {
                    hoverMarker = L.circleMarker(latlng, { radius: 6, color: trackColor, fillColor: '#ffffff', fillOpacity: 1, weight: 2 }).addTo(map);
                } else {
                    hoverMarker.setLatLng(latlng);
                }
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            if (hoverMarker) {
                map.removeLayer(hoverMarker);
                hoverMarker = null;
            }
        });
    }
    
    // Chart mobile
    const canvasMobile = document.getElementById('elevation-chart-mobile');
    if (canvasMobile) {
        const ctxMobile = canvasMobile.getContext('2d');
        if (elevationChartMobile) elevationChartMobile.destroy();
        elevationChartMobile = new Chart(ctxMobile, chartConfig);
        
        canvasMobile.addEventListener('touchstart', (event) => {
            const elements = elevationChartMobile.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
            if (elements.length > 0) {
                const latlng = latlngs[elements[0].index];
                if (!hoverMarker) {
                    hoverMarker = L.circleMarker(latlng, { radius: 6, color: trackColor, fillColor: '#ffffff', fillOpacity: 1, weight: 2 }).addTo(map);
                } else {
                    hoverMarker.setLatLng(latlng);
                }
            }
        });
    }
}

// === Génération des boutons de parcours et des filtres ===
let currentFilter = 'all';

function renderRouteButtons(filteredRoutes) {
    const listContainer = document.getElementById('route-list');
    listContainer.innerHTML = '';
    filteredRoutes.forEach(route => {
        const btn = document.createElement('button');
        btn.className = `route-btn flex w-full justify-between items-center p-3 rounded-md border-l-4 border-${config.difficultyColors[route.difficulty]}-500 bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 shadow-sm`;
        btn.setAttribute('data-gpx', route.file);
        btn.setAttribute('data-difficulty', route.difficulty);
        btn.innerHTML = `
            <div class="flex flex-col items-start">
                <p class="font-semibold text-gray-800">${route.name}</p>
                <p class="text-sm text-gray-600">${route.distance} km</p>
            </div>
            <span class="difficulty-badge text-xs font-bold px-2 py-1 rounded-full ${route.difficulty}">${route.difficulty.toUpperCase()}</span>
        `;
        btn.addEventListener('click', () => {
            const selectedDifficulty = btn.getAttribute('data-difficulty');
            loadGPX(route.file, selectedDifficulty);
            document.querySelectorAll('.route-btn').forEach(b => b.classList.remove('bg-gray-50'));
            btn.classList.add('bg-gray-50');

            if (window.innerWidth < 1024) {
                routePanel.classList.add('hidden');
            }
        });
        listContainer.appendChild(btn);
    });
}

// Gestion de la recherche et du filtre
document.getElementById('route-search').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const filtered = allRoutes.filter(route =>
        (currentFilter === 'all' || route.difficulty === currentFilter) &&
        route.name.toLowerCase().includes(searchTerm)
    );
    renderRouteButtons(filtered);
});

document.getElementById('difficulty-filter').addEventListener('click', function (e) {
    const target = e.target.closest('.filter-btn');
    if (target) {
        const difficulty = target.getAttribute('data-difficulty');
        currentFilter = difficulty;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-orange-500', 'text-white', 'hover:bg-orange-600');
            b.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        });
        target.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        target.classList.add('bg-orange-500', 'text-white', 'hover:bg-orange-600');
        const searchTerm = document.getElementById('route-search').value.toLowerCase();
        const filtered = allRoutes.filter(route =>
            (difficulty === 'all' || route.difficulty === difficulty) &&
            route.name.toLowerCase().includes(searchTerm)
        );
        renderRouteButtons(filtered);
    }
});

// Initialisation de la page
document.addEventListener('DOMContentLoaded', () => {
    renderRouteButtons(allRoutes);
    
    // S'assurer que l'empty state est visible au démarrage
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'flex';
        emptyState.style.opacity = '1';
    }
});

// === Fonction utilitaire pour Toast Notifications ===
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgColor = 'bg-green-500';
    let icon = 'check_circle';

    if (type === 'info') {
        bgColor = 'bg-blue-500';
        icon = 'info';
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = 'error';
    }

    toast.className = `p-3 rounded-lg text-white shadow-lg flex items-center ${bgColor} transition-all duration-300 ease-out transform translate-y-full opacity-0`;
    toast.innerHTML = `
        <span class="material-icons mr-2">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Animer l'entrée
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 10);

    // Animer la sortie après 3 secondes
    setTimeout(() => {
        toast.classList.add('opacity-0');
        // Supprimer après la transition de sortie
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}