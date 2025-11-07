import { Metadata } from "next";
import { Heart, Users, MapPin, Calendar, Award, Target, Eye, Handshake, ShoppingBag, ArrowRight, Recycle, HandHeart, UserCheck, TrendingUp, Shield, Quote, Lightbulb } from "lucide-react";
import { AnimatedSection } from '@/components/animations';
import GoogleReviewsServer from '@/components/GoogleReviewsServer';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
// Use client-safe animated wrappers from our animations collection
import { Badge, ClickableImage } from "@/components/ui";

export const metadata: Metadata = {
    title: "About Us - Khadim-e-Millat Welfare Foundation",
    description: "Learn about Khadim-e-Millat Welfare Foundation, established in 2021 in Gorakhpur, Uttar Pradesh. Our mission to transform communities through sustainable scrap collection and welfare programs.",
    keywords: ["about", "welfare foundation", "Gorakhpur", "community service", "scrap collection", "charity", "social impact"],
};

// Note: animation behaviour is delegated to `AnimatedSection` and other
// client-safe animation components exported from `components/animations`.

// Animation configuration and behaviour are handled by client-safe
// components in `components/animations` (e.g. `AnimatedSection`).

export default function AboutPage() {
    const stories = [
        {
            name: "Aisha Rahman",
            role: "Sponsored Student",
            image: "https://images.unsplash.com/photo-1622996061359-0da030a44e6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNsaW0lMjBmYW1pbHklMjBzdXBwb3J0fGVufDF8fHx8MTc2MjQ2NDYzM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
            quote: "Thanks to KMWF, I'm now pursuing my graduation. My family never thought education would be possible for me."
        },
        {
            name: "Mohammad Hussain",
            role: "Scrap Collection Volunteer",
            image: "https://images.unsplash.com/photo-1759320244288-10ddfcdbb5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWN5Y2xpbmclMjBjb21tdW5pdHklMjB3b3JrfGVufDF8fHx8MTc2MjQ2NDYzMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
            quote: "Being part of KMWF changed my perspective. Every item we collect is another family helped."
        },
        {
            name: "Fatima Begum",
            role: "Widow & Beneficiary",
            image: "https://images.unsplash.com/photo-1629131973019-56596eb9975a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNsaW0lMjBjaGFyaXR5JTIwdm9sdW50ZWVyfGVufDF8fHx8MTc2MjQ2NDYyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
            quote: "After losing my husband, KMWF's sponsorship program gave my children hope. We're not alone anymore."
        }
    ];

    const approachSteps = [
        {
            icon: Recycle,
            title: "Sustainable Scrap Recycling",
            description: "Every donated or collected scrap item — from metals to household recyclables — is processed responsibly. The proceeds fund key welfare activities and create a circular model where waste transforms into welfare.",
            highlight: "This initiative sustains nearly half of our welfare operations.",
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: Users,
            title: "Verified Sponsorships",
            description: "Our sponsorship system allows donors to take financial responsibility for an individual or a family in need. We conduct on-ground surveys and home visits to ensure genuine need.",
            highlight: "Donors can personally meet and follow the progress of their beneficiaries.",
            color: "from-blue-500 to-purple-500"
        },
        {
            icon: HandHeart,
            title: "Community Welfare & Relief Drives",
            description: "From flood relief and winter clothing to Ramadan support and educational assistance — our community programs respond to both seasonal and urgent needs.",
            highlight: "Ensuring no deserving family is left unseen.",
            color: "from-purple-500 to-pink-500"
        }
    ];

    const howWeWork = [
        {
            step: "01",
            title: "Survey & Verification",
            description: "Every beneficiary is identified through careful on-ground assessment.",
            icon: UserCheck
        },
        {
            step: "02",
            title: "Connection & Sponsorship",
            description: "Verified profiles are matched with compassionate donors who wish to take long-term responsibility.",
            icon: Users
        },
        {
            step: "03",
            title: "Sustainable Support",
            description: "Scrap proceeds and donations are channelled transparently to sustain welfare programs and ongoing relief efforts.",
            icon: TrendingUp
        },
        {
            step: "04",
            title: "Accountability & Updates",
            description: "Donors receive periodic updates and, where possible, can meet the beneficiaries they support.",
            icon: Eye
        }
    ];

    const values = [
        {
            icon: Eye,
            title: "Transparency",
            description: "Every rupee and resource is traceable to its impact."
        },
        {
            icon: Recycle,
            title: "Sustainability",
            description: "Recycling, reusing, and restoring — for people and the planet."
        },
        {
            icon: Shield,
            title: "Dignity",
            description: "Assistance that uplifts without dependency."
        },
        {
            icon: Heart,
            title: "Compassion",
            description: "Human connection is the heart of everything we do."
        }
    ];

    return (
        <>
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <AnimatedSection variant="fade" className="relative py-20 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <AnimatedSection variant="fade" delay={0.2} className="max-w-4xl mx-auto text-center">
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">About Us</Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                                About Khadim-e-Millat Welfare Foundation
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground">
                                Together, we are Khadim-e-Millat — a community where giving means belonging.
                            </p>
                        </AnimatedSection>
                    </div>
                </AnimatedSection>

                {/* Who We Are */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                            <AnimatedSection variant="fade" className="" triggerOnce>
                                <h2 className="text-3xl md:text-4xl mb-4">Who We Are</h2>
                                <p className="text-lg text-muted-foreground mb-4">
                                    Founded in 2021 in Gorakhpur, Uttar Pradesh, Khadim-e-Millat Welfare Foundation (KMWF) is a community-driven organisation dedicated to connecting those who wish to give with those who truly need support.
                                </p>
                                <p className="text-lg text-muted-foreground mb-4">
                                    We blend compassion with structure — ensuring every act of charity reaches a verified, deserving individual or family.
                                </p>
                                <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 mt-6">
                                    <CardContent className="p-6">
                                        <Quote className="w-8 h-8 text-primary mb-3" />
                                        <p className="text-lg italic">
                                            Together, we are Khadim-e-Millat — a community where giving means belonging.
                                        </p>
                                    </CardContent>
                                </Card>
                            </AnimatedSection>

                            <div className="grid md:grid-cols-1 gap-4">
                                {stories.map((story, index) => (
                                    <AnimatedSection key={index} variant="scale" className="">
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                                            <CardContent className="p-6">
                                                <div className="flex gap-4 items-start">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                                                        <ClickableImage
                                                            src={story.image}
                                                            alt={story.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-medium mb-1">{story.name}</h3>
                                                        <p className="text-sm text-primary mb-2">{story.role}</p>
                                                        <p className="text-sm text-muted-foreground italic">"{story.quote}"</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </AnimatedSection>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-4xl mx-auto text-center" triggerOnce>
                            <Target className="w-16 h-16 text-primary mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl mb-6">Our Mission</h2>
                            <p className="text-xl text-muted-foreground mb-4">
                                To empower underprivileged families and individuals through verified sponsorships, need-based welfare programs, and innovative scrap-to-charity systems that sustain long-term impact.
                            </p>
                            <p className="text-lg text-muted-foreground italic">
                                Our mission is simple yet profound: to make giving transparent, sustainable, and life-changing.
                            </p>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Our Approach */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
                            <h2 className="text-3xl md:text-4xl mb-4">Our Approach</h2>
                            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                                Unlike traditional welfare models, KMWF combines three powerful streams of support that work hand-in-hand:
                            </p>
                        </AnimatedSection>

                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            {approachSteps.map((step, index) => (
                                <AnimatedSection key={index} variant="scale" className="">
                                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group">
                                        <CardContent className="p-6">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <step.icon className="w-7 h-7 text-white" />
                                            </div>
                                            <h3 className="text-xl mb-3">{step.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                                            <p className="text-sm text-primary italic">{step.highlight}</p>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How We Work */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
                            <h2 className="text-3xl md:text-4xl mb-4">How We Work</h2>
                        </AnimatedSection>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                            {howWeWork.map((item, index) => (
                                <AnimatedSection key={index} variant="scale" className="">
                                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 text-center">
                                        <CardContent className="p-6">
                                            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                <item.icon className="w-8 h-8 text-primary" />
                                            </div>
                                            <div className="text-4xl font-bold text-primary/20 mb-3">{item.step}</div>
                                            <h3 className="text-lg mb-2">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Vision & Values */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                            {/* Vision */}
                            <AnimatedSection variant="fade" triggerOnce>
                                <Card className="h-full bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                                    <CardContent className="p-8">
                                        <Lightbulb className="w-12 h-12 text-primary mb-6" />
                                        <h2 className="text-3xl mb-4">Our Vision</h2>
                                        <p className="text-lg text-muted-foreground">
                                            A community where generosity flows sustainably — where donors, volunteers, and beneficiaries work hand-in-hand to restore dignity, opportunity, and hope.
                                        </p>
                                    </CardContent>
                                </Card>
                            </AnimatedSection>

                            {/* Values */}
                            <div>
                                <h2 className="text-3xl mb-6">Our Values</h2>
                                <div className="grid gap-4">
                                    {values.map((value, index) => (
                                        <AnimatedSection key={index} variant="scale">
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <value.icon className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium mb-1">{value.title}</h3>
                                                            <p className="text-sm text-muted-foreground">{value.description}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </AnimatedSection>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Leadership Section */}
                <AnimatedSection variant="fade" className="py-16 md:py-24 bg-card/80" triggerOnce>
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto">
                            <AnimatedSection variant="fade" className="text-center mb-8" delay={0} triggerOnce>
                                <h2 className="text-3xl md:text-4xl mb-4">Leadership</h2>
                            </AnimatedSection>

                            <AnimatedSection variant="scale" className="" delay={0.06} triggerOnce>
                                <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                                    <CardContent className="p-8 md:p-12">
                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden flex-shrink-0 border-4 border-primary/20">
                                                <ClickableImage
                                                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"
                                                    alt="Mufti Mohammad Dawood Qasmi"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="text-2xl mb-2">Mufti Mohammad Dawood Qasmi</h3>
                                                <p className="text-primary mb-4">Founder & Director</p>
                                                <p className="text-muted-foreground mb-6">
                                                    At the heart of Khadim-e-Millat Welfare Foundation stands Mufti Mohammad Dawood Qasmi, the organisation's founder and director. Guided by faith and a lifelong commitment to community service, he leads the Foundation's efforts to combine compassion with accountability.
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Under his direction, KMWF has grown into a transparent welfare ecosystem — connecting donors, volunteers, and verified families across Gorakhpur and beyond.
                                                </p>
                                            </div>
                                        </div>

                                        <AnimatedSection variant="fade" className="mt-8 pt-8 border-t border-primary/20" delay={0.12} triggerOnce>
                                            <div className="flex gap-4">
                                                <Quote className="w-8 h-8 text-primary flex-shrink-0" />
                                                <blockquote className="text-lg italic text-foreground">
                                                    "Our goal is simple — to serve humanity sincerely and sustainably, until giving becomes our collective habit."
                                                </blockquote>
                                            </div>
                                            <p className="text-right text-sm text-muted-foreground mt-4">
                                                — Mufti Mohammad Dawood Qasmi, Director, KMWF
                                            </p>
                                        </AnimatedSection>
                                    </CardContent>
                                </Card>
                            </AnimatedSection>
                        </div>
                    </div>
                </AnimatedSection>

                {/* Journey Ahead */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-4xl mx-auto" triggerOnce>
                            <Card className="bg-gradient-to-br from-primary to-purple-500 border-0">
                                <CardContent className="p-8 md:p-12 text-center">
                                    <TrendingUp className="w-16 h-16 text-white mx-auto mb-6" />
                                    <h2 className="text-3xl md:text-4xl text-white mb-6">
                                        Our Journey Ahead
                                    </h2>
                                    <p className="text-lg text-white/90 mb-6 max-w-3xl mx-auto">
                                        KMWF is evolving from on-paper operations to a fully digitised, accountable ecosystem.
                                    </p>
                                    <p className="text-lg text-white/90 mb-8 max-w-3xl mx-auto">
                                        Through this online platform, we aim to make giving more personal, traceable, and impactful — letting every donor witness the real change their compassion creates.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                                            <Link href="/programs">
                                                Explore Our Programs
                                                <ArrowRight className="ml-2 w-5 h-5" />
                                            </Link>
                                        </Button>
                                        <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" asChild>
                                            <Link href="/transparency">
                                                View Our Transparency
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-5xl mx-auto" rootMargin="-100px" triggerOnce>
                            <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
                                <h2 className="text-3xl md:text-4xl mb-4">Voices from Our Community</h2>
                            </AnimatedSection>

                            <div className="grid md:grid-cols-3 gap-6">
                                {stories.map((story, index) => (
                                    <AnimatedSection key={index} variant="scale" className="">
                                        <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col items-center text-center mb-4">
                                                    <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
                                                        <ClickableImage
                                                            src={story.image}
                                                            alt={story.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <h3 className="font-medium mb-1">{story.name}</h3>
                                                    <p className="text-sm text-primary">{story.role}</p>
                                                </div>
                                                <Quote className="w-6 h-6 text-primary/50 mb-2" />
                                                <p className="text-sm text-muted-foreground italic">"{story.quote}"</p>
                                            </CardContent>
                                        </Card>
                                    </AnimatedSection>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-3xl mx-auto text-center" triggerOnce>
                            <Heart className="w-16 h-16 text-primary mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl mb-4">
                                Join Our Movement
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                Be part of a community where giving means belonging and every contribution creates lasting change.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button size="lg" asChild>
                                    <Link href="/sponsorship">
                                        Sponsor a Family
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <Link href="/contribute">
                                        See All Ways to Help
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