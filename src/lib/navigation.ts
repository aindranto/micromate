import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  Wrench,
  Bell,
  PieChart,
  BookOpen,
  Settings,
} from 'lucide-react';

// Satu sumber kebenaran navigasi (v0.2.5): sidebar desktop dan BottomNav
// membaca daftar yang sama, jadi label dan urutan tidak bisa melenceng.
// `label` dipakai di sidebar, `shortLabel` di BottomNav HP (hanya di mana
// label penuh tidak muat). `section` memisahkan halaman data ('utama')
// dari tujuan sistem ('sistem', yaitu Pengaturan).
export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  section: 'utama' | 'sistem';
  inBottomNav: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, section: 'utama', inBottomNav: true },
  { id: 'assets', label: 'Aset Saya', shortLabel: 'Aset', icon: Package, section: 'utama', inBottomNav: true },
  { id: 'maintenance', label: 'Perawatan & Servis', shortLabel: 'Servis', icon: Wrench, section: 'utama', inBottomNav: false },
  { id: 'reminders', label: 'Reminder Center', shortLabel: 'Reminder', icon: Bell, section: 'utama', inBottomNav: true },
  { id: 'expenses', label: 'Biaya & TCO', shortLabel: 'Biaya', icon: PieChart, section: 'utama', inBottomNav: false },
  { id: 'docs', label: 'Panduan & Docs', shortLabel: 'Panduan', icon: BookOpen, section: 'utama', inBottomNav: false },
  { id: 'settings', label: 'Pengaturan', shortLabel: 'Pengaturan', icon: Settings, section: 'sistem', inBottomNav: true },
];

// BottomNav menampilkan subset di atas dalam urutan sidebar yang sama.
export const BOTTOM_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.inBottomNav);
