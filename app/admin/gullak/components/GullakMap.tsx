'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, ExternalLink, Navigation, Phone, Loader2 } from 'lucide-react'
import { getGoogleMapsUrl, getDirectionsUrl, geoJSONToLatLng, getCurrentLocationAsGeoJSON } from '@/utils/geolocation'
import { GULLAK_STATUS_CONFIG } from '@/utils/gullak-constants'
import type { GeoJSONPoint } from '@/utils/geolocation'
import type { GullakType } from '@/types/gullak'

// Google Maps types
declare global {
    interface Window {
        google: any
        initMap: () => void
    }
}

interface GullakMapProps {
    gullaks: GullakType[]
}



export function GullakMap({ gullaks }: GullakMapProps) {
    const [userLocation, setUserLocation] = useState<GeoJSONPoint | null>(null)
    const [selectedGullak, setSelectedGullak] = useState<string | null>(null)
    const [nearestGullaks, setNearestGullaks] = useState<any[]>([])
    const [mapLoaded, setMapLoaded] = useState(false)
    const [mapError, setMapError] = useState<string | null>(null)
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<any>(null)

    // Load Google Maps script
    useEffect(() => {
        const loadGoogleMaps = () => {
            if (window.google) {
                setMapLoaded(true)
                return
            }

            const script = document.createElement('script')
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
            script.async = true
            script.defer = true
            script.onload = () => setMapLoaded(true)
            script.onerror = () => setMapError('Failed to load Google Maps')
            document.head.appendChild(script)
        }

        loadGoogleMaps()
    }, [])

    // Initialize map when loaded
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || gullaks.length === 0) return

        try {
            // Default center (India)
            const defaultCenter = { lat: 26.7606, lng: 83.3732 }
            
            const map = new window.google.maps.Map(mapRef.current, {
                zoom: 10,
                center: defaultCenter,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            })

            mapInstanceRef.current = map

            // Add markers for each Gullak
            gullaks.forEach((gullak) => {
                const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)
                const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG] 
                
                const marker = new window.google.maps.Marker({
                    position: { lat: latitude, lng: longitude },
                    map: map,
                    title: `${gullak.gullakId} - ${gullak.location.address}`,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: gullak.status === 'active' ? '#10b981' : 
                                  gullak.status === 'maintenance' ? '#f59e0b' : 
                                  gullak.status === 'full' ? '#ef4444' : '#6b7280',
                        fillOpacity: 0.8,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    }
                })

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div class="p-2 min-w-[200px]">
                            <h3 class="font-semibold text-sm mb-1">${gullak.gullakId}</h3>
                            <p class="text-xs text-gray-600 mb-2">${gullak.location.address}</p>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}">
                                    ${statusInfo.label}
                                </span>
                            </div>
                            <p class="text-xs text-gray-500">
                                Caretaker: ${gullak.caretaker.name}<br>
                                Collections: ${gullak.totalCollections} • ₹${gullak.totalAmountCollected.toLocaleString()}
                            </p>
                        </div>
                    `
                })

                marker.addListener('click', () => {
                    infoWindow.open(map, marker)
                    setSelectedGullak(gullak._id)
                })
            })

            // Try to get user location and center map
            getCurrentLocationAsGeoJSON()
                .then(location => {
                    setUserLocation(location)
                    const { latitude, longitude } = geoJSONToLatLng(location)
                    
                    // Add user location marker
                    new window.google.maps.Marker({
                        position: { lat: latitude, lng: longitude },
                        map: map,
                        title: 'Your Location',
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 6,
                            fillColor: '#3b82f6',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2
                        }
                    })

                    // Center map on user location
                    map.setCenter({ lat: latitude, lng: longitude })
                    map.setZoom(12)

                    // Calculate distances and find nearest
                    const gullaksWithDistance = gullaks.map(gullak => {
                        const distance = calculateDistance(location, gullak.location.coordinates)
                        return { ...gullak, distance }
                    }).sort((a, b) => a.distance - b.distance)
                    
                    setNearestGullaks(gullaksWithDistance.slice(0, 5))
                })
                .catch(() => {
                    // If location access fails, just show all gullaks
                    setNearestGullaks(gullaks)
                    
                    // Fit map to show all Gullaks
                    const bounds = new window.google.maps.LatLngBounds()
                    gullaks.forEach(gullak => {
                        const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)
                        bounds.extend({ lat: latitude, lng: longitude })
                    })
                    map.fitBounds(bounds)
                })

        } catch (error) {
            console.error('Error initializing map:', error)
            setMapError('Failed to initialize map')
        }
    }, [mapLoaded, gullaks])

    useEffect(() => {
        if (!userLocation) {
            // Try to get user's location for distance calculation
            getCurrentLocationAsGeoJSON()
                .then(location => {
                    setUserLocation(location)
                    // Calculate distances and find nearest
                    const gullaksWithDistance = gullaks.map(gullak => {
                        const distance = calculateDistance(location, gullak.location.coordinates)
                        return { ...gullak, distance }
                    }).sort((a, b) => a.distance - b.distance)
                    
                    setNearestGullaks(gullaksWithDistance.slice(0, 5))
                })
                .catch(() => {
                    // If location access fails, just show all gullaks
                    setNearestGullaks(gullaks)
                })
        }
    }, [gullaks, userLocation])

    // Simple distance calculation (Haversine formula)
    const calculateDistance = (point1: GeoJSONPoint, point2: GeoJSONPoint): number => {
        const R = 6371 // Earth's radius in km
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

    const openInGoogleMaps = (gullak: any) => {
        const url = getGoogleMapsUrl(gullak.location.coordinates)
        window.open(url, '_blank')
    }

    const getDirections = (gullak: any) => {
        if (userLocation) {
            const url = getDirectionsUrl(userLocation, gullak.location.coordinates)
            window.open(url, '_blank')
        } else {
            const url = getGoogleMapsUrl(gullak.location.coordinates)
            window.open(url, '_blank')
        }
    }

    return (
        <div className="space-y-6">
            {/* Interactive Google Map */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Gullak Locations Map
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {mapError ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
                            <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
                            <h3 className="text-lg font-semibold mb-2 text-destructive">Map Error</h3>
                            <p className="text-muted-foreground mb-4">{mapError}</p>
                            <Button variant="outline" onClick={() => {
                                const firstGullak = gullaks[0]
                                if (firstGullak) {
                                    openInGoogleMaps(firstGullak)
                                }
                            }}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View on Google Maps
                            </Button>
                        </div>
                    ) : !mapLoaded ? (
                        <div className="bg-muted/30 rounded-lg p-8 text-center">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                            <h3 className="text-lg font-semibold mb-2">Loading Map</h3>
                            <p className="text-muted-foreground">
                                Please wait while we load the interactive map...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div 
                                ref={mapRef} 
                                className="w-full h-96 rounded-lg border border-border"
                                style={{ minHeight: '400px' }}
                            />
                            <div className="flex flex-wrap gap-2 justify-center">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span>Active</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <span>Maintenance</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span>Full</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                    <span>Inactive</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span>Your Location</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gullak List with Location Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {userLocation ? 'Nearest Gullaks' : 'All Gullaks'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(nearestGullaks.length > 0 ? nearestGullaks : gullaks).map((gullak) => {
                            const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG]
                            const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)
                            
                            return (
                                <div 
                                    key={gullak._id}
                                    className={`p-4 rounded-lg border transition-colors ${
                                        selectedGullak === gullak._id 
                                            ? 'border-primary bg-primary/5' 
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold">{gullak.gullakId}</h3>
                                                <Badge 
                                                    variant="outline" 
                                                    className={`${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                                                >
                                                    {statusInfo.label}
                                                </Badge>
                                                {gullak.distance && (
                                                    <Badge variant="secondary">
                                                        {gullak.distance.toFixed(1)} km away
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                    <span>{gullak.location.address}</span>
                                                </p>
                                                {gullak.location.landmark && (
                                                    <p className="ml-6 text-xs">
                                                        Landmark: {gullak.location.landmark}
                                                    </p>
                                                )}
                                                <p className="flex items-center gap-2 ml-6">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{gullak.caretaker.name} - {gullak.caretaker.phone}</span>
                                                </p>
                                                <p className="ml-6 text-xs">
                                                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                                                </p>
                                                <p className="ml-6 text-xs">
                                                    {gullak.totalCollections} collections • ₹{gullak.totalAmountCollected?.toLocaleString() || 0}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openInGoogleMaps(gullak)}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-1" />
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => getDirections(gullak)}
                                            >
                                                <Navigation className="w-4 h-4 mr-1" />
                                                Directions
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    
                    {gullaks.length === 0 && (
                        <div className="text-center py-8">
                            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">No Gullaks found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}