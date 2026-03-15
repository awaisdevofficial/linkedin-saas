import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiCalls, type FeatureFlagRow } from '@/lib/api';
import { getAdminAuth } from '@/lib/config';
import { toast } from 'sonner';

const MESSAGE_TYPES = [
  { value: 'coming_soon', label: 'Coming soon' },
  { value: 'maintenance', label: 'In maintenance' },
  { value: 'custom', label: 'Custom message' },
] as const;

export default function AdminFeatureFlags() {
  const { adminKey: key, adminEmail, role } = getAdminAuth();
  const canWrite = role === 'super_admin' || role === 'admin';
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { message_type: string; custom_message: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    if (!key) return;
    setLoading(true);
    apiCalls.adminFeatureFlags(key, adminEmail ?? undefined)
      .then((data) => {
        setFlags(data || []);
        setEditing({});
      })
      .catch(() => toast.error('Failed to load feature flags'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [key]);

  const getEdit = (row: FeatureFlagRow) => {
    return editing[row.key] ?? { message_type: row.message_type || 'coming_soon', custom_message: row.custom_message || '' };
  };

  const setEdit = (rowKey: string, field: 'message_type' | 'custom_message', value: string) => {
    setEditing((prev) => ({
      ...prev,
      [rowKey]: { ...getEdit(flags.find((f) => f.key === rowKey)!), [field]: value },
    }));
  };

  const save = async (row: FeatureFlagRow) => {
    if (!key) return;
    const edit = getEdit(row);
    setSaving(row.key);
    try {
      await apiCalls.adminPatchFeatureFlag(key, {
        key: row.key,
        enabled: row.enabled,
        message_type: edit.message_type,
        custom_message: edit.message_type === 'custom' ? edit.custom_message : undefined,
      }, adminEmail ?? undefined);
      toast.success('Updated');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = async (row: FeatureFlagRow) => {
    if (!key) return;
    setSaving(row.key);
    try {
      await apiCalls.adminPatchFeatureFlag(key, {
        key: row.key,
        enabled: !row.enabled,
      }, adminEmail ?? undefined);
      toast.success(row.enabled ? 'Page disabled for users' : 'Page enabled');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl font-bold text-[#10153E] mb-2">Pages & Features</h1>
      <p className="text-[#6B7098] text-sm mb-4 sm:mb-6">
        Enable or disable dashboard pages for users. When disabled, they will see your chosen message (e.g. Coming soon, In maintenance).
      </p>

      <div className="bg-white rounded-2xl border border-[#6B7098]/10 overflow-hidden">
        <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-[#6B7098]">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Message when disabled</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((row) => {
                const edit = getEdit(row);
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={() => toggleEnabled(row)}
                          disabled={saving === row.key}
                        />
                      ) : (
                        <span className="text-sm">{row.enabled ? 'Yes' : 'No'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <div className="space-y-2">
                          <Select
                            value={edit.message_type}
                            onValueChange={(v) => setEdit(row.key, 'message_type', v)}
                          >
                            <SelectTrigger className="w-44 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MESSAGE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {edit.message_type === 'custom' && (
                            <Textarea
                              placeholder="Custom message..."
                              value={edit.custom_message}
                              onChange={(e) => setEdit(row.key, 'custom_message', e.target.value)}
                              rows={2}
                              className="rounded-lg"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm capitalize">{edit.message_type.replace('_', ' ')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full min-h-[36px] touch-manipulation"
                          onClick={() => save(row)}
                          disabled={saving === row.key}
                        >
                          {saving === row.key ? 'Saving...' : 'Save'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        </div>
        {!loading && flags.length === 0 && (
          <div className="p-8 sm:p-12 text-center text-[#6B7098]">No feature flags. Run the feature_flags.sql migration.</div>
        )}
      </div>
    </div>
  );
}
