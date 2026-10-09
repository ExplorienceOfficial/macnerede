import { ImageResponse } from 'next/og';

// iPhone ana ekranı ve Safari sekmesi için PNG ikon (diğer tarayıcılar app/icon.svg'yi kullanır)
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 2C11.7 2 5 8.6 5 16.8 5 28 20 38 20 38s15-10 15-21.2C35 8.6 28.3 2 20 2Z" fill="#fff"/><circle cx="20" cy="17" r="8.5" fill="#1e7a4c"/><path d="M20 11.6l2.9 2.1-1.1 3.4h-3.6l-1.1-3.4Z" fill="#fff"/><path d="M13.2 15.6l2.6-.8 1.1 3.4-2 2.6M26.8 15.6l-2.6-.8-1.1 3.4 2 2.6M17.6 22.9l.7-2.6h3.4l.7 2.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e7a4c' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`} width={124} height={124} alt="" />
      </div>
    ),
    size,
  );
}
