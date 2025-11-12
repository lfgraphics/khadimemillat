import type { Metadata } from 'next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge, Button } from "@/components/ui";
import Link from 'next/link';
export const metadata: Metadata = {
    title: 'Our Programs - Khadim-e-Millat',
    description: 'Explore our welfare programs — scrap recycling, sponsorships, Sadqa & Zakat, Neki Bank, food redistribution, and livelihood support that turn compassion into lasting change.'
};

// Motion shim to avoid importing motion/react directly; renders plain elements.
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
import {
    Recycle,
    Users,
    Heart,
    HandHeart,
    Shirt,
    Building2,
    Briefcase,
    ArrowRight,
    Quote,
    Sparkles,
    Coins,
    UtensilsCrossed,
    Star,
    MapPin
} from "lucide-react";

// Animation variants
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const popIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function ProgramsPage() {
    const programs = [
        {
            id: 1,
            icon: Recycle,
            title: "Sustainable Scrap Initiative",
            subtitle: "Transforming Waste into Welfare",
            color: "from-green-500 to-emerald-500",
            description: "Our journey began with a simple idea — that even discarded items can change lives. Through our Scrap Collection and Recycling Program, households and businesses donate recyclable materials that our team processes responsibly.",
            details: [
                "The proceeds directly support welfare projects — from education assistance to relief drives — ensuring that nothing truly goes to waste.",
                "This initiative sustains nearly half of our welfare operations, making generosity environmentally friendly and financially steady.",
                "We also refurbish and resell usable spares and items after careful repair. The income from these sales is redirected entirely toward verified families and welfare causes."
            ],
            quote: "Every kilogram of scrap becomes a building block of hope.",
            cta: "Contribute with Scrap",
            ctaLink: "#scrap-donation"
        },
        {
            id: 2,
            icon: Users,
            title: "Family & Individual Sponsorships",
            subtitle: "One Donor, One Family — A Connection That Changes Lives",
            color: "from-blue-500 to-purple-500",
            description: "Our sponsorship program lets compassionate donors take long-term responsibility for families or individuals verified through on-ground surveys.",
            details: [
                "Donors may support essentials like food, healthcare, education, or livelihoods, and can even meet their sponsored families in person.",
                "Every sponsorship is transparent — donors receive detailed background information and updates on how their contribution improves lives."
            ],
            quote: "Because help means more when you know who you're helping.",
            cta: "Sponsor Now",
            ctaLink: "#sponsorship"
        },
        {
            id: 3,
            icon: Heart,
            title: "Community Welfare & Relief Programs",
            subtitle: "Responding to Needs — When and Where It Matters Most",
            color: "from-purple-500 to-pink-500",
            description: "From flood relief in crisis seasons to winter clothing and Ramadan care drives, KMWF runs diverse welfare programs that respond to real-time community needs.",
            details: [
                "Our volunteers ensure swift on-ground action, while our donors make that compassion possible.",
                "Upcoming initiatives include women's empowerment workshops, medical support camps, and education aid for orphans — all funded through scrap proceeds and donations."
            ],
            cta: "Support a Drive",
            ctaLink: "#programs"
        },
        {
            id: 4,
            icon: HandHeart,
            title: "Sadqa & Zakat Distribution",
            subtitle: "Faith in Action",
            color: "from-orange-500 to-red-500",
            description: "KMWF enables donors to fulfil their spiritual obligations responsibly. Through verified data and transparent channels, your Sadqa and Zakat reach the most deserving families and individuals.",
            details: [
                "Our team ensures accurate identification and documentation of beneficiaries, maintaining full accountability and trust at every stage.",
                "Meeting both immediate and long-term needs with complete transparency."
            ],
            quote: "Give with faith, and watch your compassion multiply in impact.",
            ctas: [
                { label: "Fulfil your Zakat", link: "#zakat" },
                { label: "Give Sadqa", link: "#sadqa" }
            ]
        },
        {
            id: 5,
            icon: Shirt,
            title: "Clothing & Recycling Program",
            subtitle: "From Used Fabric to New Hope",
            color: "from-cyan-500 to-blue-500",
            description: "Clothing donations form a major part of our recycling work. Each piece goes through a thoughtful process designed to benefit people at every stage.",
            details: [],
            processes: [
                {
                    title: "Direct Giving",
                    description: "Usable clothes are sorted and distributed to families and individuals in need."
                },
                {
                    title: "Charity Sales",
                    description: "Some donated items are sold at appropriate cost, and the income directly funds other welfare activities and those in need."
                },
                {
                    title: "Recycling & Reuse",
                    description: "Worn-out fabrics are processed into cotton, transformed into mattresses, and then sold — with all proceeds again directed toward those in need."
                }
            ],
            quote: "What once covered one family, now comforts another.",
            note: "Nothing is wasted, and every fibre contributes to comfort and care for someone else."
        },
        {
            id: 6,
            icon: Building2,
            title: "Organization Support",
            subtitle: "Strengthening the System that Serves Others",
            color: "from-indigo-500 to-purple-500",
            description: "Beyond direct charity, some donors choose to help sustain the backbone of the mission — the organisation itself.",
            details: [
                "These contributions maintain logistics, surveys, digital operations, volunteer training, and the sustainability of every ongoing program.",
                "Your support here ensures that KMWF remains equipped to keep serving — consistently, transparently, and effectively."
            ],
            cta: "Support Operations",
            ctaLink: "#org-support"
        },
        {
            id: 7,
            icon: Briefcase,
            title: "Employment & Financial Support",
            subtitle: "Creating Livelihoods, Not Dependence",
            color: "from-amber-500 to-orange-500",
            description: "Beyond immediate relief, Khadim-e-Millat invests in long-term empowerment.",
            details: [
                "We provide employment opportunities to skilled but unemployed individuals, helping them regain stability and dignity.",
                "We offer monthly stipends to those who have no source of income or are unable to work due to age, illness, or disability.",
                "For urgent financial needs — such as medical operations, education expenses, or crisis situations — we host verified donation campaigns on our website."
            ],
            campaignNote: "Each campaign transparently shows the target, collected amount, and completion status, ensuring accountability at every stage.",
            paymentNote: "All campaign contributions are processed securely through our Razorpay payment gateway and credited directly to the organisation's official account. After deducting standard payment-gateway charges, the full remaining amount is delivered to the verified recipient.",
            quote: "We believe in sustainable help — where every rupee restores not just relief, but livelihood."
        },
        {
            id: 8,
            icon: Coins,
            title: "Neki Bank — Your Account of Eternal Rewards",
            subtitle: "The Everyday Charity System",
            color: "from-amber-500 to-yellow-500",
            description: "Every coin has a purpose, every rupee has potential. At Khadim-e-Millat Welfare Foundation, the Golak System—lovingly known as the Neki Bank—turns daily generosity into lasting impact. It's not a bank of this world, but one of the Hereafter, where every deposit of kindness becomes eternal profit.",
            details: [
                "Each Neki Bank (Golak) is a small metal or digital box with a big mission. It sits quietly in homes, shops, offices, and schools, waiting for moments of goodness.",
                "A child saving a rupee after buying candy, a family setting aside a portion before a meal, a traveller giving thanks before a safe journey — every small act becomes part of continuous charity.",
                "Once full, each Golak is collected, opened in the presence of its caretaker, counted, logged, and resealed for the next round with complete transparency.",
                "Faith teaches that charity does not reduce wealth—it multiplies it. Through the Neki Bank, we turn that belief into a living practice."
            ],
            quote: "Where your coins become currency for the Hereafter.",
            note: "Your Golak doesn't just collect coins—it collects blessings.",
            cta: "Register a Golak",
            ctaLink: "#golak-registration"
        },
        {
            id: 9,
            icon: UtensilsCrossed,
            title: "From Tables to Tummies — The Food Recovery Initiative",
            subtitle: "Bulk Food Redistribution Program",
            color: "from-orange-500 to-red-500",
            description: "Every day, countless meals are prepared across weddings, community events, and gatherings. Often, a large portion goes uneaten—not out of neglect, but simply because there's more than people can finish. Instead of letting this food go to waste, KMWF transforms it into nourishment for those who truly need it.",
            details: [
                "Anyone can participate. When there's extra food left from an event, restaurant, or household function, simply contact KMWF through our helpline or website.",
                "Our collection team quickly visits the location, inspects and safely packs the food, then transports it to the nearest underserved area or village.",
                "Distribution happens within hours, ensuring freshness, hygiene, and dignity for all recipients.",
                "This initiative not only prevents waste but restores value to what would have been lost. Each plate becomes a meal for someone hungry."
            ],
            quote: "Where surplus becomes sustenance.",
            note: "For the donors, it's effortless yet deeply meaningful: a chance to convert excess into sustenance, convenience into compassion.",
            cta: "Report Extra Food",
            ctaLink: "#food-donation"
        }
    ];

    return (
        <>
            {/* metadata provided via Next.js `metadata` export above */}
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <motion.section
                    className="relative py-20 md:py-32 overflow-hidden"
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <motion.div
                            className="max-w-4xl mx-auto text-center"
                            variants={fadeIn}
                            transition={{ delay: 0.2 }}
                        >
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Our Programs</Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                                Programs That Empower Change
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                                At Khadim-e-Millat Welfare Foundation, we believe that compassion should be simple, accessible, and continuous. Every individual, family, and business can contribute in a way that fits their life. Whether you give time, items, or income—every act matters, because together they sustain the lives of thousands.
                            </p>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Programs List */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="space-y-16 md:space-y-24">
                            {programs.map((program, index) => (
                                <motion.div
                                    key={program.id}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-100px" }}
                                    variants={staggerContainer}
                                >
                                    <div className={`${index % 2 === 1 ? 'bg-muted/30' : ''} ${index % 2 === 1 ? '-mx-4 md:-mx-8 px-4 md:px-8 py-12 md:py-16' : ''}`}>
                                        <div className={`max-w-5xl ${index % 2 === 0 ? 'mx-auto' : 'ml-auto mr-0'}`}>
                                            {/* Program Header */}
                                            <motion.div
                                                className="flex items-start gap-6 mb-8"
                                                variants={fadeIn}
                                            >
                                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center flex-shrink-0`}>
                                                    <program.icon className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            Program {program.id}
                                                        </Badge>
                                                    </div>
                                                    <h2 className="text-3xl md:text-4xl mb-2">{program.title}</h2>
                                                    <p className="text-lg text-primary italic">"{program.subtitle}"</p>
                                                </div>
                                            </motion.div>

                                            {/* Program Content */}
                                            <motion.div variants={fadeIn} className="space-y-6">
                                                <p className="text-lg text-muted-foreground">
                                                    {program.description}
                                                </p>

                                                {program.details && program.details.length > 0 && (
                                                    <div className="space-y-3">
                                                        {program.details.map((detail, idx) => (
                                                            <motion.div
                                                                key={idx}
                                                                variants={fadeIn}
                                                                className="flex gap-3"
                                                            >
                                                                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                                <p className="text-muted-foreground">{detail}</p>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}

                                                {program.processes && (
                                                    <motion.div
                                                        className="grid md:grid-cols-3 gap-4 my-6"
                                                        variants={staggerContainer}
                                                    >
                                                        {program.processes.map((process, idx) => (
                                                            <motion.div key={idx} variants={popIn}>
                                                                <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50">
                                                                    <CardContent className="p-4">
                                                                        <h4 className="font-medium mb-2">{process.title}</h4>
                                                                        <p className="text-sm text-muted-foreground">{process.description}</p>
                                                                    </CardContent>
                                                                </Card>
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                )}

                                                {program.campaignNote && (
                                                    <motion.div variants={fadeIn}>
                                                        <Card className="bg-primary/5 border-primary/20">
                                                            <CardContent className="p-4">
                                                                <p className="text-sm text-muted-foreground">{program.campaignNote}</p>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                )}

                                                {program.paymentNote && (
                                                    <motion.div variants={fadeIn}>
                                                        <Card className="bg-muted/50 border-border/50">
                                                            <CardContent className="p-4">
                                                                <p className="text-sm text-muted-foreground">{program.paymentNote}</p>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                )}

                                                {program.note && (
                                                    <p className="text-muted-foreground italic">{program.note}</p>
                                                )}

                                                {program.quote && (
                                                    <motion.div
                                                        variants={popIn}
                                                        className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-l-4 border-primary p-6 rounded-r-xl"
                                                    >
                                                        <div className="flex gap-4">
                                                            <Quote className="w-6 h-6 text-primary flex-shrink-0" />
                                                            <p className="text-lg italic">{program.quote}</p>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* CTA Buttons */}
                                                <motion.div
                                                    variants={fadeIn}
                                                    className="flex flex-wrap gap-4 pt-4"
                                                >
                                                    {program.cta && (
                                                        <Button
                                                            size="lg"
                                                            className={`bg-gradient-to-r ${program.color} text-white border-0 hoact:opacity-90`}
                                                        >
                                                            {program.cta}
                                                            <ArrowRight className="ml-2 w-5 h-5" />
                                                        </Button>
                                                    )}
                                                    {program.ctas && program.ctas.map((cta, idx) => (
                                                        <Button
                                                            key={idx}
                                                            size="lg"
                                                            variant={idx === 0 ? "default" : "outline"}
                                                            className={idx === 0 ? `bg-gradient-to-r ${program.color} text-white border-0 hoact:opacity-90` : ''}
                                                        >
                                                            {cta.label}
                                                            <ArrowRight className="ml-2 w-5 h-5" />
                                                        </Button>
                                                    ))}
                                                </motion.div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Ways to Contribute Section */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <motion.div
                            className="max-w-6xl mx-auto"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                        >
                            <motion.div className="text-center mb-16" variants={fadeIn}>
                                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Ways to Help</Badge>
                                <h2 className="text-4xl md:text-5xl mb-6">Ways to Be a Part of the Mission</h2>
                                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                                    At Khadim-e-Millat Welfare Foundation, we believe that compassion should be simple, accessible, and continuous. Every individual, family, and business can contribute in a way that fits their life. Whether you give time, items, or income—every act matters, because together they sustain the lives of thousands.
                                </p>
                            </motion.div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[
                                    {
                                        icon: Users,
                                        title: "Sponsor a Family or Individual",
                                        description: "Take long-term responsibility for a verified beneficiary. Choose from categories such as widows, orphans, students, and patients.",
                                        cta: "Sponsor Now",
                                        color: "from-blue-500 to-purple-500"
                                    },
                                    {
                                        icon: Heart,
                                        title: "Subscribe to Ongoing Sadqa",
                                        description: "Make charity a habit, not an occasion. Choose a daily, weekly, monthly, or yearly plan and let your Sadqa flow automatically.",
                                        cta: "Start Subscription",
                                        color: "from-purple-500 to-pink-500"
                                    },
                                    {
                                        icon: Recycle,
                                        title: "Contribute Through Scrap and Clothing",
                                        description: "Donate recyclable materials or used clothes. KMWF processes them sustainably, turning items into funds that fuel welfare programs.",
                                        cta: "Donate Scrap",
                                        color: "from-green-500 to-emerald-500"
                                    },
                                    {
                                        icon: Coins,
                                        title: "Join the Neki Bank Network",
                                        description: "Host a Golak in your home, office, or shop. Your personal bank of blessings—where every small coin becomes lasting charity.",
                                        cta: "Register a Golak",
                                        color: "from-amber-500 to-yellow-500",
                                        note: "You may not remember each coin you gave, but heaven does."
                                    },
                                    {
                                        icon: UtensilsCrossed,
                                        title: "Share Unused Food",
                                        description: "Be part of our Food Redistribution Drive. When there's extra food after an event, let us know. We reduce waste and spread warmth—one meal at a time.",
                                        cta: "Report Extra Food",
                                        color: "from-orange-500 to-red-500"
                                    },
                                    {
                                        icon: HandHeart,
                                        title: "Volunteer or Partner",
                                        description: "Join hands with us as a volunteer, organization, or CSR partner. Help conduct drives, awareness campaigns, and community upliftment projects.",
                                        cta: "Get Involved",
                                        color: "from-teal-500 to-cyan-500"
                                    }
                                ].map((way, index) => (
                                    <motion.div key={index} variants={popIn}>
                                        <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group">
                                            <CardContent className="p-6">
                                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${way.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                    <way.icon className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-xl mb-3">{way.title}</h3>
                                                <p className="text-muted-foreground mb-4">{way.description}</p>
                                                {way.note && (
                                                    <p className="text-sm italic text-primary mb-4">"{way.note}"</p>
                                                )}
                                                <Button 
                                                    className={`w-full bg-gradient-to-r ${way.color} text-white border-0 hover:opacity-90`}
                                                >
                                                    {way.cta}
                                                    <ArrowRight className="ml-2 w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div 
                                className="text-center mt-16"
                                variants={fadeIn}
                            >
                                <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 max-w-4xl mx-auto">
                                    <CardContent className="p-8">
                                        <Quote className="w-12 h-12 text-primary mx-auto mb-4" />
                                        <p className="text-xl italic text-muted-foreground">
                                            "At KMWF, every rupee, every scrap, every meal, and every moment counts. When compassion finds structure, miracles become measurable."
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Closing Section */}
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background">
                    <div className="container mx-auto px-4">
                        <motion.div
                            className="max-w-4xl mx-auto text-center"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeIn}
                        >
                            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                                <CardContent className="p-8 md:p-12">
                                    <div className="flex justify-center mb-6">
                                        <Quote className="w-12 h-12 text-primary" />
                                    </div>
                                    <blockquote className="text-xl md:text-2xl italic mb-6">
                                        "At Khadim-e-Millat, every program begins with trust and ends with impact — uniting faith, community, and sustainability in a single act of giving."
                                    </blockquote>
                                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                                        <Button size="lg" className="bg-primary hoact:bg-primary/90">
                                            Start Giving Today
                                            <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                        <Button size="lg" variant="outline" asChild>
                                            <Link href="/about">
                                                Learn More About Us
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            </div>
        </>
    );
}
