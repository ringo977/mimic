// ============================================================
// Lab Manager - Data Types & Mock Data
// ============================================================

// --- Types ---

export type UserRole = 'admin' | 'pi' | 'researcher' | 'lab_manager' | 'project_manager' | 'postdoc' | 'phd' | 'msc' | 'guest';

export type UserAffiliation = 'MiMic Lab' | 'DEIB' | 'POLIMI' | 'External';

export interface LabUser {
  id: string;
  email: string;
  name: string;
  abbreviation: string;
  role: UserRole;
  affiliation: UserAffiliation;
  isAdmin: boolean;
  certifications: string[];
  projects: string[];
}

export function generateAbbreviation(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.substring(0, 3).toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1].substring(0, 2).toUpperCase();
}

export interface Instrument {
  id: string;
  name: string;
  category: string;
  location: string;
  locationId?: string;
  requiresCertification: boolean;
  description: string;
  icon: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: string;
  commissionDate?: string;
  maintenancePeriodMonths?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface MaintenanceLog {
  id: string;
  instrumentId: string;
  date: string;
  type: 'scheduled' | 'repair' | 'calibration' | 'inspection';
  description: string;
  performedBy: string;
  cost?: number;
  notes?: string;
}

// --- Storage Units (was Dewar) ---

export type StorageUnitType = 'DEWAR' | 'ULT_FREEZER' | 'FREEZER_40' | 'FREEZER' | 'FRIDGE' | 'CABINET' | 'DRY_CAB' | 'INCUBATOR' | 'SAFETY';

export const storageUnitTypes: Record<StorageUnitType, { label: string; temperature: string; icon: string }> = {
  DEWAR:       { label: 'LN₂ Dewar',          temperature: '−196 °C',     icon: '🧊' },
  ULT_FREEZER: { label: 'Ultra-Low Freezer',   temperature: '−80 °C',      icon: '🥶' },
  FREEZER_40:  { label: 'Mid-Temp Freezer',     temperature: '−40 °C',      icon: '❄️' },
  FREEZER:     { label: 'Freezer',              temperature: '−20 °C',      icon: '❄️' },
  FRIDGE:      { label: 'Refrigerator',         temperature: '+4 °C',       icon: '🌡️' },
  CABINET:     { label: 'Storage Cabinet',      temperature: 'RT',          icon: '🗄️' },
  DRY_CAB:     { label: 'Desiccator Cabinet',   temperature: 'RT / Low RH', icon: '💨' },
  INCUBATOR:   { label: 'Incubator',            temperature: '+37 °C',      icon: '🔬' },
  SAFETY:      { label: 'Safety Cabinet',       temperature: 'RT',          icon: '⚠️' },
};

export interface StorageUnit {
  id: string;
  name: string;
  type: StorageUnitType;
  temperature: string;
  model: string;
  location: string;        // display string
  locationId?: string;     // references Location.id
  // Rack/box/grid config (for cryo-type: DEWAR, ULT_FREEZER, FREEZER_40)
  numRacks?: number;
  boxesPerRack?: number;
  gridRows?: number;
  gridCols?: number;
  // Shelf/door config (for freezers, fridges, cabinets, etc.)
  numShelves?: number;
  numDoors?: number;  // 1 = single door, 2 = left + right
}

/** Types that use rack + box + vial grid layout (only LN₂ dewars) */
export const rackBasedTypes: StorageUnitType[] = ['DEWAR'];
/** Types that use shelf + door layout (everything else) */
export const shelfBasedTypes: StorageUnitType[] = ['ULT_FREEZER', 'FREEZER_40', 'FREEZER', 'FRIDGE', 'CABINET', 'DRY_CAB', 'INCUBATOR', 'SAFETY'];
export function isRackBased(t: StorageUnitType): boolean { return rackBasedTypes.includes(t); }
export function isShelfBased(t: StorageUnitType): boolean { return shelfBasedTypes.includes(t); }

export interface Location {
  id: string;
  name: string;        // e.g. "Room 101", "Cleanroom"
  building?: string;   // e.g. "Building 3", "DEIB"
  floor?: string;      // e.g. "Ground Floor", "2nd Floor"
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed';
}

export interface Certification {
  id: string;
  name: string;
  instrumentId?: string;
  description: string;
}

export interface Booking {
  id: string;
  instrumentId: string;
  userId: string;
  userName: string;
  date: string;
  startHour: number;   // decimal hours: 9 = 09:00, 9.5 = 09:30
  endHour: number;
  notes: string;
  createdAt: string;
}

// Lab-wide booking configuration (editable by admins, shared via Supabase).
export interface BookingSettings {
  openStartHour: number;   // earliest bookable hour shown on the timeline
  openEndHour: number;     // latest bookable hour (exclusive end of last slot)
  workStartHour: number;   // start of highlighted "working hours" band
  workEndHour: number;     // end of working hours band
  slotMinutes: 30 | 60;    // booking granularity
}

export const defaultBookingSettings: BookingSettings = {
  openStartHour: 7,
  openEndHour: 21,
  workStartHour: 9,
  workEndHour: 19,
  slotMinutes: 30,
};

// Clamp/sanitize settings loaded from storage so the UI never breaks.
export function sanitizeBookingSettings(s: Partial<BookingSettings> | null | undefined): BookingSettings {
  const d = defaultBookingSettings;
  const slot = s?.slotMinutes === 60 ? 60 : 30;
  let openStart = Number.isFinite(s?.openStartHour) ? (s as BookingSettings).openStartHour : d.openStartHour;
  let openEnd = Number.isFinite(s?.openEndHour) ? (s as BookingSettings).openEndHour : d.openEndHour;
  let workStart = Number.isFinite(s?.workStartHour) ? (s as BookingSettings).workStartHour : d.workStartHour;
  let workEnd = Number.isFinite(s?.workEndHour) ? (s as BookingSettings).workEndHour : d.workEndHour;
  openStart = Math.min(Math.max(0, openStart), 23);
  openEnd = Math.min(Math.max(openStart + 1, openEnd), 24);
  workStart = Math.min(Math.max(openStart, workStart), openEnd);
  workEnd = Math.min(Math.max(workStart, workEnd), openEnd);
  return { openStartHour: openStart, openEndHour: openEnd, workStartHour: workStart, workEndHour: workEnd, slotMinutes: slot };
}

// Build the list of slot START hours (decimal) for a given settings range.
export function buildBookingSlots(settings: BookingSettings): number[] {
  const step = settings.slotMinutes / 60;
  const slots: number[] = [];
  for (let h = settings.openStartHour; h < settings.openEndHour - 1e-9; h += step) {
    slots.push(Math.round(h * 100) / 100);
  }
  return slots;
}

// True if the given decimal hour falls inside the working-hours band.
export function isWorkingHour(hour: number, settings: BookingSettings): boolean {
  return hour >= settings.workStartHour && hour < settings.workEndHour;
}

export interface Reagent {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  maxStock: number;
  unit: string;
  expiryDate: string;
  location: string;
  storageUnitId?: string;   // links to StorageUnit
  supplier: string;
  catalogNumber: string;
  alertThreshold: number;
}

// Macro-categories group sub-categories for admin panel navigation
export type ReagentMacroCategory = 'Reagents' | 'Plasticware' | 'Microfabrication' | 'Gases & Liquids';

export const reagentMacroCategories: Record<ReagentMacroCategory, { label: string; icon: string; subCategories: string[] }> = {
  'Reagents':          { label: 'Reagents',          icon: '🧪', subCategories: ['Culture Media', 'Reagents', 'Staining', 'Antibodies', 'Chemicals'] },
  'Plasticware':       { label: 'Plasticware',       icon: '🧫', subCategories: ['Plasticware'] },
  'Microfabrication':  { label: 'Microfabrication',  icon: '💿', subCategories: ['Microfabrication'] },
  'Gases & Liquids':   { label: 'Gases & Liquids',   icon: '⛽', subCategories: ['Gases & Liquids'] },
};

export const allMacroKeys = Object.keys(reagentMacroCategories) as ReagentMacroCategory[];

/** Get the macro-category a sub-category belongs to */
export function getMacroCategory(category: string): ReagentMacroCategory {
  for (const [macro, info] of Object.entries(reagentMacroCategories)) {
    if (info.subCategories.includes(category)) return macro as ReagentMacroCategory;
  }
  return 'Reagents'; // fallback
}

// Known instrument categories (for dropdown)
export const instrumentCategories = ['Cell Culture', 'Microscopy', 'Microfabrication', 'Analysis', 'Microfluidics'] as const;

// Emoji palette for instrument icons
export const instrumentIcons = [
  '🔬', '🧫', '🌡️', '🔄', '🔢', '🔍', '💿', '⚡', '🔥', '☀️',
  '📊', '📋', '🧬', '🧪', '💉', '🎛️', '🔧', '⚗️', '🧲', '💡',
  '🖥️', '📷', '🩺', '⚙️', '🏗️', '🛠️', '📐', '🔩', '💎', '🌊',
];

export interface ReagentTransaction {
  id: string;
  reagentId: string;
  userId: string;
  userName: string;
  type: 'withdraw' | 'add' | 'aliquot';
  amount: number;
  purpose: string;
  project: string;
  timestamp: string;
}

export interface CryoVial {
  id: string;
  cellLine: string;
  passage: number;
  date: string;
  userId: string;
  userName: string;
  storageUnitId: string;   // references StorageUnit.id
  rack: number;
  box: number;
  row: number;
  col: number;
  notes: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  type: 'reagent' | 'antibody' | 'consumable' | 'equipment';
  catalogNumber: string;
  supplier: string;
  estimatedCost: number;
  quantity: number;
  urgency: 'low' | 'medium' | 'high';
  requestedBy: string;
  requestedByName: string;
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'delivered';
  approvedBy?: string;
  deliveredAt?: string;
  stockedToReagentId?: string;     // reagent ID if stocked
  stockedToStorageUnitId?: string;  // storage unit ID if stocked
  notes: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'booking' | 'reagent' | 'cryo' | 'wishlist' | 'auth' | 'manual';
  details: string;
}

export interface Manual {
  id: string;
  title: string;
  category: 'protocol' | 'manual' | 'sds';
  instrument?: string;
  description: string;
  lastUpdated: string;
  uploadedBy: string;
  fileData?: string;
  fileName?: string;
  fileUrl?: string;
}

// --- Permissions ---

export const rolePermissions: Record<UserRole, {
  canBook: boolean;
  canWithdrawReagents: boolean;
  canAddReagents: boolean;
  canManageCryo: boolean;
  canRequestOrders: boolean;
  canApproveOrders: boolean;
  canViewLog: boolean;
  canViewDatabase: boolean;
  canExportData: boolean;
  canUploadManuals: boolean;
  canAdmin: boolean;
  label: string;
}> = {
  admin: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: true,
    canViewLog: true, canViewDatabase: true, canExportData: true,
    canUploadManuals: true, canAdmin: true, label: 'Administrator',
  },
  pi: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: true,
    canViewLog: true, canViewDatabase: true, canExportData: true,
    canUploadManuals: true, canAdmin: true, label: 'Principal Investigator',
  },
  researcher: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: true, canViewDatabase: true, canExportData: true,
    canUploadManuals: true, canAdmin: false, label: 'Researcher',
  },
  lab_manager: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: true,
    canViewLog: true, canViewDatabase: true, canExportData: true,
    canUploadManuals: true, canAdmin: false, label: 'Lab Manager',
  },
  project_manager: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: true,
    canViewLog: true, canViewDatabase: false, canExportData: true,
    canUploadManuals: true, canAdmin: false, label: 'Project Manager',
  },
  postdoc: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: true, canViewDatabase: false, canExportData: false,
    canUploadManuals: true, canAdmin: false, label: 'Post-Doc',
  },
  phd: {
    canBook: true, canWithdrawReagents: true, canAddReagents: false,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'PhD Student',
  },
  msc: {
    canBook: true, canWithdrawReagents: false, canAddReagents: false,
    canManageCryo: false, canRequestOrders: false, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'MSc Student',
  },
  guest: {
    canBook: false, canWithdrawReagents: false, canAddReagents: false,
    canManageCryo: false, canRequestOrders: false, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'Guest',
  },
};

