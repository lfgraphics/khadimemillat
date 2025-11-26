// Utility functions for geolocation and GeoJSON handling

export interface GeoJSONPoint {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
}

export interface LatLng {
    latitude: number
    longitude: number
}

/**
 * Convert latitude/longitude to GeoJSON Point format
 */
export function latLngToGeoJSON(lat: number, lng: number): GeoJSONPoint {
    return {
        type: 'Point',
        coordinates: [lng, lat] // longitude first, latitude second
    }
}

/**
 * Convert GeoJSON Point to latitude/longitude object
 */
export function geoJSONToLatLng(geoJSON: GeoJSONPoint): LatLng {
    return {
        longitude: geoJSON.coordinates[0],
        latitude: geoJSON.coordinates[1]
    }
}

/**
 * Calculate distance between two GeoJSON points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(point1: GeoJSONPoint, point2: GeoJSONPoint): number {
    const R = 6371 // Earth's radius in kilometers
    
    const lat1 = point1.coordinates[1] * Math.PI / 180
    const lat2 = point2.coordinates[1] * Math.PI / 180
    const deltaLat = (point2.coordinates[1] - point1.coordinates[1]) * Math.PI / 180
    const deltaLng = (point2.coordinates[0] - point1.coordinates[0]) * Math.PI / 180

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
}

/**
 * Find nearest Gullaks to a given point
 */
export function findNearestGullaks(
    userLocation: GeoJSONPoint, 
    gullaks: Array<{ location: { coordinates: GeoJSONPoint } }>,
    limit: number = 5
) {
    return gullaks
        .map(gullak => ({
            ...gullak,
            distance: calculateDistance(userLocation, gullak.location.coordinates)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
}

/**
 * Get user's current location as GeoJSON Point
 */
export function getCurrentLocationAsGeoJSON(): Promise<GeoJSONPoint> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(latLngToGeoJSON(
                    position.coords.latitude,
                    position.coords.longitude
                ))
            },
            (error) => {
                reject(error)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        )
    })
}

/**
 * Validate GeoJSON Point coordinates
 */
export function isValidGeoJSONPoint(point: any): point is GeoJSONPoint {
    return (
        point &&
        point.type === 'Point' &&
        Array.isArray(point.coordinates) &&
        point.coordinates.length === 2 &&
        typeof point.coordinates[0] === 'number' &&
        typeof point.coordinates[1] === 'number' &&
        point.coordinates[0] >= -180 && point.coordinates[0] <= 180 && // longitude
        point.coordinates[1] >= -90 && point.coordinates[1] <= 90      // latitude
    )
}

/**
 * Generate Google Maps URL for a GeoJSON point
 */
export function getGoogleMapsUrl(point: GeoJSONPoint, zoom: number = 15): string {
    const [lng, lat] = point.coordinates
    return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}`
}

/**
 * Generate directions URL between two points
 */
export function getDirectionsUrl(from: GeoJSONPoint, to: GeoJSONPoint): string {
    const [fromLng, fromLat] = from.coordinates
    const [toLng, toLat] = to.coordinates
    return `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`
}