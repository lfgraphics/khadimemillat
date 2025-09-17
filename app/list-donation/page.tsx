"use client"
/**
 * Donation Intake Page
 * Flow:
 *  - Search / create donor (Clerk + Mongo linkage)
 *  - Stage multiple items (with images, condition, marketplace listing intent)
 *  - Generate temporary barcodes (UUID) locally
 *  - On finalize: confirmation modal -> POST to full submission endpoint
 *  - Redirect to print page with persistent barcodes (Mongo IDs)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SearchableDropDownSelect, { ComboboxOption } from '@/components/searchable-dropdown-select';
import UserSearchAndCreate, { Donor } from '@/components/UserSearchAndCreate';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Loading from '@/app/loading';

interface UserOption { id: string; name: string; email?: string; phone?: string; clerkUserId?: string; mongoUserId?: string }
interface LocalItem { tempId: string; serverId?: string; name: string; description: string; donorId: string; donorName: string; condition: string; photos: { before: string[]; after: string[] }; marketplace: { listed: boolean; demandedPrice?: number } }

const CONDITIONS = ["new", "good", "repairable", "scrap", "not applicable"] as const;

// Predefined item names (excerpt from receipt) could be extracted to a separate file
const PRESET_ITEM_NAMES = [
  'Paper','Carton','Books','Plastic','Used clothes','Iron','Aluminium','Steel','Copper','Wire','Fan','Table Fan','Exhaust Fan','Radio','VCR','CD Player','Amplifier','Woofer','Land line phone','Sound box','Emergency Light','Room Heater','Roster','Rice Cooker','Oven','Cooler Motor','Thermas','Electric Stove','Gas Stove','Iron Box','Hair Dryer','Stabilizer','Massage Machine','Mixer','Geyser','A.C','Water Filter','Iron Stand','Vacuum Cleaner','Water pump','Watch','Child walker','Electronic accs.','Mobile/Tablet','Camera','Cooler','TV','Washing Machine','Refrigerator','TV Table','Computer Table','Wood Table','Counter Table','Dining Table','Dressing Table','Showcase','Wood bed','Malledaan','Tagat','Wood Almira','Iron Almira','Wood chair','Center Table','Wooden door','Door Frame','Sofa','Plywood','Wood','CPU','Moniter','UPS','Printer','Scanner','Laptop','Computer accs.','patient Bed','Wheel chair','Walker','Walking stick','Soap Nut','Medicine','Sewing Machine','Wash basin','Chair','Exercise cycle','Exercise Machine','Cycle','Glass Vessel','Tyres','Bags','Slippers','Mattress','Carpet','Water Tank','Crockery','Motor Cycle'
];

// Convert to options
const presetOptions: ComboboxOption[] = PRESET_ITEM_NAMES.map(n => ({ value: n, label: n }));

type NewUserForm = { name: string; mobile: string };

const DonationListManager: React.FC = () => {
  const [donor, setDonor] = useState<Donor | null>(null);

  const emptyItem = useCallback((): LocalItem => ({ tempId: crypto.randomUUID(), name: '', description: '', donorId: donor?.mongoUserId || donor?.id || '', donorName: donor?.name || '', condition: 'good', photos: { before: [], after: [] }, marketplace: { listed: false } }), [donor]);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [currentItem, setCurrentItem] = useState<LocalItem>(emptyItem());
  const [submitting, setSubmitting] = useState(false);
  const [itemNameSearch, setItemNameSearch] = useState('');
  const [preset, setPreset] = useState('');
  const [loadingSearchUsers] = useState(false);

  useEffect(() => { setCurrentItem(emptyItem()); }, [donor, emptyItem]);

  const pushItem = () => {
    const selectedUser = donor?.mongoUserId || donor?.id || '';
    if (!selectedUser || !currentItem.name.trim()) return;
    setItems(prev => [{ ...currentItem, donorId: selectedUser, donorName: donor?.name || '' }, ...prev]);
    setCurrentItem(emptyItem());
    setPreset('');
    setItemNameSearch('');
  };

  const fileListToBase64 = async (files: FileList | null): Promise<string[]> => {
    if (!files) return [];
    return await Promise.all(Array.from(files).map(f => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(f); })));
  };
  const handleBeforeImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const base64 = await fileListToBase64(files);
    setCurrentItem(ci => ({
      ...ci,
      photos: { ...ci.photos, before: [...ci.photos.before, ...base64] }
    }));
  };
  const handleAfterImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const base64 = await fileListToBase64(files);
    setCurrentItem(ci => ({
      ...ci,
      photos: { ...ci.photos, after: [...ci.photos.after, ...base64] }
    }));
  };
  const removePhoto = (phase: 'before' | 'after', index: number) => setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, [phase]: ci.photos[phase].filter((_, i) => i !== index) } }));

  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const isValidObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
  const openConfirm = () => {
    if (!selectedUser || items.length === 0) return;
    if (!isValidObjectId(selectedUser)) {
      console.warn('[INVALID_DONOR_ID]', selectedUser);
      alert('Selected donor invalid. Choose a donor with a valid Mongo ID.');
      return;
    }
    setConfirmOpen(true);
  };

  const submitAll = async () => {
    if (!selectedUser || items.length === 0) return;
    if (!isValidObjectId(selectedUser)) {
      console.warn('[SUBMIT_BLOCKED_INVALID_DONOR]', selectedUser);
      alert('Cannot submit: donor id invalid.');
      return;
    }
    setFinalizing(true);
    try {
      const payload = { donorId: selectedUser, items: items.map(i => ({ name: i.name, description: i.description, condition: i.condition as any, photos: i.photos, marketplaceListing: { listed: i.marketplace.listed, demandedPrice: i.marketplace.demandedPrice } })) };
      const res = await fetch('/api/protected/donation-entries/full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) {
        console.error('[DONATION_SUBMIT_FAILED]', json);
        alert('Failed to save donation: ' + (json.error || 'Unknown error'));
      }
      if (json.success) {
        const mapIds = json.itemIds as string[];
        setItems(prev => prev.map((it, idx) => ({ ...it, serverId: mapIds[idx] })));
        // Redirect to print page passing donationId
        router.push(`/list-donation/print/${json.donationId}`);
      }
    } catch (err) { console.error(err); } finally { setFinalizing(false); setConfirmOpen(false); }
  };

  // When selecting a preset or creating new preset option
  const handlePresetSelect = (val: string) => {
    setPreset(val);
    if (val) setCurrentItem(ci => ({ ...ci, name: val }));
  };
  const handleCreatePreset = (label: string) => {
    handlePresetSelect(label);
  };

  const selectedUser = donor?.mongoUserId || donor?.id || '';
  const selectedUserDetails = donor;

  const [donorPanelOpen, setDonorPanelOpen] = useState<boolean>(!donor);

  return (
    <div className="space-y-10 relative">
  {(loadingSearchUsers || submitting) && <Loading />}
      <header>
        <h1 className="text-2xl font-bold">Donation Intake & Barcodes</h1>
        <p className="text-sm text-muted-foreground">Create or select a donor, add detailed items with images & marketplace info, then submit to persist and generate verifiable barcodes.</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-semibold text-lg shrink-0">Donor</h2>
          <div className="ml-auto">
            <Collapsible open={donorPanelOpen} onOpenChange={setDonorPanelOpen}>
              <div className="flex justify-end mb-1">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    {donor ? (donorPanelOpen ? 'Hide Donor Panel' : 'Change Donor') : 'Select / Create Donor'}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-4 pt-1">
                <UserSearchAndCreate onSelect={(d)=> { setDonor(d); if(d) setDonorPanelOpen(false); }} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        {donor && (
          <Card className="p-4 border shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{donor.name}</p>
                <p className="text-xs text-muted-foreground">{donor.email || donor.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={()=> setDonorPanelOpen(o=> !o)}>{donorPanelOpen ? 'Close' : 'Change'}</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              {donor.phone && <span>Phone: {donor.phone}</span>}
              {donor.mongoUserId && <span>ID: {donor.mongoUserId.slice(0,6)}…</span>}
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg">Add Item</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Preset / Name</label>
              <SearchableDropDownSelect
                options={presetOptions}
                value={preset}
                onChange={handlePresetSelect}
                searchTerm={itemNameSearch}
                onSearchTermChange={setItemNameSearch}
                onCreateOption={handleCreatePreset}
                placeholder="Search or create item name..."
                width="w-full"
              />
              <Input value={currentItem.name} onChange={e => setCurrentItem(ci => ({ ...ci, name: e.target.value }))} className="mt-2" placeholder="Item name override" />
            </div>
            <div>
              <label className="text-sm font-medium">Condition</label>
              <select className="w-full border rounded p-2 mt-1 bg-background" value={currentItem.condition} onChange={e => setCurrentItem(ci => ({ ...ci, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Marketplace Listing</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={currentItem.marketplace.listed} onChange={e => setCurrentItem(ci => ({ ...ci, marketplace: { ...ci.marketplace, listed: e.target.checked } }))} />
                <span className="text-sm">List Immediately</span>
              </div>
              {currentItem.marketplace.listed && (
                <Input type="number" min={0} className="mt-2" placeholder="Demanded Price" value={currentItem.marketplace.demandedPrice ?? ''} onChange={e => setCurrentItem(ci => ({ ...ci, marketplace: { ...ci.marketplace, demandedPrice: e.target.value ? Number(e.target.value) : undefined } }))} />
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={currentItem.description} onChange={e => setCurrentItem(ci => ({ ...ci, description: e.target.value }))} placeholder="Notes, defects, etc." className="mt-1" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Before Images</label>
              <Input type="file" multiple accept="image/*" onChange={handleBeforeImages} className="mt-1" />
              <div className="flex flex-wrap gap-2 mt-2">
                {currentItem.photos.before.map((b, i) => (
                  <div key={i} className="relative group">
                    <img src={b} alt="before" className="w-16 h-16 object-cover rounded" />
                    <button type="button" onClick={() => removePhoto('before', i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">After Images</label>
              <Input type="file" multiple accept="image/*" onChange={handleAfterImages} className="mt-1" />
              <div className="flex flex-wrap gap-2 mt-2">
                {currentItem.photos.after.map((a, i) => (
                  <div key={i} className="relative group">
                    <img src={a} alt="after" className="w-16 h-16 object-cover rounded" />
                    <button type="button" onClick={() => removePhoto('after', i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
  <Button type="button" onClick={pushItem} disabled={!selectedUser || !currentItem.name}>Add Item to List</Button>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">Pending Items <span className="text-xs font-normal text-muted-foreground">({items.length})</span></h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div key={item.tempId} className="border rounded-lg p-4 space-y-2 bg-card">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-medium text-lg">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">Donor: {item.donorName}</p>
                  <p className="text-[10px] uppercase tracking-wide">{item.condition}</p>
                  {item.marketplace.listed && <p className="text-[11px] text-green-600">₹{item.marketplace.demandedPrice}</p>}
                </div>
                {item.serverId && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">Saved</span>}
              </div>
              <div className="flex gap-1 flex-wrap">
                {item.photos.before.slice(0,3).map((b,i)=>(<img key={i} src={b} className="w-10 h-10 object-cover rounded" alt="b" />))}
                {item.photos.after.slice(0,3).map((a,i)=>(<img key={i} src={a} className="w-10 h-10 object-cover rounded" alt="a" />))}
              </div>
              <div className="pt-2 flex flex-col items-center gap-1">
                <Barcode value={item.serverId || item.tempId} format="CODE128" width={0.8} height={50} fontSize={11} />
                <p className="text-[10px] text-muted-foreground">{item.serverId ? 'ID:' : 'TEMP:'} {item.serverId || item.tempId}</p>
              </div>
            </div>
          ))}
        </div>
  <Button type="button" onClick={openConfirm} disabled={finalizing || items.length === 0 || !selectedUser}>{finalizing ? 'Submitting...' : 'Finalize & Print'}</Button>
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-background border rounded-lg p-6 w-full max-w-md space-y-4 shadow-lg">
              <h3 className="text-lg font-semibold">Confirm Finalization</h3>
              <p className="text-sm text-muted-foreground">You're about to persist {items.length} item(s) for donor <span className="font-medium">{selectedUserDetails?.name}</span>. After saving you'll be redirected to a printable barcode page. Continue?</p>
              <ul className="text-xs max-h-24 overflow-auto list-disc pl-4 space-y-0.5">
                {items.map(i => <li key={i.tempId}>{i.name} {i.marketplace.listed && <span className="text-green-600">(₹{i.marketplace.demandedPrice})</span>}</li>)}
              </ul>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setConfirmOpen(false)} disabled={finalizing}>Cancel</Button>
                <Button type="button" onClick={submitAll} disabled={finalizing}>{finalizing ? 'Saving...' : 'Confirm & Save'}</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default function Page() {
  return (
    <div className="p-6">
      <DonationListManager />
    </div>
  )
}