// Reduced permissions for non-MiMic users (DEIB, POLIMI, External)
export const externalRolePermissions: Record<UserRole, typeof rolePermissions[UserRole]> = {
  admin: { ...rolePermissions.admin },
  pi: { ...rolePermissions.pi },
  researcher: {
    canBook: true, canWithdrawReagents: true, canAddReagents: false,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'Researcher',
  },
  lab_manager: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: true, canViewDatabase: false, canExportData: false,
    canUploadManuals: true, canAdmin: false, label: 'Lab Manager',
  },
  project_manager: {
    canBook: true, canWithdrawReagents: true, canAddReagents: false,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'Project Manager',
  },
  postdoc: {
    canBook: true, canWithdrawReagents: true, canAddReagents: false,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'Post-Doc',
  },
  phd: {
    canBook: true, canWithdrawReagents: true, canAddReagents: false,
    canManageCryo: false, canRequestOrders: false, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'PhD Student',
  },
  msc: {
    canBook: true, canWithdrawReagents: false, canAddReagents: false,
    canManageCryo: false, canRequestOrders: false, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'MSc Student',
  },
  guest: {
    canBook: false, canWithdrawReagents: false, canAddReagents: false,
    canManageCryo: false, canRequestOrders: false, canApproveOrders: false,
    canViewLog: false, canViewDatabase: false, canExportData: false,
    canUploadManuals: false, canAdmin: false, label: 'Guest',
  },
};

// --- Mock Users ---

