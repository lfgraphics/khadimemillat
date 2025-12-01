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
import { Loader2, DollarSign, Calendar, User, FileText, Phone } from "lucide-react";

export default function OfflineDonationForm() {
  const [donorName, setDonorName] = useState("");
  const [donorNumber, setDonorNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const [showList, setShowList] = useState(false);

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const amounts = [500, 1000, 2500, 5000];

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
        setDonorNumber("");
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
          <Input
            id="donorNumber"
            type="text"
            inputMode="numeric"
            placeholder="Enter donor's Number"
            max={10}
            value={donorNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ""); //INFO: Reg-ex for filtering str
              if (value.length <= 10) setDonorNumber(value);
            }}

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

        <Button
          onClick={() => setShowList(true)}
          className="w-full h-12 text-lg bg-blue-400 hover:bg-blue-100 text-white"
        >
          View Donations
        </Button>

        {showList && (
          <DonationModal onClose={() => setShowList(false)} />
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
    </Card>
  );
}


function DonationModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const filtered = donations.filter(d =>
    d.donorName.toLowerCase().includes(search) ||
    (d.collectedBy?.name || "").toLowerCase().includes(search) ||
    (d.notes || "").toLowerCase().includes(search) ||
    (d.donorNumber?.toString() || "").includes(search)
  );

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cash-intake/list");
      const data = await res.json();
      setDonations(data?.donations || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl p-6 
                      animate-[slideUp_0.35s_ease-out] relative overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl font-bold opacity-70 hover:opacity-100"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-5 text-center">
          Offline Donations
        </h2>

        <div className="flex justify-center mb-4">
          <input
            type="text"
            placeholder="Search donor, collector, notes..."
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
            className="w-full max-w-md border p-2 rounded-lg shadow-sm"
          />
        </div>

        <div className="flex justify-between items-center gap-4 mb-4">

          <div className="flex-1 text-center text-lg font-semibold p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            Total Collection: ₹{filtered.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}
          </div>

          <Button
            onClick={handleCSVExport}
            className="h-12 px-6 text-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Download CSV
          </Button>

        </div>


        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : donations.length === 0 ? (
          <p className="text-center text-muted-foreground">No donations recorded yet.</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-neutral-800 sticky top-0">
                <tr>
                  <th className="p-3 text-left">S. No</th>
                  <th className="p-3 text-left">Donor</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Collector</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Notes</th>
                  <th className="p-3 text-left">Phone No</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((d: any, index: number) => (
                    <tr key={d._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{index + 1}</td>
                      <td className="p-3">{d.donorName}</td>
                      <td className="p-3 font-semibold text-green-700">₹{d.amount}</td>
                      <td className="p-3">{d.collectedBy?.name}</td>
                      <td className="p-3">{new Date(d.receivedAt).toLocaleDateString()}</td>
                      <td className="p-3">{d.notes || "-"}</td>
                      <td className="p-3">{d.donorNumber || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-500">
                      No matching records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div >

  );

}

const handleCSVExport = async () => {
  try {
    const res = await fetch("/api/cash-intake/list");
    const { donations } = await res.json();

    if (!donations?.length) return toast.error("No records found");

    const headers = ["Sr,Name,Amount,Collector,Date,Notes"];
    const rows = donations.map((d: any, i: number) =>
      `${i + 1},${d.donorName},${d.amount},${d.collectedBy?.name || "-"},${new Date(d.receivedAt).toLocaleDateString()},${d.notes || "-"}`
    );

    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    // download instantly
    const a = document.createElement("a");
    a.href = url;
    a.download = "donations.csv";
    a.click();

    setTimeout(() => {
      toast.success("CSV downloaded successfully!");
    }, 700)

    URL.revokeObjectURL(url);
  } catch {
    toast.error("Download failed.");
  }
};
