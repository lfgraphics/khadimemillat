"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SponsorshipRequestForm from "./SponsorshipRequestForm";
import { toast } from "sonner";

export default function SponsorshipRequestWrapper() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/sponsorship/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Your sponsorship request has been submitted successfully!');
        router.push(`/sponsorship/request/success?requestId=${result.data.requestId}`);
      } else {
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((detail: any) => 
            `${detail.field}: ${detail.message}`
          ).join(', ');
          toast.error(`Validation errors: ${errorMessages}`);
        } else {
          toast.error(result.error || 'Failed to submit request. Please check your information and try again.');
        }
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SponsorshipRequestForm 
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}