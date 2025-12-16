import { AnimatedSection } from '@/components/animations';
import type { Metadata } from 'next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui";
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    MessageSquare,
    Users,
    Package,
    Handshake,
    Building2
} from "lucide-react";
// Contact form is rendered as a client component below
import ContactForm from '@/components/ContactForm'

// Animation variants
export const metadata: Metadata = {
    title: 'Contact Us - Khadim-e-Millat',
    description: 'Reach Khadim-e-Millat Welfare Foundation in Gorakhpur to sponsor, donate scrap, or volunteer for transparent community welfare.'
};

// Motion shim to allow legacy <motion.div> / <motion.section> usage without motion/react
const motion: any = {
    div: (props: any) => {
        const { children, className, ...rest } = props;
        return <div className={className} {...rest}>{children}</div>;
    },
    section: (props: any) => {
        const { children, className, ...rest } = props;
        return <section className={className} {...rest}>{children}</section>;
    }
};

export default function ContactPage() {
    // Contact form is handled by a client component `ContactForm` to keep this page server-side for SEO.

    const contactInfo = [
        {
            icon: MapPin,
            title: "Head Office",
            details: [
                "Khadim-e-Millat Welfare Foundation",
                "Jafrabazar, Gorakhpur, Uttar Pradesh, India"
            ],
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: Phone,
            title: "Phone",
            details: ["+91 80817 47259"],
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: Mail,
            title: "Email",
            details: ["support@khadimemillat.org"],
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: Clock,
            title: "Working Hours",
            details: ["Monday – Saturday", "10 AM – 6 PM"],
            color: "from-orange-500 to-red-500"
        }
    ];

    const ways = [
        {
            icon: MessageSquare,
            title: "General Enquiries",
            description: "Questions about our initiatives or upcoming drives."
        },
        {
            icon: Users,
            title: "Sponsorship Support",
            description: "Assistance with donor onboarding or updates."
        },
        {
            icon: Package,
            title: "Scrap Donation",
            description: "Schedule a pickup or drop-off point near you."
        },
        {
            icon: Handshake,
            title: "Volunteer & Partnerships",
            description: "Collaborate for drives, CSR, or awareness events."
        }
    ];

    // Form submission moved to client component `ContactForm` (uses Formspree). This keeps the page server-side for SEO.

    return (
        <>
            {/* metadata provided via Next.js `metadata` export above */}
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <AnimatedSection variant="fade" className="relative py-20 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <AnimatedSection variant="fade" delay={0.2} className="max-w-4xl mx-auto text-center">
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Contact Us</Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                                We're Here to Listen, Guide, and Help You Make an Impact
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                                Every act of generosity begins with a conversation. Whether you want to sponsor a family, contribute scrap, volunteer, or simply understand our work better — our team is always ready to connect.
                            </p>
                        </AnimatedSection>
                    </div>
                </AnimatedSection>

                {/* Contact Info Cards */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {contactInfo.map((info, index) => (
                                <AnimatedSection key={index} variant="scale" delay={index * 0.06} className="">
                                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hoact:border-primary/50 transition-all duration-300 group">
                                        <CardContent className="p-6">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <info.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <h3 className="text-lg mb-3">{info.title}</h3>
                                            {info.details.map((detail, idx) => (
                                                <p key={idx} className="text-sm text-muted-foreground">
                                                    {detail}
                                                </p>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Contact Form */}
                            <AnimatedSection variant="fade" triggerOnce>
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                    <CardContent className="p-6 md:p-8">
                                        <h2 className="text-2xl md:text-3xl mb-6">Send Us a Message</h2>

                                        {/* Contact form rendered as a client component for interactive behavior and Formspree submission */}
                                        <ContactForm formEndpoint={process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT} />
                                    </CardContent>
                                </Card>
                            </AnimatedSection>

                            {/* Map and Ways to Reach */}
                            <div className="space-y-8">
                                {/* Google Map */}
                                <AnimatedSection variant="fade" className="" triggerOnce>
                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="aspect-video bg-muted/30 relative">
                                                <iframe
                                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3562.4843867338222!2d83.35141737521882!3d26.760825376738097!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3991452f7bba76a5%3A0xb253b2b9d09702b4!2sKhadim-e-Millat%20Welfare%20Foundation!5e0!3m2!1sen!2sin!4v1762477285152!5m2!1sen!2sin"
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0 }}
                                                    allowFullScreen
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    className="absolute inset-0"
                                                ></iframe>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>

                                {/* Ways to Reach Us */}
                                <AnimatedSection variant="fade" className="" triggerOnce>
                                    <h3 className="text-2xl mb-4">Ways to Reach Us</h3>
                                    <div className="space-y-4">
                                        {ways.map((way, index) => (
                                            <AnimatedSection
                                                key={index}
                                                variant="scale"
                                                delay={index * 0.05}
                                                className=""
                                            >
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hoact:border-primary/50 transition-all duration-300">
                                                    <CardContent className="p-4">
                                                        <div className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                <way.icon className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium mb-1">{way.title}</h4>
                                                                <p className="text-sm text-muted-foreground">{way.description}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </AnimatedSection>
                                        ))}
                                    </div>
                                </AnimatedSection>

                                {/* Visit Us Note */}
                                <AnimatedSection variant="fade" className="" triggerOnce>
                                    <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                                        <CardContent className="p-6">
                                            <Building2 className="w-10 h-10 text-primary mb-3" />
                                            <p className="text-muted-foreground">
                                                We believe in personal connection — if you're nearby, we'd love to meet you at our office or during one of our community events.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
