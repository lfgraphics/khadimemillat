"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, safeJson } from "@/lib/utils";

export interface CollectionRequestFormValues {
  address: string;
  phone: string;
  requestedPickupTime?: string;
  notes?: string;
}

interface CollectionRequestFormProps {
  defaultValues?: Partial<CollectionRequestFormValues>;
  onSuccess?: (data: any) => void;
  className?: string;
  submitLabel?: string;
  donorId?: string; // Optional explicit donor; if omitted backend infers from session
}

export const CollectionRequestForm: React.FC<CollectionRequestFormProps> = ({
  defaultValues,
  onSuccess,
  className,
  submitLabel = "Submit Request",
  donorId,
}) => {
  const [form, setForm] = useState<CollectionRequestFormValues>({
    address: defaultValues?.address || "",
    phone: defaultValues?.phone || "",
    requestedPickupTime: defaultValues?.requestedPickupTime,
    notes: defaultValues?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateField = <K extends keyof CollectionRequestFormValues>(key: K, value: CollectionRequestFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      if (!form.address.trim() || !form.phone.trim()) {
        setError("Address and phone are required.");
        setLoading(false);
        return;
      }
      const payload: any = { ...form };
      if (donorId) payload.donor = donorId;
      const res = await fetch("/api/protected/collection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to submit");
      }
      const data = await safeJson<any>(res);
      setSuccess(true);
      if (onSuccess) onSuccess(data?.data || data);
      setForm(prev => ({ ...prev, notes: "" }));
    } catch (e: any) {
      setError(e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Address<span className="text-red-500">*</span></label>
        <input
          type="text"
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="Pickup address"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Phone<span className="text-red-500">*</span></label>
        <input
          type="tel"
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="Contact number"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Requested Pickup Time</label>
        <input
          type="datetime-local"
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.requestedPickupTime || ""}
          onChange={(e) => updateField("requestedPickupTime", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Describe the scrap items, access instructions, etc."
          rows={5}
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {success && <div className="text-xs text-green-600">Request submitted.</div>}
      <div className="pt-2">
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CollectionRequestForm;
