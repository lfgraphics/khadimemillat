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
      <div className="mb-4 flex justify-between items-start print:hidden">
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
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
        {items.map(item => (
          <div key={item.id} className="border rounded p-2 flex flex-col items-center gap-1 label:block" style={{ width: '180px' }}>
            <Barcode value={item.id} format="CODE128" width={1} height={50} fontSize={10} />
            <div className="w-full text-center">
              <p className="text-[11px] font-medium truncate" title={item.name}>{item.name}</p>
              <p className="text-[10px] text-muted-foreground truncate" title={donor?.name}>{donor?.name}</p>
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @media print {
          body { background: white; }
          .label\\:block { break-inside: avoid; }
          @page { size: 50mm auto; margin: 4mm; }
        }
      `}</style>
    </div>
  );
};
