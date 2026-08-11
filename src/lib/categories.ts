import { useState, useEffect } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  Headphones, 
  Watch, 
  Camera, 
  Car, 
  Bike, 
  Truck, 
  Home, 
  Lamp, 
  Refrigerator, 
  Sofa, 
  Fan, 
  Gamepad2, 
  Dumbbell, 
  Music, 
  Book, 
  Box, 
  Package, 
  Tag, 
  Wrench, 
  Briefcase, 
  Shield, 
  Zap, 
  Heart, 
  Gift, 
  Key, 
  Folder,
  Cpu,
  Utensils,
  Shirt,
  Sparkles,
  Luggage,
  LucideIcon
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  label: string;
  iconName: string;
  isDefault?: boolean;
}

export const CATEGORY_ICON_LIST: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'Laptop', label: 'Laptop/Komputer', icon: Laptop },
  { name: 'Smartphone', label: 'HP/Smartphone', icon: Smartphone },
  { name: 'Tablet', label: 'Tablet/Pad', icon: Tablet },
  { name: 'Monitor', label: 'Monitor/Layar', icon: Monitor },
  { name: 'Tv', label: 'Televisi', icon: Tv },
  { name: 'Headphones', label: 'Audio/Headset', icon: Headphones },
  { name: 'Watch', label: 'Jam/Smartwatch', icon: Watch },
  { name: 'Camera', label: 'Kamera', icon: Camera },
  { name: 'Car', label: 'Mobil', icon: Car },
  { name: 'Bike', label: 'Motor/Sepeda', icon: Bike },
  { name: 'Truck', label: 'Truk/Kargo', icon: Truck },
  { name: 'Home', label: 'Rumah/Properti', icon: Home },
  { name: 'Lamp', label: 'Pencahayaan/Lampu', icon: Lamp },
  { name: 'Refrigerator', label: 'Kulkas/Dapur', icon: Refrigerator },
  { name: 'Sofa', label: 'Mebel/Furniture', icon: Sofa },
  { name: 'Fan', label: 'Kipas/Pendingin', icon: Fan },
  { name: 'Gamepad2', label: 'Gaming/Konsol', icon: Gamepad2 },
  { name: 'Dumbbell', label: 'Olahraga/Fitness', icon: Dumbbell },
  { name: 'Music', label: 'Musik/Instrumen', icon: Music },
  { name: 'Book', label: 'Buku/Dokumen', icon: Book },
  { name: 'Cpu', label: 'SIM Card/Chip/Komponen', icon: Cpu },
  { name: 'Box', label: 'Kotak/Aset Umum', icon: Box },
  { name: 'Package', label: 'Paket/Peralatan', icon: Package },
  { name: 'Tag', label: 'Tag/Label', icon: Tag },
  { name: 'Wrench', label: 'Perkakas/Servis', icon: Wrench },
  { name: 'Briefcase', label: 'Pekerjaan/Kantor', icon: Briefcase },
  { name: 'Shield', label: 'Garansi/Asuransi', icon: Shield },
  { name: 'Zap', label: 'Listrik/Elektronik', icon: Zap },
  { name: 'Heart', label: 'Personal/Kesehatan', icon: Heart },
  { name: 'Gift', label: 'Koleksi/Hadiah', icon: Gift },
  { name: 'Key', label: 'Kunci/Lisensi', icon: Key },
  { name: 'Folder', label: 'Arsip/Berkas', icon: Folder },
  { name: 'Utensils', label: 'Peralatan Dapur', icon: Utensils },
  { name: 'Shirt', label: 'Pakaian/Fashion', icon: Shirt },
  { name: 'Luggage', label: 'Koper/Travel', icon: Luggage },
  { name: 'Sparkles', label: 'Special/Mewah', icon: Sparkles },
];

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = CATEGORY_ICON_LIST.reduce(
  (acc, item) => {
    acc[item.name] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'device', label: 'Device', iconName: 'Laptop', isDefault: true },
  { id: 'vehicle', label: 'Vehicle', iconName: 'Car', isDefault: true },
  { id: 'home', label: 'Home', iconName: 'Home', isDefault: true },
  { id: 'camera', label: 'Camera', iconName: 'Camera', isDefault: true },
  { id: 'gaming', label: 'Gaming', iconName: 'Gamepad2', isDefault: true },
  { id: 'other', label: 'Lainnya', iconName: 'Box', isDefault: true },
];

const LOCAL_STORAGE_KEY = 'micromate_categories';

export function getCategories(): CategoryItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse categories from localStorage', e);
  }
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories: CategoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event('micromate_categories_updated'));
  } catch (e) {
    console.error('Failed to save categories to localStorage', e);
  }
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return CATEGORY_ICON_MAP[iconName] || Box;
}

export function getCategoryLabel(categoryId: string, customCategories?: CategoryItem[]): string {
  const list = customCategories || getCategories();
  const found = list.find((c) => c.id === categoryId);
  if (found) return found.label;
  
  // Fallbacks
  switch (categoryId) {
    case 'device': return 'Device';
    case 'vehicle': return 'Vehicle';
    case 'home': return 'Home';
    case 'camera': return 'Camera';
    case 'gaming': return 'Gaming';
    case 'other': return 'Lainnya';
    default: return categoryId;
  }
}

export function useCategories(): CategoryItem[] {
  const [categories, setCategories] = useState<CategoryItem[]>(getCategories);

  useEffect(() => {
    const handleUpdate = () => {
      setCategories(getCategories());
    };
    window.addEventListener('micromate_categories_updated', handleUpdate);
    return () => {
      window.removeEventListener('micromate_categories_updated', handleUpdate);
    };
  }, []);

  return categories;
}
