// ============================================================
// Lab Manager - Data Types & Mock Data
// ============================================================

// --- Types ---

export type UserRole = 'admin' | 'pi' | 'lab_manager' | 'postdoc' | 'phd' | 'msc';

export interface LabUser {
  id: string;
  email: string;
  pin: string;
  name: string;
  role: UserRole;
  certifications: string[];
  projects: string[];
}

export interface Instrument {
  id: string;
  name: string;
  category: string;
  location: string;
  requiresCertification: boolean;
  description: string;
  icon: string;
}

export interface Booking {
  id: string;
  instrumentId: string;
  userId: string;
  userName: string;
  date: string;
  startHour: number;
  endHour: number;
  notes: string;
  createdAt: string;
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
  supplier: string;
  catalogNumber: string;
  alertThreshold: number;
}

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
  tank: number;
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
  status: 'pending' | 'approved' | 'rejected' | 'ordered';
  approvedBy?: string;
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
    canUploadManuals: true, canAdmin: false, label: 'Principal Investigator',
  },
  lab_manager: {
    canBook: true, canWithdrawReagents: true, canAddReagents: true,
    canManageCryo: true, canRequestOrders: true, canApproveOrders: true,
    canViewLog: true, canViewDatabase: true, canExportData: true,
    canUploadManuals: true, canAdmin: false, label: 'Lab Manager',
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
};

// --- Mock Users ---

export const mockUsers: LabUser[] = [
  {
    id: 'u0', email: 'admin@polimi.it', pin: '0000',
    name: 'Admin MiMic', role: 'admin',
    certifications: ['confocal', 'flow-cytometer', 'rt-pcr', 'spin-coater', 'plasma-cleaner', 'syringe-pump', 'plate-reader', 'western-blot', 'fluorescence', 'uv-curing', 'pressure-ctrl', 'chip-bonding'],
    projects: ['All Projects'],
  },
  {
    id: 'u1', email: 'marco.rasponi@polimi.it', pin: '1234',
    name: 'Marco Rasponi', role: 'pi',
    certifications: ['confocal', 'flow-cytometer', 'rt-pcr', 'spin-coater', 'plasma-cleaner', 'syringe-pump', 'plate-reader'],
    projects: ['PHOENIX', 'REMODEL', 'MATRIx', 'SINERGIA'],
  },
  {
    id: 'u2', email: 'paola.occhetta@polimi.it', pin: '1234',
    name: 'Paola Occhetta', role: 'pi',
    certifications: ['confocal', 'flow-cytometer', 'rt-pcr', 'spin-coater', 'plasma-cleaner', 'syringe-pump', 'plate-reader'],
    projects: ['PHOENIX', 'REMODEL'],
  },
  {
    id: 'u3', email: 'cecilia.palma@polimi.it', pin: '5678',
    name: 'Cecilia Palma', role: 'lab_manager',
    certifications: ['confocal', 'flow-cytometer', 'rt-pcr', 'spin-coater', 'plasma-cleaner', 'syringe-pump', 'plate-reader', 'western-blot'],
    projects: ['Lab Management'],
  },
  {
    id: 'u4', email: 'roberta.visone@polimi.it', pin: '3456',
    name: 'Roberta Visone', role: 'postdoc',
    certifications: ['confocal', 'flow-cytometer', 'spin-coater', 'plasma-cleaner', 'syringe-pump', 'plate-reader'],
    projects: ['PHOENIX', 'REMODEL'],
  },
  {
    id: 'u5', email: 'alice.bianchi@polimi.it', pin: '1111',
    name: 'Alice Bianchi', role: 'phd',
    certifications: ['confocal', 'spin-coater', 'plasma-cleaner', 'syringe-pump'],
    projects: ['PHOENIX'],
  },
  {
    id: 'u6', email: 'giulia.ferretti@polimi.it', pin: '2222',
    name: 'Giulia Ferretti', role: 'msc',
    certifications: ['syringe-pump'],
    projects: ['REMODEL'],
  },
];

