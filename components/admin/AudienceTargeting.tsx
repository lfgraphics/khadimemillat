'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  MapPin, 
  Activity, 
  Save, 
  Trash2, 
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Filter
} from 'lucide-react'
// Simple debounce implementation to avoid lodash dependency
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export interface TargetingCriteria {
  roles: string[]
  locations?: string[]
  activityStatus?: 'active' | 'inactive' | 'new'
  customSegments?: string[]
  logic: 'AND' | 'OR'
  excludeOptedOut: boolean
}

export interface AudienceSegment {
  _id: string
  name: string
  description?: string
  criteria: TargetingCriteria
  userCount: number
  lastUpdated: Date
  createdBy: string
  isShared: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AudiencePreview {
  totalUsers: number
  effectiveAudience: number
  channelBreakdown: Record<string, number>
  demographics: {
    roles: Record<string, number>
    locations: Record<string, number>
    contactMethods: {
      email: number
      phone: number
    }
  }
  sampleUsers: Array<{
    id: string
    email?: string
    phone?: string
    role: string
    location?: string
    lastActive?: Date
  }>
}

interface AudienceTargetingProps {
  criteria: TargetingCriteria
  onCriteriaChange: (criteria: TargetingCriteria) => void
  previewCount: number
  channels?: string[]
  onPreviewUpdate?: (preview: AudiencePreview) => void
  className?: string
}

// Available roles and activity statuses
const AVAILABLE_ROLES = [
  { value: 'everyone', label: 'Everyone', description: 'All users regardless of role' },
  { value: 'admin', label: 'Administrators', description: 'System administrators' },
  { value: 'moderator', label: 'Moderators', description: 'Content moderators' },
  { value: 'scrapper', label: 'Scrappers', description: 'Field collection workers' },
  { value: 'user', label: 'Users', description: 'Regular platform users' }
]

const ACTIVITY_STATUSES = [
  { value: 'active', label: 'Active Users', description: 'Logged in within 30 days' },
  { value: 'inactive', label: 'Inactive Users', description: 'Not logged in for 30+ days' },
  { value: 'new', label: 'New Users', description: 'Registered within 7 days' }
]

// Common locations (this could be fetched from an API)
const COMMON_LOCATIONS = [
  'Gorakhpur', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 
  'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Ghaziabad'
]

export default function AudienceTargeting({
  criteria,
  onCriteriaChange,
  previewCount,
  channels = [],
  onPreviewUpdate,
  className = ''
}: AudienceTargetingProps) {
  const [segments, setSegments] = useState<AudienceSegment[]>([])
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [showSaveSegment, setShowSaveSegment] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [filteredLocations, setFilteredLocations] = useState(COMMON_LOCATIONS)

  // Debounced preview update
  const debouncedPreviewUpdate = useCallback(
    debounce(async (targetingCriteria: TargetingCriteria, selectedChannels: string[]) => {
      if (targetingCriteria.roles.length === 0) return

      setIsLoadingPreview(true)
      try {
        const response = await fetch('/api/admin/notifications/audience/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria: targetingCriteria,
            channels: selectedChannels,
            excludeOptedOut: targetingCriteria.excludeOptedOut
          })
        })

        if (response.ok) {
          const result = await response.json()
          setPreview(result.data)
          onPreviewUpdate?.(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch audience preview:', error)
      } finally {
        setIsLoadingPreview(false)
      }
    }, 500),
    [onPreviewUpdate]
  )

  // Load audience segments
  const loadSegments = async () => {
    setIsLoadingSegments(true)
    try {
      const response = await fetch('/api/admin/notifications/audience/segments')
      if (response.ok) {
        const result = await response.json()
        setSegments(result.data.segments || [])
      }
    } catch (error) {
      console.error('Failed to load segments:', error)
    } finally {
      setIsLoadingSegments(false)
    }
  }

  // Update criteria
  const updateCriteria = (updates: Partial<TargetingCriteria>) => {
    const newCriteria = { ...criteria, ...updates }
    onCriteriaChange(newCriteria)
  }

  // Handle role selection
  const handleRoleToggle = (role: string) => {
    const newRoles = criteria.roles.includes(role)
      ? criteria.roles.filter(r => r !== role)
      : [...criteria.roles, role]
    
    // If 'everyone' is selected, clear other roles
    if (role === 'everyone' && !criteria.roles.includes('everyone')) {
      updateCriteria({ roles: ['everyone'] })
    } else if (newRoles.includes('everyone') && role !== 'everyone') {
      // If other role is selected while 'everyone' is active, remove 'everyone'
      updateCriteria({ roles: newRoles.filter(r => r !== 'everyone') })
    } else {
      updateCriteria({ roles: newRoles })
    }
  }

  // Handle location management
  const addLocation = (location: string) => {
    if (location && !criteria.locations?.includes(location)) {
      updateCriteria({
        locations: [...(criteria.locations || []), location]
      })
      setLocationInput('')
    }
  }

  const removeLocation = (location: string) => {
    updateCriteria({
      locations: criteria.locations?.filter(l => l !== location) || []
    })
  }

