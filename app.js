class LooFinder {
    constructor() {
        this.map = null;
        this.toilets = [];
        this.reviews = {};
        this.userLocation = null;
        this.userMarker = null;
        this.toiletMarkers = [];
        this.selectedToilet = null;
        this.filters = {
            wheelchairAccessible: false,
            babyChange: false,
            freeAccess: false
        };
        this.currentRating = 0;
        this.loadingTimeout = null; // Add debouncing
        
        this.init();
    }

    async init() {
        console.log('Initializing LooFinder...');
        
        // Initialize map
        this.initializeMap();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadToiletData();
        await this.loadReviewsFromStorage();
        
        // Get user location silently
        this.locateUser(true);
        
        console.log('LooFinder initialized successfully');
    }

    initializeMap() {
        try {
            console.log('Initializing map...');
            
            // Check if map container exists
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.error('Map container not found!');
                return;
            }
            
            console.log('Map container found:', mapContainer);
            console.log('Map container dimensions:', {
                width: mapContainer.offsetWidth,
                height: mapContainer.offsetHeight,
                clientWidth: mapContainer.clientWidth,
                clientHeight: mapContainer.clientHeight
            });
            
            // Initialize Leaflet map centered on Melbourne
            this.map = L.map('map').setView([-37.8136, 144.9631], 13);
            
            console.log('Leaflet map created successfully');
            
            // Try CartoDB Voyager tiles first
            const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: 'OpenStreetMap contributors CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            });

            // Add error handling for CartoDB
            cartoLayer.on('tileerror', (e) => {
                console.error('CartoDB tile error, falling back to OpenStreetMap:', e);
                this.map.removeLayer(cartoLayer);
                this.addOpenStreetMapTiles();
            });

            cartoLayer.addTo(this.map);
            console.log('CartoDB tiles added successfully');

            // Add map move event listeners to reload data for new bounds (with debouncing)
            this.map.on('moveend', () => {
                console.log('Map moveend event triggered');
                this.debouncedLoadData();
            });

            this.map.on('zoomend', () => {
                console.log('Map zoomend event triggered');
                this.debouncedLoadData();
            });

            // Verify map is working
            setTimeout(() => {
                if (this.map && this.map._container) {
                    console.log('Map initialized successfully');
                } else {
                    console.error('Map initialization failed');
                }
            }, 1000);

        } catch (error) {
            console.error('Error initializing map:', error);
            // Try basic OpenStreetMap tiles as fallback
            this.addOpenStreetMapTiles();
        }
    }

    addOpenStreetMapTiles() {
        try {
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'OpenStreetMap contributors',
                maxZoom: 19
            });
            osmLayer.addTo(this.map);
            console.log('OpenStreetMap fallback tiles added');
        } catch (error) {
            console.error('Failed to add OpenStreetMap tiles:', error);
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Review modal
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal) {
            reviewModal.addEventListener('click', (e) => {
                if (e.target === reviewModal) {
                    this.closeReviewModal();
                }
            });
        }

        // Star rating
        const starRating = document.getElementById('starRating');
        if (starRating) {
            starRating.addEventListener('click', (e) => {
                if (e.target.classList.contains('star')) {
                    const rating = parseInt(e.target.dataset.rating);
                    this.setRating(rating);
                }
            });
        }
    }

    debouncedLoadData() {
        // Clear existing timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        
        // Set new timeout to prevent excessive loading (increased to 1 second)
        this.loadingTimeout = setTimeout(() => {
            console.log('Loading toilet data (debounced)...');
            this.loadToiletData();
        }, 1000); // Wait 1 second after map stops moving
    }

    async loadToiletData() {
        try {
            console.log('=== Loading Toilet Data for Current Map View ===');
            
            // Get current map bounds
            const bounds = this.map.getBounds();
            const mapBounds = {
                south: bounds.getSouth(),
                north: bounds.getNorth(),
                west: bounds.getWest(),
                east: bounds.getEast()
            };
            
            console.log('Map bounds:', mapBounds);
            
            let newToilets = [];
            
            if (window.DataLoader) {
                console.log('DataLoader available, fetching OpenStreetMap data for current view...');
                const dataLoader = new DataLoader();
                const osmData = await dataLoader.fetchOpenStreetMapData(mapBounds);
                newToilets = osmData;
                console.log(`Loaded ${newToilets.length} toilets from OpenStreetMap for current view`);
                
                // If OSM fails, try to use any cached data first
                if (newToilets.length === 0) {
                    console.log('No OSM data, checking for cached data...');
                    newToilets = this.getSampleDataInBounds(mapBounds);
                    console.log(`Using ${newToilets.length} sample toilets in bounds`);
                }
            } else {
                console.log('DataLoader not available, using sample data in bounds');
                newToilets = this.getSampleDataInBounds(mapBounds);
                console.log(`Using ${newToilets.length} sample toilets in bounds`);
            }
            
            // Always update if we have data (new or cached)
            if (newToilets.length > 0) {
                this.toilets = newToilets;
                console.log('Final toilets array:', this.toilets);
                if (this.toilets.length > 0) {
                    console.log('Sample toilet:', this.toilets[0]);
                }
                
                this.displayToilets();
                this.updateAllToiletRatings();
                this.updateToiletList();
            } else {
                console.log('No toilets found in current bounds, keeping existing data');
                // Only show notification if we have no toilets at all
                if (this.toilets.length === 0) {
                    this.showNotification('No toilets found in this area. Try moving the map.', 'info');
                }
            }
            
        } catch (error) {
            console.error('Error loading toilet data:', error);
            console.log('Falling back to sample data due to error');
            const bounds = this.map.getBounds();
            this.toilets = this.getSampleDataInBounds({
                south: bounds.getSouth(),
                north: bounds.getNorth(),
                west: bounds.getWest(),
                east: bounds.getEast()
            });
            this.displayToilets();
            this.updateToiletList();
        }
    }

    getSampleDataInBounds(bounds) {
        const allSampleData = this.getSampleData();
        return allSampleData.filter(toilet => 
            toilet.lat >= bounds.south && 
            toilet.lat <= bounds.north && 
            toilet.lng >= bounds.west && 
            toilet.lng <= bounds.east
        );
    }

    getSampleData() {
        return [
            {
                id: 'sample_1',
                name: "Flinders Street Station",
                lat: -37.8183,
                lng: 144.9671,
                address: "Flinders Street, Melbourne VIC 3000",
                wheelchairAccessible: true,
                babyChange: true,
                freeAccess: true,
                openingHours: "24/7",
                facilities: ["Wheelchair Accessible", "Baby Change", "Free Access"],
                dataSource: 'Sample'
            },
            {
                id: 'sample_2',
                name: "Melbourne Central",
                lat: -37.8099,
                lng: 144.9621,
                address: "La Trobe Street, Melbourne VIC 3000",
                wheelchairAccessible: true,
                babyChange: true,
                freeAccess: true,
                openingHours: "Shopping hours",
                facilities: ["Wheelchair Accessible", "Baby Change", "Free Access"],
                dataSource: 'Sample'
            },
            {
                id: 'sample_3',
                name: "Federation Square",
                lat: -37.8170,
                lng: 144.9695,
                address: "Swanston Street, Melbourne VIC 3000",
                wheelchairAccessible: true,
                babyChange: false,
                freeAccess: true,
                openingHours: "24/7",
                facilities: ["Wheelchair Accessible", "Free Access"],
                dataSource: 'Sample'
            },
            {
                id: 'sample_4',
                name: "Crown Casino",
                lat: -37.8236,
                lng: 144.9580,
                address: "Whiteman Street, Southbank VIC 3006",
                wheelchairAccessible: true,
                babyChange: true,
                freeAccess: true,
                openingHours: "24/7",
                facilities: ["Wheelchair Accessible", "Baby Change", "Free Access"],
                dataSource: 'Sample'
            },
            {
                id: 'sample_5',
                name: "Southern Cross Station",
                lat: -37.8183,
                lng: 144.9525,
                address: "Spencer Street, Melbourne VIC 3000",
                wheelchairAccessible: true,
                babyChange: true,
                freeAccess: true,
                openingHours: "24/7",
                facilities: ["Wheelchair Accessible", "Baby Change", "Free Access"],
                dataSource: 'Sample'
            }
        ];
    }

    displayToilets(toilets = null) {
        // Clear existing markers
        this.toiletMarkers.forEach(marker => this.map.removeLayer(marker));
        this.toiletMarkers = [];

        const toiletsToDisplay = toilets || this.toilets;

        // Create default toilet icon (smaller, green)
        const defaultIcon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;background:#3d6b4f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;">🚽</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
        });

        // Create selected toilet icon (orange)
        const selectedIcon = L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;background:#c85a3a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">🚽</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18]
        });

        toiletsToDisplay.forEach(toilet => {
            // Use selected icon if this toilet is currently selected
            const icon = (this.selectedToilet && this.selectedToilet.id === toilet.id) ? selectedIcon : defaultIcon;
            
            const marker = L.marker([toilet.lat, toilet.lng], { icon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="min-width: 280px; font-family: 'DM Sans', sans-serif;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 4px 0; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 16px; color: #2c1f0e;">${toilet.name}</h3>
                                <p style="margin: 0; color: #6b5e48; font-size: 13px; line-height: 1.3;">${toilet.address}</p>
                            </div>
                            <div style="text-align: right; margin-left: 12px;">
                                <div style="font-size: 12px; color: #6b5e48; margin-bottom: 2px;">${toilet.rating ? `${toilet.rating.toFixed(1)}` : 'No rating'}</div>
                                <div style="color: #d4a017; font-size: 14px;">${this.generateRatingStars(toilet.rating || 0)}</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;">
                            ${toilet.wheelchairAccessible ? '<span style="background: #eaf2ed; color: #3d6b4f; padding: 2px 6px; border-radius: 4px; font-size: 11px;">♿ Wheelchair</span>' : ''}
                            ${toilet.babyChange ? '<span style="background: #fce4ec; color: #c85a3a; padding: 2px 6px; border-radius: 4px; font-size: 11px;">👶 Baby Change</span>' : ''}
                            ${toilet.freeAccess ? '<span style="background: #fff9c4; color: #f57f17; padding: 2px 6px; border-radius: 4px; font-size: 11px;">🆓 Free</span>' : ''}
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button onclick="app.openReviewModal('${toilet.id}')" style="background: #3d6b4f; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; flex: 1;">Review</button>
                            <button onclick="app.getDirections(${toilet.lat}, ${toilet.lng})" style="background: #d4a017; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; flex: 1;">🧭 Directions</button>
                        </div>
                    </div>
                `);

            marker.on('click', () => {
                this.selectToilet(toilet);
                // Update only the clicked marker's icon instead of refreshing all markers
                const newIcon = selectedIcon;
                marker.setIcon(newIcon);
                
                // Reset other markers to default icon
                this.toiletMarkers.forEach(otherMarker => {
                    if (otherMarker !== marker) {
                        otherMarker.setIcon(defaultIcon);
                    }
                });
            });

            this.toiletMarkers.push(marker);
        });
    }

    selectToilet(toilet) {
        this.selectedToilet = toilet;
        
        // Update selected state in UI
        document.querySelectorAll('.toilet-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Find and highlight the selected card
        const cards = document.querySelectorAll('.toilet-card');
        cards.forEach(card => {
            if (card.onclick && card.onclick.toString().includes(toilet.lat) && card.onclick.toString().includes(toilet.lng)) {
                card.classList.add('selected');
            }
        });
    }

    getDirections(lat, lng) {
        // Open Google Maps with directions from user's current location to the toilet
        if (this.userLocation) {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${this.userLocation.lat},${this.userLocation.lng}&destination=${lat},${lng}&travelmode=walking`;
            window.open(url, '_blank');
        } else {
            // If no user location, just open the toilet location
            const url = `https://www.google.com/maps/?api=1&destination=${lat},${lng}`;
            window.open(url, '_blank');
            this.showNotification('Enable location for turn-by-turn directions', 'info');
        }
    }

    updateToiletList(filteredToilets = null) {
        const toiletList = document.getElementById('toiletList');
        const resultCount = document.getElementById('resultCount');
        if (!toiletList) return;

        const toiletsToDisplay = filteredToilets || this.toilets;

        // Update result count
        if (resultCount) {
            resultCount.textContent = `${toiletsToDisplay.length} toilets found`;
        }

        if (toiletsToDisplay.length === 0) {
            toiletList.innerHTML = '<div class="text-center py-8 text-gray-500">No toilets found matching your criteria.</div>';
            return;
        }

        toiletList.innerHTML = toiletsToDisplay.map(toilet => {
            // Calculate distance from user location or map center
            let distance = null;
            let referencePoint = null;
            
            console.log('Calculating distance for toilet:', toilet.name);
            console.log('User location:', this.userLocation);
            
            if (this.userLocation) {
                distance = this.calculateDistance(this.userLocation.lat, this.userLocation.lng, toilet.lat, toilet.lng);
                referencePoint = 'your location';
                console.log('Distance from user:', distance);
            } else {
                // Use map center as reference point
                const mapCenter = this.map.getCenter();
                distance = this.calculateDistance(mapCenter.lat, mapCenter.lng, toilet.lat, toilet.lng);
                referencePoint = 'map center';
                console.log('Distance from map center:', distance);
                console.log('Map center:', mapCenter);
            }

            const ratingStars = this.generateRatingStars(toilet.rating || 0);
            const ratingText = toilet.rating ? `${toilet.rating.toFixed(1)} ${ratingStars}` : 'No rating';

            const distanceDisplay = distance ? `${distance.toFixed(1)}km away` : '';
            console.log('Distance display:', distanceDisplay);

            return `
                <div class="toilet-card" onclick="app.focusToilet(${toilet.lat}, ${toilet.lng})">
                    <div class="toilet-card-top">
                        <div class="toilet-name">${toilet.name}</div>
                        ${distanceDisplay ? `<div class="toilet-dist">${distanceDisplay}</div>` : ''}
                    </div>
                    <div class="toilet-tags">
                        ${toilet.wheelchairAccessible ? '<div class="tag green">♿ Wheelchair</div>' : ''}
                        ${toilet.babyChange ? '<div class="tag pink">👶 Baby Change</div>' : ''}
                        ${toilet.freeAccess ? '<div class="tag yellow">🆓 Free</div>' : ''}
                        ${toilet.rating ? `<div class="tag blue">${ratingText}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    generateRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }
        if (hasHalfStar) {
            stars += '☆';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        return stars;
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.displayToilets();
            this.updateToiletList();
            return;
        }

        const filtered = this.toilets.filter(toilet => 
            toilet.name.toLowerCase().includes(query.toLowerCase()) ||
            toilet.address.toLowerCase().includes(query.toLowerCase())
        );

        this.displayToilets(filtered);
        this.updateToiletList(filtered);
    }

    toggleFilter(filterType, element) {
        this.filters[filterType] = !this.filters[filterType];
        
        if (this.filters[filterType]) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
        
        this.applyFilters();
    }

    applyFilters() {
        const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
        let filtered = this.toilets;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(toilet => 
                toilet.name.toLowerCase().includes(searchQuery) ||
                toilet.address.toLowerCase().includes(searchQuery)
            );
        }

        // Apply facility filters
        if (this.filters.wheelchairAccessible) {
            filtered = filtered.filter(toilet => toilet.wheelchairAccessible);
        }
        if (this.filters.babyChange) {
            filtered = filtered.filter(toilet => toilet.babyChange);
        }
        if (this.filters.freeAccess) {
            filtered = filtered.filter(toilet => toilet.freeAccess);
        }

        this.displayToilets(filtered);
        this.updateToiletList(filtered);
    }

    locateUser(silent = false) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    this.userLocation = { lat, lng };
                    
                    // Remove existing user marker
                    if (this.userMarker) {
                        this.map.removeLayer(this.userMarker);
                    }
                    
                    // Create user marker (same as aussie_loo_finder)
                    const userIcon = L.divIcon({
                        className: '',
                        html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.25);"></div>`,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    });
                    
                    this.userMarker = L.marker([lat, lng], { icon: userIcon })
                        .addTo(this.map)
                        .bindTooltip('You are here')
                        .openTooltip();
                    
                    this.map.setView([lat, lng], 14);
                    this.updateToiletList(); // Update distances from new user location
                    
                    if (!silent) {
                        this.showNotification('Location found!', 'success');
                    }
                },
                (error) => {
                    if (!silent) {
                        this.showNotification('Unable to get your location. Please check your browser settings.', 'error');
                    }
                }
            );
        } else {
            if (!silent) {
                this.showNotification('Geolocation is not supported by your browser.', 'error');
            }
        }
    }

    focusToilet(lat, lng) {
        this.map.setView([lat, lng], 16);
        
        // Find and select the toilet
        const toilet = this.toilets.find(t => 
            Math.abs(t.lat - lat) < 0.0001 && Math.abs(t.lng - lng) < 0.0001
        );
        if (toilet) {
            this.selectToilet(toilet);
        }
    }

    openReviewModal(toiletId) {
        this.selectedToilet = this.toilets.find(t => t.id === toiletId);
        if (this.selectedToilet) {
            document.getElementById('reviewModal').classList.add('active');
            this.resetReviewForm();
        }
    }

    closeReviewModal() {
        document.getElementById('reviewModal').classList.remove('active');
        this.selectedToilet = null;
        this.resetReviewForm();
    }

    resetReviewForm() {
        document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
        document.getElementById('reviewText').value = '';
        this.currentRating = 0;
    }

    setRating(rating) {
        this.currentRating = rating;
        document.querySelectorAll('.star').forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    submitReview() {
        if (!this.selectedToilet || this.currentRating === 0) {
            this.showNotification('Please select a rating', 'error');
            return;
        }

        const reviewText = document.getElementById('reviewText').value.trim();
        
        // Create review
        const review = {
            id: Date.now().toString(),
            rating: this.currentRating,
            comment: reviewText,
            timestamp: new Date().toISOString(),
            toiletId: this.selectedToilet.id,
            toiletName: this.selectedToilet.name
        };

        // Add to reviews
        if (!this.reviews[this.selectedToilet.id]) {
            this.reviews[this.selectedToilet.id] = [];
        }
        this.reviews[this.selectedToilet.id].push(review);

        // Update toilet rating
        this.updateToiletRating(this.selectedToilet.id);

        // Save reviews
        this.saveReviewsToFile();

        // Close modal and show success
        this.closeReviewModal();
        this.showNotification('Review submitted successfully!', 'success');
    }

    updateToiletRating(toiletId) {
        const toiletReviews = this.reviews[toiletId] || [];
        if (toiletReviews.length === 0) return;
        
        const averageRating = toiletReviews.reduce((sum, review) => sum + review.rating, 0) / toiletReviews.length;
        const toilet = this.toilets.find(t => t.id === toiletId);
        if (toilet) {
            toilet.rating = Math.round(averageRating * 10) / 10;
        }
    }

    updateAllToiletRatings() {
        this.toilets.forEach(toilet => {
            this.updateToiletRating(toilet.id);
        });
    }

    async loadReviewsFromStorage() {
        try {
            // Try to load from GitHub first
            const response = await fetch('https://raw.githubusercontent.com/asenang/loo-location/main/reviews/reviews.json');
            if (response.ok) {
                const content = await response.text();
                const reviewsData = JSON.parse(content);
                this.reviews = reviewsData.reviews || {};
                console.log('Reviews loaded from GitHub');
                return;
            }
        } catch (error) {
            console.log('GitHub not available, using localStorage');
        }

        // Fallback to localStorage
        const storedReviews = localStorage.getItem('looFinderReviews');
        if (storedReviews) {
            this.reviews = JSON.parse(storedReviews);
            console.log('Reviews loaded from localStorage');
        } else {
            this.reviews = {};
        }
    }

    async saveReviewsToFile() {
        try {
            // Save to localStorage
            localStorage.setItem('looFinderReviews', JSON.stringify(this.reviews));
            
            // Also save to GitHub if possible (this would require server-side code)
            console.log('Reviews saved to localStorage');
            
        } catch (error) {
            console.error('Error saving reviews:', error);
            this.showNotification('Error saving reviews', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle'
                } mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LooFinder();
});
