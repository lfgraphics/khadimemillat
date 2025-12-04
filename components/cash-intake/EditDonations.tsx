"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface EditOfflineDonationProps {
  open: boolean;
  donation: any;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditOfflineDonation({
  open,
  donation,
  onClose,
  onUpdated,
}: EditOfflineDonationProps) {
  const [form, setForm] = useState({
    donorName: "",
    amount: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  // Fill form when donation changes
  useEffect(() => {
    if (donation) {
      setForm({
        donorName: donation.donorName || "",
        amount: donation.amount || "",
        notes: donation.notes || "",
      });
    }
  }, [donation]);

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!donation?._id) return toast.error(`Donation id not found!`);

    setLoading(true);
    try {
      const res = await fetch(`/api/cash-intake/edit/${donation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update donation");
        setLoading(false);
        return;
      }

      toast.success("Donation Updated Successfully!")

      onUpdated();
      onClose();
    } catch (err) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Donation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-1">Donor Name</label>
            <Input
              value={form.donorName}
              onChange={(e) => handleChange("donorName", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <Input
              type="number"
              placeholder="amount"
              value={form.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              id="notes"
              placeholder="Additional notes or message from donor"
              value={form.notes}
              maxLength={500}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="break-words break-all whitespace-normal"
            />

          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
