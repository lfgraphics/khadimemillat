import { forwardRef } from "react"

interface DonationPrintSlipProps {
  donation: any
}

const DonationPrintSlip = forwardRef<HTMLDivElement, DonationPrintSlipProps>(
  ({ donation }, ref) => {
    return (
      <div
        ref={ref}

        className="
          w-[320px] max-w-full p-4 text-black bg-white
          font-sans
        "
        style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}
      >
        <div className="text-center mb-2">
          <img src="../favicon.ico" alt="Logo" className="mx-auto h-12 mb-1" />
          <h1 className="text-lg font-bold">Khadim-e-Millat Welfare Foundation</h1>
          <p className="text-xs text-gray-600 mt-1">Donation Receipt</p>
        </div>

        <hr className="border-gray-300 my-2" />

        <div className="text-left text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Donor Name:</span>
            <span>{donation.donorName}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">Amount:</span>
            <span>₹{donation.amount}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{new Date(donation.receivedAt).toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">Collected By:</span>
            <span>{donation.collectedBy.name}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">Donation ID:</span>
            <span>{donation._id}</span>
          </div>
        </div>

        <hr className="border-gray-300 my-2" />

        <div className="mt-2 text-center text-gray-500 text-xs">
          Thank you for your contribution.
        </div>
      </div>
    )
  }
)

DonationPrintSlip.displayName = "DonationPrintSlip"
export default DonationPrintSlip