// --- Mock Instruments ---

export const mockInstruments: Instrument[] = [
  { id: 'bsc-1', name: 'Biosafety Cabinet #1', category: 'Cell Culture', location: 'Room 101', requiresCertification: false, description: 'Class II Type A2', icon: '🧫' },
  { id: 'bsc-2', name: 'Biosafety Cabinet #2', category: 'Cell Culture', location: 'Room 101', requiresCertification: false, description: 'Class II Type A2', icon: '🧫' },
  { id: 'incubator-1', name: 'CO₂ Incubator #1', category: 'Cell Culture', location: 'Room 101', requiresCertification: false, description: '37°C, 5% CO₂', icon: '🌡️' },
  { id: 'incubator-2', name: 'CO₂ Incubator #2', category: 'Cell Culture', location: 'Room 102', requiresCertification: false, description: '37°C, 5% CO₂, hypoxia', icon: '🌡️' },
  { id: 'centrifuge', name: 'Centrifuge', category: 'Cell Culture', location: 'Room 101', requiresCertification: false, description: 'Eppendorf 5810R', icon: '🔄' },
  { id: 'cell-counter', name: 'Cell Counter', category: 'Cell Culture', location: 'Room 101', requiresCertification: false, description: 'Countess 3', icon: '🔢' },
  { id: 'confocal', name: 'Confocal Microscope', category: 'Microscopy', location: 'Room 201', requiresCertification: true, description: 'Nikon A1R', icon: '🔬' },
  { id: 'fluorescence', name: 'Fluorescence Microscope', category: 'Microscopy', location: 'Room 201', requiresCertification: true, description: 'Nikon Ti2-E', icon: '🔬' },
  { id: 'inverted', name: 'Inverted Microscope', category: 'Microscopy', location: 'Room 102', requiresCertification: false, description: 'Olympus CKX53', icon: '🔬' },
  { id: 'stereo', name: 'Stereo Microscope', category: 'Microscopy', location: 'Room 103', requiresCertification: false, description: 'Leica M125', icon: '🔍' },
  { id: 'spin-coater', name: 'Spin Coater', category: 'Microfabrication', location: 'Cleanroom', requiresCertification: true, description: 'Laurell WS-650', icon: '💿' },
  { id: 'plasma-cleaner', name: 'Plasma Cleaner', category: 'Microfabrication', location: 'Cleanroom', requiresCertification: true, description: 'Harrick PDC-002', icon: '⚡' },
  { id: 'hot-plate', name: 'Hot Plate', category: 'Microfabrication', location: 'Cleanroom', requiresCertification: false, description: 'IKA C-MAG', icon: '🔥' },
  { id: 'uv-curing', name: 'UV Curing System', category: 'Microfabrication', location: 'Cleanroom', requiresCertification: true, description: 'OmniCure S2000', icon: '☀️' },
  { id: 'flow-cytometer', name: 'Flow Cytometer', category: 'Analysis', location: 'Room 301', requiresCertification: true, description: 'BD FACSCanto II', icon: '📊' },
  { id: 'plate-reader', name: 'Plate Reader', category: 'Analysis', location: 'Room 301', requiresCertification: true, description: 'Tecan Infinite M200', icon: '📋' },
  { id: 'rt-pcr', name: 'Real-Time PCR', category: 'Analysis', location: 'Room 302', requiresCertification: true, description: 'Bio-Rad CFX96', icon: '🧬' },
  { id: 'western-blot', name: 'Western Blot System', category: 'Analysis', location: 'Room 302', requiresCertification: true, description: 'Bio-Rad Trans-Blot', icon: '🧪' },
  { id: 'syringe-pump', name: 'Syringe Pump', category: 'Microfluidics', location: 'Room 102', requiresCertification: true, description: 'Harvard PHD Ultra', icon: '💉' },
  { id: 'pressure-ctrl', name: 'Pressure Controller', category: 'Microfluidics', location: 'Room 102', requiresCertification: true, description: 'Elveflow OB1 MK4', icon: '🎛️' },
  { id: 'chip-bonding', name: 'Chip Bonding Station', category: 'Microfluidics', location: 'Cleanroom', requiresCertification: true, description: 'Custom bonding setup', icon: '🔧' },
];

