"use client";
import React from 'react';
import Link from 'next/link';

interface ItemLite { id: string; name: string; }
interface DonorLite { name?: string; phone?: string; email?: string }
interface Props { donor: DonorLite | null; createdAt?: string; items: ItemLite[] }

/**
 * Client component responsible for rendering printable QR code labels.
 * Optimized for 3.5cm thermal printer width.
 */
export const BarcodePrintSheet: React.FC<Props> = ({ donor, createdAt, items }) => {
  // Generate QR code URL using free public API
  // QR code will contain the full marketplace URL for the item
  const getQRCodeUrl = (itemId: string) => {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const marketplaceUrl = `https://khadimemillat.org/marketplace/${itemId}`;
    const params = new URLSearchParams({
      data: marketplaceUrl,
      size: '150x150',
      margin: '5',
      format: 'png'
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="p-4 print:p-0">
      {/* Controls (hidden when printing) */}
      <div className="mb-4 flex justify-between items-start print:hidden print-controls">
        <div>
          <h1 className="text-xl font-semibold">QR Codes for Donation</h1>
          <p className="text-xs text-muted-foreground">Donor: {donor?.name} • {donor?.phone || donor?.email}</p>
          {createdAt && <p className="text-[10px] text-muted-foreground">Created: {new Date(createdAt).toLocaleString()}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-3 py-1 rounded border bg-primary text-primary-foreground text-sm">Print</button>
          <Link href="/list-donation" className="px-3 py-1 rounded border text-sm">Back</Link>
        </div>
      </div>

      {/* Printable Area - Optimized for 3.5cm thermal printer */}
      <div className="print-area flex flex-col items-center gap-3">
        {items.map(item => (
          <div
            key={item.id}
            className="qr-card rounded p-2 flex flex-col items-center gap-1 bg-white text-black border border-gray-400"
          >
            {/* QR Code Image */}
            <img
              src={getQRCodeUrl(item.id)}
              alt={`QR Code for ${item.name}`}
              className="qr-code-img"
              style={{ width: '100px', height: '100px' }}
            />

            {/* Item Details - Compact */}
            <div className="w-full text-center space-y-0">
              <p className="text-[11px] font-bold truncate leading-tight" title={item.name}>{item.name}</p>
              <p className="text-[9px] truncate font-semibold leading-tight" title={donor?.name}>{donor?.name}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        /* Screen enhancements */
        .qr-card { 
          transition: all .2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .qr-card:hover { 
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
          transform: translateY(-2px);
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
          /* Start from top immediately - no centering */
          .print-area { 
            position: absolute; 
            left: 0;
            top: 0;
            width: 3.5cm;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.1cm;
            padding: 0;
          }
          
          .print-controls { display: none !important; }
          
          .qr-card { 
            page-break-inside: avoid; 
            break-inside: avoid; 
            border: 1px solid #000 !important;
            box-shadow: none !important;
            padding: 0.1cm;
            width: 3.3cm !important;
            margin: 0;
            background: white !important;
          }
          
          .qr-code-img {
            width: 2.8cm !important;
            height: 2.8cm !important;
            display: block;
            margin: 0 auto;
          }
          
          .qr-card + .qr-card { 
            margin-top: 0.15cm;
          }
          
          /* Minimize text size for compact printing */
          .qr-card p {
            font-size: 8px !important;
            line-height: 1.1 !important;
            margin: 0 !important;
            padding: 0.5mm 0 !important;
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
