// Atmosfer fotoğrafları (Flickr, özgür lisanslı) — künye görselin üstünde gösterilir
export interface Scene {
  photo: string;
  credit: string;
  license: string;
  source: string;
}

export const scenes = {
  /** Pub içinde, TV'de maç izleyenler */
  pub: { photo: '/scenes/pub.jpg', credit: 'puamelia', license: 'CC BY-SA 2.0', source: 'https://www.flickr.com/photos/26226522@N08/3595717418' },
  /** Pub terasında maç izleyen kalabalık */
  crowd: { photo: '/scenes/crowd.jpg', credit: 'markhillary', license: 'CC BY 2.0', source: 'https://www.flickr.com/photos/56087830@N00/4756976706' },
} satisfies Record<string, Scene>;
