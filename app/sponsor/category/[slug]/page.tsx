import { Metadata } from "next";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Category from "@/models/Category";
import FamilyMember from "@/models/FamilyMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Heart, 
  Users, 
  Calendar,
  MapPin,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  await connectDB();
  const category = await Category.findOne({ slug, type: 'sponsorship', active: true });
  
  if (!category) {
    return { title: "Category Not Found" };
  }

  return {
    title: `Sponsor ${category.label} - KMWF`,
    description: `Help families in need by sponsoring ${category.label}. Monthly contribution: ₹${category.defaultMonthlyAmount}`
  };
}

async function getCategoryData(slug: string) {
  await connectDB();
  
  const category = await Category.findOne({ 
    slug, 
    type: 'sponsorship', 
    active: true 
  }).lean();

  if (!category) {
    return null;
  }

  // Get available beneficiaries for this category (sorted by newest first)
  const availableBeneficiaries = await FamilyMember.find({
    'sponsorship.availableForSponsorship': true,
    'sponsorship.category': slug,
    'sponsorship.isSponsored': { $ne: true }
  })
  .select('age relationship healthStatus hasDisability sponsorship familySize dependentsCount surveyId')
  .populate('surveyId', 'surveyId')
  .sort({ createdAt: -1 })
  .lean();

  // Get sponsored beneficiaries for this category
  const sponsoredBeneficiaries = await FamilyMember.find({
    'sponsorship.availableForSponsorship': true,
    'sponsorship.category': slug,
    'sponsorship.isSponsored': true
  })
  .select('age relationship healthStatus hasDisability sponsorship familySize dependentsCount surveyId')
  .populate('surveyId', 'surveyId')
  .sort({ 'sponsorship.sponsoredAt': -1 })
  .lean();

  return {
    category,
    availableBeneficiaries,
    sponsoredBeneficiaries
  };
}

export default async function CategorySponsorshipPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCategoryData(slug);

  if (!data) {
    notFound();
  }

  const { category, availableBeneficiaries, sponsoredBeneficiaries } = data;
  const allBeneficiaries = [...(availableBeneficiaries || []), ...(sponsoredBeneficiaries || [])];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" asChild>
              <Link href="/sponsor">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Categories
              </Link>
            </Button>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {(category as any).label}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {(category as any).description}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {availableBeneficiaries.length} Available
                </Badge>
                {sponsoredBeneficiaries.length > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {sponsoredBeneficiaries.length} Sponsored
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Monthly Amount: ₹{(category as any).defaultMonthlyAmount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{availableBeneficiaries.length} people need support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiaries Grid */}
        {allBeneficiaries.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBeneficiaries.map((beneficiary: any, index: number) => {
              const isSponsored = beneficiary.sponsorship?.isSponsored;
              const memberId = beneficiary._id.toString().slice(-6).toUpperCase();
              const surveyId = beneficiary.surveyId?.surveyId || `SUR-${memberId}`;
              
              return (
              <Card key={beneficiary._id} className={`hover:shadow-md transition-shadow ${isSponsored ? 'opacity-75 bg-muted/30' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">
                      ID: {surveyId}
                    </CardTitle>
                    <div className="flex gap-2">
                      {isSponsored && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Sponsored
                        </Badge>
                      )}
                      <Badge variant={beneficiary.hasDisability ? "destructive" : "secondary"}>
                        {beneficiary.hasDisability ? "Special Needs" : "Healthy"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {beneficiary.relationship} • Age {beneficiary.age}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Person Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Health Status</span>
                      <p className="font-medium capitalize">{beneficiary.healthStatus}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Family Size</span>
                      <p className="font-medium">{beneficiary.familySize || 1} members</p>
                    </div>
                    {beneficiary.dependentsCount && (
                      <div>
                        <span className="text-muted-foreground">Dependents</span>
                        <p className="font-medium">{beneficiary.dependentsCount} people</p>
                      </div>
                    )}
                  </div>

                  {/* Requirement */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Monthly Requirement</span>
                      <span className="font-bold text-primary">
                        ₹{beneficiary.sponsorship?.monthlyRequirement?.toLocaleString() || (category as any).defaultMonthlyAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-sm text-muted-foreground">
                    <p className="line-clamp-3">
                      {beneficiary.sponsorship?.description || 
                       `This ${beneficiary.relationship} needs support for ${Array.isArray(category) ? category[0]?.label?.toLowerCase() : category?.label?.toLowerCase()}. Your monthly contribution will help improve their living conditions and provide essential resources.`}
                    </p>
                  </div>

                  {/* Action Button */}
                  {isSponsored ? (
                    <Button disabled className="w-full">
                      <Heart className="w-4 h-4 mr-2" />
                      Already Sponsored
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href={`/sponsor/beneficiary/${beneficiary._id}`}>
                        <Heart className="w-4 h-4 mr-2" />
                        Sponsor This Person
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-card rounded-lg p-8 shadow-sm">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">
                No People Available
              </h3>
              <p className="text-muted-foreground mb-6">
                All people in this category are currently sponsored. 
                Check back later or explore other categories.
              </p>
              <Button asChild>
                <Link href="/sponsor">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Browse Other Categories
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Category Info */}
        <div className="mt-12 bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">About {Array.isArray(category) ? category[0]?.label : category?.label}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">What Your Sponsorship Provides:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Monthly financial support of ₹{Array.isArray(category) ? category[0]?.defaultMonthlyAmount?.toLocaleString() : category?.defaultMonthlyAmount?.toLocaleString()}</li>
                <li>• Direct assistance to verified individuals</li>
                <li>• Regular updates on progress</li>
                <li>• Transparent fund utilization reports</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">How It Works:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Choose a person to sponsor</li>
                <li>• Set up monthly automatic payments</li>
                <li>• Receive quarterly progress reports</li>
                <li>• Cancel or modify anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}