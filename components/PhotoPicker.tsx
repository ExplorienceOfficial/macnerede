'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { MAX_PHOTOS } from '@/lib/types';

export interface PickedPhoto {
  id: string;
  data: string;
}

interface Props {
  photos: PickedPhoto[];
  coverId: string | null;
  /** Seçilen dosyalar; sıkıştırma ve kaydetme çağıranın işi */
  onAdd: (files: File[]) => Promise<void>;
  onRemove: (id: string) => void;
  onCover: (id: string) => void;
}

export default function PhotoPicker({ photos, coverId, onAdd, onRemove, onCover }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_PHOTOS - photos.length;

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const files = [...list].slice(0, left);
    if (list.length > left) setError(`En fazla ${MAX_PHOTOS} fotoğraf; ilk ${left} tanesini aldık.`);
    setBusy(true);
    try {
      await onAdd(files);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <div className="photo-grid">
        <AnimatePresence initial={false}>
          {photos.map((p) => {
            const isCover = p.id === coverId;
            return (
              <motion.div
                key={p.id}
                layout
                className={`photo-tile${isCover ? ' cover' : ''}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.data} alt="" />
                <button type="button" className="photo-btn cover-btn" onClick={() => onCover(p.id)} aria-label="Kapak yap" title="Kapak yap">
                  <Star size={14} fill={isCover ? 'currentColor' : 'none'} />
                  {isCover && <span>Kapak</span>}
                </button>
                <button type="button" className="photo-btn del-btn" onClick={() => onRemove(p.id)} aria-label="Fotoğrafı sil">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {left > 0 && (
          <motion.button layout type="button" className="photo-tile add" onClick={() => input.current?.click()} disabled={busy} whileTap={{ scale: 0.96 }}>
            {busy ? <Loader2 size={22} className="spin" /> : <ImagePlus size={22} />}
            <span>{busy ? 'Hazırlanıyor…' : 'Fotoğraf ekle'}</span>
            <small>{left} yer kaldı</small>
          </motion.button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
      {error && (
        <p className="hint" style={{ color: 'var(--danger)', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
