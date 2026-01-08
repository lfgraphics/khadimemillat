"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from "sonner";
import { Loader2, DollarSign, Calendar, User, FileText, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

interface DonationProgram {
  value: string;
  label: string;
  description?: string;
}


export default function OfflineDonationForm() {
  const [donorName, setDonorName] = useState("");
  const [donorNumber, setDonorNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [programs, setPrograms] = useState<DonationProgram[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [donationId, setDonationId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { user } = useUser();
  const router = useRouter()

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const amounts = [500, 1000, 2500, 5000];

  // Fetch programs from API
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setProgramsLoading(true);
        const res = await fetch('/api/public/welfare-programs?format=simple');
        if (!res.ok) throw new Error('Failed to fetch programs');
        const data = await res.json();
        if (data.programs && Array.isArray(data.programs)) {
          setPrograms(data.programs);
          if (data.programs.length > 0 && !selectedProgram) {
            setSelectedProgram(data.programs[0].value);
          }
        }
      } catch (error) {
        console.error('[FETCH_PROGRAMS_ERROR]', error);
        toast.error('Failed to load programs');
        // Fallback programs
        setPrograms([{ value: 'general', label: 'General Donation' }]);
        setSelectedProgram('general');
      } finally {
        setProgramsLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  async function submitOfflineDonation() {
    if (!isFormValid) return;

    setLoading(true);

    try {
      const body = {
        donorName: donorName.trim(),
        donorNumber,
        amount: Number(amount),
        notes: notes.trim(),
        receivedAt,
        programSlug: selectedProgram,
        collectedBy: {
          name: name,
          userId: user?.id
        },
      }

      const res = await fetch("/api/cash-intake/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Donation added successfully!");
        // Store donation ID and show success UI
        setDonationId(data.donation._id);
        setShowSuccess(true);
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isFormValid =
    donorName.trim() !== "" &&
    amount.trim() !== "" &&
    Number(amount) > 0 &&
    receivedAt.trim() !== "";

  const handlePrintReceipt = () => {
    if (donationId) {
      window.open(`/cash-intake/receipt?id=${donationId}`, '_blank');
    }
  };

  const handleAddAnother = () => {
    // Reset all form fields and states
    setDonorName("");
    setDonorNumber("");
    setAmount("");
    setNotes("");
    setReceivedAt(new Date().toISOString().split('T')[0]);
    setDonationId(null);
    setShowSuccess(false);
  };

  // Set default date to today
  useEffect(() => {
    if (!receivedAt) {
      setReceivedAt(new Date().toISOString().split('T')[0]);
    }
  }, [receivedAt]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <DollarSign className="w-6 h-6 text-primary" />
          Add Offline Donation
        </CardTitle>
        <p className="text-muted-foreground">
          Record cash donations received offline
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Amount Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Quick Amount Selection</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {amounts.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant={Number(amount) === amt ? "default" : "outline"}
                onClick={() => setAmount(amt.toString())}
                className="h-12"
              >
                ₹{amt.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Program/Cause Selection */}
        <div className="space-y-2">
          <Label htmlFor="program-select" className="text-base font-medium">
            Select Program/Cause
          </Label>
          <Select
            value={selectedProgram}
            onValueChange={setSelectedProgram}
            disabled={programsLoading}
          >
            <SelectTrigger id="program-select">
              <SelectValue placeholder={programsLoading ? "Loading programs..." : "Select a program"} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.value} value={program.value}>
                  {program.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            placeholder="Enter custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            className="text-lg"
          />
        </div>

        {/* Donor Name */}
        <div className="space-y-2">
          <Label htmlFor="donorName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Donor Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="donorName"
            type="text"
            placeholder="Enter donor's full name"
            value={donorName}
            maxLength={100}
            onChange={(e) => setDonorName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="donorNumber" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Donor Phone Number (Optional)
          </Label>

          <PhoneInput
            id="donorNumber"
            value={donorNumber}
            onChange={(e) => setDonorNumber(e)}
            placeholder="Enter your phone number"
            className="text-sm"
          />
        </div>

        {/* Date Received */}
        <div className="space-y-2">
          <Label htmlFor="receivedAt" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Donation Received <span className="text-destructive">*</span>
          </Label>
          <Input
            id="receivedAt"
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // Can't be future date
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Additional notes or message from donor"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 characters used
            </p>
            {notes.length > 400 && (
              <Badge variant="outline" className="text-xs">
                {500 - notes.length} remaining
              </Badge>
            )}
          </div>
        </div>

        {/* Success Screen or Submit Button */}
        {showSuccess && donationId ? (
          <div className="space-y-4 bg-primary/5 dark:bg-primary/10 p-6 rounded-lg border-2 border-primary">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Donation Submitted Successfully!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                The donation has been recorded and {donorNumber ? 'a WhatsApp notification has been sent to the donor' : 'saved in the system'}.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handlePrintReceipt}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>

              <Button
                onClick={handleAddAnother}
                variant="outline"
                className="w-full h-12 text-lg"
                size="lg"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Add Another Donation
              </Button>

              <Button
                onClick={() => router.push("/cash-intake/list")}
                variant="outline"
                className="w-full h-12 text-lg"
              >
                View All Donations
              </Button>
            </div>
          </div>
        ) : (
          <>
              {/* Submit Button */}
              <Button
                onClick={submitOfflineDonation}
                disabled={!isFormValid || loading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Donation...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Submit Donation
                  </>
                )}
              </Button>

              <Button
                onClick={() => router.push("/cash-intake/list")}
                className="w-full h-12 text-lg bg-blue-400 hover:bg-blue-100 text-white"
              >
                View Donations
              </Button>
          </>
        )}

        {!isFormValid && (donorName || amount || receivedAt) && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">Please complete:</p>
            <ul className="space-y-1">
              {!donorName.trim() && <li>• Donor name is required</li>}
              {(!amount.trim() || Number(amount) <= 0) && <li>• Valid amount is required</li>}
              {!receivedAt.trim() && <li>• Date received is required</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card >
  );
}