  // Filter locations based on input
  useEffect(() => {
    if (locationInput) {
      const filtered = COMMON_LOCATIONS.filter(location =>
        location.toLowerCase().includes(locationInput.toLowerCase())
      )
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(COMMON_LOCATIONS)
    }
  }, [locationInput])

  // Update preview when criteria or channels change
  useEffect(() => {
    debouncedPreviewUpdate(criteria, channels)
  }, [criteria, channels, debouncedPreviewUpdate])

  // Load segments on mount
  useEffect(() => {
    loadSegments()
  }, [])

  // Save segment
  const saveSegment = async () => {
    if (!newSegmentName.trim()) return

    try {
      const response = await fetch('/api/admin/notifications/audience/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegmentName,
          criteria,
          isShared: true
        })
      })

      if (response.ok) {
        setNewSegmentName('')
        setShowSaveSegment(false)
        loadSegments()
      }
    } catch (error) {
      console.error('Failed to save segment:', error)
    }
  }

  // Load segment
  const loadSegment = (segment: AudienceSegment) => {
    onCriteriaChange(segment.criteria)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Saved Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Saved Audience Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSegments ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading segments...
            </div>
          ) : segments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No saved segments found. Create targeting criteria below to save your first segment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {segments.map(segment => (
                <div
                  key={segment._id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => loadSegment(segment)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{segment.name}</h4>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {segment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {segment.userCount.toLocaleString()} users
                        </Badge>
                        {segment.isShared && (
                          <Badge variant="outline" className="text-xs">
                            Shared
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Targeting Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Targeting Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logic Selector */}
          <div className="space-y-2">
            <Label>Criteria Logic</Label>
            <Select
              value={criteria.logic}
              onValueChange={(value: 'AND' | 'OR') => updateCriteria({ logic: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND - All criteria must match</SelectItem>
                <SelectItem value="OR">OR - Any criteria can match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Roles *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_ROLES.map(role => (
                <div
                  key={role.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    criteria.roles.includes(role.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleRoleToggle(role.value)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={criteria.roles.includes(role.value)}
                      onChange={() => handleRoleToggle(role.value)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{role.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {role.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {criteria.roles.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one role to target.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Location Targeting */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Target Locations (Optional)
            </Label>
            
            {/* Location Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Type location name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationInput.trim()) {
                      addLocation(locationInput.trim())
                    }
                  }}
                />
                {locationInput && filteredLocations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredLocations.map(location => (
                      <div
                        key={location}
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => addLocation(location)}
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => locationInput.trim() && addLocation(locationInput.trim())}
                disabled={!locationInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Locations */}
            {criteria.locations && criteria.locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {criteria.locations.map(location => (
                  <Badge
                    key={location}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {location}
                    <button
                      onClick={() => removeLocation(location)}
                      className="ml-1 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Activity Status */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Status (Optional)
            </Label>
            <Select
              value={criteria.activityStatus || ''}
              onValueChange={(value) => 
                updateCriteria({ 
                  activityStatus: value as 'active' | 'inactive' | 'new' | undefined || undefined 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Users</SelectItem>
                {ACTIVITY_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    <div>
                      <div className="font-medium">{status.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {status.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preferences */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeOptedOut"
                checked={criteria.excludeOptedOut}
                onCheckedChange={(checked) => 
                  updateCriteria({ excludeOptedOut: !!checked })
                }
              />
              <Label htmlFor="excludeOptedOut" className="text-sm">
                Exclude users who have opted out of notifications
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audience Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Audience Preview
            </div>
            {isLoadingPreview && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criteria.roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select targeting criteria to see audience preview</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {preview.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {preview.effectiveAudience.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Can Receive</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {preview.demographics.contactMethods.email.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Email</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {preview.demographics.contactMethods.phone.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Phone</div>
                </div>
              </div>

              {/* Channel Breakdown */}
              {channels.length > 0 && Object.keys(preview.channelBreakdown).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Channel Reach</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(preview.channelBreakdown).map(([channel, count]) => (
                      <div key={channel} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm capitalize">{channel.replace('_', ' ')}</span>
                        <Badge variant="outline">{count.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role Breakdown */}
                {Object.keys(preview.demographics.roles).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">By Role</h4>
                    <div className="space-y-1">
                      {Object.entries(preview.demographics.roles).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{role}</span>
                          <Badge variant="outline">{count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Breakdown */}
                {Object.keys(preview.demographics.locations).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">By Location</h4>
                    <div className="space-y-1">
                      {Object.entries(preview.demographics.locations).slice(0, 5).map(([location, count]) => (
                        <div key={location} className="flex items-center justify-between text-sm">
                          <span>{location}</span>
                          <Badge variant="outline">{count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Loading audience preview...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Segment */}
      {criteria.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Audience Segment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showSaveSegment ? (
              <Button
                variant="outline"
                onClick={() => setShowSaveSegment(true)}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current Targeting as Segment
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                    placeholder="Enter segment name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSegmentName.trim()) {
                        saveSegment()
                      }
                    }}
                  />
                  <Button onClick={saveSegment} disabled={!newSegmentName.trim()}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSaveSegment(false)
                      setNewSegmentName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This segment will be shared with other admins and moderators.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}