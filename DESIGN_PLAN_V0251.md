# Rencana Desain v0.2.5.1 — Perbaiki scroll Pengaturan di HP + label versi

Patch atas v0.2.5 (Tahap 2: navigasi sidebar + Pengaturan sebagai halaman).
Subjek: halaman Pengaturan (Control Center) milik pemilik aset — tugasnya
membiarkan pemilik mencapai semua section (storage & sync, PIN, kategori,
backup, diagnostik, notifikasi, Zona Bahaya) lalu bertindak. Audiensnya
pemilik yang membuka Pengaturan dari HP.

## 1. Akar masalah scroll (dibuktikan dari kode, bukan tebakan)

`SettingsModal` punya efek kunci-scroll modal (baris ~59):

```ts
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
}, [isOpen]);
```

Efek ini benar untuk mode modal overlay (halaman di belakang modal tidak
boleh ikut bergerak), tapi berjalan tanpa syarat — tidak memeriksa
`asPage`. Sejak v0.2.5, Pengaturan dirender sebagai halaman penuh
(`<SettingsModal asPage isOpen ...>` di `App.tsx`, tab `'settings'`),
jadi selama pengguna berada di halaman Pengaturan, `isOpen` selalu true
dan body terkunci (`overflow: hidden` di body diteruskan ke viewport).
Halaman tidak bisa di-scroll; section bawah (Zona Bahaya) tidak
terjangkau. Di desktop tidak ketahuan karena konten Pengaturan yang
terlipat muat dalam satu viewport tinggi; di HP konten yang sama lebih
tinggi dari viewport sehingga kunci scroll langsung terasa.

Bukti pendukung (diferensial): Dashboard dan Aset memakai `<main>` yang
sama dan tetap bisa di-scroll di HP — hanya Pengaturan yang tidak. Jadi
penyebabnya spesifik untuk Pengaturan, yaitu efek kunci-scroll ini,
bukan `<main overflow-hidden>` di `App.tsx`.

## 2. Perbaikan (akar masalah, bukan workaround)

Efek kunci-scroll kini dilewati bila `asPage`:

```ts
useEffect(() => {
  if (asPage) return;
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
}, [isOpen, asPage]);
```

Mode modal (tidak lagi dipakai pintu masuk mana pun di v0.2.5, tapi
dipertahankan sebagai fallback) tetap mengunci body seperti semula.
Mode halaman tidak menyentuh body sama sekali — halaman scroll normal
lewat body, seperti Dashboard dan halaman lain. `asPage` masuk daftar
dependensi, jadi peralihan mode pun aman (cleanup sebelumnya jalan dulu).

`<main overflow-hidden>` di `App.tsx` TIDAK diubah: main menyesuaikan
tinggi konten (flex-basis 0% pada row dihitung sebagai `auto` karena
tinggi root tidak definit — `min-h-screen`, bukan `h-screen`), jadi
tidak ada yang terpotong; dan mengubahnya akan membuka risiko scroll
horizontal dari konten lebar. Keputusan ini dicatat agar tidak
diperdebatkan ulang tanpa bukti baru.

## 3. Label versi di Pengaturan

Baris kecil di bawah Zona Bahaya, hanya di mode halaman:

```jsx
{asPage && (
  <p className="pt-1 pb-2 text-center text-[11px] font-medium text-stone-400">
    MicroMate v{APP_VERSION}
  </p>
)}
```

- Teks: "MicroMate v0.2.5.1" — kecil (11px), abu-abu stone-400,
  rata tengah, tanpa warna aksen (sesuai aturan: warna hanya untuk
  data, bukan chrome).
- Sumber versi: `import packageJson from '../../package.json'` di
  `SettingsModal.tsx`, `const APP_VERSION = packageJson.version`.
  Vite membundel JSON secara native; `resolveJsonModule: true`
  ditambahkan ke `tsconfig.json` agar `tsc --noEmit` (lint) mengenal
  import JSON. Dengan cara ini label selalu sama dengan rilis — tidak
  ada string versi kedua yang bisa melenceng.
- Catatan: nomor versi empat segmen (0.2.5.1) bukan semver murni —
  `npm version` menolaknya, jadi bump dilakukan manual di package.json
  + package-lock.json (diff lock tepat 2 baris, seperti v0.2.4.1).

## 4. Yang tidak berubah / tidak disentuh

Model data, sync engine, PIN, demo seeding, reset (`handleClearCacheAndReset`),
semua section dan handler Pengaturan, navigasi (sidebar/BottomNav), dan
`<main>`. Tidak ada dependensi baru, webfont eksternal, atau gradient.
Mode modal SettingsModal tetap ada di kode sebagai fallback reversibel.

## 5. Verifikasi

- `npm run lint` (tsc --noEmit): lolos — termasuk import JSON baru.
- `npm run test:sync-queue`: 11/11.
- `npm run test:demo-seed`: 4/4.
- `npm run build`: lolos.
- `vite preview`: `/`, `/manifest.webmanifest`, `/sw.js` → 200.
- Cek visual belum dijalankan oleh builder (tidak ada browser di
  lingkungan build): parent agent memverifikasi live setelah push —
  khususnya scroll halaman Pengaturan di HP (semua section sampai
  Zona Bahaya terjangkau) dan label versi yang terbaca.
