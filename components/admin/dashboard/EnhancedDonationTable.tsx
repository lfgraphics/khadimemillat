"use client"

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, ChevronRight, Archive, CheckCircle } from 'lucide-react'
import { DonationRow } from '@/types/dashboard'
import { useResponsiveBreakpoint, TOUCH_TARGETS } from '@/lib/utils/responsive'
import { generateAriaLabel, keyboardNavigation } from '@/lib/utils/accessibility'

interface EnhancedDonationTableProps {
  rows: DonationRow[]
  loading: boolean
  onViewDetails: (id: string) => void
  selectedId?: string | null
  onQuickAction?: (id: string, action: 'archive' | 'complete') => void
}

interface SwipeableCardProps {
  row: DonationRow
  onViewDetails: (id: string) => void
  onQuickAction?: (id: string, action: 'archive' | 'complete') => void
  loading: boolean
  selectedId?: string | null
}

// Custom hook for swipe gestures
function useSwipeGesture(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
    setIsDragging(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || !isDragging) return

    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }

    const deltaX = currentTouch.x - touchStart.x
    const deltaY = Math.abs(currentTouch.y - touchStart.y)

    // Only allow horizontal swipes (prevent vertical scroll interference)
    if (deltaY < 30) {
      e.preventDefault()
      setDragOffset(Math.max(-120, Math.min(0, deltaX)))
    }
  }, [touchStart, isDragging])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !isDragging) return

    setIsDragging(false)

    if (dragOffset < -minSwipeDistance) {
      onSwipeLeft?.()
      setDragOffset(-120)
    } else {
      setDragOffset(0)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, isDragging, dragOffset, onSwipeLeft, minSwipeDistance])

  const resetSwipe = useCallback(() => {
    setDragOffset(0)
    setIsDragging(false)
  }, [])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    dragOffset,
    isDragging,
    resetSwipe
  }
}

