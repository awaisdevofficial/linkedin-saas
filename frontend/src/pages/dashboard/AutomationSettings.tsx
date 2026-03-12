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
  } | null>(null);
  const [engageSettings, setEngageSettings] = useState<Record<string, unknown> | null>(null);
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
      setEngageSettings(engageRes.data as Record<string, unknown>);
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
    if (!supabase || !user || !engageSettings) return;
    setSaving('engage');
    const client = supabase;
    try {
      await client.from('engagement_settings').upsert(
        {
          user_id: user.id,
          ...engageSettings,
        },
        { onConflict: 'user_id' }
      );
      toast.success('Engagement settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Automation Settings</h1>
        <p className="text-sm text-[#6B7098]">Configure how PostPilot automates your LinkedIn activity</p>
      </div>

      <Card className="card-shadow border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Post Generation</CardTitle>
              <CardDescription>Configure how posts are generated and published</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={!generationPaused}
              onCheckedChange={(checked) => handlePauseGeneration(!checked)}
              disabled={!!saving}
            />
            <Label className="text-sm">Auto-generation</Label>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Niche</Label>
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    niche === (n === 'Custom' ? 'custom' : n.toLowerCase())
                      ? 'bg-[#2D5AF6] text-white'
                      : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Post Tone</Label>
            <div className="flex flex-wrap gap-2">
              {['professional', 'conversational', 'bold', 'educational'].map((t) => (
                <button
                  key={t}
                  onClick={() => setContentSettings((s) => ({ ...(s || {}), post_tone: t }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    postTone === t ? 'bg-[#2D5AF6] text-white' : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Input
              value={contentSettings?.target_audience || ''}
              onChange={(e) =>
                setContentSettings((s) => ({ ...(s || {}), target_audience: e.target.value }))
              }
              placeholder="e.g., SaaS founders, marketers"
            />
          </div>

          <Button
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={handleSaveContent}
            disabled={!!saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Post Generation
          </Button>
        </CardContent>
      </Card>

      <Card className="card-shadow border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Engage Others</CardTitle>
              <CardDescription>Auto-like and comment on other posts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Comment Prompt</Label>
            <Textarea
              value={(engageSettings?.comment_prompt as string) || ''}
              onChange={(e) =>
                setEngageSettings((s) => ({ ...(s || {}), comment_prompt: e.target.value }))
              }
              rows={3}
              placeholder="Write a short genuine LinkedIn comment..."
            />
          </div>

          <Button
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={handleSaveEngage}
            disabled={!!saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Engage Others
          </Button>
        </CardContent>
      </Card>

      <Card className="card-shadow border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Reply className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Reply to Comments</CardTitle>
              <CardDescription>Auto-reply to comments on your posts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Reply Prompt</Label>
            <Textarea
              value={(contentSettings?.custom_reply_prompt as string) || ''}
              onChange={(e) =>
                setContentSettings((s) => ({ ...(s || {}), custom_reply_prompt: e.target.value }))
              }
              rows={3}
              placeholder="Reply professionally and helpfully..."
            />
          </div>

          <Button
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={handleSaveContent}
            disabled={!!saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Reply Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationSettings;
