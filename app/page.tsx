import { ArrowRight, ClipboardCheck, Headphones, Heart, HeartHandshake, HandHeart, HomeIcon, Mail, Package, Phone, Recycle, ShoppingBag, Truck, Users, HandHelping, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import SuspenseSection from "@/components/SuspenseSection";
import Loading from "@/components/Loading";
import { AnimatedSection } from '@/components/animations';
import WelfareProgramsSection from '@/components/WelfareProgramsSection';
import DynamicHomeCounters from '@/components/DynamicHomeCounters';
import HomeActivitiesServer from '@/components/HomeActivitiesServer';
import { Badge, Button, Carousel } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";

const processSteps = [
  {
    number: "01",
    title: "Donate Your Items",
    description:
      "Share items you no longer need. From clothes to books, furniture to electronics - every contribution makes a difference in someone's life.",
    icon: Package,
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    title: "We Collect & Verify",
    description:
      "Our dedicated team picks up donations from your doorstep, carefully inspects each item, and ensures quality standards are met.",
    icon: ClipboardCheck,
    color: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    title: "Reaches Those in Need",
    description:
      "Verified items are distributed through our marketplace to families and individuals who need them most, creating real impact.",
    icon: Truck,
    color: "from-orange-500 to-red-500",
  },
];

const supportOptions = [
  {
    icon: Recycle,
    title: "Donate Scrap or Clothing",
    description: "Your unused items can bring warmth, dignity and relief to another family. We collect, repair, recycle and upcycle scrap and clothing — and the proceeds directly support welfare programs.",
    cta: "Schedule a Pickup",
    link: "/contact",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: ShoppingBag,
    title: "Purchase Upcycled Products",
    description: "From repaired household items to cotton-filled mattresses made from recycled fabric — our upcycled products fund medical aid, education support, and monthly stipends.",
    cta: "Visit the Marketplace",
    link: "/programs",
    color: "from-blue-500 to-purple-500"
  },
  {
    icon: Heart,
    title: "Sadqa Subscription",
    description: "Let giving become a daily habit. Choose from daily, weekly, monthly, or yearly Sadqa plans — small amounts, continuous blessings, lasting impact.",
    cta: "Start a Subscription",
    link: "/programs",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Users,
    title: "Sponsor a Family or Individual",
    description: "Support a verified widow, orphan, student, medical patient, or family in need. Meet them, stay connected, and see the difference your sponsorship makes over time.",
    cta: "Learn About Sponsorship",
    link: "/sponsorship",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: HomeIcon,
    title: "Neki Bank (Gullak) Contribution",
    description: `Your coins become currency for the Hereafter \n Our community Gullak network — also called the Neki Bank — turns daily generosity into ongoing support. Placed in homes, shops, and offices, each Gullak collects small donations that together fund education, food, and healthcare for families in need. Simple, transparent, and spiritually rewarding.`,
    cta: "Find a Gullak Near You",
    link: "/programs",
    color: "from-cyan-500 to-blue-500"
  },
  {
    icon: UtensilsCrossed,
    title: "Bulk Food Recovery Program",
    description: `From surplus to sustenance.\nThrough our Food Recovery Initiative, leftover food from events and gatherings is collected, inspected, and safely distributed to impoverished communities. A quick call prevents waste and feeds hundreds. Compassion shouldn’t end with the meal — let your occasion nourish others.`,
    cta: "Report Extra Food",
    link: "/donate",
    color: "from-orange-500 to-red-500"
  }
];

const images = [
  {
    id: '1',
    src: '/carousel/scrap.jpeg',
    mobileSrc: '/carousel/scrap.jpeg',
    alt: 'Description 1',
    title: 'Scrap Collection Drive',
  },
  {
    id: '2',
    src: '/carousel/scrap.jpeg',
    mobileSrc: '/carousel/scrap.jpeg',
    alt: 'Description 1',
    title: 'Recycling for a Cause',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        id="home"
        className="relative overflow-hidden min-h-[55svh] flex items-center"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-15 dark:opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "48px 48px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative z-8">
          <div className="grid lg:grid-cols-2 gap-3 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left mt-3 order-2 lg:order-1">
              {/* <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full backdrop-blur-sm border border-primary/20">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">
                    Transforming Lives Since 2021
                  </span>
                </div> */}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Bridging
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  Generosity & Need
                </span>
                Through Compassion
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                We bring compassionate donors together with verified families and individuals in need — supporting them through sponsorships, community drives, and sustainable programs funded by scrap recycling initiatives.
              </p>

              <div className="flex flex-row gap-4 justify-center lg:justify-start">
                <Link href="/donate">
                  <Button
                    size="lg"
                    className="bg-primary hoact:bg-primary/90 text-base h-10 px-8 group"
                  >
                    Donate Now
                    <ArrowRight className="ml-2 w-5 h-5 group-hoact:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/#">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-base h-10 px-8 border-border hoact:bg-accent group"
                  >
                    <HeartHandshake className="w-5 h-5 animate-bounce" />
                    Sponsor Now
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 justify-center lg:justify-start py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>100% Transparent</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Verified Programs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Real Impact</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image with Floating Cards */}
            <div className="relative lg:h-[500px] flex items-center justify-center mb-3 order-1 lg:order-2">
              <div className="relative w-full max-w-xl">
                {/* Main Hero Image */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                  <img
                    src="assets/hero.png"
                    alt="Community Impact"
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent"></div>
                </div>

                {/* Floating Stats Card - Top Left */}
                <div className="absolute left-2 md:-left-8 top-8 md:top-12 bg-card/75 backdrop-blur-sm p-3 md:p-5 rounded-2xl shadow-xl border border-border/50 animate-float">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl md:text-2xl">25K+</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">
                        Items Collected
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Stats Card - Bottom Right */}
                <div className="absolute right-2 md:-right-8 bottom-2 md:-bottom-8 bg-gradient-to-br from-primary to-purple-500 p-3 md:p-5 rounded-2xl shadow-2xl animate-float animation-delay-1000">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="text-white">
                      <div className="text-xl md:text-2xl">1.2K+</div>
                      <div className="text-[10px] md:text-xs opacity-90">
                        Families Helped
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute top-2 md:-top-4 right-8 md:right-12 animate-bounce-slow">
                  <Badge className="bg-green-500 text-white px-3 py-1.5 md:px-4 md:py-2 shadow-lg text-xs md:text-sm">
                    ✓ Verified Programs
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Carousel
        images={images}
        autoPlayInterval={5000}
        showIndicators={true}
        showArrows={true}
      />

      {/* Stats Section (suspense localized) */}
      <section className="bg-bg-background py-16 pt-8 text-center" data-testid="stats-section">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
          Our Impact
        </Badge>
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
      <section className="py-20 bg-gradient-to-b from-card/50 to-background relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Scrap Process
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A seamless journey from donation to impact -
              making giving easier than ever
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative group">
                  {/* Connection Line */}
                  {index < processSteps.length - 1 && (
                    <div className="absolute rotate-90 md:rotate-0 bottom-0 md:top-12 md:left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent z-0"></div>
                  )}

                  <div className="relative bg-card border border-border rounded-2xl p-8 hoact:border-primary/50 transition-all hoact:shadow-xl group-hoact:-translate-y-2 duration-300">
                    {/* Gradient Circle */}
                    <div
                      className={`relative w-24 h-24 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hoact:scale-110 transition-transform`}
                    >
                      <Icon className="w-12 h-12 text-white" />
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm shadow-lg">
                        {step.number}
                      </div>
                    </div>

                    <h3 className="text-xl mb-3 text-center">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed text-center">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Programs Section */}
      <section className="bg-card py-16" data-testid="programs-section">
        <SuspenseSection
          fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><Loading inline={false} label="Loading programs" /></div>}
        >
          <WelfareProgramsSection />
        </SuspenseSection>
      </section>

      {/* Ways you can support */}
      <section className="py-16 bg-muted/30">
        <AnimatedSection variant="fade" className="container mx-auto px-4" rootMargin="-100px" triggerOnce>
          <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
            <h2 className="text-3xl md:text-4xl lg:text-5xl mb-4">Ways You Can Support the Mission</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Every act of compassion strengthens our community. Choose the path that speaks to you:
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
            {supportOptions.map((option, index) => (
              <AnimatedSection key={index} variant="scale" delay={index * 0.1} className={index === 4 ? "md:col-span-2 lg:col-span-1 lg:col-start-2" : ""}>
                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hoact:border-primary/50 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <option.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl mb-3">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {option.description}
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={option.link}>
                        {option.cta}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection variant="fade" className="text-center" triggerOnce>
            <Button size="lg" asChild>
              <Link href="/contribute">
                See All Ways to Contribute
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </AnimatedSection>
        </AnimatedSection>
      </section>

      {/* Testimonials Section (Placeholder for now) */}
      <section className="py-16 md:py-24">
        <AnimatedSection variant="fade" className="container mx-auto px-4" rootMargin="-100px" triggerOnce>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl mb-4">Stories of Impact</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from the families and donors who are part of our movement
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-8 md:p-12 text-center">
                <HandHeart className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-lg italic text-muted-foreground mb-4">
                  "Together, we are Khadim-e-Millat — a community where giving means belonging."
                </p>
                <p className="text-sm text-muted-foreground">
                  More testimonials coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
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
              delay={0.1}
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hoact:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-phone">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Phone</h3>
                </div>
                <div className="text-muted-foreground flex flex-col">
                  <Link href="tel:+918081747259" className="hoact:text-primary transition-colors">
                    +91 80817 47259
                  </Link>
                  <Link href="tel:+919935904289" className="hoact:text-primary transition-colors">
                    +91 99359 04289
                  </Link>
                  <Link href="tel:+919839353055" className="hoact:text-primary transition-colors">
                    +91 98393 53055
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection
              variant="slideUp"
              delay={0.1}
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hoact:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-email">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">Email</h3>
                </div>
                <div className="text-muted-foreground">
                  <Link href="mailto:support@khadimemillat.org" className="hoact:text-primary transition-colors">
                    <p>support@khadimemillat.org</p>
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection
              variant="slideUp"
              delay={0.1}
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="text-center bg-card rounded-lg p-6 shadow-sm hoact:shadow-md transition-shadow h-full flex flex-col justify-between" data-testid="contact-whatsapp">
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