// Swipeable card component for mobile
function SwipeableCard({ row, onViewDetails, onQuickAction, loading, selectedId }: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  const handleSwipeLeft = useCallback(() => {
    setIsRevealed(true)
  }, [])

  const { onTouchStart, onTouchMove, onTouchEnd, dragOffset, resetSwipe } = useSwipeGesture(handleSwipeLeft)

  const handleQuickAction = (action: 'archive' | 'complete') => {
    if (onQuickAction) {
      onQuickAction(row.id, action)
    }
    setIsRevealed(false)
    resetSwipe()
  }

  const handleViewDetails = () => {
    if (isRevealed) {
      setIsRevealed(false)
      resetSwipe()
    } else {
      onViewDetails(row.id)
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-card hover-lift transition-all duration-300 group focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      role="article"
      aria-label={`Donation from ${row.donor?.name || 'Unknown donor'}`}
    >
      {/* Action buttons revealed on swipe */}
      <div
        className="absolute right-0 top-0 h-full flex items-center bg-muted/50 backdrop-blur-sm transition-all duration-300"
        role="group"
        aria-label="Quick actions"
      >
        <Button
          size="sm"
          variant="ghost"
          className={`${TOUCH_TARGETS.comfortable} h-full rounded-none px-4 text-blue-600 hoact:bg-blue-50 dark:hoact:bg-blue-900/20 button-press transition-all duration-200`}
          onClick={() => handleQuickAction('complete')}
          aria-label={generateAriaLabel('Mark as complete', row.donor?.name || 'donation', 'button', 'Click to mark donation as complete')}
        >
          <CheckCircle className="h-5 w-5 transition-transform duration-200 hoact:scale-110" aria-hidden="true" />
          <span className="sr-only">Mark as complete</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`${TOUCH_TARGETS.comfortable} h-full rounded-none px-4 text-orange-600 hoact:bg-orange-50 dark:hoact:bg-orange-900/20 button-press transition-all duration-200`}
          onClick={() => handleQuickAction('archive')}
          aria-label={generateAriaLabel('Archive', row.donor?.name || 'donation', 'button', 'Click to archive donation')}
        >
          <Archive className="h-5 w-5 transition-transform duration-200 hoact:scale-110" aria-hidden="true" />
          <span className="sr-only">Archive</span>
        </Button>
      </div>

      {/* Main card content */}
      <div
        className="bg-card transition-all duration-200 ease-out touch-manipulation hoact:bg-muted/20"
        style={{ transform: `translateX(${dragOffset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-foreground truncate text-base"
                id={`donation-${row.id}-title`}
              >
                {row.donor?.name || row.donor?.id || 'Unknown'}
              </h3>
              {row.donor?.email && (
                <p
                  className="text-sm text-muted-foreground truncate mt-1"
                  id={`donation-${row.id}-email`}
                >
                  {row.donor.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Button
                size="sm"
                variant="ghost"
                className={`${TOUCH_TARGETS.comfortable} p-2 button-press transition-all duration-200 hoact:bg-muted`}
                onClick={handleViewDetails}
                disabled={loading && selectedId === row.id}
                aria-label={generateAriaLabel('View details', row.donor?.name || 'donation', 'button', 'Click to view donation details')}
                aria-describedby={`donation-${row.id}-title`}
              >
                {loading && selectedId === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 hoact:translate-x-1" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {loading && selectedId === row.id ? 'Loading details' : 'View details'}
                </span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2" role="group" aria-label="Donation status and item count">
              <Badge
                variant="outline"
                className="text-xs capitalize"
                aria-label={generateAriaLabel(row.status || 'Unknown', 'donation status', 'badge')}
              >
                {row.status || 'Unknown'}
              </Badge>
              <span
                className="text-muted-foreground"
                aria-label={`${row.itemsCount || 0} items in this donation`}
              >
                {row.itemsCount || 0} items
              </span>
            </div>

            {row.createdAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {(row.validItemsCount !== undefined || row.invalidItemsCount !== undefined) && (
            <div
              className="flex items-center gap-3 text-xs"
              role="group"
              aria-label="Item validation status"
            >
              {row.validItemsCount !== undefined && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></div>
                  <span
                    className="text-green-600 font-medium"
                    aria-label={`${row.validItemsCount} valid items`}
                  >
                    {row.validItemsCount} valid
                  </span>
                </div>
              )}
              {row.invalidItemsCount !== undefined && row.invalidItemsCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true"></div>
                  <span
                    className="text-red-600 font-medium"
                    aria-label={`${row.invalidItemsCount} invalid items`}
                  >
                    {row.invalidItemsCount} invalid
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Swipe hint */}
          {!isRevealed && dragOffset === 0 && (
            <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground animate-pulse opacity-0 group-hoact:opacity-100 transition-opacity duration-300">
              <span>Swipe left for actions</span>
              <ChevronRight className="h-3 w-3 ml-1 animate-wiggle" />
            </div>
          )}
        </CardContent>
      </div>
    </div>
  )
}

export default function EnhancedDonationTable({
  rows,
  loading,
  onViewDetails,
  selectedId,
  onQuickAction
}: EnhancedDonationTableProps) {
  const breakpoint = useResponsiveBreakpoint()
  const isMobile = breakpoint === 'mobile'

  if (isMobile) {
    // Mobile card layout with swipe actions
    return (
      <div className="space-y-3 stagger-children">
        {rows.map((row, index) => (
          <div
            key={row.id}
            style={{ '--stagger-delay': index } as React.CSSProperties}
            className="animate-fade-in-up"
          >
            <SwipeableCard
              row={row}
              onViewDetails={onViewDetails}
              onQuickAction={onQuickAction}
              loading={loading}
              selectedId={selectedId}
            />
          </div>
        ))}

        {rows.length === 0 && (
          <Card className="animate-fade-in-up">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading donations...
                  </span>
                ) : (
                  'No donations found'
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Desktop table layout
  return (
    <Card role="region" aria-labelledby="donations-table-title">
      <CardHeader>
        <CardTitle className="text-base" id="donations-table-title">
          All Scrap Donations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table role="table" aria-labelledby="donations-table-title">
            <TableHeader>
              <TableRow role="row">
                <TableHead className="font-semibold" scope="col">Donor</TableHead>
                <TableHead className="font-semibold" scope="col">Status</TableHead>
                <TableHead className="font-semibold" scope="col">Items</TableHead>
                <TableHead className="font-semibold" scope="col">Validation</TableHead>
                <TableHead className="font-semibold" scope="col">Created</TableHead>
                <TableHead className="text-right font-semibold" scope="col">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="hoact:bg-muted/50 transition-all duration-200 cursor-pointer group hover-lift animate-fade-in-up focus-within:bg-muted/30"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => onViewDetails(row.id)}
                  role="row"
                  aria-label={`Donation from ${row.donor?.name || 'Unknown donor'}`}
                  tabIndex={0}
                  onKeyDown={(e) => keyboardNavigation.handleKeyDown(e, () => onViewDetails(row.id))}
                >
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground group-hoact:text-primary transition-colors">
                        {row.donor?.name || row.donor?.id || 'Unknown'}
                      </span>
                      {row.donor?.email && (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {row.donor.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="capitalize">
                      {row.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="font-medium">{row.itemsCount || 0}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {row.validItemsCount !== undefined && (
                        <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/20">
                          {row.validItemsCount} valid
                        </Badge>
                      )}
                      {row.invalidItemsCount !== undefined && row.invalidItemsCount > 0 && (
                        <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-900/20">
                          {row.invalidItemsCount} invalid
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm text-muted-foreground">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onQuickAction && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`${TOUCH_TARGETS.comfortable} opacity-0 group-hoact:opacity-100 transition-all duration-200 button-press hover-lift`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onQuickAction(row.id, 'complete')
                            }}
                          >
                            <CheckCircle className="h-4 w-4 transition-transform duration-200 hoact:scale-110" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`${TOUCH_TARGETS.comfortable} opacity-0 group-hoact:opacity-100 transition-all duration-200 button-press hover-lift`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onQuickAction(row.id, 'archive')
                            }}
                          >
                            <Archive className="h-4 w-4 transition-transform duration-200 hoact:scale-110" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        className={`${TOUCH_TARGETS.comfortable} button-press hover-lift transition-all duration-200`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails(row.id)
                        }}
                        disabled={loading && selectedId === row.id}
                      >
                        {loading && selectedId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2 transition-transform duration-200 hoact:scale-110" />
                            View
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading donations...
                      </div>
                    ) : (
                      'No donations found'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}