import { Card, CardContent } from "@/components/ui/card";
import { Badge, Button } from "@/components/ui";
import Link from "next/link";
import { AnimatedSection } from '@/components/animations';
import type { Metadata } from 'next';
import {
    Users,
    Heart,
    Recycle,
    ShoppingBag,
    Home,
    Calendar,
    MapPin,
    ArrowRight,
    Gift,
    Briefcase
} from "lucide-react";

export const metadata: Metadata = {
    title: 'How You Can Contribute - Khadim-e-Millat',
    description: "Choose how you'd like to support Khadim-e-Millat — from sponsorships and scrap donations to Gullak contributions and more."
};

export default function ContributePage() {
    const supportWays = [
        {
            icon: Users,
            title: "Sponsorship Support",
            description: "Ongoing monthly support for widows, orphans, students, families without income, and patients with recurring medical needs.",
            features: [
                "See verified profiles",
                "Choose whom you want to support",
                "Sponsor securely",
                "Receive updates"
            ],
            cta: [
                { label: "Learn More", url: "/sponsorship", variant: "default" as const },
                { label: "See Verified Beneficiaries", url: "/sponsorship/beneficiaries", variant: "outline" as const }
            ],
            color: "from-blue-500 to-purple-500"
        },
        {
            icon: Heart,
            title: "Sadqa Subscription",
            description: "Set once → donation goes automatically → continuously supporting the needy.",
            features: [
                "Daily: ₹10 · ₹20 · ₹50 · ₹100",
                "Juma (Weekly): same slabs",
                "Monthly: ₹100 to ₹5,000",
                "Yearly: ₹5,000+"
            ],
            cta: [
                { label: "Start Subscription", url: "/programs/sadqa-subscription", variant: "default" as const }
            ],
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: Home,
            title: "Neki Bank (Gullak) Contribution",
            description: "Our smart Gullak system with registered caretakers, GPS mapping, and transparent contribution tracking.",
            features: [
                "Each Gullak has a registered caretaker",
                "Mapped via GPS",
                "Contributions tracked transparently",
                "Donors can find nearest Gullak online"
            ],
            cta: [
                { label: "Locate a Gullak on Map", url: "/programs/golak-map", variant: "default" as const },
                { label: "Apply to Host a Gullak", url: "/programs/host-golak", variant: "outline" as const }
            ],
            color: "from-cyan-500 to-blue-500"
        },
        {
            icon: Recycle,
            title: "Scrap Donation",
            description: "We accept clothing, electronics, utensils, spares, and scrap materials. We recycle, refurbish, and convert them into welfare funds.",
            features: [
                "Clothing donations",
                "Electronics & appliances",
                "Household items & utensils",
                "Scrap materials"
            ],
            cta: [
                { label: "Schedule Pickup", url: "/donate", variant: "default" as const }
            ],
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: ShoppingBag,
            title: "Purchase Upcycled Items",
            description: "Support dignity with sustainability — buy items that help someone live.",
            features: [
                "Repaired household items",
                "Refurbished electronics",
                "Cotton-filled mattresses from recycled fabric",
                "Proceeds support welfare programs"
            ],
            cta: [
                { label: "Visit Marketplace", url: "/marketplace", variant: "default" as const }
            ],
            color: "from-orange-500 to-red-500"
        },
        {
            icon: Gift,
            title: "Zakat & Sadqa",
            description: "Fulfill your spiritual obligations responsibly with verified beneficiaries and transparent channels.",
            features: [
                "Verified beneficiaries",
                "Accurate identification",
                "Full accountability",
                "Transparent tracking"
            ],
            cta: [
                { label: "Fulfill your Zakat", url: "/donate?program=zakat", variant: "default" as const },
                { label: "Give Sadqa", url: "/donate?program=sadqa", variant: "outline" as const }
            ],
            color: "from-indigo-500 to-purple-500"
        },
        {
            icon: Briefcase,
            title: "Support Operations",
            description: "Keep the foundation active — funding survey teams, volunteers, logistics, data systems, and operational backbone.",
            features: [
                "Survey team support",
                "Volunteer coordination",
                "Logistics & field operations",
                "Data systems & technology"
            ],
            cta: [
                { label: "Support Operations", url: "/programs/operations", variant: "default" as const }
            ],
            color: "from-slate-500 to-gray-500"
        },
        {
            icon: Calendar,
            title: "Community Welfare Programs",
            description: "Support seasonal drives, education aid, medical camps, and emergency relief efforts.",
            features: [
                "Ramadan support programs",
                "Winter clothing drives",
                "Medical support camps",
                "Education assistance"
            ],
            cta: [
                { label: "Support a Welfare Drive", url: "/programs/welfare-drives", variant: "default" as const }
            ],
            color: "from-teal-500 to-green-500"
        }
    ];

    return (
        <>
            {/* Page metadata set via Next.js `metadata` export */}
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <AnimatedSection variant="fade" className="relative py-20 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <AnimatedSection variant="fade" delay={0.2} className="max-w-4xl mx-auto text-center">
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Support the Mission</Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                                How You Can Support the Mission
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                                We believe charity is most meaningful when it is transparent, continuous, sustainable, and personal. Choose how you'd like to help:
                            </p>
                        </AnimatedSection>
                    </div>
                </AnimatedSection>

                {/* Support Options Grid */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                            {supportWays.map((way, index) => (
                                <AnimatedSection key={index} variant="scale" delay={index * 0.06} className="">
                                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hoact:border-primary/50 transition-all duration-300 group">
                                        <CardContent className="p-6 md:p-8">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${way.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <way.icon className="w-7 h-7 text-white" />
                                            </div>

                                            <h3 className="text-2xl mb-3">{way.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {way.description}
                                            </p>

                                            <ul className="space-y-2 mb-6">
                                                {way.features.map((feature, i) => (
                                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                        <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            <div className="flex flex-col gap-2">
                                                {way.cta.map((ctaItem, ctaIndex) => (
                                                    <Button 
                                                        key={ctaIndex}
                                                        variant={ctaItem.variant}
                                                        className="w-full" 
                                                        asChild
                                                    >
                                                        <Link href={ctaItem.url}>
                                                            {ctaItem.label}
                                                            <ArrowRight className="ml-2 w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-4xl mx-auto" triggerOnce>
                            <Card className="bg-gradient-to-br from-primary to-purple-500 border-0">
                                <CardContent className="p-8 md:p-12 text-center">
                                    <Heart className="w-16 h-16 text-white mx-auto mb-6" />
                                    <h2 className="text-3xl md:text-4xl text-white mb-4">
                                        Become a Part of the Movement
                                    </h2>
                                    <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                                        Every act of compassion strengthens our community and changes lives. Join thousands of others who are making a difference.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button size="lg" className="bg-white text-primary hoact:bg-white/90" asChild>
                                            <Link href="/sponsorship">
                                                Start Making an Impact
                                                <ArrowRight className="ml-2 w-5 h-5" />
                                            </Link>
                                        </Button>
                                        <Button size="lg" variant="outline" className="text-white border-white hoact:bg-white/10" asChild>
                                            <Link href="/about">
                                                Learn About Our Work
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </section>

                {/* FAQ or Additional Info */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-3xl mx-auto text-center" triggerOnce>
                            <h2 className="text-3xl md:text-4xl mb-4">Have Questions?</h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                We're here to guide you through the process and help you find the best way to make an impact.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button size="lg" variant="outline" asChild>
                                    <Link href="/contact">
                                        Contact Us
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <Link href="/transparency">
                                        View Our Transparency
                                    </Link>
                                </Button>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>
            </div>
        </>
    );
}
