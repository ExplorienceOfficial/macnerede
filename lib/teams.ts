export type BigTeam = 'gs' | 'fb' | 'bjk' | 'ts';
export const BIG4: BigTeam[] = ['gs', 'fb', 'bjk', 'ts'];

export type CrestPattern = 'split' | 'stripes' | 'halves' | 'ring';

export interface Team {
  id: string;
  name: string;
  short: string;
  colors: [string, string];
  pattern: CrestPattern;
  /** Resmi arma dosyası koymak istersen: public/logos/<id>.svg yolunu buraya yaz */
  logo?: string;
}

const T = (id: string, name: string, short: string, c1: string, c2: string, pattern: CrestPattern = 'ring'): Team => ({
  id,
  name,
  short,
  colors: [c1, c2],
  pattern,
});

export const teams: Record<string, Team> = Object.fromEntries(
  [
    T('gs', 'Galatasaray', 'GS', '#A90432', '#FDB912', 'split'),
    T('fb', 'Fenerbahçe', 'FB', '#13235B', '#FFE01B', 'stripes'),
    T('bjk', 'Beşiktaş', 'BJK', '#141414', '#FFFFFF', 'stripes'),
    T('ts', 'Trabzonspor', 'TS', '#7A1F3D', '#79B8E6', 'halves'),

    T('kasimpasa', 'Kasımpaşa', 'KAS', '#1A3A7A', '#FFFFFF'),
    T('samsunspor', 'Samsunspor', 'SAM', '#D2122E', '#FFFFFF'),
    T('rizespor', 'Rizespor', 'RİZ', '#0A7B3E', '#1E5BB8'),
    T('kocaelispor', 'Kocaelispor', 'KOC', '#0B6B3A', '#141414'),
    T('genclerbirligi', 'Gençlerbirliği', 'GB', '#C8102E', '#141414'),
    T('alanyaspor', 'Alanyaspor', 'ALA', '#F28C00', '#0B7A3B'),
    T('basaksehir', 'Başakşehir', 'İBFK', '#F26522', '#1B2A4A'),
    T('konyaspor', 'Konyaspor', 'KON', '#0A7A3B', '#FFFFFF'),
    T('goztepe', 'Göztepe', 'GÖZ', '#E30613', '#FFDD00'),
    T('gaziantep', 'Gaziantep FK', 'GFK', '#C8102E', '#141414'),
    T('amedspor', 'Amedspor', 'AMD', '#C8102E', '#0B7A3B'),
    T('corum', 'Çorum FK', 'ÇOR', '#C8102E', '#141414'),
    T('eyupspor', 'Eyüpspor', 'EYÜ', '#5B2C83', '#F7D417'),
    T('erzurumspor', 'Erzurumspor', 'ERZ', '#1E4FA3', '#FFFFFF'),

    T('barcelona', 'Barcelona', 'BAR', '#A50044', '#004D98'),
    T('lille', 'Lille', 'LOSC', '#E01E13', '#1C2C5B'),
    T('stuttgart', 'Stuttgart', 'VFB', '#E32219', '#FFFFFF'),
    T('astonvilla', 'Aston Villa', 'AVL', '#670E36', '#95BFE5'),
    T('aek', 'AEK Atina', 'AEK', '#FFD200', '#141414'),
    T('feyenoord', 'Feyenoord', 'FEY', '#E30613', '#FFFFFF'),
    T('psg', 'Paris Saint-Germain', 'PSG', '#004170', '#DA291C'),
    T('slavia', 'Slavia Prag', 'SLA', '#C8102E', '#FFFFFF'),
    T('liverpool', 'Liverpool', 'LIV', '#C8102E', '#00B2A9'),
    T('shakhtar', 'Shakhtar Donetsk', 'SHA', '#F18A00', '#141414'),
    T('lask', 'LASK Linz', 'LASK', '#141414', '#FFFFFF'),
    T('villarreal', 'Villarreal', 'VIL', '#E8C500', '#005187'),
    T('atletico', 'Atlético Madrid', 'ATM', '#CB3524', '#272E61'),
    T('hoffenheim', 'Hoffenheim', 'TSG', '#1961B5', '#FFFFFF'),
    T('crystalpalace', 'Crystal Palace', 'CRY', '#1B458F', '#C4122E'),
    T('celtic', 'Celtic', 'CEL', '#018749', '#FFFFFF'),
    T('hapoel', 'Hapoel Beer-Sheva', 'HBS', '#C8102E', '#FFFFFF'),
    T('leverkusen', 'Bayer Leverkusen', 'B04', '#E32221', '#141414'),
    T('usg', 'Union Saint-Gilloise', 'USG', '#E8C500', '#1E3A8A'),
    T('omonia', 'Omonia', 'OMO', '#00843D', '#FFFFFF'),
    T('kups', 'KuPS', 'KUPS', '#E8C500', '#141414'),
    T('hearts', 'Hearts', 'HMFC', '#8B1E3F', '#FFFFFF'),
    T('freiburg', 'Freiburg', 'SCF', '#141414', '#E2001A'),
    T('cska', 'CSKA Sofya', 'CSKA', '#C8102E', '#FFFFFF'),
    T('jablonec', 'Jablonec', 'JAB', '#00843D', '#141414'),
    T('crvena', 'Kızılyıldız', 'CZV', '#C8102E', '#FFFFFF'),
  ].map((t) => [t.id, t]),
);

