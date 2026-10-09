'use client';

import { useCallback, useEffect, useState } from 'react';
import { listBroadcasts, listCafes, watchAccount, type Account } from './db';
import type { Broadcast, Cafe } from './types';

/** localStorage'da hatırlanan küçük tercihler (şehir, takım) */
export function usePref<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v) setValue(v as T);
    } catch {}
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {}
    },
    [key],
  );
  return [value, set];
}

export interface Listing {
  cafes: Cafe[];
  broadcasts: Broadcast[];
  loading: boolean;
  error: string | null;
}

/** Anlaşmalı mekanlar + verilen maçlar için yayın kayıtları */
export function useListings(matchIds: string[]) {
  const key = matchIds.join(',');
  const [state, setState] = useState<Listing>({ cafes: [], broadcasts: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([listCafes(), listBroadcasts(key ? key.split(',') : [])])
      .then(([cafes, broadcasts]) => {
        if (!alive) return;
        const ids = new Set(cafes.map((c) => c.id));
        setState({ cafes, broadcasts: broadcasts.filter((b) => ids.has(b.cafeId)), loading: false, error: null });
      })
      .catch((e: Error) => {
        console.error('[mekanlar]', e);
        if (alive) setState((s) => ({ ...s, loading: false, error: 'Mekanlar şu an yüklenemedi. Sayfayı yenileyip tekrar dene.' }));
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const addReserved = useCallback((cafeId: string, matchId: string, people: number) => {
    setState((s) => ({
      ...s,
      broadcasts: s.broadcasts.map((b) => (b.cafeId === cafeId && b.matchId === matchId ? { ...b, reserved: b.reserved + people } : b)),
    }));
  }, []);

  return { ...state, addReserved };
}

export const tl = (n: number) => `${new Intl.NumberFormat('tr-TR').format(n)} TL`;

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export const directionsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Oturumdaki hesap: undefined = yükleniyor, null = giriş yok */
export function useAccount() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  useEffect(() => watchAccount(setAccount), []);
  return account;
}

export const telLink = (phone: string) => `tel:+${phone.startsWith('90') ? phone : `90${phone.replace(/^0/, '')}`}`;

/** 905321234567 → 0532 123 45 67 */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '').replace(/^90/, '');
  if (d.length !== 10) return phone;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}
