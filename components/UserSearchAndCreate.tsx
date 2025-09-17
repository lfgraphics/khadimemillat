"use client";

import React, { useEffect, useState } from 'react';
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
  enableCreate = true,
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
        const json = await res.json();
        if (json.users) {
          const mapped: Donor[] = json.users.map((u: any) => ({
            id: u.mongoUserId || u._id || u.clerkUserId,
            mongoUserId: u.mongoUserId || u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            clerkUserId: u.clerkUserId,
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
        const res = await fetch('/api/protected/users');
        const json = await res.json();
        if (json.users) {
          const mapped: Donor[] = json.users.map((u: any) => ({
            id: u._id,
            mongoUserId: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            clerkUserId: u.clerkUserId,
          }));
          setUsers(mapped);
        }
      } catch (e) { console.error(e); } finally { setLoadingInitial(false); }
    })();
  }, []);

  // Emit selection when selectedUserId changes
  useEffect(() => {
    const donor = users.find(u => u.mongoUserId === selectedUserId || u.id === selectedUserId) || null;
    onSelect(donor);
  }, [selectedUserId, users, onSelect]);

  const userOptions: ComboboxOption[] = users.map(u => ({ value: u.mongoUserId || u.id, label: u.name }));

  const handleCreateUser = async () => {
    if (!userForm.name.trim() || !userForm.mobile.trim()) return;
    setCreatingUser(true);
    try {
      const res = await fetch('/api/protected/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userForm.name, mobile: userForm.mobile })
      });
      const json = await res.json();
      if (json.user) {
        const newDonor: Donor = {
          id: json.user.id,
            mongoUserId: json.user.id,
            name: json.user.name,
            email: json.user.email,
            phone: json.user.phone,
            clerkUserId: json.user.clerkUserId,
        };
        setUsers(prev => [newDonor, ...prev]);
        setSelectedUserId(newDonor.id);
        setUserForm({ name: '', mobile: '' });
      }
    } catch (e) { console.error(e); } finally { setCreatingUser(false); }
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
            <Button type="button" onClick={handleCreateUser} disabled={creatingUser}>{creatingUser ? 'Creating...' : 'Add Donor'}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Email/username/password auto-generated. Phone stored only in Mongo. Clerk linkage established.</p>
        </div>
      )}
    </div>
  );
};

export default UserSearchAndCreate;