// --- Mock Reagents ---

export const mockReagents: Reagent[] = [
  { id: 'r1', name: 'DMEM High Glucose', category: 'Culture Media', currentStock: 4, maxStock: 10, unit: 'bottles (500mL)', expiryDate: '2026-06-15', location: '4°C Fridge A', supplier: 'Gibco', catalogNumber: '11965092', alertThreshold: 2 },
  { id: 'r2', name: 'RPMI 1640', category: 'Culture Media', currentStock: 3, maxStock: 8, unit: 'bottles (500mL)', expiryDate: '2026-05-20', location: '4°C Fridge A', supplier: 'Gibco', catalogNumber: '11875093', alertThreshold: 2 },
  { id: 'r3', name: 'FBS', category: 'Culture Media', currentStock: 8, maxStock: 20, unit: 'aliquots (50mL)', expiryDate: '2027-01-10', location: '-20°C Freezer', supplier: 'Gibco', catalogNumber: '10270106', alertThreshold: 4 },
  { id: 'r4', name: 'Pen/Strep (100x)', category: 'Culture Media', currentStock: 6, maxStock: 10, unit: 'aliquots (5mL)', expiryDate: '2026-08-01', location: '-20°C Freezer', supplier: 'Gibco', catalogNumber: '15140122', alertThreshold: 2 },
  { id: 'r5', name: 'Trypsin-EDTA 0.25%', category: 'Culture Media', currentStock: 3, maxStock: 6, unit: 'bottles (100mL)', expiryDate: '2026-04-15', location: '-20°C Freezer', supplier: 'Gibco', catalogNumber: '25200056', alertThreshold: 1 },
  { id: 'r6', name: 'PBS 10x', category: 'Reagents', currentStock: 5, maxStock: 10, unit: 'bottles (500mL)', expiryDate: '2027-12-01', location: 'Shelf B2', supplier: 'Sigma-Aldrich', catalogNumber: 'P5493', alertThreshold: 2 },
  { id: 'r7', name: 'PDMS Sylgard 184', category: 'Reagents', currentStock: 2, maxStock: 5, unit: 'kits (1.1kg)', expiryDate: '2027-06-01', location: 'Cabinet C1', supplier: 'Dow Corning', catalogNumber: '4019862', alertThreshold: 1 },
  { id: 'r8', name: 'Collagen I (Rat Tail)', category: 'Reagents', currentStock: 3, maxStock: 6, unit: 'vials (5mg)', expiryDate: '2026-09-01', location: '4°C Fridge B', supplier: 'Corning', catalogNumber: '354236', alertThreshold: 1 },
  { id: 'r9', name: 'Fibronectin', category: 'Reagents', currentStock: 2, maxStock: 4, unit: 'vials (1mg)', expiryDate: '2026-07-15', location: '-20°C Freezer', supplier: 'Sigma-Aldrich', catalogNumber: 'F1141', alertThreshold: 1 },
  { id: 'r10', name: 'Matrigel', category: 'Reagents', currentStock: 4, maxStock: 8, unit: 'aliquots (250μL)', expiryDate: '2026-05-01', location: '-20°C Freezer', supplier: 'Corning', catalogNumber: '354234', alertThreshold: 2 },
  { id: 'r11', name: 'DAPI', category: 'Staining', currentStock: 3, maxStock: 5, unit: 'vials (10mg)', expiryDate: '2027-03-01', location: '-20°C Freezer', supplier: 'Sigma-Aldrich', catalogNumber: 'D9542', alertThreshold: 1 },
  { id: 'r12', name: 'Phalloidin-FITC', category: 'Staining', currentStock: 2, maxStock: 4, unit: 'vials (300U)', expiryDate: '2026-11-01', location: '-20°C Freezer', supplier: 'Sigma-Aldrich', catalogNumber: 'P5282', alertThreshold: 1 },
  { id: 'r13', name: 'Calcein AM', category: 'Staining', currentStock: 1, maxStock: 3, unit: 'vials (1mg)', expiryDate: '2026-08-15', location: '-20°C Freezer', supplier: 'Invitrogen', catalogNumber: 'C3100MP', alertThreshold: 1 },
  { id: 'r14', name: 'Ethidium Homodimer-1', category: 'Staining', currentStock: 2, maxStock: 3, unit: 'vials (1mL)', expiryDate: '2026-10-01', location: '-20°C Freezer', supplier: 'Invitrogen', catalogNumber: 'E1169', alertThreshold: 1 },
  { id: 'r15', name: 'Anti-CD31 (PECAM-1)', category: 'Antibodies', currentStock: 1, maxStock: 2, unit: 'vials (100μg)', expiryDate: '2026-12-01', location: '-20°C Freezer', supplier: 'Abcam', catalogNumber: 'ab28364', alertThreshold: 1 },
  { id: 'r16', name: 'Anti-α-SMA', category: 'Antibodies', currentStock: 2, maxStock: 3, unit: 'vials (100μL)', expiryDate: '2027-02-01', location: '-20°C Freezer', supplier: 'Abcam', catalogNumber: 'ab5694', alertThreshold: 1 },
  { id: 'r17', name: 'Anti-Cardiac Troponin T', category: 'Antibodies', currentStock: 1, maxStock: 2, unit: 'vials (100μL)', expiryDate: '2026-09-15', location: '-20°C Freezer', supplier: 'Abcam', catalogNumber: 'ab45932', alertThreshold: 1 },
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

// --- Mock initial data (bookings, cryo, etc.) ---

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function getInitialBookings(): Booking[] {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  return [
    { id: 'b1', instrumentId: 'confocal', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 9, endHour: 12, notes: 'IF imaging - PHOENIX chips', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b2', instrumentId: 'confocal', userId: 'u4', userName: 'Roberta Visone', date: today, startHour: 14, endHour: 17, notes: 'Live cell imaging', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'b3', instrumentId: 'spin-coater', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 10, endHour: 11, notes: 'SU-8 coating', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b4', instrumentId: 'flow-cytometer', userId: 'u4', userName: 'Roberta Visone', date: tomorrow, startHour: 10, endHour: 13, notes: 'Cell viability assay', createdAt: new Date().toISOString() },
    { id: 'b5', instrumentId: 'bsc-1', userId: 'u5', userName: 'Alice Bianchi', date: today, startHour: 8, endHour: 10, notes: 'Cell passaging', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b6', instrumentId: 'syringe-pump', userId: 'u1', userName: 'Marco Rasponi', date: tomorrow, startHour: 9, endHour: 11, notes: 'OoC perfusion test', createdAt: new Date().toISOString() },
  ];
}

export function getInitialCryoVials(): CryoVial[] {
  return [
    { id: 'cv1', cellLine: 'iPSC-CMs (CDI)', passage: 0, date: '2025-12-01', userId: 'u5', userName: 'Alice Bianchi', tank: 1, rack: 1, box: 1, row: 0, col: 0, notes: 'Batch #2025-12A' },
    { id: 'cv2', cellLine: 'iPSC-CMs (CDI)', passage: 0, date: '2025-12-01', userId: 'u5', userName: 'Alice Bianchi', tank: 1, rack: 1, box: 1, row: 0, col: 1, notes: 'Batch #2025-12A' },
    { id: 'cv3', cellLine: 'HUVECs', passage: 3, date: '2025-11-15', userId: 'u4', userName: 'Roberta Visone', tank: 1, rack: 1, box: 1, row: 1, col: 0, notes: 'Lonza Lot #636254' },
    { id: 'cv4', cellLine: 'HUVECs', passage: 3, date: '2025-11-15', userId: 'u4', userName: 'Roberta Visone', tank: 1, rack: 1, box: 1, row: 1, col: 1, notes: 'Lonza Lot #636254' },
    { id: 'cv5', cellLine: 'HUVECs', passage: 5, date: '2026-01-10', userId: 'u4', userName: 'Roberta Visone', tank: 1, rack: 1, box: 2, row: 0, col: 0, notes: 'Expanded from cv3' },
    { id: 'cv6', cellLine: 'MCF-7', passage: 22, date: '2025-10-01', userId: 'u5', userName: 'Alice Bianchi', tank: 1, rack: 2, box: 1, row: 0, col: 0, notes: 'Breast cancer line' },
    { id: 'cv7', cellLine: 'A549', passage: 15, date: '2025-09-20', userId: 'u4', userName: 'Roberta Visone', tank: 1, rack: 2, box: 1, row: 0, col: 1, notes: 'Lung carcinoma' },
    { id: 'cv8', cellLine: 'hiPSCs (WTC-11)', passage: 35, date: '2026-01-05', userId: 'u5', userName: 'Alice Bianchi', tank: 2, rack: 1, box: 1, row: 0, col: 0, notes: 'Feeder-free' },
    { id: 'cv9', cellLine: 'hiPSCs (WTC-11)', passage: 35, date: '2026-01-05', userId: 'u5', userName: 'Alice Bianchi', tank: 2, rack: 1, box: 1, row: 0, col: 1, notes: 'Feeder-free' },
    { id: 'cv10', cellLine: 'hMSCs', passage: 4, date: '2025-12-20', userId: 'u4', userName: 'Roberta Visone', tank: 2, rack: 1, box: 1, row: 1, col: 0, notes: 'Bone marrow derived' },
  ];
}

export function getInitialWishlist(): WishlistItem[] {
  return [
    { id: 'w1', name: 'Anti-VE-Cadherin', type: 'antibody', catalogNumber: 'ab33168', supplier: 'Abcam', estimatedCost: 350, quantity: 1, urgency: 'high', requestedBy: 'u4', requestedByName: 'Roberta Visone', status: 'pending', notes: 'Endothelial barrier assay', timestamp: new Date().toISOString() },
    { id: 'w2', name: 'Fibronectin (Human)', type: 'reagent', catalogNumber: 'F0895', supplier: 'Sigma-Aldrich', estimatedCost: 180, quantity: 2, urgency: 'medium', requestedBy: 'u5', requestedByName: 'Alice Bianchi', status: 'approved', approvedBy: 'Marco Rasponi', notes: 'Chip coating', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ];
}

export function getInitialLog(): LogEntry[] {
  const today = getTodayStr();
  return [
    { id: 'l1', timestamp: new Date(Date.now() - 3600000).toISOString(), userId: 'u5', userName: 'Alice Bianchi', action: 'Booked Confocal Microscope', category: 'booking', details: `${today} 9:00-12:00` },
    { id: 'l2', timestamp: new Date(Date.now() - 7200000).toISOString(), userId: 'u4', userName: 'Roberta Visone', action: 'Withdrew DMEM High Glucose', category: 'reagent', details: '1 bottle for REMODEL project' },
    { id: 'l3', timestamp: new Date(Date.now() - 10800000).toISOString(), userId: 'u4', userName: 'Roberta Visone', action: 'Stored 2 vials HUVECs', category: 'cryo', details: 'Tank 1, Rack 1, Box 2, P5' },
    { id: 'l4', timestamp: new Date(Date.now() - 14400000).toISOString(), userId: 'u5', userName: 'Alice Bianchi', action: 'Requested Anti-VE-Cadherin', category: 'wishlist', details: 'Urgency: High, Est. €350' },
  ];
}

// --- Utilities ---

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
