import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SponsorshipRequestWrapper from "@/components/sponsorship/SponsorshipRequestWrapper";

export const metadata: Metadata = {
  title: "Apply for Sponsorship - KMWF",
  description: "Submit your sponsorship request to Khadim-e-Millat Welfare Foundation"
};

export default async function SponsorshipRequestPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in?redirect_url=/sponsorship/request");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Apply for Sponsorship</h1>
            <p className="text-lg text-muted-foreground">
              Complete this form to submit your sponsorship request. Our team will review your application and contact you within 3-5 business days.
            </p>
          </div>
          
          <SponsorshipRequestWrapper />
        </div>
      </div>
    </div>
  );
}