// Kulüp armaları: public/logos (kaynak: Wikipedia/Wikimedia). Çok büyük SVG'ler için PNG kullanılıyor.
const PNG_LOGOS = new Set(['eyupspor', 'liverpool', 'omonia']);
for (const t of Object.values(teams)) t.logo = `/logos/${t.id}.${PNG_LOGOS.has(t.id) ? 'png' : 'svg'}`;

export interface Stadium {
  name: string;
  /** Stadyumun konumu (haritada fotoğraflı işaretçi için) */
  coords: [number, number];
  photo: string;
  credit: string;
  license: string;
  source: string;
}

/** Ev sahibi takımın stadyum fotoğrafı (Rizespor, Çorum ve Shakhtar için özgür lisanslı foto yok) — Wikimedia Commons, özgür lisanslı (künye gösterilmeli) */
export const stadiums: Record<string, Stadium> = {
  gs: { name: 'RAMS Park', coords: [41.10278, 28.99056], photo: '/stadiums/gs.jpg', credit: 'Antoloji', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Rams_Park_i%C3%A7_g%C3%B6r%C3%BCn%C3%BCm_2025.jpg' },
  fb: { name: 'Chobani Stadyumu', coords: [40.98778, 29.03694], photo: '/stadiums/fb.jpg', credit: 'Anl55400', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Sukrusaracoglu.jpg' },
  bjk: { name: 'Tüpraş Stadyumu', coords: [41.03917, 28.99472], photo: '/stadiums/bjk.jpg', credit: 'Beşiktaş JK', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:T%C3%BCpra%C5%9F_Stadyumu_20231011_2.jpg' },
  ts: { name: 'Papara Park', coords: [40.99917, 39.64583], photo: '/stadiums/ts.jpg', credit: 'Myrat', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Trabzonspor_vs_Karag%C3%BCmr%C3%BCk,_15.04.2022.jpg' },
};

/** Rakiplerin stadyumları — aynı kaynak ve lisans koşulları */
Object.assign(stadiums, {
  kasimpasa: { name: 'Recep Tayyip Erdoğan Stadyumu', coords: [41.03278, 28.9725], photo: '/stadiums/kasimpasa.jpg', credit: 'Supermæn', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Kas%C4%B1mpa%C5%9Fa_Stadyumu.jpg' },
  samsunspor: { name: 'Samsun 19 Mayıs Stadyumu', coords: [41.22778, 36.4575], photo: '/stadiums/samsunspor.jpg', credit: 'Cobija', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Samsun_19_May%C4%B1s_Stadyumu_(cropped).jpg' },
  kocaelispor: { name: 'Kocaeli Stadyumu', coords: [40.77472, 30.0175], photo: '/stadiums/kocaelispor.jpg', credit: 'Ucandairebaskani', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kocaeli_Stadium.jpg' },
  genclerbirligi: { name: 'Eryaman Stadyumu', coords: [39.98028, 32.61389], photo: '/stadiums/genclerbirligi.jpg', credit: 'SAİT71', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ankara_Eryaman_Stadyumu4.jpg' },
  konyaspor: { name: 'Konya Büyükşehir Stadyumu', coords: [37.946, 32.488], photo: '/stadiums/konyaspor.jpg', credit: 'Hüseyin Öcal', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:TORKU_ARENA_-_panoramio.jpg' },
  goztepe: { name: 'Gürsel Aksel Stadyumu', coords: [38.39682, 27.07595], photo: '/stadiums/goztepe.jpg', credit: 'Estin Giç Giç', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:G%C3%B6ztepe_Stadyumu.jpg' },
  gaziantep: { name: 'Gaziantep Stadyumu', coords: [37.12389, 37.3825], photo: '/stadiums/gaziantep.jpg', credit: 'YG01', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kalyon_Arena_(Gaziantep).jpg' },
  amedspor: { name: 'Diyarbakır Stadyumu', coords: [37.9425, 40.12028], photo: '/stadiums/amedspor.jpg', credit: 'Chansey', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Diyarbekirspor-Eskisehirspor1.jpg' },
  erzurumspor: { name: 'Kazım Karabekir Stadyumu', coords: [39.91111, 41.23806], photo: '/stadiums/erzurumspor.jpg', credit: 'Ultraslansi', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Galatasaray-FB_Skupa.jpg' },
  alanyaspor: { name: 'Alanya Oba Stadyumu', coords: [36.5626, 32.0792], photo: '/stadiums/alanyaspor.jpg', credit: 'beIN SPORTS Türkiye', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Bah%C3%A7e%C5%9Fehir_Okullar%C4%B1_Stadyumu_%E2%80%93_D%C4%B1%C5%9F_manzara.png' },
  basaksehir: { name: 'Başakşehir Fatih Terim Stadyumu', coords: [41.12278, 28.80861], photo: '/stadiums/basaksehir.jpg', credit: 'Maurice Flesier', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Greece_vs_Turkey_(0-3),_17_November_2015,_3.jpg' },
  astonvilla: { name: 'Villa Park', coords: [52.50917, -1.88472], photo: '/stadiums/astonvilla.jpg', credit: 'Arne Müseler', license: 'CC BY-SA 3.0 de', source: 'https://commons.wikimedia.org/wiki/File:Birmingham_aston_villa_park_stadium.jpg' },
  aek: { name: 'OPAP Arena', coords: [38.03556, 23.73639], photo: '/stadiums/aek.jpg', credit: 'Demian vi', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:AEK_fans_during_AEK-Marseille_game.jpg' },
  lask: { name: 'Raiffeisen Arena', coords: [48.29361, 14.27667], photo: '/stadiums/lask.jpg', credit: 'Werner100359', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Raiffeisen-Arena_Linz_01.jpg' },
  celtic: { name: 'Celtic Park', coords: [55.84972, -4.20556], photo: '/stadiums/celtic.jpg', credit: 'Vincenzo.togni', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Celtic_Park_during_an_Old_Firm_derby_between_Celtic_FC_and_Rangers_FC.jpg' },
  omonia: { name: 'GSP Stadyumu', coords: [35.11444, 33.36278], photo: '/stadiums/omonia.jpg', credit: 'George M. Groutas from Dali, Nicosia, Cyprus', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:APOEL_-_real_madrid_(6879935408).jpg' },
  kups: { name: 'Väre Areena', coords: [62.88463, 27.6718], photo: '/stadiums/kups.jpg', credit: 'Juhm', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Savon_Sanomat_Areena_20.9.2016.jpg' },
  cska: { name: 'Vasil Levski Ulusal Stadyumu', coords: [42.6875, 23.33528], photo: '/stadiums/cska.jpg', credit: 'JukoFF', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Vasil_Levski_National_Stadium_2022.jpg' },
  crvena: { name: 'Rajko Mitić Stadyumu', coords: [44.78333, 20.46472], photo: '/stadiums/crvena.jpg', credit: 'Isimic', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Zvezda_stadion.jpg' },
  lille: { name: 'Stade Pierre-Mauroy', coords: [50.6119, 3.1304], photo: '/stadiums/lille.jpg', credit: 'Liondartois', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Lille_vs_PSG_2019_-_Stade_Pierre_Mauroy.jpg' },
  psg: { name: 'Parc des Princes', coords: [48.84139, 2.25306], photo: '/stadiums/psg.jpg', credit: 'c:User:Arne mueseler', license: 'CC BY-SA 3.0', source: 'https://en.wikipedia.org/wiki/File:Paris_Le_Parc_des_Princes.jpg' },
  atletico: { name: 'Metropolitano', coords: [40.43611, -3.59944], photo: '/stadiums/atletico.jpg', credit: 'Elwin594', license: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Atleti_vs_Villarreal_-_September_2025.jpg' },
  hoffenheim: { name: 'PreZero Arena', coords: [49.23806, 8.8875], photo: '/stadiums/hoffenheim.jpg', credit: 'PreZero', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:PreZero_Arena_wiki.jpg' },
  leverkusen: { name: 'BayArena', coords: [51.03833, 7.00222], photo: '/stadiums/leverkusen.jpg', credit: 'Arne Müseler', license: 'CC BY-SA 3.0 de', source: 'https://commons.wikimedia.org/wiki/File:Bayarena_Leverkusen_2020.jpg' },
  eyupspor: { name: 'Recep Tayyip Erdoğan Stadyumu', coords: [41.03278, 28.9725], photo: '/stadiums/kasimpasa.jpg', credit: 'Supermæn', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Kas%C4%B1mpa%C5%9Fa_Stadyumu.jpg' },
} satisfies Record<string, Stadium>);

export const stadiumFor = (homeId: string): Stadium | null => stadiums[homeId] ?? null;

export const team = (id: string): Team => teams[id] ?? T(id, id, id.slice(0, 3).toUpperCase(), '#666', '#ddd');

export const fanLabel: Record<BigTeam, string> = {
  gs: 'Galatasaraylı mekan',
  fb: 'Fenerbahçeli mekan',
  bjk: 'Beşiktaşlı mekan',
  ts: 'Trabzonsporlu mekan',
};
