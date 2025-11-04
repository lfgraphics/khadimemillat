import { Metadata } from "next";
import { Heart, Users, MapPin, Calendar, Award, Target, Eye, Handshake, ShoppingBag } from "lucide-react";
import { AnimatedSection } from '@/components/animations';
import GoogleReviewsServer from '@/components/GoogleReviewsServer';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = {
    title: "About Us - Khadim-e-Millat Welfare Foundation",
    description: "Learn about Khadim-e-Millat Welfare Foundation, established in 2021 in Gorakhpur, Uttar Pradesh. Our mission to transform communities through sustainable scrap collection and welfare programs.",
    keywords: ["about", "welfare foundation", "Gorakhpur", "community service", "scrap collection", "charity", "social impact"],
};

export default function AboutPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection variant="fade" delay={0.1} duration={0.6}>
                        <div className="text-center">
                            <h1 className="text-4xl md:text-6xl font-bold mb-6">
                                About Our Foundation
                            </h1>
                            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
                                Transforming communities through sustainable practices and compassionate service since 2021
                            </p>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Foundation Story */}
            <section className="py-16 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <AnimatedSection variant="slideLeft" delay={0.2}>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                                    Our Story
                                </h2>
                                <div className="space-y-4 text-muted-foreground">
                                    <p className="text-lg">
                                        Khadim-e-Millat Welfare Foundation was established in 2021 in the heart of Gorakhpur, Uttar Pradesh,
                                        with a vision to create sustainable change in our communities. What started as a small initiative has
                                        grown into a comprehensive welfare platform that bridges the gap between waste and want.
                                    </p>
                                    <p>
                                        Our unique approach combines environmental sustainability with social welfare. Through our innovative
                                        scrap collection and redistribution system, we transform discarded items into opportunities for those
                                        in need, creating a circular economy that benefits everyone involved.
                                    </p>
                                    <p>
                                        Every donation, every collection, and every redistribution is a step towards building a more equitable
                                        and sustainable society. We believe that small actions, when multiplied by millions of people, can
                                        transform the world.
                                    </p>
                                </div>
                            </div>
                        </AnimatedSection>

                        <AnimatedSection variant="slideRight" delay={0.4}>
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-6 text-center">
                                    <CardContent className="p-0">
                                        <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                                        <h3 className="font-semibold text-2xl mb-2">2021</h3>
                                        <p className="text-sm text-muted-foreground">Founded</p>
                                    </CardContent>
                                </Card>
                                <Card className="p-6 text-center">
                                    <CardContent className="p-0">
                                        <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                                        <h3 className="font-semibold text-2xl mb-2">Gorakhpur</h3>
                                        <p className="text-sm text-muted-foreground">Headquarters</p>
                                    </CardContent>
                                </Card>
                                <Card className="p-6 text-center">
                                    <CardContent className="p-0">
                                        <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                                        <h3 className="font-semibold text-2xl mb-2">1000+</h3>
                                        <p className="text-sm text-muted-foreground">Families Helped</p>
                                    </CardContent>
                                </Card>
                                <Card className="p-6 text-center">
                                    <CardContent className="p-0">
                                        <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                                        <h3 className="font-semibold text-2xl mb-2">50+</h3>
                                        <p className="text-sm text-muted-foreground">Active Volunteers</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* Mission, Vision, Values */}
            <section className="py-16 bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection variant="fade" delay={0.1}>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                Our Foundation
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Built on strong values and guided by a clear vision for a better tomorrow
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-8">
                        <AnimatedSection variant="slideUp" delay={0.2}>
                            <Card className="h-full p-8 text-center">
                                <CardContent className="p-0">
                                    <Target className="h-16 w-16 text-primary mx-auto mb-6" />
                                    <h3 className="text-2xl font-bold mb-4 text-foreground">Our Mission</h3>
                                    <p className="text-muted-foreground">
                                        To create sustainable change in communities by transforming waste into opportunities,
                                        ensuring that every donation reaches those who need it most while promoting environmental
                                        responsibility.
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedSection>

                        <AnimatedSection variant="slideUp" delay={0.35}>
                            <Card className="h-full p-8 text-center">
                                <CardContent className="p-0">
                                    <Eye className="h-16 w-16 text-primary mx-auto mb-6" />
                                    <h3 className="text-2xl font-bold mb-4 text-foreground">Our Vision</h3>
                                    <p className="text-muted-foreground">
                                        A world where no resource goes to waste and no person goes without help. We envision
                                        communities where sustainability and social welfare work hand in hand to create lasting
                                        positive impact.
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedSection>

                        <AnimatedSection variant="slideUp" delay={0.5}>
                            <Card className="h-full p-8 text-center">
                                <CardContent className="p-0">
                                    <Handshake className="h-16 w-16 text-primary mx-auto mb-6" />
                                    <h3 className="text-2xl font-bold mb-4 text-foreground">Our Values</h3>
                                    <p className="text-muted-foreground">
                                        Transparency, sustainability, compassion, and community. We believe in honest operations,
                                        environmental stewardship, caring for all people, and building stronger communities together.
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* How We Work */}
            <section className="py-16 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <AnimatedSection variant="fade" delay={0.1}>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                How We Create Impact
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Our systematic approach ensures maximum impact and transparency in every operation
                            </p>
                        </div>
                    </AnimatedSection>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <AnimatedSection variant="slideLeft" delay={0.2}>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary font-bold">1</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">Collection & Verification</h3>
                                        <p className="text-muted-foreground">
                                            We collect donated items through our app-based system, verify their condition,
                                            and process them for maximum utility.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary font-bold">2</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">Marketplace Distribution</h3>
                                        <p className="text-muted-foreground">
                                            Items are listed on our marketplace where community members can purchase them
                                            at affordable prices, generating funds for welfare programs.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary font-bold">3</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">Welfare Programs</h3>
                                        <p className="text-muted-foreground">
                                            Proceeds fund various welfare initiatives including healthcare, education,
                                            food distribution, and emergency assistance for families in need.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>

                        <AnimatedSection variant="slideRight" delay={0.4}>
                            <Card className="p-8">
                                <CardContent className="p-0">
                                    <h3 className="text-2xl font-bold mb-6 text-center">Our Impact Areas</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                                            <span className="font-medium">Healthcare Support</span>
                                            <Award className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                                            <span className="font-medium">Education Assistance</span>
                                            <Award className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                                            <span className="font-medium">Food Distribution</span>
                                            <Award className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                                            <span className="font-medium">Emergency Relief</span>
                                            <Award className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                                            <span className="font-medium">Environmental Conservation</span>
                                            <Award className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <GoogleReviewsServer />

            {/* Call to Action */}
            <section className="py-16 bg-primary text-primary-foreground">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <AnimatedSection variant="fade" delay={0.1}>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Join Our Mission
                        </h2>
                        <p className="text-xl mb-8 text-primary-foreground/90">
                            Be part of the change. Every contribution, big or small, makes a difference in someone's life.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/donate">
                                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                                    <Heart className="mr-2 h-5 w-5" />
                                    Start Donating
                                </Button>
                            </Link>
                            <Link href="/marketplace">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground text-primary-foreground hoact:bg-primary-foreground">
                                    <ShoppingBag className="mr-2 h-5 w-5" />
                                    Browse Marketplace
                                </Button>
                            </Link>
                        </div>
                    </AnimatedSection>
                </div>
            </section>
        </div>
    );
}