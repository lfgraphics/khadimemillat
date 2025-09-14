"use client";

import { IScrapItem } from "@/models/ScrapItem";
import React, { useEffect, useState } from "react";

export default function ItemList() {
    const [items, setItems] = useState<IScrapItem[]>([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetch(`/api/public/items?page=${page}&limit=12`)
            .then(r => r.json())
            .then(d => setItems(d.items || []))
            .catch(console.error);
    }, [page]);

    return (
        <div>
            {items.length === 0 && "No items"}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.map(item => (
                    <div key={String(item._id)} className="p-4 border rounded">
                        <img src={item.photos?.after?.[0] || "/placeholder.png"} className="w-full h-48 object-cover" alt={item.name} />
                        <h3 className="font-medium mt-2">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.condition}</p>
                        <a href={`/market-place/${encodeURIComponent(item.name.replace(/\s+/g, '-').toLowerCase())}/${item._id}`} className="text-indigo-600">View</a>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn">Prev</button>
                <button onClick={() => setPage(p => p + 1)} className="btn">Next</button>
            </div>
        </div>
    );
}
