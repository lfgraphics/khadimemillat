"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function OfflineDonationForm() {
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const { user } = useUser();

  const name = `${user?.firstName} ${user?.lastName}`
  const amounts = [500, 1000, 2500, 5000];

  async function submitOfflineDonation() {
    setLoading(true); setResponseMsg("");

    const res = await fetch("/api/cash-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorName,
        amount: Number(amount),
        notes,
        receivedAt,
        collectedBy: name,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setResponseMsg("Donation added successfully");
      setDonorName("");
      setAmount("");
      setNotes("");
      setReceivedAt("");
    } else {
      setResponseMsg(data.error || "Something went wrong");
    }
  }
  const isFormValid =
    donorName.trim() !== "" &&
    amount.trim() !== "" &&
    receivedAt.trim() !== "";

  useEffect(() => {
    if (!responseMsg) return;

    const timer = setTimeout(() => {
      setResponseMsg("");
    }, 3000);
    return () => clearTimeout(timer)
  }, [responseMsg]);


  return (

    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex justify-center items-start py-20">
      <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-semibold text-center mb-6">Add Offline Donation</h2>

        {
          responseMsg && (
            <div
              className={`mt-4 mb-4 p-4 rounded-lg text-center font-medium border
      animate-[fadein_0.4s_ease-out,fadeout_0.4s_ease-in_2.6s_forwards]
      ${responseMsg.includes("successfully")
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-red-100 text-red-700 border-red-300"
                }
    `}
            >
              {responseMsg}
            </div>
          )
        }

        <div className="grid grid-cols-2 gap-4 mb-3">
          {amounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt.toString())}
              className={`py-2 border rounded-lg hover:bg-gray-100 ${Number(amount) == amt ? "bg-purple-100 border-purple-500 font-semibold" : ""
                }`}
            >
              ₹{amt.toLocaleString()}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium">
          Amount <span className="text-red-500">*</span>
        </label>

        <input
          type="number"
          placeholder="Enter custom amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3"
        />


        <label className="block text-sm font-medium">
          Donor Name<span className="text-red-500">*</span>
        </label>

        <input
          type="text"
          placeholder="Donor Name"
          value={donorName}
          maxLength={50}
          onChange={(e) => setDonorName(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3"
        />

        <label className="block text-sm font-medium">
          Notes
        </label>

        <textarea
          placeholder="Notes / Message (optional)"
          value={notes}
          maxLength={200}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3"
        />
        <p className="text-xs text-gray-500 mb-3">
          {notes.length}/200 characters used
        </p>

        <label className="text-sm font-medium">
          Date Donation Received <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          className="w-full border p-2 rounded-lg mb-4"
        />

        <button
          onClick={submitOfflineDonation}
          disabled={!isFormValid || loading}
          className={`w-full py-3 rounded-lg font-semibold transition-all
    ${!isFormValid || loading
              ? "bg-gray-400"
              : "bg-purple-600 hover:bg-purple-700 text-white"
            }
  `}
        >
          {loading ? "Saving..." : "Submit Donation"}
        </button>
      </div>
    </div >
  );
}
