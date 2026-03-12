import { useState, useEffect } from 'react';
import { Save, MessageSquare, Reply, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';
import { toast } from 'sonner';

const niches = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI', 'Custom'];

const AutomationSettings = () => {
  const { user, accessToken } = useAuth();
  const [generationPaused, setGenerationPaused] = useState(false);
  const [contentSettings, setContentSettings] = useState<{
    niche?: string;
    custom_keywords?: string[];
    target_audience?: string;
    post_tone?: string;
    comment_tone?: string;
    custom_post_prompt?: string;
    custom_comment_prompt?: string;
    custom_reply_prompt?: string;
    enable_post_comment?: boolean;
  } | null>(null);
  const [engageSettings, setEngageSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;

    const fetch = async () => {
      const [settingsRes, engageRes] = await Promise.all([
        client
          .from('user_content_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        client
          .from('engagement_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setContentSettings(settingsRes.data as typeof contentSettings);
      setEngageSettings((engageRes.data as Record<string, unknown>) ?? {});
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    if (!accessToken) return;
    apiCalls.getGenerationPaused(accessToken).then((r) => setGenerationPaused(r.generation_paused)).catch(() => {});
  }, [accessToken]);

  const handlePauseGeneration = async (paused: boolean) => {
    if (!accessToken) return;
    setSaving('generation');
    try {
      await apiCalls.setGenerationPaused(accessToken, paused);
      setGenerationPaused(paused);
      toast.success(paused ? 'Generation paused' : 'Generation resumed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveContent = async () => {
    if (!supabase || !user || !contentSettings) return;
    setSaving('content');
    try {
      await supabase!.from('user_content_settings').upsert(
        {
          user_id: user.id,
          ...contentSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      toast.success('Content settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveEngage = async () => {
    if (!supabase || !user) return;
    const client = supabase;
    await client.from('engagement_settings').upsert(
      { user_id: user.id, ...engageSettings },
      { onConflict: 'user_id' }
    );
  };

  const handleSaveAll = async () => {
    if (!supabase || !user) return;
    setSaving('all');
    try {
      if (contentSettings) {
        await supabase.from('user_content_settings').upsert(
          { user_id: user.id, ...contentSettings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      }
      await handleSaveEngage();
      toast.success('All settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  const niche = contentSettings?.niche || 'tech';
  const postTone = contentSettings?.post_tone || 'professional';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Automation Settings</h1>
        <p className="mt-1 text-[15px] text-[#64748b]">Configure how PostPilot automates your LinkedIn activity</p>
      </div>

      <div className="space-y-6">
        <Card className="border border-[#e2e8f0] shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-[#0f172a]">Post Generation</CardTitle>
                <CardDescription className="text-[#64748b] mt-0.5">Configure how new posts are generated and published</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
              <Label className="text-sm font-medium text-[#334155] cursor-pointer">Auto post generation</Label>
              <Switch
                checked={!generationPaused}
                onCheckedChange={(checked) => handlePauseGeneration(!checked)}
                disabled={!!saving}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
              <Label className="text-sm font-medium text-[#334155] cursor-pointer max-w-[280px]">Post suggested comments on my post when publishing</Label>
              <Switch
                checked={contentSettings?.enable_post_comment !== false}
                onCheckedChange={(checked) =>
                  setContentSettings((s) => ({ ...(s || {}), enable_post_comment: checked }))
                }
                disabled={!!saving}
              />
            </div>
            <Separator className="bg-[#e2e8f0]" />
            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#334155]">Niche</Label>
              <div className="flex flex-wrap gap-2">
                {niches.map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setContentSettings((s) => ({
                        ...(s || {}),
                        niche: n === 'Custom' ? 'custom' : n.toLowerCase(),
                      }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      niche === (n === 'Custom' ? 'custom' : n.toLowerCase())
                        ? 'bg-[#2D5AF6] text-white shadow-sm'
                        : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#334155]">Post tone</Label>
              <div className="flex flex-wrap gap-2">
                {['professional', 'conversational', 'bold', 'educational'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setContentSettings((s) => ({ ...(s || {}), post_tone: t }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      postTone === t ? 'bg-[#2D5AF6] text-white shadow-sm' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#334155]">Target audience</Label>
              <Input
                value={contentSettings?.target_audience || ''}
                onChange={(e) =>
                  setContentSettings((s) => ({ ...(s || {}), target_audience: e.target.value }))
                }
                placeholder="e.g. Sales, marketers"
                className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#2D5AF6]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#e2e8f0] shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-[#0f172a]">Engage Others</CardTitle>
                <CardDescription className="text-[#64748b] mt-0.5">Auto-like and comment on other posts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
              <Label className="text-sm font-medium text-[#334155] cursor-pointer">Enable auto-like on feed posts</Label>
              <Switch
                checked={engageSettings?.auto_liking !== false}
                onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_liking: checked }))}
                disabled={!!saving}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
              <Label className="text-sm font-medium text-[#334155] cursor-pointer">Enable comment on feed posts</Label>
              <Switch
                checked={engageSettings?.auto_commenting !== false}
                onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_commenting: checked }))}
                disabled={!!saving}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#334155]">Comment prompt</Label>
              <Textarea
                value={(engageSettings?.comment_prompt as string) || ''}
                onChange={(e) => setEngageSettings((s) => ({ ...s, comment_prompt: e.target.value }))}
                rows={3}
                placeholder="Professional"
                className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#2D5AF6] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#e2e8f0] shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Reply className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-[#0f172a]">Reply to Comments</CardTitle>
                <CardDescription className="text-[#64748b] mt-0.5">Auto-reply to comments on your posts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
              <Label className="text-sm font-medium text-[#334155] cursor-pointer">Enable auto-reply to comments on my posts</Label>
              <Switch
                checked={engageSettings?.auto_replying !== false}
                onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_replying: checked }))}
                disabled={!!saving}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#334155]">Reply prompt</Label>
              <Textarea
                value={(contentSettings?.custom_reply_prompt as string) || ''}
                onChange={(e) =>
                  setContentSettings((s) => ({ ...(s || {}), custom_reply_prompt: e.target.value }))
                }
                rows={3}
                placeholder="Reply professionally and helpfully..."
                className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#2D5AF6] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 pt-6 border-t border-[#e2e8f0] flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={!!saving}
          className="bg-[#2D5AF6] hover:bg-[#2563eb] text-white shadow-md rounded-xl px-8 py-6 text-base font-medium"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save all settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AutomationSettings;
