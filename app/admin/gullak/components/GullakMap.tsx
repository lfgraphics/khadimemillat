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
    const activeInfoWindowRef = useRef<any>(null)

    // Load Google Maps script
    useEffect(() => {
        const loadGoogleMaps = () => {
            // Check if Google Maps is already loaded
            if (window.google && window.google.maps) {
                setMapLoaded(true)
                return
            }

            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
            if (existingScript) {
                // Script already exists, wait for it to load
                existingScript.addEventListener('load', () => setMapLoaded(true))
                existingScript.addEventListener('error', () => setMapError('Failed to load Google Maps'))
                return
            }

            // Check if API key is available
            if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
                setMapError('Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
                return
            }

            const script = document.createElement('script')
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
            script.async = true
            script.defer = true
            script.onload = () => setMapLoaded(true)
            script.onerror = () => setMapError('Failed to load Google Maps. Please check your API key and internet connection.')
            document.head.appendChild(script)
        }

        loadGoogleMaps()
    }, [])

    // Initialize map when loaded
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return

        try {
            // Default center (Gorakhpur, UP)
            const defaultCenter = { lat: 26.7606, lng: 83.3732 }
            
            const map = new window.google.maps.Map(mapRef.current, {
                zoom: gullaks.length === 0 ? 12 : 10,
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

            // Add markers for each Gullak (if any)
            if (gullaks.length > 0) {
                gullaks.forEach((gullak) => {
                const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)
                const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG] 
                
                const marker = new window.google.maps.Marker({
                    position: { lat: latitude, lng: longitude },
                    map: map,
                    title: `${gullak.gullakId} - ${gullak.location.address}`,
                    zIndex: 10, // Higher priority than user location
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: gullak.status === 'active' ? '#10b981' : 
                                  gullak.status === 'maintenance' ? '#f59e0b' : 
                                  gullak.status === 'full' ? '#ef4444' : '#6b7280',
                        fillOpacity: 0.9,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    }
                })

                // Get status colors
                const statusColor = gullak.status === 'active' ? '#10b981' : 
                                   gullak.status === 'maintenance' ? '#f59e0b' : 
                                   gullak.status === 'full' ? '#ef4444' : '#6b7280'



                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div style="padding: 0; min-width: 280px; max-width: 320px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
                            ${gullak.image && gullak.image.trim() ? `
                                <div style="position: relative;">
                                    <img src="${gullak.image}" alt="${gullak.gullakId}" 
                                         style="width: 100%; height: 160px; object-fit: cover; display: block;" 
                                         onload="console.log('Image loaded successfully: ${gullak.image}')"
                                         onerror="console.log('Image failed to load: ${gullak.image}'); this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                    <div style="display: none; height: 160px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); align-items: center; justify-content: center; flex-direction: column;">
                                        <div style="font-size: 18px; font-weight: bold; color: #374151; margin-bottom: 8px;">${gullak.gullakId}</div>
                                        <div style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                            ${statusInfo.label}
                                        </div>
                                        <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Image: ${gullak.image}</div>
                                    </div>
                                    <div style="position: absolute; top: 8px; right: 8px;">
                                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            ${statusInfo.label}
                                        </span>
                                    </div>
                                </div>
                            ` : `
                                <div style="height: 96px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); display: flex; align-items: center; justify-content: center;">
                                    <div style="text-align: center;">
                                        <h3 style="font-weight: bold; font-size: 18px; color: #111827; margin: 0 0 8px 0;">${gullak.gullakId}</h3>
                                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                            ${statusInfo.label}
                                        </span>
                                    </div>
                                </div>
                            `}
                            
                            <div style="padding: 16px;">
                                ${gullak.image ? `
                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                        <h3 style="font-weight: bold; font-size: 18px; color: #111827; margin: 0;">${gullak.gullakId}</h3>
                                    </div>
                                ` : ''}
                                
                                <div style="margin-bottom: 16px;">
                                    <div style="margin-bottom: 12px;">
                                        <p style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">Address</p>
                                        <p style="font-size: 14px; color: #374151; line-height: 1.4; margin: 0;">
                                            ${gullak.location.address}
                                        </p>
                                    </div>
                                    ${gullak.location.landmark ? `
                                        <div style="margin-bottom: 12px;">
                                            <p style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">Landmark</p>
                                            <p style="font-size: 12px; color: #4b5563; margin: 0;">
                                                ${gullak.location.landmark}
                                            </p>
                                        </div>
                                    ` : ''}
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <div>
                                            <p style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">Caretaker</p>
                                            <p style="font-size: 12px; color: #4b5563; margin: 0 0 2px 0;">${gullak.caretaker.name}</p>
                                            ${gullak.caretaker.phone ? `<p style="font-size: 11px; color: #6b7280; margin: 0;">${gullak.caretaker.phone}</p>` : ''}
                                        </div>
                                        <div>
                                            <p style="font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">Statistics</p>
                                            <p style="font-size: 12px; color: #4b5563; margin: 0 0 2px 0;">${gullak.totalCollections || 0} collections</p>
                                            <p style="font-size: 12px; color: #4b5563; margin: 0;">₹${(gullak.totalAmountCollected || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                                    <button 
                                        onclick="window.open('https://www.google.com/maps?q=${latitude},${longitude}', '_blank')"
                                        style="flex: 1; background: #2563eb; color: white; font-size: 12px; padding: 10px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background-color 0.2s;"
                                        onmouseover="this.style.background='#1d4ed8'"
                                        onmouseout="this.style.background='#2563eb'"
                                    >
                                        View Location
                                    </button>
                                    <button 
                                        onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}', '_blank')"
                                        style="flex: 1; background: #059669; color: white; font-size: 12px; padding: 10px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background-color 0.2s;"
                                        onmouseover="this.style.background='#047857'"
                                        onmouseout="this.style.background='#059669'"
                                    >
                                        Get Directions
                                    </button>
                                </div>
                            </div>
                        </div>
                    `
                })

                marker.addListener('click', () => {
                    // Close any previously open info window
                    if (activeInfoWindowRef.current) {
                        activeInfoWindowRef.current.close()
                    }
                    
                    // Open new info window and store reference
                    infoWindow.open(map, marker)
                    activeInfoWindowRef.current = infoWindow
                    setSelectedGullak(gullak._id)
                })

                // Close info window when map is clicked
                map.addListener('click', () => {
                    if (activeInfoWindowRef.current) {
                        activeInfoWindowRef.current.close()
                        activeInfoWindowRef.current = null
                        setSelectedGullak(null)
                    }
                })
                })
            }

            // Try to get user location and center map
            getCurrentLocationAsGeoJSON()
                .then(location => {
                    setUserLocation(location)
                    const { latitude, longitude } = geoJSONToLatLng(location)
                    
                    // Add user location marker with lower zIndex (behind Gullaks)
                    new window.google.maps.Marker({
                        position: { lat: latitude, lng: longitude },
                        map: map,
                        title: 'Your Location',
                        zIndex: 1, // Lower priority than Gullaks
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 6,
                            fillColor: '#3b82f6',
                            fillOpacity: 0.8,
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
                    
                    // Fit map to show all Gullaks (if any exist)
                    if (gullaks.length > 0) {
                        const bounds = new window.google.maps.LatLngBounds()
                        gullaks.forEach(gullak => {
                            const { latitude, longitude } = geoJSONToLatLng(gullak.location.coordinates)
                            bounds.extend({ lat: latitude, lng: longitude })
                        })
                        map.fitBounds(bounds)
                    }
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
            {mapError ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
                    <h3 className="text-lg font-semibold mb-2 text-destructive">Map Error</h3>
                    <p className="text-muted-foreground mb-4">{mapError}</p>
                    {mapError.includes('API key') && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>For developers:</strong> Add your Google Maps API key to the environment variables:
                                <br />
                                <code className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-xs mt-1 inline-block">
                                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
                                </code>
                            </p>
                        </div>
                    )}
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
                        className="w-full h-[70svh] rounded-lg border border-border"
                        style={{ minHeight: '400px' }}
                    />
                    {gullaks.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                            <MapPin className="w-8 h-8 mx-auto mb-2" />
                            <p>No Gullaks to display. Map centered on Gorakhpur, UP.</p>
                        </div>
                    )}
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

            {/* Gullak List with Location Actions */}
            {gullaks.length > 0 && (
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
                    </CardContent>
                </Card>
            )}
        </div>
    )
}