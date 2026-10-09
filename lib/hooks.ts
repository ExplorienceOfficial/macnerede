'use client';

import { useCallback, useEffect, useState } from 'react';
import { listBroadcasts, listCafes, listVenues, watchAccount, type Account } from './db';
import { DEFAULT_CITY, cityById } from './places';
import { team } from './teams';
import type { MatchInfo } from './fixtures';
import type { Broadcast, Cafe, Venue } from './types';

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

/** Tarayıcı saati, `ms`de bir tazelenir; sunucu çiziminde ve ilk karede null (hidrasyon uyuşsun) */
export function useNow(ms: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Hatırlanan şehir; listeden kalkmış bir şehir kayıtlıysa varsayılana döner */
export function useCity(): [string, (v: string) => void] {
  const [city, setCity] = usePref<string>('mn.city', DEFAULT_CITY);
  return [cityById(city) ? city : DEFAULT_CITY, setCity];
}

export interface Listing {
  cafes: Cafe[];
  broadcasts: Broadcast[];
  venues: Venue[];
  loading: boolean;
  error: string | null;
}

/**
 * Anlaşmalı mekanlar + verilen maçlar için yayın kayıtları + rehber mekanları.
 * Anlaşmalı bir mekanla aynı telefonu taşıyan rehber kaydı gösterilmez (mekan profilini sahiplenmiş demektir).
 */
export function useListings(matchIds: string[]) {
  const key = matchIds.join(',');
  const [state, setState] = useState<Listing>({ cafes: [], broadcasts: [], venues: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([listCafes(), listBroadcasts(key ? key.split(',') : []), listVenues()])
      .then(([cafes, broadcasts, venues]) => {
        if (!alive) return;
        const ids = new Set(cafes.map((c) => c.id));
        const claimed = new Set(cafes.map((c) => c.phone));
        setState({
          cafes,
          broadcasts: broadcasts.filter((b) => ids.has(b.cafeId)),
          venues: venues.filter((v) => !v.phone || !claimed.has(v.phone)),
          loading: false,
          error: null,
        });
      })
      .catch((e: Error) => {
        console.error('[mekanlar]', e);
        if (alive) setState((s) => ({ ...s, loading: false, error: 'Mekanlar şu an yüklenemedi. Sayfayı yenileyip tekrar dene.' }));
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}

export const tl = (n: number) => `${new Intl.NumberFormat('tr-TR').format(n)} TL`;

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Mekana gidecek hazır WhatsApp mesajı */
export function seatMessage(match: MatchInfo, people: number) {
  const when = [match.day, match.time].filter(Boolean).join(' ');
  return `Merhaba, neredemac.com üzerinden ulaşıyorum. ${when} ${team(match.home).name} – ${team(match.away).name} maçı için ${people} kişilik yeriniz var mı?`;
}

export const directionsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Oturumdaki mekan hesabı: undefined = yükleniyor, null = giriş yok */
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
