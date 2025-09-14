import { PaginationProvider } from "@/components/marketplace/PaginationProvider"
import { ImageModalProvider } from "@/components/marketplace/ImageModalProvider"
import { MarketplaceContent } from "./MarketplaceContent"

 function MarketplacePage() {
    return (
        <ImageModalProvider>
            <PaginationProvider>
                <MarketplaceContent />
            </PaginationProvider>
        </ImageModalProvider>
    )
}

export default MarketplacePage;