export const mockUsers: LabUser[] = [
  { id: 'u0', email: 'admin@polimi.it', name: 'Admin MiMic', abbreviation: 'AMI', role: 'admin', affiliation: 'MiMic Lab', isAdmin: true,
    certifications: ['confocal','flow-cytometer','rt-pcr','spin-coater','plasma-cleaner','syringe-pump','plate-reader','western-blot','fluorescence','uv-curing','pressure-ctrl','chip-bonding','lab-safety','chemical-handling','bsl2'],
    projects: ['PHOENIX','REMODEL','MATRIx','SINERGIA','Lab Management'] },
  { id: 'u1', email: 'marco.rasponi@polimi.it', name: 'Marco Rasponi', abbreviation: 'MRA', role: 'pi', affiliation: 'MiMic Lab', isAdmin: true,
    certifications: ['confocal','flow-cytometer','rt-pcr','spin-coater','plasma-cleaner','syringe-pump','plate-reader','lab-safety','chemical-handling','bsl2'],
    projects: ['PHOENIX','REMODEL','MATRIx','SINERGIA'] },
  { id: 'u2', email: 'paola.occhetta@polimi.it', name: 'Paola Occhetta', abbreviation: 'POC', role: 'pi', affiliation: 'MiMic Lab', isAdmin: true,
    certifications: ['confocal','flow-cytometer','rt-pcr','spin-coater','plasma-cleaner','syringe-pump','plate-reader','lab-safety','chemical-handling','bsl2'],
    projects: ['PHOENIX','REMODEL'] },
  { id: 'u3', email: 'cecilia.palma@polimi.it', name: 'Cecilia Palma', abbreviation: 'CPA', role: 'lab_manager', affiliation: 'MiMic Lab', isAdmin: false,
    certifications: ['confocal','flow-cytometer','rt-pcr','spin-coater','plasma-cleaner','syringe-pump','plate-reader','western-blot','lab-safety','chemical-handling','bsl2'],
    projects: ['Lab Management'] },
  { id: 'u4', email: 'roberta.visone@polimi.it', name: 'Roberta Visone', abbreviation: 'RVI', role: 'postdoc', affiliation: 'MiMic Lab', isAdmin: false,
    certifications: ['confocal','flow-cytometer','spin-coater','plasma-cleaner','syringe-pump','plate-reader','lab-safety','bsl2'],
    projects: ['PHOENIX','REMODEL'] },
  { id: 'u5', email: 'alice.bianchi@polimi.it', name: 'Alice Bianchi', abbreviation: 'ABI', role: 'phd', affiliation: 'DEIB', isAdmin: false,
    certifications: ['confocal','spin-coater','plasma-cleaner','syringe-pump','lab-safety','bsl2'],
    projects: ['PHOENIX'] },
  { id: 'u6', email: 'giulia.ferretti@polimi.it', name: 'Giulia Ferretti', abbreviation: 'GFE', role: 'msc', affiliation: 'POLIMI', isAdmin: false,
    certifications: ['syringe-pump','lab-safety'],
    projects: ['REMODEL'] },
];

// --- Mock Storage Units ---

export const mockStorageUnits: StorageUnit[] = [
  // Cryo (with grid)
  { id: 'su-dewar1', name: 'Main LN₂ Dewar', type: 'DEWAR', temperature: '−196 °C', model: 'Thermo CryoPlus 2', location: 'Room 101', locationId: 'room-101', numRacks: 6, boxesPerRack: 5, gridRows: 5, gridCols: 5 },
  { id: 'su-dewar2', name: 'Backup LN₂ Dewar', type: 'DEWAR', temperature: '−196 °C', model: 'MVE XC 47/11-10', location: 'Room 102', locationId: 'room-102', numRacks: 4, boxesPerRack: 4, gridRows: 9, gridCols: 9 },
  // Ultra-low (shelves + door)
  { id: 'su-ult1', name: 'ULT Freezer #1', type: 'ULT_FREEZER', temperature: '−80 °C', model: 'Thermo TSX600', location: 'Room 101', locationId: 'room-101', numDoors: 1, numShelves: 5 },
  // Freezers
  { id: 'su-fz20', name: 'Freezer −20 °C', type: 'FREEZER', temperature: '−20 °C', model: 'Liebherr GGv 5010', location: 'Room 101', locationId: 'room-101', numDoors: 1, numShelves: 4 },
  // Fridges
  { id: 'su-fr-a', name: 'Fridge A (+4 °C)', type: 'FRIDGE', temperature: '+4 °C', model: 'Liebherr LKv 3910', location: 'Room 101', locationId: 'room-101', numDoors: 1, numShelves: 5 },
  { id: 'su-fr-b', name: 'Fridge B (+4 °C)', type: 'FRIDGE', temperature: '+4 °C', model: 'Liebherr LKv 3910', location: 'Room 102', locationId: 'room-102', numDoors: 1, numShelves: 5 },
  // Cabinets
  { id: 'su-shelf', name: 'Shelf B2', type: 'CABINET', temperature: 'RT', model: 'Standard shelving', location: 'Room 101', locationId: 'room-101', numDoors: 2, numShelves: 4 },
  { id: 'su-cab-c1', name: 'Cabinet C1', type: 'CABINET', temperature: 'RT', model: 'Chemical cabinet', location: 'Room 103', locationId: 'room-103', numDoors: 2, numShelves: 3 },
  // Desiccator
  { id: 'su-dry1', name: 'Desiccator Cabinet', type: 'DRY_CAB', temperature: 'RT / Low RH', model: 'Bel-Art SP Scienceware', location: 'Cleanroom', locationId: 'cleanroom', numDoors: 1, numShelves: 3 },
];

// --- Mock Locations ---

export const mockLocations: Location[] = [
  { id: 'room-101', name: 'Room 101', building: 'DEIB', floor: 'Ground Floor', notes: 'Main cell culture lab' },
  { id: 'room-102', name: 'Room 102', building: 'DEIB', floor: 'Ground Floor', notes: 'Secondary culture / microfluidics' },
  { id: 'room-103', name: 'Room 103', building: 'DEIB', floor: 'Ground Floor', notes: 'Chemical storage' },
  { id: 'room-201', name: 'Room 201', building: 'DEIB', floor: '1st Floor', notes: 'Microscopy suite' },
  { id: 'room-301', name: 'Room 301', building: 'DEIB', floor: '2nd Floor', notes: 'Analysis instruments' },
  { id: 'room-302', name: 'Room 302', building: 'DEIB', floor: '2nd Floor', notes: 'Molecular biology' },
  { id: 'cleanroom', name: 'Cleanroom', building: 'DEIB', floor: 'Ground Floor', notes: 'ISO 7 cleanroom - microfabrication' },
];

// --- Mock Projects ---

export const mockProjects: Project[] = [
  { id: 'PHOENIX', name: 'PHOENIX', description: 'Heart-on-Chip platform for cardiac drug testing and disease modeling', status: 'active' },
  { id: 'REMODEL', name: 'REMODEL', description: 'Cardiac remodeling studies on microfluidic devices', status: 'active' },
  { id: 'MATRIx', name: 'MATRIx', description: 'Advanced matrix engineering for Organ-on-Chip applications', status: 'active' },
  { id: 'SINERGIA', name: 'SINERGIA', description: 'Multi-organ integrated platforms for systemic studies', status: 'active' },
  { id: 'Lab Management', name: 'Lab Management', description: 'General laboratory operations, maintenance, and safety', status: 'active' },
];

// --- Mock Certifications ---

