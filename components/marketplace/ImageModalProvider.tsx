"use client"

import { createContext, useContext, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Carousel } from "react-responsive-carousel"

interface ImageModalContextValue {
    openModal: (images: string[]) => void
}

const ImageModalContext = createContext<ImageModalContextValue | null>(null)

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [images, setImages] = useState<string[]>([])

    const openModal = (imgs: string[]) => {
        setImages(imgs)
        setIsOpen(true)
    }

    return (
        <ImageModalContext.Provider value={{ openModal }}>
            {children}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <Carousel showThumbs infiniteLoop>
                    {images.map((src, idx) => (
                        <img key={idx} src={src} alt={`image-${idx}`} />
                    ))}
                </Carousel>
            </Dialog>
        </ImageModalContext.Provider>
    )
}

export function useImageModal() {
    const ctx = useContext(ImageModalContext)
    if (!ctx) throw new Error("useImageModal must be used inside ImageModalProvider")
    return ctx
}
