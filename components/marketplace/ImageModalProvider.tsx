"use client"

import React, { createContext, useContext, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface ImageModalContextValue {
    openModal: (images: string[], initialIndex?: number) => void
}

const ImageModalContext = createContext<ImageModalContextValue | null>(null)

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [images, setImages] = useState<string[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

    const openModal = (imgs: string[], initialIndex = 0) => {
        setImages(imgs)
        setCurrentIndex(initialIndex)
        setIsOpen(true)
    }

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length)
    }

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    const goToImage = (index: number) => {
        setCurrentIndex(index)
    }

    // Keyboard navigation
    React.useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault()
                    if (images.length > 1) prevImage()
                    break
                case 'ArrowRight':
                    event.preventDefault()
                    if (images.length > 1) nextImage()
                    break
                case 'Escape':
                    event.preventDefault()
                    setIsOpen(false)
                    break
                case 'Home':
                    event.preventDefault()
                    if (images.length > 1) goToImage(0)
                    break
                case 'End':
                    event.preventDefault()
                    if (images.length > 1) goToImage(images.length - 1)
                    break
            }
        }

        document?.addEventListener('keydown', handleKeyDown)
        return () => document?.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, images.length])

    return (
        <ImageModalContext.Provider value={{ openModal }}>
            {children}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] p-0 overflow-hidden border-0">
                    {images.length > 0 && (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* Main Image */}
                            <div 
                                className="relative w-full h-full flex items-center justify-center p-4 touch-manipulation"
                                onTouchStart={(e) => {
                                    const touch = e.touches[0]
                                    setTouchStart({ x: touch.clientX, y: touch.clientY })
                                }}
                                onTouchEnd={(e) => {
                                    if (!touchStart) return
                                    const touch = e.changedTouches[0]
                                    const deltaX = touch.clientX - touchStart.x
                                    const deltaY = Math.abs(touch.clientY - touchStart.y)
                                    
                                    // Only trigger swipe if horizontal movement is greater than vertical
                                    if (Math.abs(deltaX) > 50 && deltaY < 100) {
                                        if (deltaX > 0) {
                                            prevImage()
                                        } else {
                                            nextImage()
                                        }
                                    }
                                    setTouchStart(null)
                                }}
                            >
                                <img
                                    src={images[currentIndex]}
                                    alt={`Image ${currentIndex + 1} of ${images.length}`}
                                    className="max-w-full max-h-full object-contain select-none"
                                    loading="lazy"
                                    draggable={false}
                                />
                                
                                {/* Navigation Arrows */}
                                {images.length > 1 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hoact:bg-black/70 text-white border-0"
                                            onClick={prevImage}
                                            aria-label="Previous image"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </Button>
                                        
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hoact:bg-black/70 text-white border-0"
                                            onClick={nextImage}
                                            aria-label="Next image"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Image Counter */}
                            {images.length > 1 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                    {currentIndex + 1} / {images.length}
                                </div>
                            )}

                            {/* Keyboard Navigation Hint */}
                            {/* {images.length > 1 && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs opacity-75">
                                    Use ← → keys or swipe to navigate
                                </div>
                            )} */}
                            
                            {/* Thumbnail Navigation */}
                            {images.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
                                    {images.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToImage(index)}
                                            className={`
                                                flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all duration-200
                                                ${index === currentIndex 
                                                    ? 'border-white shadow-lg' 
                                                    : 'border-transparent opacity-60 hoact:opacity-80'
                                                }
                                            `}
                                            aria-label={`Go to image ${index + 1}`}
                                        >
                                            <img
                                                src={image}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </ImageModalContext.Provider>
    )
}

export function useImageModal() {
    const ctx = useContext(ImageModalContext)
    if (!ctx) {
        console.warn("useImageModal must be used inside ImageModalProvider")
        return { openModal: () => {} }
    }
    return ctx
}
