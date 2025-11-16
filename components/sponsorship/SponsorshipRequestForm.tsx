"use client";


import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Send, 
  User, 
  FileText,
  Phone
} from "lucide-react";

// Very simple validation schema for sponsorship request
const sponsorshipRequestSchema = z.object({
  // Basic Personal Information
  applicantName: z.string().min(2, "Name must be at least 2 characters"),
  fatherName: z.string().min(2, "Father's name must be at least 2 characters"),
  
  // Contact Information
  phone: z.string().min(10, "Please provide a valid phone number"),
  alternatePhone: z.string().optional(),
  
  // Address
  fullAddress: z.string().min(10, "Please provide complete address"),
  
  // Simple Reason
  reasonForRequest: z.string().min(10, "Please briefly explain why they need help")
});

type SponsorshipRequestForm = z.infer<typeof sponsorshipRequestSchema>;

interface SponsorshipRequestFormProps {
  onSubmit?: (data: SponsorshipRequestForm) => Promise<void>;
  initialData?: Partial<SponsorshipRequestForm>;
  isSubmitting?: boolean;
}

export default function SponsorshipRequestForm({ 
  onSubmit, 
  initialData, 
  isSubmitting = false 
}: SponsorshipRequestFormProps) {
  const form = useForm<SponsorshipRequestForm>({
    resolver: zodResolver(sponsorshipRequestSchema),
    defaultValues: {
      applicantName: "",
      fatherName: "",
      phone: "",
      alternatePhone: "",
      fullAddress: "",
      reasonForRequest: "",
      ...initialData
    }
  });

  const handleSubmit = async (data: SponsorshipRequestForm) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
        // Success handling is done in the wrapper component
        form.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error("Failed to submit request. Please try again.");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Request for Help
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill this simple form to request assistance. Our team will visit you for detailed verification.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Benificiari's Information</h3>
              </div>
              
              <div>
                <Label htmlFor="applicantName">Benificiary Full Name *</Label>
                <Input
                  id="applicantName"
                  {...form.register("applicantName")}
                  placeholder="Enter full name"
                />
                {form.formState.errors.applicantName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.applicantName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  {...form.register("fatherName")}
                  placeholder="Enter father's name"
                />
                {form.formState.errors.fatherName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.fatherName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Contact Details</h3>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="phone number"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="alternatePhone">Alternate Phone (Optional)</Label>
                <Input
                  id="alternatePhone"
                  {...form.register("alternatePhone")}
                  placeholder="Another contact number"
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">              
              <div>
                <Label htmlFor="fullAddress">Complete Address *</Label>
                <Textarea
                  id="fullAddress"
                  {...form.register("fullAddress")}
                  placeholder="Complete address including house number, street, area, city"
                  rows={3}
                />
                {form.formState.errors.fullAddress && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.fullAddress.message}
                  </p>
                )}
              </div>
            </div>

            {/* Reason for Request */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Why You Need Help</h3>
              </div>
              
              <div>
                <Label htmlFor="reasonForRequest">Please tell us about Benificiari's situation *</Label>
                <Textarea
                  id="reasonForRequest"
                  {...form.register("reasonForRequest")}
                  placeholder="Briefly explain why they need assistance..."
                  rows={4}
                />
                {form.formState.errors.reasonForRequest && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.reasonForRequest.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>
                <strong>What happens next?</strong>
              </p>
              <p>
                Our team will contact on given contact information within 2-3 days to schedule a home visit. 
                During the visit, we'll collect detailed information and verify the situation.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}