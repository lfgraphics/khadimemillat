"use client";
import React from 'react';

interface OfflineDonationData {
  _id: string;
  donorName: string;
  donorNumber?: string;
  amount: number;
  notes?: string;
  programName?: string;
  campaignName?: string;
  receivedAt: string;
  collectedBy: {
    name: string;
    userId: string;
  };
  createdAt: string;
}

interface Props {
  donation: OfflineDonationData;
}

/**
 * Client component for rendering printable offline donation receipts.
 * Optimized for 3.5cm thermal printer width.
 */
export const OfflineDonationReceipt: React.FC<Props> = ({ donation }) => {
  const receiptDate = new Date(donation.receivedAt).toLocaleDateString('en-IN');
  const receiptTime = new Date(donation.createdAt).toLocaleTimeString('en-IN');
  const receiptId = donation._id.toString().slice(-8);

  // Generate QR code URL for organization website
  const getQRCodeUrl = () => {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const organizationUrl = 'https://khadimemillat.org';
    const params = new URLSearchParams({
      data: organizationUrl,
      size: '100x100',
      margin: '2',
      format: 'png'
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="p-4 print:p-0">
      {/* Controls (hidden when printing) */}
      <div className="mb-4 flex justify-between items-start print:hidden print-controls">
        <div>
          <h1 className="text-xl font-semibold">Offline Donation Receipt</h1>
          <p className="text-xs text-muted-foreground">
            Donor: {donation.donorName} • Amount: ₹{donation.amount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Receipt ID: {receiptId} • Date: {receiptDate}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1 rounded border bg-primary text-primary-foreground text-sm"
          >
            Print Receipt
          </button>
          <button
            onClick={() => window.close()}
            className="px-3 py-1 rounded border text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Printable Area - Optimized for 3.5cm thermal printer */}
      <div className="print-area flex flex-col items-center gap-2 bg-background">
        <div className="receipt-card w-full max-w-sm border border-border p-3 bg-card text-card-foreground">
          {/* Organization Header with Logo */}
          <div className="text-center mb-3 border-b border-border pb-2">
            <img
              src="/android-chrome-192x192.png"
              alt="Khadim-e-Millat Logo"
              className="organization-logo mx-auto mb-1"
              style={{ width: '60px', height: '60px' }}
            />
            <h2 className="text-sm font-bold leading-tight">KHADIM-E-MILLAT</h2>
            <h3 className="text-sm font-bold leading-tight">WELFARE FOUNDATION</h3>
            <p className="text-[9px] mt-1 leading-tight">Gorakhpur, Uttar Pradesh</p>
            <p className="text-[8px] leading-tight">PAN: AAICK6626K</p>
          </div>

          {/* Receipt Title */}
          <div className="text-center mb-2">
            <p className="text-xs font-bold">CASH DONATION RECEIPT</p>
            <p className="text-[8px]">Receipt #{receiptId}</p>
          </div>

          {/* Donation Details */}
          <div className="space-y-1 mb-2 text-[9px] border-t border-b border-border py-2">
            <div className="flex justify-between">
              <span className="font-semibold">Donor:</span>
              <span className="text-right max-w-[60%] truncate">{donation.donorName}</span>
            </div>
            {donation.donorNumber && (
              <div className="flex justify-between">
                <span className="font-semibold">Phone:</span>
                <span>{donation.donorNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold">Amount:</span>
              <span className="font-bold">₹{donation.amount.toLocaleString('en-IN')}</span>
            </div>
            {donation.programName && (
              <div className="flex justify-between">
                <span className="font-semibold">Program:</span>
                <span className="text-right max-w-[60%] truncate">{donation.programName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold">Date:</span>
              <span>{receiptDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Time:</span>
              <span>{receiptTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Collected By:</span>
              <span className="text-right max-w-[60%] truncate">{donation.collectedBy.name}</span>
            </div>
          </div>

          {/* Notes */}
          {donation.notes && (
            <div className="mb-2 text-[8px]">
              <p className="font-semibold mb-1">Notes:</p>
              <p className="text-[8px] leading-tight break-words">{donation.notes}</p>
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center my-2">
            <img
              src={getQRCodeUrl()}
              alt="Organization QR Code"
              className="qr-code-img"
              style={{ width: '80px', height: '80px' }}
            />
          </div>

          {/* Footer */}
          <div className="text-center text-[7px] leading-tight border-t border-border pt-2 mt-2">
            <p className="font-semibold">Thank you for your generous donation!</p>
            <p className="mt-1">📞 +91 80817 47259</p>
            <p>🌐 www.khadimemillat.org</p>
            <p className="mt-1">Jazakallahu Khairan</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Screen enhancements */
        .receipt-card {
          transition: all .2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        @media print {
          /* Reset all */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          /* Hide everything except print area */
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }

          /* Optimize for 3.5cm thermal printer width */
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 3.5cm;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0;
          }

          .print-controls { display: none !important; }

          .receipt-card {
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid currentColor !important;
            box-shadow: none !important;
            padding: 0.15cm !important;
            width: 3.3cm !important;
            margin: 0;
            background: white !important;
            color: black !important;
          }

          .qr-code-img {
            width: 2cm !important;
            height: 2cm !important;
            display: block;
            margin: 0 auto;
          }

          .organization-logo {
            width: 1.5cm !important;
            height: 1.5cm !important;
            display: block;
            margin: 0 auto 0.1cm auto;
          }

          /* Minimize text size for compact printing */
          .receipt-card h2,
          .receipt-card h3 {
            font-size: 9px !important;
            line-height: 1.1 !important;
          }

          .receipt-card p,
          .receipt-card span,
          .receipt-card div {
            font-size: 7px !important;
            line-height: 1.2 !important;
          }

          @page {
            size: 3.5cm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
