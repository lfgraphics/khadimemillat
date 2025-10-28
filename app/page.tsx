import { Headphones, Heart, Mail, Phone, ShoppingBag, Store, Truck, Users } from "lucide-react";
import Link from "next/link";
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";
import { AnimatedSection, AnimatedButton, AnimatedProcessSteps } from '@/components/animations';
import WelfareProgramsSection from '@/components/WelfareProgramsSection';
import DynamicHomeCounters from '@/components/DynamicHomeCounters';
import HomeActivitiesServer from '@/components/HomeActivitiesServer';
import { Button } from "@/components/ui";
import Image from "next/image";

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
                {/* <Image src="/android-chrome-512x512.png" width={250} height={250} alt="Logo" className="block mx-auto rounded-lg mb-4"></Image> */}
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

              {/* <AnimatedSection 
                variant="slideUp" 
                delay={0.5} 
                duration={0.6}
                threshold={0.1}
               >
                  </AnimatedSection> */}
              <div className="flex flex-row gap-4 justify-center">
                <Link href="/donate" data-testid="donate-button">
                  <Button
                    variant="default"
                    className="cursor-pointer h-10 inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-8 py-4"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    Donate Now
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground text-primary dark:text-popover-foreground hover:bg-primary-foreground">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Marketplace
                  </Button>
                </Link>
                {/* <Link href="/about" data-testid="about-button">
                  <Button
                    variant="outline"
                    className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary h-11 px-8 py-4"
                  >
                    Learn More
                  </Button>
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (suspense localized) */}
      <section className="bg-bg-background py-16" data-testid="stats-section">
        <SuspenseSection
          fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Loading inline={false} label="Loading stats" /></div>}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <DynamicHomeCounters />
          </div>
        </SuspenseSection>
      </section>


      {/* Activities Section */}
      <SuspenseSection
        fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"><Loading inline={false} label="Loading activities" /></div>}
      >
        <HomeActivitiesServer />
      </SuspenseSection>



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
        <SuspenseSection
          fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Loading inline={false} label="Loading programs" /></div>}
        >
          <WelfareProgramsSection />
        </SuspenseSection>
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
                <div className="text-muted-foreground flex flex-col">
                  <Link href="tel:+918081747259" className="hover:text-primary transition-colors">
                    +91 80817 47259
                  </Link>
                  <Link href="tel:+919935904289" className="hover:text-primary transition-colors">
                    +91 99359 04289
                  </Link>
                  <Link href="tel:+919839353055" className="hover:text-primary transition-colors">
                    +91 98393 53055
                  </Link>
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
                  <Link href="mailto:support@khadimemillat.org" className="hover:text-primary transition-colors">
                    <p>support@khadimemillat.org</p>
                  </Link>
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
