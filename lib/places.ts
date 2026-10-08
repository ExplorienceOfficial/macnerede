export interface District {
  id: string;
  name: string;
  center: [number, number];
}

export interface City {
  id: string;
  name: string;
  center: [number, number];
  districts: District[];
}

export const cities: City[] = [
  {
    id: 'istanbul',
    name: 'İstanbul',
    center: [41.02, 29.0],
    districts: [
      { id: 'kadikoy', name: 'Kadıköy', center: [40.9900, 29.0290] },
      { id: 'besiktas', name: 'Beşiktaş', center: [41.0430, 29.0050] },
      { id: 'sisli', name: 'Şişli', center: [41.0600, 28.9870] },
      { id: 'uskudar', name: 'Üsküdar', center: [41.0260, 29.0150] },
      { id: 'atasehir', name: 'Ataşehir', center: [40.9920, 29.1240] },
      { id: 'bakirkoy', name: 'Bakırköy', center: [40.9800, 28.8720] },
    ],
  },
  {
    id: 'ankara',
    name: 'Ankara',
    center: [39.92, 32.85],
    districts: [
      { id: 'cankaya', name: 'Çankaya', center: [39.9040, 32.8600] },
      { id: 'yenimahalle', name: 'Yenimahalle', center: [39.9670, 32.8090] },
    ],
  },
  {
    id: 'izmir',
    name: 'İzmir',
    center: [38.43, 27.14],
    districts: [
      { id: 'konak', name: 'Konak / Alsancak', center: [38.4370, 27.1430] },
      { id: 'karsiyaka', name: 'Karşıyaka', center: [38.4560, 27.1100] },
      { id: 'bornova', name: 'Bornova', center: [38.4660, 27.2200] },
    ],
  },
  {
    id: 'trabzon',
    name: 'Trabzon',
    center: [41.0050, 39.7270],
    districts: [{ id: 'ortahisar', name: 'Ortahisar', center: [41.0050, 39.7270] }],
  },
];

export const cityById = (id: string) => cities.find((c) => c.id === id);
export const districtById = (cityId: string, id: string) => cityById(cityId)?.districts.find((d) => d.id === id);
export const districtName = (cityId: string, id: string) => districtById(cityId, id)?.name ?? id;

/** "İzmir" → "İzmir’de", "Beşiktaş" → "Beşiktaş’ta" (ünlü uyumu + sert ünsüz) */
export function locative(name: string) {
  const lower = name.toLocaleLowerCase('tr-TR');
  const vowels = [...lower].filter((c) => 'aıoueiöü'.includes(c));
  const back = 'aıou'.includes(vowels[vowels.length - 1] ?? 'a');
  const hard = 'çfhkpsşt'.includes(lower[lower.length - 1]);
  return `${name}’${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}

/** İki nokta arası kuş uçuşu mesafe (km) */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
