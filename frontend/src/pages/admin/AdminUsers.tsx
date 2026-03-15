import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiCalls, type AdminUser } from '@/lib/api';
import { getAdminAuth } from '@/lib/config';
import { toast } from 'sonner';

const QUICK_DAYS = [3, 7, 14, 30, 90, 365];
const STATUS_FILTERS = ['all', 'pending', 'approved', 'expired', 'banned'] as const;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-700' },
    approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-700' },
    banned: { label: 'Banned', className: 'bg-red-500/15 text-red-700' },
    expired: { label: 'Expired', className: 'bg-gray-500/15 text-gray-700' },
  };
  const s = map[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}

export default function AdminUsers() {
  const { adminKey: key, adminEmail, role } = getAdminAuth();
  const canWrite = role === 'super_admin' || role === 'admin';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveDays, setApproveDays] = useState(30);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('USD');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewingApproval, setPreviewingApproval] = useState(false);
  const [previewingInvoiceDraft, setPreviewingInvoiceDraft] = useState(false);

  const load = () => {
    if (!key) return;
    setLoading(true);
    apiCalls.adminUsers(key, adminEmail ?? undefined)
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [key]);

  const filtered = users.filter((u) => {
    if (statusFilter !== 'all' && (u.status || '') !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q)
    );
  });

  const openApprove = (u: AdminUser) => {
    setSelected(u);
    setApproveDays(30);
    setApproveOpen(true);
  };
  const doApprove = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminApprove(key, selected.id, approveDays, adminEmail ?? undefined);
      toast.success('User approved');
      setApproveOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const previewApprovalEmail = async () => {
    if (!key || !selected) return;
    setPreviewingApproval(true);
    try {
      const expiresAt = new Date(Date.now() + approveDays * 24 * 60 * 60 * 1000).toISOString();
      const html = await apiCalls.adminApprovalEmailPreview(
        key,
        { full_name: selected.full_name ?? undefined, days: approveDays, expires_at: expiresAt },
        adminEmail ?? undefined
      );
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        toast.error('Allow popups to view preview');
      }
    } catch {
      toast.error('Could not load email preview');
    } finally {
      setPreviewingApproval(false);
    }
  };

  const openExtend = (u: AdminUser) => {
    setSelected(u);
    setExtendDays(30);
    setExtendOpen(true);
  };
  const doExtend = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminExtend(key, selected.id, extendDays, adminEmail ?? undefined);
      toast.success('Access extended');
      setExtendOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const openBan = (u: AdminUser) => {
    setSelected(u);
    setBanReason('');
    setBanOpen(true);
  };
  const doBan = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminBan(key, selected.id, banReason, adminEmail ?? undefined);
      toast.success('User banned');
      setBanOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const openNotes = (u: AdminUser) => {
    setSelected(u);
    setNotesText(u.notes || '');
    setNotesOpen(true);
  };
  const doNotes = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminNotes(key, selected.id, notesText, adminEmail ?? undefined);
      toast.success('Notes saved');
      setNotesOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = (u: AdminUser) => {
    setSelected(u);
    setInvoiceAmount('');
    setInvoiceCurrency('USD');
    setInvoiceDescription('');
    setInvoiceDueDate('');
    setInvoiceOpen(true);
  };

  const previewInvoiceDraft = async () => {
    if (!key || !selected) return;
    setPreviewingInvoiceDraft(true);
    try {
      const html = await apiCalls.adminInvoiceDraftPreview(
        key,
        {
          user_id: selected.id,
          amount: invoiceAmount || '0',
          currency: invoiceCurrency,
          description: invoiceDescription || undefined,
          due_date: invoiceDueDate || undefined,
        },
        adminEmail ?? undefined
      );
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        toast.error('Allow popups to view preview');
      }
    } catch {
      toast.error('Could not load preview');
    } finally {
      setPreviewingInvoiceDraft(false);
    }
  };

  const doInvoice = async () => {
    if (!key || !selected) return;
    const amount = parseFloat(invoiceAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      await apiCalls.adminInvoice(key, selected.id, {
        amount,
        currency: invoiceCurrency,
        description: invoiceDescription || undefined,
        due_date: invoiceDueDate || undefined,
      }, adminEmail ?? undefined);
      toast.success('Invoice created and sent');
      setInvoiceOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminRevoke(key, selected.id, adminEmail ?? undefined);
      toast.success('Access revoked');
      setRevokeConfirm(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!key || !selected) return;
    setBusy(true);
    try {
      await apiCalls.adminDeleteUser(key, selected.id, adminEmail ?? undefined);
      toast.success('User deleted');
      setDeleteConfirm(false);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doUnban = async (u: AdminUser) => {
    if (!key) return;
    setBusy(true);
    try {
      await apiCalls.adminUnban(key, u.id, adminEmail ?? undefined);
      toast.success('User unbanned');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#10153E] mb-6">Users</h1>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex rounded-xl border border-[#6B7098]/20 overflow-hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                statusFilter === f ? 'bg-[#2D5AF6] text-white' : 'bg-white text-[#6B7098] hover:bg-[#6B7098]/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-xl"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#6B7098]/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#6B7098]">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Access Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email || '—'}</TableCell>
                  <TableCell>{u.full_name || '—'}</TableCell>
                  <TableCell><StatusBadge status={u.status || 'pending'} /></TableCell>
                  <TableCell>{u.plan || 'free'}</TableCell>
                  <TableCell className="text-[#6B7098]">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-[#6B7098]">{formatDate(u.access_expires_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {canWrite && u.status === 'pending' && (
                        <Button size="sm" variant="default" className="rounded-full" onClick={() => openApprove(u)} disabled={busy}>
                          Approve
                        </Button>
                      )}
                      {canWrite && u.status === 'approved' && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => openExtend(u)} disabled={busy}>Extend</Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setSelected(u); setRevokeConfirm(true); }} disabled={busy}>Revoke</Button>
                        </>
                      )}
                      {canWrite && u.status !== 'banned' && (
                        <Button size="sm" variant="outline" className="rounded-full text-amber-600" onClick={() => openBan(u)} disabled={busy}>Ban</Button>
                      )}
                      {canWrite && u.status === 'banned' && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => doUnban(u)} disabled={busy}>Unban</Button>
                      )}
                      {canWrite && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => openInvoice(u)} disabled={busy}>Invoice</Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => openNotes(u)} disabled={busy}>Notes</Button>
                        </>
                      )}
                      {role === 'super_admin' && (
                        <Button size="sm" variant="outline" className="rounded-full text-red-600" onClick={() => { setSelected(u); setDeleteConfirm(true); }} disabled={busy}>Delete</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-[#6B7098]">No users match your filters.</div>
        )}
      </div>

      {/* Approve modal */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User Access</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B7098]">Grant access for:</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              min={1}
              value={approveDays}
              onChange={(e) => setApproveDays(parseInt(e.target.value, 10) || 30)}
              className="w-24"
            />
            <span>days</span>
            {QUICK_DAYS.map((d) => (
              <Button key={d} variant="outline" size="sm" onClick={() => setApproveDays(d)}>{d}d</Button>
            ))}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={previewApprovalEmail} disabled={busy || previewingApproval}>
              {previewingApproval ? 'Opening…' : 'Preview email'}
            </Button>
            <Button onClick={doApprove} disabled={busy}>Approve & Notify User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend modal */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Access</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Label>Additional days:</Label>
            <Input
              type="number"
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 30)}
              className="w-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={doExtend} disabled={busy}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban modal */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <Label>Reason (optional)</Label>
          <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason for ban..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doBan} disabled={busy}>Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice modal */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" step="0.01" min={0} value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0.00" />
                <select value={invoiceCurrency} onChange={(e) => setInvoiceCurrency(e.target.value)} className="rounded-lg border px-3">
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} placeholder="Description" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} />
            </div>
            {selected && (
              <div className="rounded-lg bg-[#6B7098]/10 p-3 text-sm space-y-1">
                <p className="font-medium">To: {selected.email}</p>
                <p>Amount: {invoiceAmount || '0'} {invoiceCurrency} · Due: {invoiceDueDate || '—'}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={previewInvoiceDraft} disabled={busy || previewingInvoiceDraft}>
              {previewingInvoiceDraft ? 'Opening…' : 'Preview email'}
            </Button>
            <Button onClick={doInvoice} disabled={busy}>Create & Send Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes modal */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
          </DialogHeader>
          <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Notes about this user..." rows={5} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button>
            <Button onClick={doNotes} disabled={busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog open={revokeConfirm} onOpenChange={setRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>This will set the user back to pending. They will not be able to use the app until approved again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRevoke} disabled={busy}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this user?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the user and all their data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={busy} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
