import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiCalls } from '@/lib/api';
import type { AdminInvoice } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Invoices() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const openInvoiceHtml = async (invoiceId: string) => {
    if (!accessToken) return;
    setPrintingId(invoiceId);
    try {
      const html = await apiCalls.getInvoiceHtml(accessToken, invoiceId);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        toast.error('Allow popups to view invoice');
      }
    } catch {
      toast.error('Could not load invoice');
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    apiCalls.getMyInvoices(accessToken)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: 'bg-emerald-500/15 text-emerald-700',
      unpaid: 'bg-amber-500/15 text-amber-700',
      cancelled: 'bg-gray-500/15 text-gray-600',
    };
    return <Badge variant="secondary" className={map[status] || ''}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#10153E] mb-2">Invoices</h1>
      <p className="text-[#6B7098] text-sm mb-6">
        Your invoices and billing history.
      </p>

      {invoices.length === 0 ? (
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
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-[#10153E]">
                  <DollarSign className="w-4 h-4 text-[#6B7098]" />
                  <span className="text-xl font-bold">
                    {inv.currency} {Number(inv.amount).toFixed(2)}
                  </span>
                </div>
                {inv.description && (
                  <p className="text-sm text-[#6B7098]">{inv.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-[#6B7098]">
                  <Calendar className="w-4 h-4" />
                  Due: {formatDate(inv.due_date)}
                  {inv.paid_at && ` · Paid: ${formatDate(inv.paid_at)}`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-full"
                  onClick={() => openInvoiceHtml(inv.id)}
                  disabled={printingId === inv.id}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  {printingId === inv.id ? 'Opening…' : 'View / Print'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
