"use client";

import React, { useEffect, useState } from 'react';
import { safeJson } from '@/lib/utils';
import SearchableDropDownSelect, { ComboboxOption } from '@/components/searchable-dropdown-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface Donor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  clerkUserId?: string;
  mongoUserId?: string;
}

interface UserSearchAndCreateProps {
  onSelect: (donor: Donor | null) => void;
  initialDonorId?: string;
  className?: string;
  enableCreate?: boolean;
}

export const UserSearchAndCreate: React.FC<UserSearchAndCreateProps> = ({
  onSelect,
  initialDonorId,
  className,
  enableCreate = false,
}) => {
  const [users, setUsers] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(initialDonorId || '');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', mobile: '' });
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const url = new URL('/api/protected/users', window.location.origin);
        if (search.trim()) url.searchParams.set('search', search.trim());
  const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 403) {
            setUsers([]);
            return;
          }
          throw new Error('Failed to fetch users');
        }
  const json = await safeJson<any>(res);
        if (json.users) {
          const mapped: Donor[] = json.users.map((u: any) => ({
            id: u.id, // Clerk ID primary
            mongoUserId: u.mongoUserId || u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            clerkUserId: u.id,
          }));
          setUsers(mapped);
        }
      } catch (e) { if ((e as any).name !== 'AbortError') console.error(e); }
      finally { setLoadingSearch(false); }
    }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [search]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoadingInitial(true);
      try {
        // Upsert current user mapping silently to help donor resolution later
        try { await fetch('/api/protected/users?self=1'); } catch {}
  const res = await fetch('/api/protected/users');
        if (!res.ok) {
          if (res.status === 403) {
            setUsers([]);
          } else {
            throw new Error('Failed to fetch users');
          }
        } else {
          const json = await safeJson<any>(res);
          if (json.users) {
            const mapped: Donor[] = json.users.map((u: any) => ({
              id: u.id, // Clerk ID
              mongoUserId: u.mongoUserId || u._id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              clerkUserId: u.id,
            }));
            setUsers(mapped);
          }
        }
      } catch (e) { console.error(e); } finally { setLoadingInitial(false); }
    })();
  }, []);

  // Emit selection when selectedUserId changes
  useEffect(() => {
    const donor = users.find(u => u.id === selectedUserId || u.mongoUserId === selectedUserId) || null;
    onSelect(donor);
  }, [selectedUserId, users, onSelect]);

  const userOptions: ComboboxOption[] = users.map(u => ({ value: u.id, label: u.name }));

  const handleCreateUser = async () => {
    // Direct creation disabled per Clerk-first. Consider building a Clerk invite flow.
    return;
  };

  const selected = users.find(u => u.mongoUserId === selectedUserId || u.id === selectedUserId);

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium mb-1 block">Select Donor</label>
        <SearchableDropDownSelect
          options={userOptions}
          value={selectedUserId}
          onChange={v => setSelectedUserId(v)}
          searchTerm={search}
          onSearchTermChange={setSearch}
          placeholder="Search donor..."
          width="w-full"
        />
        {(!loadingSearch && users.length === 0) && (
          <p className="text-[11px] text-muted-foreground">Type to search for users.</p>
        )}
        {selected && (
          <div className="mt-2 text-xs border rounded p-2 space-y-1 bg-muted/30">
            <div><span className="font-medium">Name:</span> {selected.name}</div>
            {selected.email && <div><span className="font-medium">Email:</span> {selected.email}</div>}
            {selected.phone && <div><span className="font-medium">Phone:</span> {selected.phone}</div>}
            {selected.clerkUserId && <div><span className="font-medium">Clerk ID:</span> {selected.clerkUserId}</div>}
            {selected.mongoUserId && <div><span className="font-medium">Mongo ID:</span> {selected.mongoUserId}</div>}
          </div>
        )}
      </div>
      {enableCreate && (
        <div className="mt-5 border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Quick Create Donor</p>
          <div className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Full Name" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Mobile Number" value={userForm.mobile} onChange={e => setUserForm(f => ({ ...f, mobile: e.target.value }))} />
            <Button type="button" onClick={handleCreateUser} disabled>{'Disabled'}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Direct user creation is disabled. Please invite users via Clerk. Contact admin if needed.</p>
        </div>
      )}
    </div>
  );
};

export default UserSearchAndCreate;
