# Rencana Desain v0.2.6 — Dashboard attention-first + refresh landing

Tahap 3 dari redesign bertahap (v0.2.4 fondasi → v0.2.5 navigasi →
v0.2.6 dashboard attention-first + landing). Termasuk bersih-bersih
menu duplikat yang dilaporkan Agung 6 Nov 2026: "Pusat Perhatian"
digabung ke "Reminder Center". Subjek: Dashboard sebagai rumah
perhatian (apa yang perlu diurus sebelum terlambat) dan landing
sebagai janji yang sama. Audiensnya pemilik yang membuka aplikasi
untuk mengecek apa yang mendesak hari ini.

## 1. Audit penggabungan: dua halaman tentang hal yang sama

Sebelum v0.2.6 ada dua rumah perhatian:

- Tab `'attention'` ("Pusat Perhatian", `AttentionDashboardPage`):
  halaman "Attention Intelligence" yang dibangun di atas
  `attentionSignalEngine` + `attentionPresentationAdapter` +
  `FleetAttentionOverview` + workflow gateway (modal eksekusi
  workflow, resolver perpanjangan dokumen berbasis bukti, review
  tren biaya). Isinya sinyal per aset: dokumen kedaluwarsa, servis
  terlewat, lonjakan biaya.
- Tab `'reminders'` ("Reminder Center", `RemindersPage`): daftar
  pengingat per tugas (terlambat / hari ini / mendatang / selesai)
  dengan filter aset dan kategori, aksi Selesaikan dan Abaikan.
  Hanya menampilkan `asset.reminders` — TIDAK menampilkan garansi,
  pajak, atau oli yang tidak punya catatan pengingat.

Sementara itu sumber kebenaran ketiga — `getNeedsAttentionItems`
(`src/lib/utils.ts`, baris ~261) — sudah dipakai strip "Perlu
Perhatian" di Dashboard dan badge jumlah perhatian: pengingat yang
jatuh tempo ≤ 14 hari, garansi yang kedaluwarsa ≤ 30 hari atau habis
≤ 30 hari, pajak kendaraan ≤ 30 hari, dan oli yang tersisa ≤ 500 km.
Inilah set yang dimaksud "semua yang ditampilkan halaman perhatian"
(pengingat, garansi, pajak) — dan set ini pula yang sekarang menjadi
isi section gabungan.

Keputusan penggabungan:

- Reminder Center menjadi SATU-SATUNYA rumah perhatian + pengingat.
  Di atas daftar pengingat, ia kini punya section "Perlu Perhatian"
  dari `getNeedsAttentionItems`, dikelompokkan Terlambat (rose, badge
  jumlah) lalu Mendatang (amber, badge jumlah) — pengelompokan yang
  sama dengan strip Dashboard v0.2.4. Kartu dan aksinya pun sama:
  Detail Aset (ke detail aset) dan Selesaikan (untuk pengingat;
  garansi/pajak/oli tidak punya tombol Selesaikan, sama seperti di
  Dashboard). Section ini tidak terpengaruh filter tab di bawahnya —
  filter hanya memengaruhi daftar pengingat — dan hal itu ditulis
  di komentar kode agar tidak "diperbaiki" menjadi bug.
- Judul halaman disamakan dengan label nav: "Reminder Hub" →
  "Reminder Center" (inkonsistensi label kecil yang ikut dibersihkan).
- Nav 8 → 7 item: entri `'attention'` dihapus dari
  `src/lib/navigation.ts` (ikon `ShieldAlert` ikut dihapus dari
  import karena tidak terpakai lagi); cabang tab `'attention'` di
  `App.tsx` dihapus beserta import `AttentionDashboardPage`.
- Badge jumlah perhatian pindah ke "Reminder Center" di sidebar
  (`Sidebar.tsx`: `item.id === 'reminders'`) dan tetap di "Reminder"
  di BottomNav — sumber hitungan sama (`attentionItems.length` dari
  `App.tsx`). Komentar BottomNav yang sudah kedaluwarsa (menjelaskan
  badge ditempel ke item terdekat karena HP tidak punya slot Pusat
  Perhatian) diperbarui.
- Setelah perubahan, grep seluruh `src/` untuk id tab `'attention'`
  menghasilkan nol; literal "Pusat Perhatian" yang tersisa hanya di
  komentar kode (penjelasan riwayat penggabungan) dan di CHANGELOG —
  tidak ada di string UI maupun bundle.

## 2. Sub-sistem yatim yang dihapus (15 file) — dan konsekuensinya

Begitu tab `'attention'` dicabut, seluruh sub-sistem di baliknya
tidak punya importir lain (diverifikasi dengan grep sebelum
menghapus):

- `src/components/attention/` — AttentionDashboardPage,
  FleetAttentionOverview, AssetAttentionCard, ActionResolverCTA,
  EvidenceDisclosureModal.
- `src/components/workflow/` — WorkflowExecutionModal,
  DocumentRenewalResolverModal, CostTrendReviewModal.
- `src/hooks/useWorkflowGateway.ts`.
- `src/lib/attentionSignalEngine.ts`,
  `src/lib/attentionPresentationAdapter.ts`,
  `src/lib/workflowExecutionGateway.ts`,
  `src/lib/workflowStateMachine.ts`,
  `src/lib/coordinatedMutationService.ts`,
  `src/lib/documentRenewalCoordinatedService.ts`.

