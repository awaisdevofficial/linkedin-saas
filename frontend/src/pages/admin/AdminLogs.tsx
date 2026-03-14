import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiCalls, type AdminLog } from '@/lib/api';
import { getAdminAuth } from '@/lib/config';

export default function AdminLogs() {
  const { adminKey, adminEmail } = getAdminAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const load = () => {
    if (!adminKey) return;
    setLoading(true);
    apiCalls.adminLogs(adminKey, undefined, adminEmail ?? undefined)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [adminKey]);

  const filtered = actionFilter.trim()
    ? logs.filter((l) => l.action.toLowerCase().includes(actionFilter.trim().toLowerCase()))
    : logs;

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#10153E] mb-6">Admin Logs</h1>

      <div className="mb-4">
        <Input
          placeholder="Filter by action type..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
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
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-[#6B7098] whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.target_email || log.target_user_id || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-[#6B7098]">
                    {log.details != null ? JSON.stringify(log.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-[#6B7098]">No logs yet.</div>
        )}
      </div>
    </div>
  );
}
