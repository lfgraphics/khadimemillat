"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, DollarSign, Calendar, User, FileText } from "lucide-react";

export default function OfflineDonationForm() {
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const amounts = [500, 1000, 2500, 5000];

  async function submitOfflineDonation() {
    if (!isFormValid) return;

    setLoading(true);

    try {
      const body = {
        donorName: donorName.trim(),
        amount: Number(amount),
        notes: notes.trim(),
        receivedAt,
        collectedBy: {
          name: name,
          userId: user?.id
        },
      }

      const res = await fetch("/api/cash-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Donation added successfully!");
        // Reset form
        setDonorName("");
        setAmount("");
        setNotes("");
        setReceivedAt("");
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

        {/* Custom Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            type="string"
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

        {/* Form Validation Info */}
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
    </Card>
  );
}
