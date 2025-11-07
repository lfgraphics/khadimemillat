import { Card, CardContent } from "@/components/ui/card";
import { Badge, Button } from "@/components/ui";
import { AnimatedSection } from '@/components/animations';
import type { Metadata } from 'next';
import {
    Users,
    Heart,
    FileCheck,
    TrendingUp,
    Home,
    UserCheck,
    CheckCircle2,
    ArrowRight,
    DollarSign,
    Shield,
    Eye,
    ClipboardList
} from "lucide-react";

export const metadata: Metadata = {
    title: 'Sponsorship Program - Khadim-e-Millat',
    description: 'Learn about our transparent sponsorship program — how we assess need, verify beneficiaries, and connect donors with families.'
};

export default function SponsorshipPage() {
    const assessmentPillars = [
        {
            icon: DollarSign,
            title: "Financial Condition (Per-Capita Income)",
            description: "We calculate per-capita income to understand household economic distress.",
            formula: "(Total monthly income − Total monthly expenses) ÷ Number of family members",
            example: "If total household income is ₹6,000, monthly expenses ₹3,000 and family size is 4 → (6,000 − 3,000) ÷ 4 = ₹750 per person.",
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: Users,
            title: "Dependents",
            description: "Dependents increase household vulnerability. We record:",
            items: [
                "Spouse (wife) when not earning",
                "Elderly parents or parents-in-law dependent on the household",
                "Children (especially under 18 or in school)",
                "Persons with disabilities (physical or mental)",
                "Unmarried/divorced/deserted daughters who rely on the household"
            ],
            color: "from-blue-500 to-purple-500"
        },
        {
            icon: Home,
            title: "Social Status",
            description: "Certain social conditions increase priority:",
            items: [
                "Widows, orphans, aged/elderly persons",
                "Chronically ill or disabled family members",
                "Female-headed households without adult male earners",
                "Families living in huts, asbestos-roof dwellings, poorly ventilated rooms, or undeveloped areas"
            ],
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: ClipboardList,
            title: "Inquiry Officer Report",
            description: "The field Inquiry Officer documents:",
            items: [
                "Condition of housing (roof, walls, sanitation)",
                "Employment history & current work capacity of adults",
                "Neighbour/local references & any supporting paperwork",
                "Visual evidence (photos) and scanned documents if available",
                "Officer's recommendation and a numeric score"
            ],
            color: "from-orange-500 to-red-500"
        }
    ];

    const categories = [
        {
            name: "Category 1 — Below Poverty",
            badge: "White Category",
            income: "up to ₹1,500 / month",
            who: "Lowest income, multiple dependents, or major social vulnerabilities (widow, disabled, orphan families).",
            facilities: [
                "Eligible for full sponsorship and monthly stipends",
                "Priority for medical aid, mobile clinics, free medicines & diagnostics",
                "Eligible for ration, widow/disability pensions (where applicable), education aid",
                "Guided assistance for government scheme enrolment and documentation help"
            ],
            color: "border-red-500/50 bg-red-500/10"
        },
        {
            name: "Category 2 — Medium Poverty",
            badge: "Yellow Category",
            income: "₹1,501 – ₹2,000 / month",
            who: "Households with low but slightly higher income than Category 1, limited assets, partial employment or unsteady earnings.",
            facilities: [
                "Eligible for targeted support (partial stipends, subsidised medical treatment, one-off relief for crises)",
                "Access to some welfare services (health camps, training, government scheme guidance)",
                "May receive support for specific needs (school fees, partial medicine costs)",
                "Emergency concessions or short-term aid possible based on officer recommendation"
            ],
            color: "border-yellow-500/50 bg-yellow-500/10"
        },
        {
            name: "Category 3 — Near-Stable / Vulnerability Buffer",
            badge: "Green Category",
            income: "Above ₹2,000 / month",
            who: "Households with modest but comparatively stable income, able to cover most basic expenses but still vulnerable to shocks.",
            facilities: [
                "Priority is lower than Categories 1 & 2; support is usually need-based and episodic",
                "Eligible for skill-development, employment support, and referral to government schemes",
                "May be eligible for targeted temporary aid in verified emergencies"
            ],
            color: "border-green-500/50 bg-green-500/10"
        }
    ];

    const examples = [
        {
            household: "Household A",
            income: "₹6,000",
            expenses: "₹4,500",
            family: "6",
            perCapita: "₹250",
            category: "Category 1",
            reason: "High score on Financial"
        },
        {
            household: "Household B",
            income: "₹9,000",
            expenses: "₹6,000",
            family: "4",
            perCapita: "₹750",
            category: "Category 1 or 2",
            reason: "Dependents include disabled adult"
        },
        {
            household: "Household C",
            income: "₹12,000",
            expenses: "₹8,000",
            family: "4",
            perCapita: "₹1,000",
            category: "Category 2",
            reason: "Fewer dependents, stable housing"
        }
    ];

    return (
        <>
            {/* metadata provided via Next.js `metadata` export */}
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <AnimatedSection variant="fade" className="relative py-20 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <AnimatedSection variant="fade" delay={0.2} className="max-w-4xl mx-auto text-center">
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Sponsorship Program</Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6">
                                Eligibility, Assessment & Categories
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                                Khadim-e-Millat Welfare Foundation (KMWF) uses a clear, fair and repeatable assessment system to decide who qualifies for sponsorship and which level of support each household needs.
                            </p>
                        </AnimatedSection>
                    </div>
                </AnimatedSection>

                {/* Assessment Process */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
                            <h2 className="text-3xl md:text-4xl mb-4">How We Assess Need — Four Assessment Pillars</h2>
                            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                                Every family is assessed on four pillars. A household must meet at least two of these pillars to be eligible for support.
                            </p>
                        </AnimatedSection>

                        <div className="grid md:grid-cols-2 gap-6">
                            {assessmentPillars.map((pillar, index) => (
                                <AnimatedSection key={index} variant="scale" className="">
                                    <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                                        <CardContent className="p-6">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-4`}>
                                                <pillar.icon className="w-7 h-7 text-white" />
                                            </div>
                                            <h3 className="text-xl mb-3">{pillar.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4">{pillar.description}</p>

                                            {pillar.formula && (
                                                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                                    <p className="text-sm"><strong>Formula:</strong></p>
                                                    <p className="text-sm text-muted-foreground">{pillar.formula}</p>
                                                </div>
                                            )}

                                            {pillar.example && (
                                                <div className="bg-primary/10 rounded-lg p-3 mb-3">
                                                    <p className="text-sm text-muted-foreground italic">{pillar.example}</p>
                                                </div>
                                            )}

                                            {pillar.items && (
                                                <ul className="space-y-2">
                                                    {pillar.items.map((item, i) => (
                                                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                                                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Beneficiary Categories */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="text-center mb-12" triggerOnce>
                            <h2 className="text-3xl md:text-4xl mb-4">Beneficiary Categories</h2>
                            <p className="text-lg text-muted-foreground">
                                What each means & facilities provided
                            </p>
                        </AnimatedSection>

                        <div className="space-y-6 max-w-5xl mx-auto">
                            {categories.map((category, index) => (
                                <AnimatedSection key={index} variant="fade" delay={index * 0.06} className="">
                                    <Card className={`${category.color} border-2`}>
                                        <CardContent className="p-6 md:p-8">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                                                <h3 className="text-2xl mb-2 md:mb-0">{category.name}</h3>
                                                <Badge variant="outline" className="w-fit">{category.badge}</Badge>
                                            </div>

                                            <div className="mb-4">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    <strong>Per-capita income:</strong> {category.income}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    <strong>Who falls here:</strong> {category.who}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm mb-3"><strong>Facilities / Eligibility:</strong></p>
                                                <ul className="space-y-2">
                                                    {category.facilities.map((facility, i) => (
                                                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                                                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                            <span>{facility}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Scoring Rubric */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-4xl mx-auto" triggerOnce>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-4xl mb-4">Inquiry Officer Scoring Rubric</h2>
                                <p className="text-lg text-muted-foreground">
                                    Practical & Repeatable Assessment
                                </p>
                            </div>

                            <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-8">
                                <CardContent className="p-6 md:p-8">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left p-3">Pillar</th>
                                                    <th className="text-left p-3">Metric</th>
                                                    <th className="text-left p-3">Score (0–5)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-muted-foreground">
                                                <tr className="border-b border-border/50">
                                                    <td className="p-3">Financial Condition</td>
                                                    <td className="p-3">Per-capita income level</td>
                                                    <td className="p-3">0 (≥₹3000) → 5 (≤₹750)</td>
                                                </tr>
                                                <tr className="border-b border-border/50">
                                                    <td className="p-3">Dependents</td>
                                                    <td className="p-3">Number & vulnerability</td>
                                                    <td className="p-3">0 (none) → 5 (multiple)</td>
                                                </tr>
                                                <tr className="border-b border-border/50">
                                                    <td className="p-3">Social Status</td>
                                                    <td className="p-3">Widow/orphan/disabled</td>
                                                    <td className="p-3">0 (none) → 5 (multiple markers)</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3">Officer Report</td>
                                                    <td className="p-3">Housing, documents, evidence</td>
                                                    <td className="p-3">0 (stable) → 5 (severe distress)</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                                <CardContent className="p-6">
                                    <h4 className="mb-3">Sample Decision Rules:</h4>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li className="flex gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span><strong>Total score 15–20</strong> → Category 1 (Below Poverty)</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span><strong>Total score 8–14</strong> → Category 2 (Medium Poverty)</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span><strong>Total score 0–7</strong> → Category 3 (Near-Stable)</span>
                                        </li>
                                    </ul>
                                    <p className="text-xs text-muted-foreground mt-4 italic">
                                        (These bands can be adjusted by KMWF administration; the score system is a transparency tool.)
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Examples */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" triggerOnce>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-4xl mb-4">Real-World Examples</h2>
                                <p className="text-lg text-muted-foreground">
                                    Quick Reference
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                                {examples.map((example, index) => (
                                    <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
                                        <CardContent className="p-6">
                                            <h3 className="text-lg mb-4">{example.household}</h3>
                                            <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                                <p><strong>Income:</strong> {example.income}</p>
                                                <p><strong>Expenses:</strong> {example.expenses}</p>
                                                <p><strong>Family:</strong> {example.family}</p>
                                                <p className="text-primary"><strong>Per-capita:</strong> {example.perCapita}</p>
                                            </div>
                                            <div className="pt-4 border-t border-border/50">
                                                <Badge className="mb-2">{example.category}</Badge>
                                                <p className="text-xs text-muted-foreground">{example.reason}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Transparency for Donors */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-4xl mx-auto" triggerOnce>
                            <Card className="bg-gradient-to-br from-primary to-purple-500 border-0">
                                <CardContent className="p-8 md:p-12">
                                    <Shield className="w-16 h-16 text-white mx-auto mb-6" />
                                    <h2 className="text-3xl md:text-4xl text-white text-center mb-6">
                                        Transparency for Donors
                                    </h2>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
                                        <p className="text-white mb-4">When you sponsor a family, you will receive:</p>
                                        <ul className="space-y-3 text-white/90">
                                            <li className="flex gap-3">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>Survey summary & category classification</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>Beneficiary ID & basic profile (respecting dignity & privacy)</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>Periodic updates and impact notes</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>Option to meet the family (subject to mutual consent & scheduling)</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <p className="text-lg text-white text-center italic mb-6">
                                        "We meet families where they are — in their homes, in their real circumstances, with dignity."
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                                            Sponsor a Family Now
                                            <Heart className="ml-2 w-5 h-5" />
                                        </Button>
                                        <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                                            See Live Verified Cases
                                            <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Final Message */}
                <section className="py-16 md:py-24 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <AnimatedSection variant="fade" className="max-w-3xl mx-auto text-center" triggerOnce>
                            <Eye className="w-16 h-16 text-primary mx-auto mb-6" />
                            <h2 className="text-2xl md:text-3xl mb-4">
                                Our sponsorship process is designed to be fair, measurable, and accountable.
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                The numeric scoring, the beneficiary card system, and the regular re-checks together ensure your support reaches the genuinely deserving.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button size="lg" asChild>
                                    <a href="#top">
                                        Sponsor a Family Now
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </a>
                                </Button>
                                <Button size="lg" variant="outline">
                                    See Live Verified Cases
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>
            </div>
        </>
    );
}
