"use client";
import React from 'react';
import Barcode from 'react-barcode';
import Link from 'next/link';

interface ItemLite { id: string; name: string; }
interface DonorLite { name?: string; phone?: string; email?: string }
interface Props { donor: DonorLite | null; createdAt?: string; items: ItemLite[] }

/**
 * Client component responsible for rendering printable barcode labels.
 * Separated from server page to avoid styled-jsx + window usage in server context.
 */
export const BarcodePrintSheet: React.FC<Props> = ({ donor, createdAt, items }) => {
  return (
    <div className="p-4 print:p-0">
      {/* Controls (hidden when printing) */}
      <div className="mb-4 flex justify-between items-start print:hidden print-controls">
        <div>
          <h1 className="text-xl font-semibold">Barcodes for Donation</h1>
          <p className="text-xs text-muted-foreground">Donor: {donor?.name} • {donor?.phone || donor?.email}</p>
          {createdAt && <p className="text-[10px] text-muted-foreground">Created: {new Date(createdAt).toLocaleString()}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-3 py-1 rounded border bg-primary text-primary-foreground text-sm">Print</button>
          <Link href="/list-donation" className="px-3 py-1 rounded border text-sm">Back</Link>
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-area flex flex-col items-center gap-4">
        {items.map(item => (
          <div
            key={item.id}
            className="barcode-card rounded p-3 flex flex-col items-center gap-2 bg-white text-black"
            style={{ width: '5cm', maxWidth: '100%' }}
          >
            <Barcode value={item.id} format="CODE128" width={0.6} height={60} fontSize={11} />
            <div className="w-full text-center">
              <p className="text-[13px] font-medium truncate" title={item.name}>{item.name}</p>
              <p className="text-[11px] truncate" title={donor?.name}>{donor?.name}</p>
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        /* Screen enhancements */
        .barcode-card { transition: box-shadow .15s ease; }
        .barcode-card:hover { box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06); }

        @media print {
          /* Hide everything that isn't the print area */
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0.25in 0.5in; background: white; }
          .print-controls { display: none !important; }
          .barcode-card { page-break-inside: avoid; break-inside: avoid; border: 1px solid #000; box-shadow: none !important; }
          .barcode-card + .barcode-card { margin-top: 0.35in; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
  );
};
