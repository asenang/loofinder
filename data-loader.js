// Real Data Integration for LooFinder
class DataLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache (increased from 30 seconds)
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // Minimum 2 seconds between requests
    }

    // OpenStreetMap Overpass API Integration
    async fetchOpenStreetMapData(bounds = null) {
        // Create cache key based on bounds to cache different areas
        const boundsKey = bounds ? `${bounds.south}_${bounds.west}_${bounds.north}_${bounds.east}` : 'melbourne_default';
        const cacheKey = `osm_data_${boundsKey}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('Using cached OSM data for bounds:', boundsKey);
            return cached;
        }

        // Rate limiting - check if enough time has passed since last request
        const now = Date.now();
        if (now - this.lastRequestTime < this.minRequestInterval) {
            console.log(`Rate limiting: waiting ${this.minRequestInterval - (now - this.lastRequestTime)}ms before next request`);
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - (now - this.lastRequestTime)));
        }

        // Melbourne bounds if not provided
        const melbourneBounds = bounds || {
            south: -38.0,
            north: -37.7,
            west: 144.8,
            east: 145.0
        };

        const overpassQuery = `
            [out:json][timeout:25];
            (
                node["amenity"="toilets"](${melbourneBounds.south},${melbourneBounds.west},${melbourneBounds.north},${melbourneBounds.east});
                way["amenity"="toilets"](${melbourneBounds.south},${melbourneBounds.west},${melbourneBounds.north},${melbourneBounds.east});
                relation["amenity"="toilets"](${melbourneBounds.south},${melbourneBounds.west},${melbourneBounds.north},${melbourneBounds.east});
            );
            out body;
            >;
            out skel qt;
        `;

        try {
            console.log('Making OSM API request for bounds:', boundsKey);
            this.lastRequestTime = Date.now();
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: 'data=' + encodeURIComponent(overpassQuery),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('Rate limited by OSM API, falling back to sample data');
                    return [];
                }
                if (response.status === 504 || response.status >= 500) {
                    console.warn('OSM API server error, falling back to sample data');
                    return [];
                }
                throw new Error(`OpenStreetMap API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const toilets = this.parseOpenStreetMapData(data);
            
            this.setCache(cacheKey, toilets);
            console.log(`Successfully loaded ${toilets.length} toilets from OSM`);
            return toilets;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('OSM API request timed out, falling back to sample data');
            } else {
                console.error('Error fetching OpenStreetMap data:', error);
            }
            // Return empty array instead of throwing to allow fallback to sample data
            return [];
        }
    }

    parseOpenStreetMapData(osmData) {
        const toilets = [];
        const elements = osmData.elements || [];

        elements.forEach(element => {
            if (element.type === 'node' && element.lat && element.lon) {
                const tags = element.tags || {};
                
                toilets.push({
                    id: `osm_${element.id}`,
                    name: tags.name || this.generateNameFromLocation(element.lat, element.lon),
                    lat: element.lat,
                    lng: element.lon,
                    address: tags['addr:street'] || this.generateAddressFromLocation(element.lat, element.lon),
                    wheelchairAccessible: tags.wheelchair === 'yes',
                    babyChange: tags.changing_table === 'yes' || tags.diaper === 'yes',
                    freeAccess: tags.fee === 'no' || !tags.fee,
                    openingHours: tags.opening_hours || 'Unknown',
                    facilities: this.extractFacilities(tags),
                    dataSource: 'OpenStreetMap',
                    rawData: element
                });
            }
        });

        return toilets;
    }

    // Helper methods
    extractFacilities(tags) {
        const facilities = [];
        if (tags.wheelchair === 'yes') facilities.push('Wheelchair Accessible');
        if (tags.changing_table === 'yes' || tags.diaper === 'yes') facilities.push('Baby Change');
        if (tags.fee === 'no' || !tags.fee) facilities.push('Free Access');
        if (tags.unisex === 'yes') facilities.push('Unisex');
        if (tags.male === 'yes') facilities.push('Male');
        if (tags.female === 'yes') facilities.push('Female');
        return facilities;
    }

    generateNameFromLocation(lat, lng) {
        return `Public Toilet`;
    }

    generateAddressFromLocation(lat, lng) {
        return 'Melbourne, VIC';
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
}

// Export for use in main app
window.DataLoader = DataLoader;
