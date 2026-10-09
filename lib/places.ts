/** Semt: taraftarın seçtiği, maç izlemeye gittiği bölge (ilçeden daha dar) */
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
    id: 'ankara',
    name: 'Ankara',
    center: [39.92, 32.85],
    districts: [
      { id: 'kizilay', name: 'Kızılay', center: [39.92, 32.856] },
      { id: 'tunali', name: 'Tunalı / Kavaklıdere', center: [39.907, 32.86] },
      { id: 'bahcelievler', name: 'Bahçelievler / Emek', center: [39.924, 32.827] },
      { id: 'besevler', name: 'Beşevler / Tandoğan', center: [39.933, 32.832] },
      { id: 'balgat', name: 'Balgat / Söğütözü', center: [39.905, 32.815] },
      { id: 'dikmen', name: 'Dikmen / Çankaya', center: [39.88, 32.845] },
      { id: 'cayyolu', name: 'Çayyolu / Ümitköy', center: [39.883, 32.69] },
      { id: 'bilkent', name: 'Bilkent', center: [39.884, 32.756] },
      { id: 'batikent', name: 'Batıkent', center: [39.969, 32.716] },
      { id: 'akkopru', name: 'Akköprü / Ankamall', center: [39.951, 32.831] },
      { id: 'eryaman', name: 'Eryaman / Etimesgut', center: [39.98, 32.647] },
      { id: 'kecioren', name: 'Keçiören', center: [39.98, 32.87] },
      { id: 'cebeci', name: 'Cebeci', center: [39.931, 32.876] },
    ],
  },
  {
    id: 'istanbul',
    name: 'İstanbul',
    center: [41.02, 29.0],
    districts: [
      { id: 'kadikoy', name: 'Kadıköy', center: [40.99, 29.027] },
      { id: 'bagdat', name: 'Bağdat Caddesi', center: [40.964, 29.074] },
      { id: 'besiktas', name: 'Beşiktaş', center: [41.043, 29.006] },
      { id: 'beyoglu', name: 'Beyoğlu / Taksim', center: [41.034, 28.978] },
      { id: 'sisli', name: 'Şişli / Mecidiyeköy', center: [41.064, 28.995] },
      { id: 'uskudar', name: 'Üsküdar', center: [41.026, 29.015] },
      { id: 'atasehir', name: 'Ataşehir', center: [40.993, 29.11] },
      { id: 'bakirkoy', name: 'Bakırköy', center: [40.98, 28.87] },
      { id: 'maltepe', name: 'Maltepe', center: [40.935, 29.13] },
      { id: 'sariyer', name: 'Sarıyer', center: [41.166, 29.05] },
    ],
  },
  {
    id: 'izmir',
    name: 'İzmir',
    center: [38.43, 27.14],
    districts: [
      { id: 'alsancak', name: 'Alsancak / Konak', center: [38.436, 27.142] },
      { id: 'karsiyaka', name: 'Karşıyaka / Bostanlı', center: [38.46, 27.1] },
      { id: 'bornova', name: 'Bornova', center: [38.46, 27.212] },
      { id: 'bayrakli', name: 'Bayraklı', center: [38.452, 27.184] },
      { id: 'buca', name: 'Buca', center: [38.388, 27.17] },
      { id: 'karabaglar', name: 'Karabağlar / Hatay', center: [38.404, 27.112] },
      { id: 'balcova', name: 'Balçova / Narlıdere', center: [38.392, 27.045] },
      { id: 'cigli', name: 'Çiğli', center: [38.495, 27.07] },
      { id: 'gaziemir', name: 'Gaziemir', center: [38.322, 27.135] },
    ],
  },
];

/** Pilot şehir: ilk girişte Ankara açılır (seçilen şehir tarayıcıda hatırlanır) */
export const DEFAULT_CITY = 'ankara';
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
