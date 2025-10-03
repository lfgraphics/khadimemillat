import { Headphones, Heart, Mail, Phone, ShoppingBag, Store, Truck, Users } from "lucide-react";
import Link from "next/link";
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";
import { AnimatedSection, AnimatedButton, AnimatedStatsSection, AnimatedProcessSteps } from '@/components/animations';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-primary-foreground bg-[url('/assets/landing.png')] bg-cover bg-center">
        <div className="bg-gradient-to-tl from-primary to-primary/40 w-full h-full">
          {/* <div className="absolute inset-0 bg-gradient-to-br from-[#0d89d7] to-[#001018]"></div> */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="hero-section">
            <div className="text-center">
              <AnimatedSection 
                variant="fade" 
                delay={0.1} 
                duration={0.6}
                threshold={0.1}
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="hero-title">
                  Transforming Communities
                </h1>
              </AnimatedSection>
              
              <AnimatedSection 
                variant="fade" 
                delay={0.3} 
                duration={0.6}
                threshold={0.1}
              >
                <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto" data-testid="hero-description">
                  Established in 2021 in Gorakhpur, Uttar Pradesh. Through sustainable scrap collection and redistribution, we create opportunities and support those in need
                </p>
              </AnimatedSection>
              
              <AnimatedSection 
                variant="slideUp" 
                delay={0.5} 
                duration={0.6}
                threshold={0.1}
              >
                <div className="flex flex-row gap-4 justify-center">
                  <Link href="/donate" data-testid="donate-button">
                    <AnimatedButton 
                      hoverScale={1.05}
                      clickScale={0.95}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 px-8 py-4"
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      Donate
                    </AnimatedButton>
                  </Link>
                  <Link href="/marketplace" data-testid="marketplace-button">
                    <AnimatedButton 
                      hoverScale={1.05}
                      clickScale={0.95}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-4 border border-primary-foreground/20"
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Browse Marketplace
                    </AnimatedButton>
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (suspense localized) */}
      <section className="bg-card py-16" data-testid="stats-section">
        <SuspenseSection
          fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Loading inline={false} label="Loading stats" /></div>}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedStatsSection
              stats={[
                { number: 25847, label: "Items Collected", testId: "stat-items-collected" },
                { number: 1250, label: "Families Helped", testId: "stat-families-helped" },
                { number: 187, label: "Active Volunteers", testId: "stat-volunteers" },
                { number: 12, label: "Cities Served", testId: "stat-cities" }
              ]}
              threshold={0.3}
              triggerOnce={true}
              counterDuration={2.0}
              simultaneousStart={true}
              enableEntranceAnimations={true}
              staggerDelay={0.15}
            />
          </div>
        </SuspenseSection>
      </section>

      {/* How It Works Section (suspense) */}
      <section className="bg-background py-16" data-testid="how-it-works-section">
        <SuspenseSection
          fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Loading inline={false} label="Loading process" /></div>}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection 
              variant="fade" 
              delay={0.1} 
              duration={0.5}
              threshold={0.2}
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="how-it-works-title">
                  How Our Process Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="how-it-works-description">
                  A transparent, efficient system that maximizes impact and ensures every donation reaches those who need it most
                </p>
              </div>
            </AnimatedSection>

            <AnimatedProcessSteps
              steps={[
                {
                  icon: <Phone className="h-8 w-8 text-primary" />,
                  title: "1. Request Collection",
                  description: "Submit a donation request through our app with your contact details and location",
                  testId: "step-request"
                },
                {
                  icon: <Truck className="h-8 w-8 text-primary" />,
                  title: "2. Verification & Collection", 
                  description: "Our team verifies and collects your items, processing them for maximum utility",
                  testId: "step-collection"
                },
                {
                  icon: <Store className="h-8 w-8 text-primary" />,
                  title: "3. Marketplace Distribution",
                  description: "Items are listed on our marketplace, with proceeds supporting welfare programs",
                  testId: "step-marketplace"
                }
              ]}
              delay={0.2}
              duration={0.5}
              staggerDelay={0.15}
              threshold={0.2}
            />
          </div>
        </SuspenseSection>
      </section>

      {/* Our Programs Section */}
      <section className="bg-card py-16" data-testid="programs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection 
            variant="fade" 
            delay={0.1} 
            duration={0.5}
            threshold={0.2}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="programs-title">
                Our Welfare Programs
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="programs-description">
                Supporting communities through various initiatives funded by our sustainable scrap collection operations
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatedSection 
              variant="slideUp" 
              delay={0.2} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" data-testid="program-education">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Education Support</h3>
                <p className="text-muted-foreground mb-4 flex-grow">
                  Providing school supplies, books, and educational resources to underprivileged children
                </p>
                <div className="flex items-center text-sm text-primary mt-auto">
                  <Users className="mr-2 h-4 w-4" />
                  <span>450 students supported</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection 
              variant="slideUp" 
              delay={0.35} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" data-testid="program-healthcare">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Healthcare Access</h3>
                <p className="text-muted-foreground mb-4 flex-grow">
                  Medical equipment and supplies distribution to local healthcare facilities
                </p>
                <div className="flex items-center text-sm text-primary mt-auto">
                  <Heart className="mr-2 h-4 w-4" />
                  <span>23 facilities equipped</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection 
              variant="slideUp" 
              delay={0.5} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" data-testid="program-emergency">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-orange-600 dark:text-orange-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Emergency Relief</h3>
                <p className="text-muted-foreground mb-4 flex-grow">
                  Rapid response support during natural disasters and emergency situations
                </p>
                <div className="flex items-center text-sm text-primary mt-auto">
                  <Truck className="mr-2 h-4 w-4" />
                  <span>18 emergency responses</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-background py-16" data-testid="contact-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection 
            variant="fade" 
            delay={0.1} 
            duration={0.5}
            threshold={0.2}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Get In Touch
              </h2>
              <p className="text-lg text-muted-foreground">
                Have questions or want to get involved? We'd love to hear from you.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <AnimatedSection 
              variant="slideUp" 
              delay={0.2} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-phone">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Phone</h3>
                </div>
                <div className="text-muted-foreground">
                  <p>8081747259</p>
                  <p>9935904289</p>
                  <p>9839353055</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection 
              variant="slideUp" 
              delay={0.35} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-email">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Email</h3>
                </div>
                <div className="text-muted-foreground">
                  <p>info@khadimemillat.org</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection 
              variant="slideUp" 
              delay={0.5} 
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-whatsapp">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Headphones className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">WhatsApp</h3>
                </div>
                <div className="text-muted-foreground">
                  <p>Quick support available</p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </div>

  );
}
