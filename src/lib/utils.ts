import { Asset, MaintenanceRecord, Reminder, Warranty } from '../types';

/** Helper untuk mengonversi URL Google Drive ke format gambar langsung (CDN direct view) */
export function formatImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Extract Google Drive File ID jika berbentuk URL drive
  let fileId = '';
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    fileId = matchFileD[1];
  } else {
    const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchIdParam && matchIdParam[1]) {
      fileId = matchIdParam[1];
    }
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url;
}

export function formatRupiah(amount?: number): string {
  if (amount === undefined || amount === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getDaysRemaining(targetDateStr?: string): number | null {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getWarrantyStatus(warranty?: Warranty): {
  status: 'active' | 'expiring_soon' | 'expired' | 'no_warranty';
  label: string;
  badgeClass: string;
  daysLeft: number | null;
} {
  if (!warranty || !warranty.end_date) {
    return {
      status: 'no_warranty',
      label: 'Tanpa Garansi',
      badgeClass: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
      daysLeft: null
    };
  }

  const daysLeft = getDaysRemaining(warranty.end_date);
  if (daysLeft === null) {
    return {
      status: 'no_warranty',
      label: 'Tanpa Garansi',
      badgeClass: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
      daysLeft: null
    };
  }

  if (daysLeft < 0) {
    return {
      status: 'expired',
      label: 'Garansi Habis',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900',
      daysLeft
    };
  }

  if (daysLeft <= 30) {
    return {
      status: 'expiring_soon',
      label: `Garansi Habis dalam ${daysLeft} Hari`,
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
      daysLeft
    };
  }

  return {
    status: 'active',
    label: `Garansi Aktif (${daysLeft} hari lagi)`,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
    daysLeft
  };
}

export function calculateAssetTCO(asset: Asset): {
  purchasePrice: number;
  maintenanceTotal: number;
  repairTotal: number;
  accessoriesTotal: number;
  otherTotal: number;
  totalCostOfOwnership: number;
} {
  const purchasePrice = asset.purchase_price || 0;
  let maintenanceTotal = 0;
  let repairTotal = 0;
  let accessoriesTotal = 0;
  let otherTotal = 0;

  if (asset.expenses && asset.expenses.length > 0) {
    asset.expenses.forEach((e) => {
      if (e.type === 'maintenance') maintenanceTotal += e.amount;
      else if (e.type === 'repair') repairTotal += e.amount;
      else if (e.type === 'accessories') accessoriesTotal += e.amount;
      else if (e.type === 'other') otherTotal += e.amount;
    });
  } else if (asset.maintenance_records && asset.maintenance_records.length > 0) {
    asset.maintenance_records.forEach((m) => {
      if (m.type === 'repair') repairTotal += m.cost;
      else maintenanceTotal += m.cost;
    });
  }

  const totalCostOfOwnership = purchasePrice + maintenanceTotal + repairTotal + accessoriesTotal + otherTotal;

  return {
    purchasePrice,
    maintenanceTotal,
    repairTotal,
    accessoriesTotal,
    otherTotal,
    totalCostOfOwnership
  };
}

export interface AttentionItem {
  id: string;
  assetId?: string;
  assetName: string;
  title: string;
  category: 'maintenance' | 'warranty' | 'tax' | 'oil' | 'custom';
  dueDate?: string;
  daysDiff?: number;
  isOverdue: boolean;
  severity: 'high' | 'medium' | 'info';
  actionLabel: string;
}

export function getNeedsAttentionItems(assets: Asset[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  assets.forEach((asset) => {
    // 1. Warranty expiring soon or expired
    if (asset.warranty && asset.warranty.end_date) {
      const days = getDaysRemaining(asset.warranty.end_date);
      if (days !== null) {
        if (days <= 0 && days >= -30) {
          items.push({
            id: `war_exp_${asset.asset_id}`,
            assetId: asset.asset_id,
            assetName: asset.name,
            title: `Masa Garansi Berakhir (${formatDate(asset.warranty.end_date)})`,
            category: 'warranty',
            dueDate: asset.warranty.end_date,
            daysDiff: days,
            isOverdue: true,
            severity: 'high',
            actionLabel: 'Lihat Garansi'
          });
        } else if (days > 0 && days <= 30) {
          items.push({
            id: `war_soon_${asset.asset_id}`,
            assetId: asset.asset_id,
            assetName: asset.name,
            title: `Garansi Habis dalam ${days} Hari (${formatDate(asset.warranty.end_date)})`,
            category: 'warranty',
            dueDate: asset.warranty.end_date,
            daysDiff: days,
            isOverdue: false,
            severity: 'medium',
            actionLabel: 'Lihat Garansi'
          });
        }
      }
    }

    // 2. Vehicle Tax & Registration
    if (asset.vehicle_details) {
      const veh = asset.vehicle_details;
      if (veh.annual_tax_date) {
        const days = getDaysRemaining(veh.annual_tax_date);
        if (days !== null && days <= 30) {
          items.push({
            id: `tax_${asset.asset_id}`,
            assetId: asset.asset_id,
            assetName: asset.name,
            title: days < 0 
              ? `Jatuh Tempo Pajak STNK Lewat (${formatDate(veh.annual_tax_date)})`
              : `Pajak STNK Jatuh Tempo dalam ${days} Hari (${formatDate(veh.annual_tax_date)})`,
            category: 'tax',
            dueDate: veh.annual_tax_date,
            daysDiff: days,
            isOverdue: days < 0,
            severity: days < 0 ? 'high' : 'medium',
            actionLabel: 'Perbarui Pajak'
          });
        }
      }

      // Vehicle Oil & Service Mileage checks
      if (veh.current_mileage && veh.next_oil_change_mileage) {
        const kmRemaining = veh.next_oil_change_mileage - veh.current_mileage;
        if (kmRemaining <= 500) {
          items.push({
            id: `oil_km_${asset.asset_id}`,
            assetId: asset.asset_id,
            assetName: asset.name,
            title: kmRemaining <= 0
              ? `Sudah Waktunya Ganti Oli Mesin! (Saat ini: ${veh.current_mileage.toLocaleString('id-ID')} km)`
              : `Jadwal Ganti Oli Mesin Tinggal ${kmRemaining} km lagi`,
            category: 'oil',
            daysDiff: Math.floor(kmRemaining / 50),
            isOverdue: kmRemaining <= 0,
            severity: kmRemaining <= 0 ? 'high' : 'medium',
            actionLabel: 'Catat Service'
          });
        }
      }
    }

    // 3. Reminders list attached to asset
    if (asset.reminders) {
      asset.reminders.forEach((r) => {
        if (r.status !== 'completed' && r.due_date) {
          const days = getDaysRemaining(r.due_date);
          if (days !== null && days <= 14) {
            items.push({
              id: r.reminder_id,
              assetId: asset.asset_id,
              assetName: asset.name,
              title: r.title,
              category: r.type === 'maintenance' ? 'maintenance' : 'custom',
              dueDate: r.due_date,
              daysDiff: days,
              isOverdue: days < 0,
              severity: days < 0 ? 'high' : 'medium',
              actionLabel: 'Selesaikan'
            });
          }
        }
      });
    }
  });

  // Sort by overdue first, then nearest due date
  return items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return (a.daysDiff || 0) - (b.daysDiff || 0);
  });
}
