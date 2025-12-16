import { ImageModalProvider } from "@/components/marketplace/ImageModalProvider"
import { ItemDetailView } from "./ItemDetailView"
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const { id } = await params;
        const res = await fetch(`/api/public/items/${id}`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            return {
                title: "Item Not Found | Marketplace",
            };
        }

        const data = await res.json();
        const item = data.item;

        return {
            title: `${item.name} | Marketplace | Khadim-Millat Welfare Foundation`,
            description: item.description || `View details for ${item.name}. Condition: ${item.condition}. ${item.marketplaceListing.listed ? `Price: ₹${item.marketplaceListing.demandedPrice}` : 'Not currently available'}`,
            keywords: ["marketplace", item.name, item.condition, "welfare", "donation"],
        };
    } catch (error) {
        return {
            title: "Item | Marketplace",
        };
    }
}

async function MarketplaceItemPage({ params }: PageProps) {
    const { id } = await params;

    return (
        <ImageModalProvider>
            <SuspenseSection fallback={<Loading inline={false} label="Loading item details" />}>
                <ItemDetailView itemId={id} />
            </SuspenseSection>
        </ImageModalProvider>
    );
}

export default MarketplaceItemPage;
