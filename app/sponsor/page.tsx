import { Metadata } from "next";
import connectDB from "@/lib/db";
import Category from "@/models/Category";
import FamilyMember from "@/models/FamilyMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Users,
  ArrowRight,
  GraduationCap,
  Home,
  Utensils,
  Stethoscope,
  Baby,
  UserCheck
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsor a Family - KMWF",
  description: "Make a difference by sponsoring families in need. Choose from various categories and help transform lives."
};

async function getSponsorshipData() {
  await connectDB();

  // Get active sponsorship categories
  const categories = await Category.find({
    type: 'sponsorship',
    active: true
  }).lean();

  // Get available beneficiaries for each category
  const categoriesWithBeneficiaries = await Promise.all(
    categories.map(async (category: any) => {
      const availableBeneficiaries = await FamilyMember.find({
        'sponsorship.availableForSponsorship': true,
        'sponsorship.category': category.slug,
        'sponsorship.isSponsored': { $ne: true }
      }).select('age relationship healthStatus hasDisability sponsorship').lean();

      const sponsoredBeneficiaries = await FamilyMember.find({
        'sponsorship.availableForSponsorship': true,
        'sponsorship.category': category.slug,
        'sponsorship.isSponsored': true
      }).select('age relationship healthStatus hasDisability sponsorship').lean();

      return {
        _id: category._id,
        slug: category.slug,
        label: category.label,
        description: category.description,
        defaultMonthlyAmount: category.defaultMonthlyAmount,
        availableBeneficiaries: availableBeneficiaries.length,
        sponsoredBeneficiaries: sponsoredBeneficiaries.length,
        totalBeneficiaries: availableBeneficiaries.length + sponsoredBeneficiaries.length
      };
    })
  );

  // Sort by available beneficiaries (descending order)
  categoriesWithBeneficiaries.sort((a, b) => b.availableBeneficiaries - a.availableBeneficiaries);

  return categoriesWithBeneficiaries;
}

const categoryIcons: Record<string, any> = {
  'child-education': GraduationCap,
  'widow-support': Heart,
  'elderly-care': UserCheck,
  'disability-support': Stethoscope,
  'orphan-care': Baby,
  'family-support': Users,
  'housing-assistance': Home,
  'food-security': Utensils,
};

export default async function SponsorPage() {
  const categories = await getSponsorshipData();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sponsor a Family
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Make a lasting impact by sponsoring families in need. Your monthly contribution
            provides essential support for education, healthcare, food, and shelter.
          </p>
          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span>100% Transparent</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span>Direct Impact</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              <span>Verified Families</span>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-card rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">
            How Sponsorship Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose a Category</h3>
              <p className="text-muted-foreground">
                Select the type of support you want to provide - education, healthcare, food, or housing.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Select a Family</h3>
              <p className="text-muted-foreground">
                Browse verified families in need and choose one that resonates with you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Sponsoring</h3>
              <p className="text-muted-foreground">
                Set up monthly payments and receive regular updates on your impact.
              </p>
            </div>
          </div>
        </div>

        {/* Impact Stats */}
        <div className="hidden bg-primary rounded-2xl text-primary-foreground p-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Your Impact Matters</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="opacity-80">Families Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₹50L+</div>
              <div className="opacity-80">Total Donations</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="opacity-80">Lives Changed</div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category.slug] || Heart;
            
            return (
              <Link 
                key={`stat-${category._id.toString()}`}
                href={`/sponsor/category/${category.slug}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {category.availableBeneficiaries}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {category.label}
                    </div>
                    {category.sponsoredBeneficiaries > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        {category.sponsoredBeneficiaries} sponsored
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category.slug] || Heart;

            return (
              <Card key={category._id.toString()} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-full bg-primary">
                      <IconComponent className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <Badge variant="secondary">
                      {category.availableBeneficiaries} Available
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {category.label}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                    {category.description}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Monthly Amount */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Monthly Amount</span>
                      <span className="text-lg font-bold text-primary">
                        ₹{category.defaultMonthlyAmount?.toLocaleString()}
                      </span>
                    </div>

                    {/* Action Button */}
                    <Button asChild className="w-full">
                      <Link href={`/sponsor/category/${category.slug}`}>
                        <span>View Beneficiaries</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}