export const mockCertifications: Certification[] = [
  { id: 'confocal', name: 'Confocal Microscope', instrumentId: 'confocal', description: 'Nikon A1R confocal operation and maintenance' },
  { id: 'flow-cytometer', name: 'Flow Cytometer', instrumentId: 'flow-cytometer', description: 'BD FACSCanto II sample prep, acquisition, and analysis' },
  { id: 'rt-pcr', name: 'Real-Time PCR', instrumentId: 'rt-pcr', description: 'Bio-Rad CFX96 setup, run, and data analysis' },
  { id: 'spin-coater', name: 'Spin Coater', instrumentId: 'spin-coater', description: 'Laurell WS-650 operation in cleanroom' },
  { id: 'plasma-cleaner', name: 'Plasma Cleaner', instrumentId: 'plasma-cleaner', description: 'Harrick PDC-002 operation and bonding protocols' },
  { id: 'syringe-pump', name: 'Syringe Pump', instrumentId: 'syringe-pump', description: 'Harvard PHD Ultra setup and perfusion protocols' },
  { id: 'plate-reader', name: 'Plate Reader', instrumentId: 'plate-reader', description: 'Tecan Infinite M200 absorbance/fluorescence/luminescence' },
  { id: 'western-blot', name: 'Western Blot System', instrumentId: 'western-blot', description: 'Bio-Rad Trans-Blot gel/transfer/imaging' },
  { id: 'fluorescence', name: 'Fluorescence Microscope', instrumentId: 'fluorescence', description: 'Nikon Ti2-E widefield fluorescence operation' },
  { id: 'uv-curing', name: 'UV Curing System', instrumentId: 'uv-curing', description: 'OmniCure S2000 exposure and calibration' },
  { id: 'pressure-ctrl', name: 'Pressure Controller', instrumentId: 'pressure-ctrl', description: 'Elveflow OB1 MK4 setup and microfluidic protocols' },
  { id: 'chip-bonding', name: 'Chip Bonding Station', instrumentId: 'chip-bonding', description: 'Custom bonding station alignment and plasma bonding' },
  { id: 'lab-safety', name: 'Lab Safety Training', description: 'General laboratory safety, emergency procedures, waste disposal' },
  { id: 'chemical-handling', name: 'Chemical Handling', description: 'Safe handling, storage, and disposal of chemicals and reagents' },
  { id: 'bsl2', name: 'BSL-2 Training', description: 'Biosafety Level 2 procedures, decontamination, and containment' },
];

// --- Mock Instruments ---

export const mockInstruments: Instrument[] = [
  { id: 'bsc-1', name: 'Biosafety Cabinet #1', category: 'Cell Culture', location: 'Room 101', locationId: 'room-101', requiresCertification: false, description: 'Class II Type A2', icon: '🧫' },
  { id: 'bsc-2', name: 'Biosafety Cabinet #2', category: 'Cell Culture', location: 'Room 101', locationId: 'room-101', requiresCertification: false, description: 'Class II Type A2', icon: '🧫' },
  { id: 'incubator-1', name: 'CO₂ Incubator #1', category: 'Cell Culture', location: 'Room 101', locationId: 'room-101', requiresCertification: false, description: '37°C, 5% CO₂', icon: '🌡️' },
  { id: 'incubator-2', name: 'CO₂ Incubator #2', category: 'Cell Culture', location: 'Room 102', locationId: 'room-102', requiresCertification: false, description: '37°C, 5% CO₂, hypoxia', icon: '🌡️' },
  { id: 'centrifuge', name: 'Centrifuge', category: 'Cell Culture', location: 'Room 101', locationId: 'room-101', requiresCertification: false, description: 'Eppendorf 5810R', icon: '🔄' },
  { id: 'cell-counter', name: 'Cell Counter', category: 'Cell Culture', location: 'Room 101', locationId: 'room-101', requiresCertification: false, description: 'Countess 3', icon: '🔢' },
  { id: 'confocal', name: 'Confocal Microscope', category: 'Microscopy', location: 'Room 201', locationId: 'room-201', requiresCertification: true, description: 'Nikon A1R', icon: '🔬' },
  { id: 'fluorescence', name: 'Fluorescence Microscope', category: 'Microscopy', location: 'Room 201', locationId: 'room-201', requiresCertification: true, description: 'Nikon Ti2-E', icon: '🔬' },
  { id: 'inverted', name: 'Inverted Microscope', category: 'Microscopy', location: 'Room 102', locationId: 'room-102', requiresCertification: false, description: 'Olympus CKX53', icon: '🔬' },
  { id: 'stereo', name: 'Stereo Microscope', category: 'Microscopy', location: 'Room 103', locationId: 'room-103', requiresCertification: false, description: 'Leica M125', icon: '🔍' },
  { id: 'spin-coater', name: 'Spin Coater', category: 'Microfabrication', location: 'Cleanroom', locationId: 'cleanroom', requiresCertification: true, description: 'Laurell WS-650', icon: '💿' },
  { id: 'plasma-cleaner', name: 'Plasma Cleaner', category: 'Microfabrication', location: 'Cleanroom', locationId: 'cleanroom', requiresCertification: true, description: 'Harrick PDC-002', icon: '⚡' },
  { id: 'hot-plate', name: 'Hot Plate', category: 'Microfabrication', location: 'Cleanroom', locationId: 'cleanroom', requiresCertification: false, description: 'IKA C-MAG', icon: '🔥' },
  { id: 'uv-curing', name: 'UV Curing System', category: 'Microfabrication', location: 'Cleanroom', locationId: 'cleanroom', requiresCertification: true, description: 'OmniCure S2000', icon: '☀️' },
  { id: 'flow-cytometer', name: 'Flow Cytometer', category: 'Analysis', location: 'Room 301', locationId: 'room-301', requiresCertification: true, description: 'BD FACSCanto II', icon: '📊' },
  { id: 'plate-reader', name: 'Plate Reader', category: 'Analysis', location: 'Room 301', locationId: 'room-301', requiresCertification: true, description: 'Tecan Infinite M200', icon: '📋' },
  { id: 'rt-pcr', name: 'Real-Time PCR', category: 'Analysis', location: 'Room 302', locationId: 'room-302', requiresCertification: true, description: 'Bio-Rad CFX96', icon: '🧬' },
  { id: 'western-blot', name: 'Western Blot System', category: 'Analysis', location: 'Room 302', locationId: 'room-302', requiresCertification: true, description: 'Bio-Rad Trans-Blot', icon: '🧪' },
  { id: 'syringe-pump', name: 'Syringe Pump', category: 'Microfluidics', location: 'Room 102', locationId: 'room-102', requiresCertification: true, description: 'Harvard PHD Ultra', icon: '💉' },
  { id: 'pressure-ctrl', name: 'Pressure Controller', category: 'Microfluidics', location: 'Room 102', locationId: 'room-102', requiresCertification: true, description: 'Elveflow OB1 MK4', icon: '🎛️' },
  { id: 'chip-bonding', name: 'Chip Bonding Station', category: 'Microfluidics', location: 'Cleanroom', locationId: 'cleanroom', requiresCertification: true, description: 'Custom bonding setup', icon: '🔧' },
];

// --- Mock Reagents (with storageUnitId) ---

