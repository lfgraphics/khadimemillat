import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Headphones, Heart, Mail, Phone, ShoppingBag, Store, Truck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-[#0d89d7] to-[#001018]"></div> */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="hero-section">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="hero-title">
              Transforming Communities
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto" data-testid="hero-description">
              Established in 2021 in Gorakhpur, Uttar Pradesh. Through sustainable scrap collection and redistribution, we create opportunities and support those in need
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/donate" data-testid="donate-button">
                <Button size="lg" variant="secondary" className="px-8 py-4">
                  <Heart className="mr-2 h-5 w-5" />
                  Donate Scrap
                </Button>
              </Link>
              <Link href="/marketplace" data-testid="marketplace-button">
                <Button size="lg" variant="outline" className="px-8 py-4 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-card py-16" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center" data-testid="stat-items-collected">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">25,847</div>
              <div className="text-muted-foreground">Items Collected</div>
            </div>
            <div className="text-center" data-testid="stat-families-helped">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">1,250</div>
              <div className="text-muted-foreground">Families Helped</div>
            </div>
            <div className="text-center" data-testid="stat-volunteers">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">187</div>
              <div className="text-muted-foreground">Active Volunteers</div>
            </div>
            <div className="text-center" data-testid="stat-cities">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">12</div>
              <div className="text-muted-foreground">Cities Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-background py-16" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="how-it-works-title">
              How Our Process Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="how-it-works-description">
              A transparent, efficient system that maximizes impact and ensures every donation reaches those who need it most
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group" data-testid="step-request">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Request Collection</h3>
              <p className="text-muted-foreground">Submit a donation request through our app with your contact details and location</p>
            </div>

            <div className="text-center group" data-testid="step-collection">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Verification & Collection</h3>
              <p className="text-muted-foreground">Our team verifies and collects your items, processing them for maximum utility</p>
            </div>

            <div className="text-center group" data-testid="step-marketplace">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Marketplace Distribution</h3>
              <p className="text-muted-foreground">Items are listed on our marketplace, with proceeds supporting welfare programs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Programs Section */}
      <section className="bg-card py-16" data-testid="programs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="programs-title">
              Our Welfare Programs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="programs-description">
              Supporting communities through various initiatives funded by our sustainable scrap collection operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="overflow-hidden" data-testid="program-education">
              <CardContent className="p-6">
                <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg mb-4 flex items-center justify-center">
                  <Users className="h-16 w-16 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Education Support</h3>
                <p className="text-muted-foreground mb-4">Providing school supplies, books, and educational resources to underprivileged children</p>
                <div className="flex items-center text-sm text-primary">
                  <Users className="mr-2 h-4 w-4" />
                  <span>450 students supported</span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden" data-testid="program-healthcare">
              <CardContent className="p-6">
                <div className="w-full h-48 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg mb-4 flex items-center justify-center">
                  <Heart className="h-16 w-16 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Healthcare Access</h3>
                <p className="text-muted-foreground mb-4">Medical equipment and supplies distribution to local healthcare facilities</p>
                <div className="flex items-center text-sm text-primary">
                  <Heart className="mr-2 h-4 w-4" />
                  <span>23 facilities equipped</span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden" data-testid="program-emergency">
              <CardContent className="p-6">
                <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 rounded-lg mb-4 flex items-center justify-center">
                  <Truck className="h-16 w-16 text-orange-600 dark:text-orange-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Emergency Relief</h3>
                <p className="text-muted-foreground mb-4">Rapid response support during natural disasters and emergency situations</p>
                <div className="flex items-center text-sm text-primary">
                  <Truck className="mr-2 h-4 w-4" />
                  <span>18 emergency responses</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-background py-16" data-testid="contact-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="contact-title">
              Get In Touch
            </h2>
            <p className="text-lg text-muted-foreground">
              Have questions or want to get involved? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="contact-phone">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-muted-foreground">8081747259</p>
              <p className="text-muted-foreground">9935904289</p>
              <p className="text-muted-foreground">9839353055</p>
            </div>

            <div className="text-center" data-testid="contact-email">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground">info@khadimemillat.org</p>
            </div>

            <div className="text-center" data-testid="contact-whatsapp">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">WhatsApp</h3>
              <p className="text-muted-foreground">Quick support available</p>
            </div>
          </div>
        </div>
      </section>
    </div>

  );
}
