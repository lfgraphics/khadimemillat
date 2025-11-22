import { PaginationProvider } from "@/components/marketplace/PaginationProvider"
import { ImageModalProvider } from "@/components/marketplace/ImageModalProvider"
import { MarketplaceContent } from "./MarketplaceContent"
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace | Khadim-Millat Welfare Foundation",
  description: "Browse and purchase items from our community collection program. Support welfare initiatives while finding quality items at affordable prices.",
  keywords: ["marketplace", "community", "welfare", "donation", "scrap collection", "sustainable"],
};

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