Yang TIDAK ikut dihapus karena masih dipakai di tempat lain:
`src/lib/tcoAnalyticsEngine.ts` (dipakai `TCOAnalyticsDashboard`),
`src/lib/clientNotificationHandoff.ts` (hanya memakai tipe
`WorkflowGatewayRequest`/`WorkflowGatewayResponse` dari `types.ts`,
bukan lib workflow), dan seluruh `src/types.ts` (definisi tipe
bersama). File-file yang dihapus bisa dipulihkan dari git.

Konsekuensi yang dicatat jujur: aksi workflow dari halaman lama —
resolver perpanjangan dokumen berbasis bukti, review tren biaya, dan
gateway eksekusi workflow — ikut terhapus, karena semuanya hanya bisa
dijangkau dari tab itu. Datanya tidak hilang: pengingat, garansi,
pajak, dan oli tetap muncul di Reminder Center dan strip Dashboard.
Bila suatu hari aksi workflow itu dibutuhkan lagi, itu pekerjaan
terpisah (menghidupkan kembali halaman atau memindahkan aksinya ke
detail aset), bukan bagian dari v0.2.6.

## 3. Dashboard attention-first

Urutan konten lama: hero "Ringkasan Aset Hari Ini" (+ tombol cepat)
→ kartu KPI → "Perlu Perhatian" → aset & perawatan. Urutan baru:

1. Hero yang dipimpin perhatian (banner emerald-900 yang sama,
   tanpa tombol). Bila ada butir perhatian: judul
   "Ada N hal yang perlu perhatian" dan subteks menyebut butir
   paling mendesak beserta teks jatuh temponya
   ("Paling mendesak — {judul} (Terlambat 3 hari)."). Butir paling
   mendesak adalah `attentionItems[0]` — daftar sudah terurut
   (terlambat dulu, lalu yang paling dekat jatuh temponya). Bila
   tidak ada: judul tenang "Semua terkendali" dan subteks
   "Semua garansi masih berlaku dan belum ada jadwal servis atau
   pajak yang jatuh tempo."
2. Section "Perlu Perhatian" sebagai section konten pertama di bawah
   hero (pengelompokan dan aksi tidak berubah dari v0.2.4; tautan
   "Semua Reminder" tetap menuju tab `'reminders'`).
3. Kartu KPI sebagai overview di bawah perhatian (tidak berubah isi).
4. Dua kolom aset & perawatan (tidak berubah).

Tombol cepat hero (Aset Baru / Servis / Reminder) dihapus: ketiganya
sudah ada di tombol sidebar "Tambah Aset Baru" (desktop) dan menu "+"
(FAB) di HP — ini duplikat yang dilaporkan Agung. FAB dan tombol
sidebar tidak diubah. Prop tambah Dashboard (`onQuickAddAsset`,
`onQuickAddMaintenance`, `onQuickAddReminder`) tetap dipakai empty
state di bawah (Tambah Aset / Catat Servis / Tambah Reminder), jadi
tidak ada perubahan props maupun `App.tsx` di sisi ini. Empty state
berbingkai v0.2.4 beserta aksinya dipertahankan.

## 4. Landing refresh (copy + mockup saja)

Tanpa redesign struktural, tanpa gradient baru, tanpa font eksternal:

- Badge hero: "Personal Asset Manager & Vault Digital" →
  "Tahu apa yang perlu perhatian, sebelum terlambat".
- Judul hero: "Kelola & Lindungi Aset Pribadi dalam Satu Vault
  Digital" → "Tahu Duluan Apa yang Perlu Perhatian".
- Subheadline: kini memimpin dengan manfaat perhatian (garansi yang
  mau habis, servis yang jatuh tempo, pajak yang mendekat — sebelum
  terlambat) sambil mempertahankan pesan vault yang 100% privat.
- Mockup: kartu statistik diurutkan ulang sehingga kartu perhatian
  ("Status Garansi — 2 Perlu Perhatian") menjadi yang pertama,
  diikuti Total Aset lalu TCO. Caption mockup: "Contoh tampilan
  dashboard yang mengutamakan perhatian (data contoh, bukan data
  Anda)" — tetap jujur bahwa itu data contoh.
- Gradient yang sudah ada di landing (logo, hero, kartu keunggulan,
  CTA bawah) TIDAK disentuh — di luar scope refresh ini; mengubahnya
  adalah pekerjaan visual terpisah, bukan copy.

## 5. Yang tidak berubah / tidak disentuh

Model data, sync engine, PIN, demo seeding, halaman Pengaturan,
item BottomNav (Dashboard, Aset, Reminder, Pengaturan), blok brand
sidebar, ikon Navbar, dan semua handler data. Tidak ada dependensi
baru, webfont eksternal, atau gradient baru.

## 6. Verifikasi

- `npm run lint` (tsc --noEmit): lolos.
- `npm run test:sync-queue`: 11/11.
- `npm run test:demo-seed`: 4/4.
- `npm run build`: lolos.
- `vite preview`: `/`, `/manifest.webmanifest`, `/sw.js` → 200.
- Bundle hasil build mengandung marker attention-first yang baru
  dan tidak lagi mengandung string nav "Pusat Perhatian" (hanya di
  CHANGELOG/dokumen).
- Cek visual belum dijalankan oleh builder (tidak ada browser di
  lingkungan build): parent agent memverifikasi live setelah push —
  khususnya hero Dashboard dengan dan tanpa butir perhatian, urutan
  section (Perlu Perhatian di atas KPI), section gabungan di
  Reminder Center (Terlambat lalu Mendatang), badge di sidebar
  "Reminder Center", dan hero + mockup landing.
