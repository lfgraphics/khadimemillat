import { PaginationProvider } from "@/components/marketplace/PaginationProvider"
import { ImageModalProvider } from "@/components/marketplace/ImageModalProvider"
import { MarketplaceContent } from "./MarketplaceContent"
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";

 function MarketplacePage() {
    return (
        <ImageModalProvider>
            <PaginationProvider>
                <SuspenseSection fallback={<Loading inline={false} label="Loading marketplace" />}> 
                    <MarketplaceContent />
                </SuspenseSection>
            </PaginationProvider>
        </ImageModalProvider>
    )
}

export default MarketplacePage;