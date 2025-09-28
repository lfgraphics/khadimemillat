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
import { safeJson } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
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
import { ClickableImage } from '@/components/ui/clickable-image';
import { toast } from 'sonner'

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
  const searchParams = useSearchParams();
  const collectionRequestPrimary = searchParams.get('collectionRequest');
  const collectionRequestLegacy = searchParams.get('collectionRequestId');
  const collectionRequestId = collectionRequestPrimary || collectionRequestLegacy;
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const { user } = useUser();
  const currentRole = (user?.publicMetadata as any)?.role;
  const isScrapper = currentRole === 'scrapper';

  const emptyItem = useCallback((): LocalItem => ({ tempId: crypto.randomUUID(), name: '', description: '', donorId: donor?.mongoUserId || donor?.id || '', donorName: donor?.name || '', condition: 'good', photos: { before: [], after: [] }, marketplace: { listed: false } }), [donor]);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [currentItem, setCurrentItem] = useState<LocalItem>(emptyItem());
  const [submitting, setSubmitting] = useState(false);
  const [itemNameSearch, setItemNameSearch] = useState('');
  const [preset, setPreset] = useState('');
  const [loadingSearchUsers] = useState(false);

  useEffect(() => { setCurrentItem(emptyItem()); }, [donor, emptyItem]);

  // Auto fetch donor from collection request if query param present
  useEffect(() => {
    if (!collectionRequestId) return;
    let cancelled = false;
    (async () => {
      try {
        setAutoFillLoading(true);
        const res = await fetch(`/api/protected/collection-requests/${collectionRequestId}`, { cache: 'no-store' });
        if (!res.ok) return;
  const json = await safeJson<any>(res);
        const req = json.request;
        if (!req || !req.donor) return;
        // Prefer enriched donorDetails from the request (already Clerk-first)
        const dd = req.donorDetails || null;
        if (!cancelled) {
          if (dd) {
            setDonor({ id: dd.id, mongoUserId: req.donorMongoId || undefined, name: dd.name, email: dd.email, phone: dd.phone, clerkUserId: dd.id });
          } else {
            // Fallback fetch
            const userRes = await fetch(`/api/protected/users?search=${encodeURIComponent(req.donor)}`, { cache: 'no-store' });
            const userJson = await safeJson<any>(userRes);
            const isMongoId = /^[a-fA-F0-9]{24}$/.test(req.donor);
            const match = (userJson.users || []).find((u: any) => u.id === req.donor || u.clerkUserId === req.donor || u.mongoUserId === req.donor);
            if (match) {
              setDonor({ id: match.id, mongoUserId: match.mongoUserId, name: match.name, email: match.email, phone: match.phone, clerkUserId: match.id });
            } else {
              // If donor is a Mongo ObjectId, set mongoUserId and avoid setting clerkUserId incorrectly
              if (isMongoId) {
                setDonor({ id: req.donor, mongoUserId: req.donor, name: 'Donor' });
              } else {
                setDonor({ id: req.donor, name: 'Donor', clerkUserId: req.donor });
              }
            }
          }
        }
      } catch (e) { console.warn('[AUTO_FILL_DONOR_FAILED]', e); }
      finally { if (!cancelled) setAutoFillLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [collectionRequestId]);

  const pushItem = () => {
    const selectedUser = donor?.mongoUserId || donor?.id || '';
    if (!selectedUser || !currentItem.name.trim()) return;
    // Ensure a fresh tempId for each push regardless of memoized emptyItem
    const newItem: LocalItem = { ...currentItem, tempId: crypto.randomUUID(), donorId: selectedUser, donorName: donor?.name || '' }
    setItems(prev => [newItem, ...prev]);
    setCurrentItem(emptyItem());
    setPreset('');
    setItemNameSearch('');
  };

  // Image management now handled by ImageUploader (uploads to Cloudinary and stores public_ids)
  const removePhoto = (phase: 'before' | 'after', index: number) => setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, [phase]: ci.photos[phase].filter((_, i) => i !== index) } }));

  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  
  // Single-file uploader used by "+" tiles — uploads image and returns Cloudinary public_id
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name}: not an image`); return null }
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name}: exceeds 8MB`); return null }
      const base64 = await new Promise<string>((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result as string); fr.onerror = reject; fr.readAsDataURL(file) })
      const res = await fetch('/api/protected/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) })
      if (!res.ok) {
        const txt = await res.text().catch(()=> '')
        toast.error(`Upload failed: ${txt || res.statusText}`)
        return null
      }
      const json = await res.json()
      return json?.raw?.public_id || null
    } catch {
      toast.error('Upload failed')
      return null
    }
  }

  // Local "+" tile with drag & drop and file picker
  const AddTile: React.FC<{ onAdd: (id: string) => void; title?: string } > = ({ onAdd, title = 'Add image' }) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [dragOver, setDragOver] = React.useState(false)
    const onPick = () => inputRef.current?.click()
    const handleFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return
      for (const f of Array.from(files)) {
        const id = await uploadFile(f)
        if (id) onAdd(id)
      }
    }
    const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleFiles(e.dataTransfer.files) }
    return (
      <div
        className={`w-16 h-16 rounded border border-dashed flex items-center justify-center text-muted-foreground bg-muted/40 cursor-pointer ${dragOver ? 'ring-2 ring-primary/40' : ''}`}
        title={title}
        onClick={onPick}
        onDragOver={(e)=> { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e)=> { e.preventDefault(); setDragOver(false) }}
        onDrop={onDrop}
      >
        <span className="text-lg leading-none">+</span>
        <input ref={inputRef} type="file" accept="image/*" hidden multiple onChange={(e)=> handleFiles(e.target.files)} />
      </div>
    )
  }

  const isValidObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
  const resolveDonorMongoId = async (id: string): Promise<string | null> => {
    if (isValidObjectId(id)) return id; // already mongo id
    try {
      // Use the dedicated mapping endpoint which upserts Mongo cache if missing
      const res = await fetch(`/api/protected/users/by-clerk-id/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return null;
  const json = await safeJson<any>(res);
      return json?.mongoUserId || null;
    } catch (e) { console.warn('[RESOLVE_DONOR_FAILED]', e); return null; }
  }

  const openConfirm = async () => {
    if (!selectedUser || items.length === 0) return;
    let mongoId = selectedUser;
    if (!isValidObjectId(mongoId)) {
      mongoId = await resolveDonorMongoId(selectedUser) || '';
    }
    if (!mongoId || !isValidObjectId(mongoId)) {
      console.warn('[INVALID_DONOR_ID_AFTER_RESOLVE]', selectedUser, mongoId);
      alert('Could not resolve donor Mongo ID. Ensure the donor exists or reload.');
      return;
    }
    // Patch donor ids inside working items/current state so submit uses mongo id
    setItems(prev => prev.map(p => ({ ...p, donorId: mongoId })));
    if (currentItem.donorId && !isValidObjectId(currentItem.donorId)) {
      setCurrentItem(ci => ({ ...ci, donorId: mongoId }));
    }
    setConfirmOpen(true);
  };

  const submitAll = async () => {
    if (!selectedUser || items.length === 0) return;
    let donorMongoId = selectedUser;
    if (!isValidObjectId(donorMongoId)) {
      donorMongoId = await resolveDonorMongoId(selectedUser) || '';
    }
    if (!donorMongoId || !isValidObjectId(donorMongoId)) {
      console.warn('[SUBMIT_BLOCKED_INVALID_DONOR]', selectedUser, donorMongoId);
      alert('Cannot submit: donor could not be resolved.');
      return;
    }
    setFinalizing(true);
    try {
      const baseItems = items.map(i => ({ name: i.name, description: i.description, condition: i.condition as any, photos: i.photos, marketplaceListing: { listed: i.marketplace.listed, demandedPrice: i.marketplace.demandedPrice } }));
      const payload: any = { donorId: donorMongoId, items: baseItems };
      if (collectionRequestId) payload.collectionRequestId = collectionRequestId;
      const res = await fetch('/api/protected/donation-entries/full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[DONATION_SUBMIT_FAILED]', txt);
        alert('Failed to save donation: ' + (txt || 'Unknown error'));
        return;
      }

      const json = await safeJson<any>(res);
      if (json.success && json.donationId) {
        const mapIds = json.itemIds as string[];
        setItems(prev => prev.map((it, idx) => ({ ...it, serverId: mapIds[idx] })));
        const printUrl = `/list-donation/print/${json.donationId}`;
        // Current unified behavior: always redirect to print page after submission.
        // If differentiated behavior for scrappers is needed later, introduce a query flag.
        router.push(printUrl);
      } else {
        console.error('[DONATION_SUBMIT_NO_SUCCESS]', json);
        alert('Failed to save donation: No success response');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinalizing(false);
      setConfirmOpen(false);
    }
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
        <h2 className="font-semibold text-lg">Donor</h2>
        {isScrapper && !donor && !collectionRequestId && (
          <Card className="p-4 border bg-muted/30 text-xs space-y-2">
            <p className="font-medium">Scrapper Mode</p>
            <p>You can select an existing donor below. Creating new donors is disabled. If you opened this from a verified collection request link, the donor will auto-fill.</p>
          </Card>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Collapsible open={donorPanelOpen} onOpenChange={setDonorPanelOpen}>
              <div className="flex justify-end mb-1">
                {!collectionRequestId && (
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" disabled={autoFillLoading}>
                      {donor ? (donorPanelOpen ? 'Hide Donor Panel' : 'Change Donor') : (autoFillLoading ? 'Loading Donor...' : 'Select Donor')}
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CollapsibleContent className="space-y-4 pt-1">
                {!collectionRequestId && (
                  <UserSearchAndCreate onSelect={(d)=> { setDonor(d); if(d) setDonorPanelOpen(false); }} enableCreate={false} />
                )}
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
              {!isScrapper && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={()=> setDonorPanelOpen(o=> !o)}>{donorPanelOpen ? 'Close' : 'Change'}</Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              {donor.phone && <span>Phone: {donor.phone}</span>}
              {donor.mongoUserId && <span>ID: {donor.mongoUserId.slice(0,6)}…</span>}
            </div>
            {autoFillLoading && !isScrapper && (
              <p className='text-[11px] text-muted-foreground'>Refreshing donor…</p>
            )}
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
              <div className="flex flex-wrap gap-2 mt-2">
                {currentItem.photos.before.map((b, i) => (
                  <div key={i} className="relative group">
                    <ClickableImage src={b} alt="before" className="w-16 h-16 object-cover rounded" caption={`${currentItem.name || 'Item'} - Before photo`} transform={{ width: 128, height: 128, crop: 'fill' }} />
                    <button type="button" onClick={() => removePhoto('before', i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
                <AddTile title="Add before photo" onAdd={(id)=> setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, before: [...ci.photos.before, id] } }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">After Images</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentItem.photos.after.map((a, i) => (
                  <div key={i} className="relative group">
                    <ClickableImage src={a} alt="after" className="w-16 h-16 object-cover rounded" caption={`${currentItem.name || 'Item'} - After photo`} transform={{ width: 128, height: 128, crop: 'fill' }} />
                    <button type="button" onClick={() => removePhoto('after', i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
                <AddTile title="Add after photo" onAdd={(id)=> setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, after: [...ci.photos.after, id] } }))} />
              </div>
            </div>
          </div>
        </div>
  <Button
    type="button"
    onClick={pushItem}
    disabled={!selectedUser || !currentItem.name}
  >
    {!selectedUser ? 'Select a donor to add items' : (!currentItem.name ? 'Enter a name' : 'Add Item to List')}
  </Button>
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
                {item.photos.before.slice(0,3).map((b,i)=>(
                  <ClickableImage key={`b-${i}`} src={b} className="w-10 h-10 object-cover rounded" alt="before" caption={`${item.name} - Before photo`} transform={{ width: 80, height: 80, crop: 'fill' }} />
                ))}
                {item.photos.after.slice(0,3).map((a,i)=>(
                  <ClickableImage key={`a-${i}`} src={a} className="w-10 h-10 object-cover rounded" alt="after" caption={`${item.name} - After photo`} transform={{ width: 80, height: 80, crop: 'fill' }} />
                ))}
              </div>
              <div className="pt-2 flex flex-col items-center gap-1">
                <Barcode value={item.serverId || item.tempId} format="CODE128" width={0.8} height={50} fontSize={11} />
                <p className="text-[10px] text-muted-foreground">{item.serverId ? 'ID:' : 'TEMP:'} {item.serverId || item.tempId}</p>
              </div>
            </div>
          ))}
        </div>
  <Button
    type="button"
    onClick={openConfirm}
    disabled={finalizing || items.length === 0 || !selectedUser}
  >
    {finalizing ? (
      <span className="inline-flex items-center gap-2">
        <span className='inline-block animate-spin border border-muted-foreground/40 border-t-transparent rounded-full h-3 w-3' />
        Submitting…
      </span>
    ) : (!selectedUser ? 'Select a donor to continue' : (items.length === 0 ? 'Add at least 1 item' : 'Finalize & Print'))}
  </Button>
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
