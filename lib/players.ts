// Dört büyüklerin öne çıkan oyuncuları — kadrolar: Wikipedia 'Current squad' (Ekim 2026).
// Fotoğraflar Wikimedia Commons'tan, özgür lisanslı; künye her kartta gösterilir.
import type { BigTeam } from './teams';

export interface Player {
  id: string;
  name: string;
  pos: string;
  photo: string;
  credit: string;
  license: string;
  source: string;
}

export const players: Record<BigTeam, Player[]> = {
  gs: [
    { id: 'gs-osimhen', name: 'Victor Osimhen', pos: 'Forvet', photo: '/players/gs-osimhen.jpg', credit: 'Fédération Guinéenne Football', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Victor-osimhen-nigeria-2024-3-4.jpg' },
    { id: 'gs-leao', name: 'Rafael Leão', pos: 'Forvet', photo: '/players/gs-leao.jpg', credit: 'Agência Lusa', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:RafaelLe%C3%A3oPortugal23.jpg' },
    { id: 'gs-sane', name: 'Leroy Sané', pos: 'Forvet', photo: '/players/gs-sane.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Leroy_Sane_Ecuador_v_Germany_25_June_2026-119_(cropped).jpg' },
    { id: 'gs-baris-alper-yilmaz', name: 'Barış Alper Yılmaz', pos: 'Forvet', photo: '/players/gs-baris-alper-yilmaz.jpg', credit: 'Zafer', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Bar%C4%B1%C5%9F_Alper_Y%C4%B1lmaz_20251019.jpg' },
  ],
  fb: [
    { id: 'fb-kante', name: 'N’Golo Kanté', pos: 'Orta saha', photo: '/players/fb-kante.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:N%27Golo_Kante_France_v_Senegal_16_June_2026-397.jpg' },
    { id: 'fb-lukaku', name: 'Romelu Lukaku', pos: 'Forvet', photo: '/players/fb-lukaku.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Romelu_Lukaku_Belgium_v_USA_6_July_2026-038.jpg' },
    { id: 'fb-asensio', name: 'Marco Asensio', pos: 'Orta saha', photo: '/players/fb-asensio.jpg', credit: 'Zafer', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Marco_Asensio_10_Fenerbah%C3%A7e_20260805_(4)_(cropped).JPG' },
    { id: 'fb-greenwood', name: 'Mason Greenwood', pos: 'Forvet', photo: '/players/fb-greenwood.jpg', credit: 'Zafer', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Mason_Greenwood_11_Fenerbah%C3%A7e_20260805_(4)_(cropped)_(cropped).JPG' },
  ],
  bjk: [
    { id: 'bjk-vlahovic', name: 'Dušan Vlahović', pos: 'Forvet', photo: '/players/bjk-vlahovic.jpg', credit: 'Dariuzzdigambassi', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Dusan_Vlahovic.jpg' },
    { id: 'bjk-trossard', name: 'Leandro Trossard', pos: 'Orta saha', photo: '/players/bjk-trossard.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Leandro_Trossard_Belgium_v_USA_6_July_2026-258.jpg' },
    { id: 'bjk-orkun-kokcu', name: 'Orkun Kökçü', pos: 'Orta saha', photo: '/players/bjk-orkun-kokcu.jpg', credit: 'Original: Zafer Derivative work: FootyBystander', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Orkun_K%C3%B6k%C3%A7%C3%BC_20260121_(2)_-_cropped_version.jpg' },
    { id: 'bjk-oh-hyeon-gyu', name: 'Oh Hyeon-gyu', pos: 'Forvet', photo: '/players/bjk-oh-hyeon-gyu.jpg', credit: '두쫀쿠뉴스', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Oh_Hyeon-gyu_BJK.jpeg' },
  ],
  ts: [
    { id: 'ts-salah', name: 'Mohamed Salah', pos: 'Forvet', photo: '/players/ts-salah.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Mohamed_Salah_Argentina_v_Egypt_7_July_2026-163_(cropped).jpg' },
    { id: 'ts-onana', name: 'André Onana', pos: 'Kaleci', photo: '/players/ts-onana.jpg', credit: 'Franco237', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Andr%C3%A9_Onana.jpg' },
    { id: 'ts-fabinho', name: 'Fabinho', pos: 'Orta saha', photo: '/players/ts-fabinho.jpg', credit: 'Bryan Berlin', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Fabinho_Brazil_V_Morocco_13_June_2026-70.jpg' },
    { id: 'ts-onuachu', name: 'Paul Onuachu', pos: 'Forvet', photo: '/players/ts-onuachu.jpg', credit: 'Şadi Akdoğan', license: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Paul_Onuachu_2025_(cropped).jpg' },
  ],
};
