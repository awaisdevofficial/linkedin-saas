import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { apiCalls } from '@/lib/api';
import { getAdminAuth } from '@/lib/config';

type Stats = {
  users: { total: number; pending: number; approved: number; banned: number; expired: number };
  invoices: { total: number; totalPaid: number; totalUnpaid: number };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { adminKey, adminEmail } = getAdminAuth();
    if (!adminKey) return;
    apiCalls.adminStats(adminKey, adminEmail ?? undefined)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
      </div>
    );
  }

  const { users, invoices } = stats;
  const cards = [
    { label: 'Total Users', value: users.total, icon: Users },
    { label: 'Pending Approval', value: users.pending, icon: AlertCircle, badge: 'orange' },
    { label: 'Active / Approved', value: users.approved, icon: UserCheck, badge: 'green' },
    { label: 'Expired', value: users.expired, icon: Clock, badge: 'gray' },
    { label: 'Banned', value: users.banned, icon: UserX, badge: 'red' },
    { label: 'Total Invoices', value: invoices.total, icon: FileText },
    { label: 'Total Paid', value: `$${Number(invoices.totalPaid).toFixed(2)}`, icon: DollarSign },
    { label: 'Total Unpaid', value: `$${Number(invoices.totalUnpaid).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#10153E] mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, badge }) => (
          <Card key={label} className="card-shadow border-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    badge === 'orange' ? 'bg-amber-500/10 text-amber-600' :
                    badge === 'green' ? 'bg-emerald-500/10 text-emerald-600' :
                    badge === 'red' ? 'bg-red-500/10 text-red-600' :
                    badge === 'gray' ? 'bg-gray-500/10 text-gray-600' :
                    'bg-[#2D5AF6]/10 text-[#2D5AF6]'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7098]">{label}</p>
                    <p className="text-lg font-bold text-[#10153E]">{value}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
