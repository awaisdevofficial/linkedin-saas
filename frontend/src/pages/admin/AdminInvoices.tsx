import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { apiCalls, type AdminInvoiceRow } from '@/lib/api';
import { getAdminAuth } from '@/lib/config';
import { toast } from 'sonner';
import { FileText, Mail, DollarSign, Calendar } from 'lucide-react';

export default function AdminInvoices() {
  const { adminKey, adminEmail, role } = getAdminAuth();
  const canWrite = role === 'super_admin' || role === 'admin';
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!adminKey) return;
    setLoading(true);
    apiCalls.adminInvoices(adminKey, adminEmail ?? undefined)
      .then(setInvoices)
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [adminKey]);

  const setStatus = async (invoiceId: string, status: 'paid' | 'cancelled') => {
    if (!adminKey) return;
    setBusyId(invoiceId);
    try {
      await apiCalls.adminInvoiceStatus(adminKey, invoiceId, status, adminEmail ?? undefined);
      toast.success(status === 'paid' ? 'Marked as paid' : 'Marked as cancelled');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (invoiceId: string) => {
    if (!adminKey) return;
    setBusyId(invoiceId);
    try {
      await apiCalls.adminResendInvoice(adminKey, invoiceId, adminEmail ?? undefined);
      toast.success('Invoice email sent');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const setVisibility = async (invoiceId: string, visible: boolean) => {
    if (!adminKey) return;
    setBusyId(invoiceId);
    try {
      await apiCalls.adminInvoiceVisibility(adminKey, invoiceId, visible, adminEmail ?? undefined);
      toast.success(visible ? 'Visible on user dashboard' : 'Hidden from user dashboard');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
      unpaid: 'bg-amber-500/15 text-amber-700 border-amber-200',
      cancelled: 'bg-gray-500/15 text-gray-600 border-gray-200',
    };
    return (
      <Badge variant="outline" className={map[status] || ''}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#10153E] mb-2">Invoices</h1>
      <p className="text-[#6B7098] text-sm mb-6">
        Create, send, and manage invoices. Toggle visibility to show or hide on the user dashboard.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
        </div>
      ) : invoices.length === 0 ? (
        <Card className="border-[#6B7098]/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-[#6B7098]">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {invoices.map((inv) => (
            <Card key={inv.id} className="border-[#6B7098]/10 overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="font-mono text-sm font-semibold text-[#2D5AF6]">
                  {inv.invoice_number || '—'}
                </span>
                {statusBadge(inv.status)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-[#10153E]">
                  <DollarSign className="w-4 h-4 text-[#6B7098]" />
                  <span className="text-xl font-bold">
                    {inv.currency} {Number(inv.amount).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-[#6B7098]">
                  To: {inv.profiles?.email || inv.user_id}
                  {inv.profiles?.full_name && ` (${inv.profiles.full_name})`}
                </p>
                {inv.description && (
                  <p className="text-sm text-[#6B7098]">{inv.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-[#6B7098]">
                  <Calendar className="w-4 h-4" />
                  Due: {formatDate(inv.due_date)} · Created: {formatDate(inv.created_at)}
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#6B7098]/10">
                    {inv.status === 'unpaid' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="rounded-full"
                          onClick={() => setStatus(inv.id, 'paid')}
                          disabled={busyId === inv.id}
                        >
                          Mark paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setStatus(inv.id, 'cancelled')}
                          disabled={busyId === inv.id}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => resend(inv.id)}
                      disabled={busyId === inv.id}
                      title="Resend invoice email"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={inv.visible_to_user !== false}
                        onCheckedChange={(v) => setVisibility(inv.id, v)}
                        disabled={busyId === inv.id}
                      />
                      <span className="text-xs text-[#6B7098]">
                        {inv.visible_to_user !== false ? 'On dashboard' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