export const mockReagents: Reagent[] = [
  { id: 'r1', name: 'DMEM High Glucose', category: 'Culture Media', currentStock: 4, maxStock: 10, unit: 'bottles (500mL)', expiryDate: '2026-06-15', location: 'Fridge A', storageUnitId: 'su-fr-a', supplier: 'Gibco', catalogNumber: '11965092', alertThreshold: 2 },
  { id: 'r2', name: 'RPMI 1640', category: 'Culture Media', currentStock: 3, maxStock: 8, unit: 'bottles (500mL)', expiryDate: '2026-05-20', location: 'Fridge A', storageUnitId: 'su-fr-a', supplier: 'Gibco', catalogNumber: '11875093', alertThreshold: 2 },
  { id: 'r3', name: 'FBS', category: 'Culture Media', currentStock: 8, maxStock: 20, unit: 'aliquots (50mL)', expiryDate: '2027-01-10', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Gibco', catalogNumber: '10270106', alertThreshold: 4 },
  { id: 'r4', name: 'Pen/Strep (100x)', category: 'Culture Media', currentStock: 6, maxStock: 10, unit: 'aliquots (5mL)', expiryDate: '2026-08-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Gibco', catalogNumber: '15140122', alertThreshold: 2 },
  { id: 'r5', name: 'Trypsin-EDTA 0.25%', category: 'Culture Media', currentStock: 3, maxStock: 6, unit: 'bottles (100mL)', expiryDate: '2026-04-15', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Gibco', catalogNumber: '25200056', alertThreshold: 1 },
  { id: 'r6', name: 'PBS 10x', category: 'Reagents', currentStock: 5, maxStock: 10, unit: 'bottles (500mL)', expiryDate: '2027-12-01', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Sigma-Aldrich', catalogNumber: 'P5493', alertThreshold: 2 },
  { id: 'r7', name: 'PDMS Sylgard 184', category: 'Reagents', currentStock: 2, maxStock: 5, unit: 'kits (1.1kg)', expiryDate: '2027-06-01', location: 'Cabinet C1', storageUnitId: 'su-cab-c1', supplier: 'Dow Corning', catalogNumber: '4019862', alertThreshold: 1 },
  { id: 'r8', name: 'Collagen I (Rat Tail)', category: 'Reagents', currentStock: 3, maxStock: 6, unit: 'vials (5mg)', expiryDate: '2026-09-01', location: 'Fridge B', storageUnitId: 'su-fr-b', supplier: 'Corning', catalogNumber: '354236', alertThreshold: 1 },
  { id: 'r9', name: 'Fibronectin', category: 'Reagents', currentStock: 2, maxStock: 4, unit: 'vials (1mg)', expiryDate: '2026-07-15', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Sigma-Aldrich', catalogNumber: 'F1141', alertThreshold: 1 },
  { id: 'r10', name: 'Matrigel', category: 'Reagents', currentStock: 4, maxStock: 8, unit: 'aliquots (250μL)', expiryDate: '2026-05-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Corning', catalogNumber: '354234', alertThreshold: 2 },
  { id: 'r11', name: 'DAPI', category: 'Staining', currentStock: 3, maxStock: 5, unit: 'vials (10mg)', expiryDate: '2027-03-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Sigma-Aldrich', catalogNumber: 'D9542', alertThreshold: 1 },
  { id: 'r12', name: 'Phalloidin-FITC', category: 'Staining', currentStock: 2, maxStock: 4, unit: 'vials (300U)', expiryDate: '2026-11-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Sigma-Aldrich', catalogNumber: 'P5282', alertThreshold: 1 },
  { id: 'r13', name: 'Calcein AM', category: 'Staining', currentStock: 1, maxStock: 3, unit: 'vials (1mg)', expiryDate: '2026-08-15', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Invitrogen', catalogNumber: 'C3100MP', alertThreshold: 1 },
  { id: 'r14', name: 'Ethidium Homodimer-1', category: 'Staining', currentStock: 2, maxStock: 3, unit: 'vials (1mL)', expiryDate: '2026-10-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Invitrogen', catalogNumber: 'E1169', alertThreshold: 1 },
  { id: 'r15', name: 'Anti-CD31 (PECAM-1)', category: 'Antibodies', currentStock: 1, maxStock: 2, unit: 'vials (100μg)', expiryDate: '2026-12-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Abcam', catalogNumber: 'ab28364', alertThreshold: 1 },
  { id: 'r16', name: 'Anti-α-SMA', category: 'Antibodies', currentStock: 2, maxStock: 3, unit: 'vials (100μL)', expiryDate: '2027-02-01', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Abcam', catalogNumber: 'ab5694', alertThreshold: 1 },
  { id: 'r17', name: 'Anti-Cardiac Troponin T', category: 'Antibodies', currentStock: 1, maxStock: 2, unit: 'vials (100μL)', expiryDate: '2026-09-15', location: 'Freezer −20 °C', storageUnitId: 'su-fz20', supplier: 'Abcam', catalogNumber: 'ab45932', alertThreshold: 1 },
  // --- Plasticware ---
  { id: 'p1', name: 'Pipette Tips 10 μL (filtered)', category: 'Plasticware', currentStock: 15, maxStock: 30, unit: 'racks (96 tips)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Eppendorf', catalogNumber: '0030073.266', alertThreshold: 5 },
  { id: 'p2', name: 'Pipette Tips 200 μL (filtered)', category: 'Plasticware', currentStock: 18, maxStock: 30, unit: 'racks (96 tips)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Eppendorf', catalogNumber: '0030073.274', alertThreshold: 5 },
  { id: 'p3', name: 'Pipette Tips 1000 μL (filtered)', category: 'Plasticware', currentStock: 12, maxStock: 30, unit: 'racks (96 tips)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Eppendorf', catalogNumber: '0030073.282', alertThreshold: 5 },
  { id: 'p4', name: 'Serological Pipettes 5 mL', category: 'Plasticware', currentStock: 8, maxStock: 20, unit: 'packs (200 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '4487', alertThreshold: 3 },
  { id: 'p5', name: 'Serological Pipettes 10 mL', category: 'Plasticware', currentStock: 6, maxStock: 20, unit: 'packs (200 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '4488', alertThreshold: 3 },
  { id: 'p6', name: 'Serological Pipettes 25 mL', category: 'Plasticware', currentStock: 5, maxStock: 15, unit: 'packs (200 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '4489', alertThreshold: 2 },
  { id: 'p7', name: 'Petri Dish 100 mm (TC-treated)', category: 'Plasticware', currentStock: 10, maxStock: 20, unit: 'sleeves (20 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430167', alertThreshold: 3 },
  { id: 'p8', name: 'Petri Dish 35 mm (TC-treated)', category: 'Plasticware', currentStock: 8, maxStock: 20, unit: 'sleeves (20 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430165', alertThreshold: 3 },
  { id: 'p9', name: 'T75 Flask (TC-treated)', category: 'Plasticware', currentStock: 12, maxStock: 25, unit: 'cases (100 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430641U', alertThreshold: 3 },
  { id: 'p10', name: 'T25 Flask (TC-treated)', category: 'Plasticware', currentStock: 10, maxStock: 20, unit: 'cases (200 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430639', alertThreshold: 3 },
  { id: 'p11', name: '6-Well Plate (TC-treated)', category: 'Plasticware', currentStock: 14, maxStock: 25, unit: 'cases (50 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '3516', alertThreshold: 4 },
  { id: 'p12', name: '24-Well Plate (TC-treated)', category: 'Plasticware', currentStock: 10, maxStock: 25, unit: 'cases (50 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '3524', alertThreshold: 4 },
  { id: 'p13', name: '96-Well Plate (TC-treated)', category: 'Plasticware', currentStock: 8, maxStock: 20, unit: 'cases (50 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '3596', alertThreshold: 3 },
  { id: 'p14', name: 'Microcentrifuge Tubes 1.5 mL', category: 'Plasticware', currentStock: 20, maxStock: 40, unit: 'bags (500 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Eppendorf', catalogNumber: '0030120.086', alertThreshold: 5 },
  { id: 'p15', name: 'Conical Tubes 15 mL', category: 'Plasticware', currentStock: 10, maxStock: 20, unit: 'racks (50 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430791', alertThreshold: 3 },
  { id: 'p16', name: 'Conical Tubes 50 mL', category: 'Plasticware', currentStock: 8, maxStock: 20, unit: 'racks (25 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430829', alertThreshold: 3 },
  { id: 'p17', name: 'Cryovials 2 mL (ext. thread)', category: 'Plasticware', currentStock: 6, maxStock: 15, unit: 'bags (100 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '430659', alertThreshold: 2 },
  { id: 'p18', name: 'Cell Strainer 70 μm', category: 'Plasticware', currentStock: 4, maxStock: 10, unit: 'packs (50 pcs)', expiryDate: '', location: 'Shelf B2', storageUnitId: 'su-shelf', supplier: 'Corning', catalogNumber: '431751', alertThreshold: 2 },
  // --- Microfabrication ---
  { id: 'mf1', name: 'Silicon Wafer 4″ (P-type, <100>)', category: 'Microfabrication', currentStock: 8, maxStock: 25, unit: 'wafers', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'UniversityWafer', catalogNumber: 'UW-4P100', alertThreshold: 3 },
  { id: 'mf2', name: 'Silicon Wafer 4″ (N-type, <100>)', category: 'Microfabrication', currentStock: 5, maxStock: 15, unit: 'wafers', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'UniversityWafer', catalogNumber: 'UW-4N100', alertThreshold: 2 },
  { id: 'mf3', name: 'Glass Wafer 4″ (Borofloat 33)', category: 'Microfabrication', currentStock: 6, maxStock: 15, unit: 'wafers', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Schott', catalogNumber: 'BF33-4', alertThreshold: 2 },
  { id: 'mf4', name: 'SU-8 2050 Photoresist', category: 'Microfabrication', currentStock: 2, maxStock: 5, unit: 'bottles (500mL)', expiryDate: '2027-03-01', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Kayaku (MicroChem)', catalogNumber: 'SU8-2050-500', alertThreshold: 1 },
  { id: 'mf5', name: 'SU-8 2100 Photoresist', category: 'Microfabrication', currentStock: 1, maxStock: 3, unit: 'bottles (500mL)', expiryDate: '2027-06-01', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Kayaku (MicroChem)', catalogNumber: 'SU8-2100-500', alertThreshold: 1 },
  { id: 'mf6', name: 'SU-8 Developer (PGMEA)', category: 'Microfabrication', currentStock: 3, maxStock: 6, unit: 'bottles (1L)', expiryDate: '2027-12-01', location: 'Cleanroom', storageUnitId: 'su-cab-c1', supplier: 'Kayaku (MicroChem)', catalogNumber: 'Y020100-1L', alertThreshold: 1 },
  { id: 'mf7', name: 'Tweezers Type 5 (anti-magnetic)', category: 'Microfabrication', currentStock: 6, maxStock: 10, unit: 'pcs', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Rubis', catalogNumber: '5-SA', alertThreshold: 2 },
  { id: 'mf8', name: 'Tweezers Type 7 (anti-magnetic)', category: 'Microfabrication', currentStock: 4, maxStock: 8, unit: 'pcs', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Rubis', catalogNumber: '7-SA', alertThreshold: 2 },
  { id: 'mf9', name: 'Wafer Tweezers (flat tip)', category: 'Microfabrication', currentStock: 3, maxStock: 6, unit: 'pcs', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Rubis', catalogNumber: 'WF-SA', alertThreshold: 1 },
  { id: 'mf10', name: 'Photomask (soda lime, 5″)', category: 'Microfabrication', currentStock: 4, maxStock: 10, unit: 'pcs', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Compugraphics', catalogNumber: 'SL5-CUSTOM', alertThreshold: 1 },
  { id: 'mf11', name: 'IPA (Isopropanol, cleanroom grade)', category: 'Microfabrication', currentStock: 4, maxStock: 10, unit: 'bottles (1L)', expiryDate: '2027-12-01', location: 'Cleanroom', storageUnitId: 'su-cab-c1', supplier: 'Sigma-Aldrich', catalogNumber: 'W292907', alertThreshold: 2 },
  { id: 'mf12', name: 'Acetone (cleanroom grade)', category: 'Microfabrication', currentStock: 3, maxStock: 8, unit: 'bottles (1L)', expiryDate: '2027-12-01', location: 'Cleanroom', storageUnitId: 'su-cab-c1', supplier: 'Sigma-Aldrich', catalogNumber: '179124', alertThreshold: 2 },
  { id: 'mf13', name: 'Fluorosilane (Trichloro-1H,1H,2H,2H-perfluorooctyl)', category: 'Microfabrication', currentStock: 2, maxStock: 4, unit: 'bottles (25mL)', expiryDate: '2027-06-01', location: 'Cleanroom', storageUnitId: 'su-cab-c1', supplier: 'Sigma-Aldrich', catalogNumber: '448931', alertThreshold: 1 },
  { id: 'mf14', name: 'Biopsy Punches 1 mm', category: 'Microfabrication', currentStock: 5, maxStock: 10, unit: 'packs (50 pcs)', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Miltex', catalogNumber: '33-31AA', alertThreshold: 2 },
  { id: 'mf15', name: 'Biopsy Punches 1.5 mm', category: 'Microfabrication', currentStock: 4, maxStock: 10, unit: 'packs (50 pcs)', expiryDate: '', location: 'Cleanroom', storageUnitId: 'su-dry1', supplier: 'Miltex', catalogNumber: '33-31AA-P15', alertThreshold: 2 },
  // --- Gases & Liquids ---
  { id: 'tg1', name: 'Liquid Nitrogen (LN₂)', category: 'Gases & Liquids', currentStock: 50, maxStock: 100, unit: 'L', expiryDate: '', location: 'Room 101', storageUnitId: undefined, supplier: 'SOL Group', catalogNumber: 'LN2-50L', alertThreshold: 20 },
  { id: 'tg2', name: 'Nitrogen Gas Tank (N₂)', category: 'Gases & Liquids', currentStock: 2, maxStock: 4, unit: 'cylinders (50L / 200 bar)', expiryDate: '', location: 'Room 101', storageUnitId: undefined, supplier: 'SOL Group', catalogNumber: 'N2-50-200', alertThreshold: 1 },
  { id: 'tg3', name: 'CO₂ Gas Tank (food grade)', category: 'Gases & Liquids', currentStock: 2, maxStock: 3, unit: 'cylinders (30L / 60 bar)', expiryDate: '', location: 'Room 101', storageUnitId: undefined, supplier: 'SOL Group', catalogNumber: 'CO2-30-60', alertThreshold: 1 },
  { id: 'tg4', name: 'Compressed Air (dry, oil-free)', category: 'Gases & Liquids', currentStock: 1, maxStock: 2, unit: 'cylinders (50L / 200 bar)', expiryDate: '', location: 'Room 102', storageUnitId: undefined, supplier: 'SOL Group', catalogNumber: 'AIR-50-200', alertThreshold: 1 },
  { id: 'tg5', name: 'Argon Gas Tank (Ar)', category: 'Gases & Liquids', currentStock: 1, maxStock: 2, unit: 'cylinders (50L / 200 bar)', expiryDate: '', location: 'Cleanroom', storageUnitId: undefined, supplier: 'SOL Group', catalogNumber: 'AR-50-200', alertThreshold: 1 },
  // --- Chemicals (general lab chemicals & service liquids) ---
  { id: 'sl1', name: 'Deionized Water (DI)', category: 'Chemicals', currentStock: 3, maxStock: 6, unit: 'carboys (20L)', expiryDate: '', location: 'Room 101', storageUnitId: undefined, supplier: 'In-house (Milli-Q)', catalogNumber: '—', alertThreshold: 1 },
  { id: 'sl2', name: 'Distilled Water', category: 'Chemicals', currentStock: 4, maxStock: 10, unit: 'bottles (5L)', expiryDate: '', location: 'Room 101', storageUnitId: undefined, supplier: 'In-house', catalogNumber: '—', alertThreshold: 2 },
  { id: 'sl3', name: 'Ethanol 70% (disinfection)', category: 'Chemicals', currentStock: 5, maxStock: 10, unit: 'bottles (1L)', expiryDate: '2027-12-01', location: 'Room 101', storageUnitId: 'su-cab-c1', supplier: 'Carlo Erba', catalogNumber: '414601', alertThreshold: 2 },
  { id: 'sl4', name: 'Ethanol Absolute (≥99.8%)', category: 'Chemicals', currentStock: 3, maxStock: 6, unit: 'bottles (1L)', expiryDate: '2027-12-01', location: 'Room 103', storageUnitId: 'su-cab-c1', supplier: 'Sigma-Aldrich', catalogNumber: '32205', alertThreshold: 1 },
  { id: 'sl5', name: 'Bleach (sodium hypochlorite 5%)', category: 'Chemicals', currentStock: 4, maxStock: 8, unit: 'bottles (1L)', expiryDate: '2027-06-01', location: 'Room 101', storageUnitId: undefined, supplier: 'Generic', catalogNumber: '—', alertThreshold: 2 },
];

// --- Mock Manuals ---

export const mockManuals: Manual[] = [
  { id: 'm1', title: 'Confocal Microscope - Operating Protocol', category: 'manual', instrument: 'confocal', description: 'Step-by-step guide for Nikon A1R operation.', lastUpdated: '2025-11-15', uploadedBy: 'Cecilia Palma' },
  { id: 'm2', title: 'Flow Cytometry - Standard Protocol', category: 'protocol', instrument: 'flow-cytometer', description: 'Sample preparation and data analysis workflow.', lastUpdated: '2025-10-20', uploadedBy: 'Roberta Visone' },
  { id: 'm3', title: 'PDMS Chip Fabrication Protocol', category: 'protocol', description: 'Soft lithography: master fabrication, PDMS casting, plasma bonding.', lastUpdated: '2025-12-01', uploadedBy: 'Paola Occhetta' },
  { id: 'm4', title: 'PDMS - Safety Data Sheet', category: 'sds', description: 'Sylgard 184 Silicone Elastomer Kit safety information.', lastUpdated: '2025-01-10', uploadedBy: 'Cecilia Palma' },
  { id: 'm5', title: 'Cell Culture - Standard Operating Procedure', category: 'protocol', description: 'General protocols: thawing, passaging, cryopreservation.', lastUpdated: '2025-09-05', uploadedBy: 'Cecilia Palma' },
  { id: 'm6', title: 'Trypsin-EDTA - Safety Data Sheet', category: 'sds', description: 'Safety information for Trypsin-EDTA solution.', lastUpdated: '2024-06-15', uploadedBy: 'Cecilia Palma' },
  { id: 'm7', title: 'Immunofluorescence Staining Protocol', category: 'protocol', description: 'IF protocol for OoC: fixation, permeabilization, blocking, antibody incubation.', lastUpdated: '2025-11-20', uploadedBy: 'Alice Bianchi' },
  { id: 'm8', title: 'RT-qPCR Protocol', category: 'protocol', instrument: 'rt-pcr', description: 'RNA extraction, cDNA synthesis, qPCR protocol.', lastUpdated: '2025-08-10', uploadedBy: 'Roberta Visone' },
  { id: 'm9', title: 'Plate Reader - Operating Manual', category: 'manual', instrument: 'plate-reader', description: 'Tecan Infinite M200: absorbance, fluorescence, luminescence.', lastUpdated: '2025-07-01', uploadedBy: 'Cecilia Palma' },
  { id: 'm10', title: 'Formaldehyde 4% - Safety Data Sheet', category: 'sds', description: 'Safety information for PFA fixation solution.', lastUpdated: '2024-03-01', uploadedBy: 'Cecilia Palma' },
];

// --- Mock initial data ---

function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function getTomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }

export function getInitialBookings(): Booking[] {
  const today = getTodayStr(), tomorrow = getTomorrowStr();
  return [
    { id: 'b1', instrumentId: 'confocal', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 9, endHour: 12, notes: 'IF imaging - PHOENIX chips', createdAt: new Date(Date.now()-86400000).toISOString() },
    { id: 'b2', instrumentId: 'confocal', userId: 'u4', userName: 'Roberta Visone', date: today, startHour: 14, endHour: 17, notes: 'Live cell imaging', createdAt: new Date(Date.now()-172800000).toISOString() },
    { id: 'b3', instrumentId: 'spin-coater', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 10, endHour: 11, notes: 'SU-8 coating', createdAt: new Date(Date.now()-86400000).toISOString() },
    { id: 'b4', instrumentId: 'flow-cytometer', userId: 'u4', userName: 'Roberta Visone', date: tomorrow, startHour: 10, endHour: 13, notes: 'Cell viability assay', createdAt: new Date().toISOString() },
    { id: 'b5', instrumentId: 'bsc-1', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 8, endHour: 10, notes: 'Cell passaging', createdAt: new Date(Date.now()-86400000).toISOString() },
    { id: 'b6', instrumentId: 'syringe-pump', userId: 'u1', userName: 'Marco Rasponi', date: tomorrow, startHour: 9, endHour: 11, notes: 'OoC perfusion test', createdAt: new Date().toISOString() },
  ];
}

export function getInitialCryoVials(): CryoVial[] {
  return [
    { id: 'cv1', cellLine: 'iPSC-CMs (CDI)', passage: 0, date: '2025-12-01', userId: 'u5', userName: 'Alice Bianchi', storageUnitId: 'su-dewar1', rack: 1, box: 1, row: 0, col: 0, notes: 'Batch #2025-12A' },
    { id: 'cv2', cellLine: 'iPSC-CMs (CDI)', passage: 0, date: '2025-12-01', userId: 'u5', userName: 'Alice Bianchi', storageUnitId: 'su-dewar1', rack: 1, box: 1, row: 0, col: 1, notes: 'Batch #2025-12A' },
    { id: 'cv3', cellLine: 'HUVECs', passage: 3, date: '2025-11-15', userId: 'u4', userName: 'Roberta Visone', storageUnitId: 'su-dewar1', rack: 1, box: 1, row: 1, col: 0, notes: 'Lonza Lot #636254' },
    { id: 'cv4', cellLine: 'HUVECs', passage: 3, date: '2025-11-15', userId: 'u4', userName: 'Roberta Visone', storageUnitId: 'su-dewar1', rack: 1, box: 1, row: 1, col: 1, notes: 'Lonza Lot #636254' },
    { id: 'cv5', cellLine: 'HUVECs', passage: 5, date: '2026-01-10', userId: 'u4', userName: 'Roberta Visone', storageUnitId: 'su-dewar1', rack: 1, box: 2, row: 0, col: 0, notes: 'Expanded from cv3' },
    { id: 'cv6', cellLine: 'MCF-7', passage: 22, date: '2025-10-01', userId: 'u5', userName: 'Alice Bianchi', storageUnitId: 'su-dewar1', rack: 2, box: 1, row: 0, col: 0, notes: 'Breast cancer line' },
    { id: 'cv7', cellLine: 'A549', passage: 15, date: '2025-09-20', userId: 'u4', userName: 'Roberta Visone', storageUnitId: 'su-dewar1', rack: 2, box: 1, row: 0, col: 1, notes: 'Lung carcinoma' },
    { id: 'cv8', cellLine: 'hiPSCs (WTC-11)', passage: 35, date: '2026-01-05', userId: 'u5', userName: 'Alice Bianchi', storageUnitId: 'su-dewar2', rack: 1, box: 1, row: 0, col: 0, notes: 'Feeder-free' },
    { id: 'cv9', cellLine: 'hiPSCs (WTC-11)', passage: 35, date: '2026-01-05', userId: 'u5', userName: 'Alice Bianchi', storageUnitId: 'su-dewar2', rack: 1, box: 1, row: 0, col: 1, notes: 'Feeder-free' },
    { id: 'cv10', cellLine: 'hMSCs', passage: 4, date: '2025-12-20', userId: 'u4', userName: 'Roberta Visone', storageUnitId: 'su-dewar2', rack: 1, box: 1, row: 1, col: 0, notes: 'Bone marrow derived' },
  ];
}

export function getInitialWishlist(): WishlistItem[] {
  return [
    { id: 'w1', name: 'Anti-VE-Cadherin', type: 'antibody', catalogNumber: 'ab33168', supplier: 'Abcam', estimatedCost: 350, quantity: 1, urgency: 'high', requestedBy: 'u4', requestedByName: 'Roberta Visone', status: 'pending', notes: 'Endothelial barrier assay', timestamp: new Date().toISOString() },
    { id: 'w2', name: 'Fibronectin (Human)', type: 'reagent', catalogNumber: 'F0895', supplier: 'Sigma-Aldrich', estimatedCost: 180, quantity: 2, urgency: 'medium', requestedBy: 'u5', requestedByName: 'Alice Bianchi', status: 'approved', approvedBy: 'Marco Rasponi', notes: 'Chip coating', timestamp: new Date(Date.now()-86400000).toISOString() },
  ];
}

export function getInitialLog(): LogEntry[] {
  const today = getTodayStr();
  return [
    { id: 'l1', timestamp: new Date(Date.now()-3600000).toISOString(), userId: 'u5', userName: 'Alice Bianchi', action: 'Booked Confocal Microscope', category: 'booking', details: `${today} 9:00-12:00` },
    { id: 'l2', timestamp: new Date(Date.now()-7200000).toISOString(), userId: 'u4', userName: 'Roberta Visone', action: 'Withdrew DMEM High Glucose', category: 'reagent', details: '1 bottle for REMODEL project' },
    { id: 'l3', timestamp: new Date(Date.now()-10800000).toISOString(), userId: 'u4', userName: 'Roberta Visone', action: 'Stored 2 vials HUVECs', category: 'cryo', details: 'Dewar 1, Rack 1, Box 2, P5' },
    { id: 'l4', timestamp: new Date(Date.now()-14400000).toISOString(), userId: 'u5', userName: 'Alice Bianchi', action: 'Requested Anti-VE-Cadherin', category: 'wishlist', details: 'Urgency: High, Est. €350' },
  ];
}

// --- Utilities ---

export function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
export function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
export function formatDateTime(isoStr: string): string { const d = new Date(isoStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
export function getRowLabels(count: number): string[] { return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i)); }

// Migrate old CryoVial data (tank: number → dewarId → storageUnitId)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateCryoVials(vials: any[]): CryoVial[] {
  return vials.map(v => ({
    ...v,
    storageUnitId: v.storageUnitId || v.dewarId || `su-dewar${v.tank || 1}`,
  }));
}

// Migrate old Dewar data → StorageUnit (add type & temperature if missing)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateStorageUnits(units: any[]): StorageUnit[] {
  return units.map(u => {
    if (u.type && u.temperature) return u as StorageUnit;
    // Old Dewar without type: infer from name or default to DEWAR
    let inferredType: StorageUnitType = 'DEWAR';
    const nameLower = (u.name || '').toLowerCase();
    if (nameLower.includes('ult') || nameLower.includes('-80')) inferredType = 'ULT_FREEZER';
    else if (nameLower.includes('fridge') || nameLower.includes('+4')) inferredType = 'FRIDGE';
    else if (nameLower.includes('freezer') && nameLower.includes('-20')) inferredType = 'FREEZER';
    else if (nameLower.includes('freezer') && nameLower.includes('-40')) inferredType = 'FREEZER_40';
    else if (nameLower.includes('cabinet')) inferredType = 'CABINET';
    else if (nameLower.includes('incubator')) inferredType = 'INCUBATOR';
    else if (nameLower.includes('desiccator') || nameLower.includes('dry')) inferredType = 'DRY_CAB';
    const info = storageUnitTypes[inferredType];
    return { ...u, type: inferredType, temperature: info.temperature } as StorageUnit;
  });
}

/**
 * Merge mock defaults into saved data: any mock item whose `id` is NOT already
 * present in the saved array gets appended. This ensures new mock categories
 * (e.g. Plasticware, Technical Gases) appear for existing users without
 * overwriting any data they already modified.
 */
export function mergeMockDefaults<T extends { id: string }>(saved: T[], mocks: T[], deletedIds?: Set<string>): T[] {
  const existingIds = new Set(saved.map(item => item.id));
  const missing = mocks.filter(m => !existingIds.has(m.id) && !(deletedIds && deletedIds.has(m.id)));
  return missing.length > 0 ? [...saved, ...missing] : saved;
}

/** Migrate old category names to new ones in reagent lists */
const categoryRenames: Record<string, string> = {
  'Technical Gases': 'Gases & Liquids',
  'Service Liquids': 'Chemicals',
};
export function migrateReagentCategories(reagents: Reagent[]): Reagent[] {
  return reagents.map(r => {
    const newCat = categoryRenames[r.category];
    if (newCat) return { ...r, category: newCat };
    // Migrate LN₂ unit from dewars to liters
    if (r.id === 'tg1' && r.unit.includes('dewar')) return { ...r, category: 'Gases & Liquids', currentStock: r.currentStock * 50, maxStock: r.maxStock * 50, unit: 'L', alertThreshold: 20 };
    return r;
  });
}

// Get users from localStorage for login
export function getStoredUsers(): LabUser[] {
  try {
    const saved = localStorage.getItem('mimic-lab-data');
    if (saved) { const data = JSON.parse(saved); if (data.users?.length > 0) return data.users; }
  } catch { /* noop */ }
  return mockUsers;
}
