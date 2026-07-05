import { NextResponse } from 'next/server';

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'overdue' | 'pending';
}

interface Partner {
  id: string;
  name: string;
  ico: string;
  averageDelayDays: number;
  outstandingAmount: number;
  moralityScore: number; // 0-100 (higher is better)
  insolvencyRisk3M: number; // 0-100% risk in 3 months
  trend: 'improving' | 'stable' | 'worsening';
  invoices: Invoice[];
}

const mockPartners: Partner[] = [
  {
    id: '1',
    name: 'GOLD TAXI s.r.o.',
    ico: '47568912',
    averageDelayDays: 42,
    outstandingAmount: 12500,
    moralityScore: 45,
    insolvencyRisk3M: 78,
    trend: 'worsening',
    invoices: [
      { id: 'INV-2026-001', amount: 3500, dueDate: '2026-03-10', paidDate: '2026-04-28', status: 'paid' },
      { id: 'INV-2026-005', amount: 4000, dueDate: '2026-04-15', paidDate: '2026-06-02', status: 'paid' },
      { id: 'INV-2026-009', amount: 5000, dueDate: '2026-05-20', paidDate: null, status: 'overdue' },
    ],
  },
  {
    id: '2',
    name: 'AutoServis Bratislava a.s.',
    ico: '36528974',
    averageDelayDays: 14,
    outstandingAmount: 4200,
    moralityScore: 82,
    insolvencyRisk3M: 12,
    trend: 'stable',
    invoices: [
      { id: 'INV-2026-002', amount: 1500, dueDate: '2026-03-15', paidDate: '2026-03-28', status: 'paid' },
      { id: 'INV-2026-006', amount: 2000, dueDate: '2026-04-20', paidDate: '2026-05-04', status: 'paid' },
      { id: 'INV-2026-010', amount: 2200, dueDate: '2026-06-01', paidDate: null, status: 'pending' },
    ],
  },
  {
    id: '3',
    name: 'Západoslovenská Logistika s.r.o.',
    ico: '50124789',
    averageDelayDays: 58,
    outstandingAmount: 24000,
    moralityScore: 28,
    insolvencyRisk3M: 92,
    trend: 'worsening',
    invoices: [
      { id: 'INV-2026-003', amount: 8000, dueDate: '2026-02-10', paidDate: '2026-04-12', status: 'paid' },
      { id: 'INV-2026-007', amount: 9000, dueDate: '2026-04-01', paidDate: '2026-06-05', status: 'paid' },
      { id: 'INV-2026-011', amount: 7000, dueDate: '2026-05-10', paidDate: null, status: 'overdue' },
    ],
  },
  {
    id: '4',
    name: 'Purity Pharm s.r.o.',
    ico: '31578942',
    averageDelayDays: 8,
    outstandingAmount: 0,
    moralityScore: 95,
    insolvencyRisk3M: 4,
    trend: 'improving',
    invoices: [
      { id: 'INV-2026-004', amount: 3200, dueDate: '2026-03-05', paidDate: '2026-03-12', status: 'paid' },
      { id: 'INV-2026-008', amount: 4100, dueDate: '2026-05-01', paidDate: '2026-05-09', status: 'paid' },
    ],
  },
  {
    id: '5',
    name: 'Rýchly Kuriér s.r.o.',
    ico: '45892154',
    averageDelayDays: 28,
    outstandingAmount: 8500,
    moralityScore: 60,
    insolvencyRisk3M: 35,
    trend: 'stable',
    invoices: [
      { id: 'INV-2026-008', amount: 4000, dueDate: '2026-04-10', paidDate: '2026-05-08', status: 'paid' },
      { id: 'INV-2026-012', amount: 4500, dueDate: '2026-06-05', paidDate: null, status: 'pending' },
    ],
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      partners: mockPartners,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
