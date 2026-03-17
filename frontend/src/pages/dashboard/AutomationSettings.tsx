import { useState, useEffect } from 'react';
import { Save, MessageSquare, Reply, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

const niches = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI', 'Custom'];

const ENGAGEMENT_INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 10080, label: '1 week' },
] as const;

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
    kie_api_key?: string;
    generation_mode?: string;
    custom_generation_prompt?: string;
    image_caption_mode?: string;
    custom_image_caption?: string;
    video_caption_mode?: string;
    custom_video_caption?: string;
  } | null>(null);
  const [engageSettings, setEngageSettings] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState('post');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [kieKeyPaid, setKieKeyPaid] = useState<boolean | null>(null);
  const [likeCommentLoading, setLikeCommentLoading] = useState(false);
  const [replyJobLoading, setReplyJobLoading] = useState(false);
  const { subscription, loading: subLoading } = useSubscription();

  const isPro =
    subscription?.plan === 'pro' && (subscription?.status === 'active' || subscription?.status === 'trialing');

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    if (!accessToken) return;
    apiCalls.getKieKeyStatus(accessToken).then((r) => setKieKeyPaid(r.paid)).catch(() => setKieKeyPaid(false));
  }, [accessToken, contentSettings?.kie_api_key]);

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

  const validateKieKeyIfPresent = async (): Promise<boolean> => {
    const key = contentSettings?.kie_api_key?.trim();
    if (!key || !accessToken) return true;
    const res = await apiCalls.validateKieKey(accessToken, key);
    if (!res.valid) {
      toast.error(res.message || 'Invalid KIE API key. Check your key at https://kie.ai/api-key');
      return false;
    }
    if (!res.paid) {
      toast.error(res.message || 'Upgrade your plan or add credits to continue generation of images and videos.');
      return false;
    }
    return true;
  };

  const handleSaveContent = async () => {
    if (!supabase || !user || !contentSettings) return;
    setSaving('content');
    try {
      if (!(await validateKieKeyIfPresent())) return;
      await supabase!.from('user_content_settings').upsert(
        {
          user_id: user.id,
          ...contentSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      toast.success('Content settings saved');
      if (accessToken) apiCalls.getKieKeyStatus(accessToken).then((r) => setKieKeyPaid(r.paid)).catch(() => setKieKeyPaid(false));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveEngage = async () => {
    if (!supabase || !user) return;
    setSaving('engage');
    try {
      await supabase.from('engagement_settings').upsert(
        { user_id: user.id, ...engageSettings },
        { onConflict: 'user_id' }
      );
      toast.success('Engagement settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save engagement settings');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (!supabase || !user) return;
    setSaving('all');
    try {
      if (contentSettings && !(await validateKieKeyIfPresent())) return;
      if (contentSettings) {
        await supabase.from('user_content_settings').upsert(
          {
            user_id: user.id,
            ...contentSettings,
            generation_mode: contentSettings.generation_mode || 'auto',
            custom_generation_prompt: contentSettings.custom_generation_prompt || null,
            image_caption_mode: contentSettings.image_caption_mode || 'content',
            custom_image_caption: contentSettings.custom_image_caption || null,
            video_caption_mode: contentSettings.video_caption_mode || 'content',
            custom_video_caption: contentSettings.custom_video_caption || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
      await handleSaveEngage();
      toast.success('All settings saved');
      if (accessToken) apiCalls.getKieKeyStatus(accessToken).then((r) => setKieKeyPaid(r.paid)).catch(() => setKieKeyPaid(false));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  const niche = contentSettings?.niche || 'tech';
  const postTone = contentSettings?.post_tone || 'professional';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Activity Settings</h1>
        <p className="mt-1 text-[15px] text-[#64748b]">
          Configure how POSTORA handles your LinkedIn content, scheduling, and engagement so it matches your voice.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12 p-1 bg-[#f1f5f9] rounded-xl border border-[#e2e8f0] mb-6">
          <TabsTrigger
            value="post"
            className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f172a]"
          >
            <Zap className="w-4 h-4 mr-2 inline" />
            Post Generation
          </TabsTrigger>
          <TabsTrigger
            value="engage"
            className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f172a]"
          >
            <MessageSquare className="w-4 h-4 mr-2 inline" />
            Engage Others
          </TabsTrigger>
          <TabsTrigger
            value="reply"
            className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f172a]"
          >
            <Reply className="w-4 h-4 mr-2 inline" />
            Reply to Comments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="post" className="mt-0 focus-visible:outline-none">
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
              {/* Generation Mode */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#7B3FE4] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">Content Generation Mode</p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Let Postora pick topics automatically, or write your own instructions
                    </p>
                  </div>
                </div>

                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'auto', label: 'Auto by POSTORA', desc: 'Uses your niche and saved sources to suggest topics' },
                      { value: 'custom', label: 'Custom Instructions', desc: 'You define exactly what to write about' },
                    ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setContentSettings((s) => ({ ...s, generation_mode: opt.value }))
                      }
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        (contentSettings?.generation_mode || 'auto') === opt.value
                          ? 'border-[#6366F1] bg-[#eff6ff]'
                          : 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-white'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        (contentSettings?.generation_mode || 'auto') === opt.value
                          ? 'text-[#6366F1]'
                          : 'text-[#334155]'
                      }`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#64748b] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Custom instruction textarea — only shown when mode = custom */}
                {(contentSettings?.generation_mode || 'auto') === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#334155]">
                      Your content instructions
                    </Label>
                    <Textarea
                      value={contentSettings?.custom_generation_prompt || ''}
                      onChange={(e) =>
                        setContentSettings((s) => ({
                          ...s,
                          custom_generation_prompt: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder={`Example: Write a motivational post about AI tools for marketers. Use a storytelling format. Start with a surprising statistic. Keep it under 200 words.`}
                      className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] resize-none text-sm"
                    />
                    <p className="text-xs text-[#64748b]">
                      Be specific — mention topic, style, length, audience, or any format you want
                    </p>
                    {!(contentSettings?.custom_generation_prompt?.trim()) && (
                      <p className="text-xs text-amber-600">
                        ⚠ No instructions set — generation will be skipped in custom mode
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-[#e2e8f0]" />
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <Label className="text-sm font-medium text-[#334155] cursor-pointer">Auto post generation</Label>
                <Switch checked={!generationPaused} onCheckedChange={(checked) => handlePauseGeneration(!checked)} disabled={!!saving} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <Label className="text-sm font-medium text-[#334155] cursor-pointer max-w-[280px]">Post suggested comments on my post when publishing</Label>
                <Switch
                  checked={contentSettings?.enable_post_comment !== false}
                  onCheckedChange={(checked) => setContentSettings((s) => ({ ...(s || {}), enable_post_comment: checked }))}
                  disabled={!!saving}
                />
              </div>
              <Separator className="bg-[#e2e8f0]" />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">KIE API key (image & video generation)</Label>
                <p className="text-xs text-[#64748b]">
                  Your key is stored securely and used only for generating post images and videos (text-to-image, text-to-video). Get one at{' '}
                  <a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">
                    kie.ai/api-key
                  </a>
                  .
                </p>
                <Input
                  type="password"
                  autoComplete="off"
                  value={contentSettings?.kie_api_key || ''}
                  onChange={(e) => setContentSettings((s) => ({ ...(s || {}), kie_api_key: e.target.value }))}
                  placeholder="Paste your KIE API key"
                  className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] font-mono text-sm"
                />
              </div>
              <div className="rounded-xl bg-[#eff6ff] border border-[#bfdbfe] p-3 text-sm text-[#1e40af]">
                When a post has a generated video, the video will be posted to LinkedIn when you publish (manually or via schedule).
              </div>
              <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] p-3 text-sm text-[#166534]">
                The image is generated from the post content; the video is also generated from the post content. When these tools run, whatever you provide below (post content or your custom captions) will be used for generation.
              </div>
              <Separator className="bg-[#e2e8f0]" />
              {kieKeyPaid === false && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Add and verify a KIE API key with credits above to enable image and video generation.
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <Label className="text-sm font-medium text-[#334155] cursor-pointer">Auto-generate image for new posts</Label>
                <Switch
                  checked={engageSettings?.auto_generate_image === true}
                  onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_generate_image: checked }))}
                  disabled={!!saving || kieKeyPaid !== true}
                />
              </div>
              {/* Image caption mode — only shown when auto_generate_image is enabled */}
              {engageSettings?.auto_generate_image === true && (
                <div className="space-y-3 pl-4 border-l-2 border-[#6366F1]/20">
                  <Label className="text-sm font-medium text-[#334155]">
                    Image prompt source
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'content', label: 'From post content', desc: 'Auto-built from hook & body' },
                      { value: 'custom', label: 'Custom caption', desc: 'You write the image prompt' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setContentSettings((s) => ({ ...s, image_caption_mode: opt.value }))
                        }
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          (contentSettings?.image_caption_mode || 'content') === opt.value
                            ? 'border-[#6366F1] bg-[#eff6ff]'
                            : 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-white'
                        }`}
                      >
                        <p className={`text-xs font-medium ${
                          (contentSettings?.image_caption_mode || 'content') === opt.value
                            ? 'text-[#6366F1]'
                            : 'text-[#334155]'
                        }`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-[#64748b] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {(contentSettings?.image_caption_mode || 'content') === 'custom' && (
                    <div className="space-y-1">
                      <Textarea
                        value={contentSettings?.custom_image_caption || ''}
                        onChange={(e) =>
                          setContentSettings((s) => ({
                            ...s,
                            custom_image_caption: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="e.g. A futuristic office with glowing screens and AI robots"
                        className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] resize-none text-sm"
                      />
                      <p className="text-xs text-[#64748b]">
                        This exact text will be sent to KIE as the image prompt
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <Label className="text-sm font-medium text-[#334155] cursor-pointer">Auto-generate video for new posts</Label>
                <Switch
                  checked={engageSettings?.auto_generate_video === true}
                  onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_generate_video: checked }))}
                  disabled={!!saving || kieKeyPaid !== true}
                />
              </div>
              {/* Video caption mode — only shown when auto_generate_video is enabled */}
              {engageSettings?.auto_generate_video === true && (
                <div className="space-y-3 pl-4 border-l-2 border-[#6366F1]/20">
                  <Label className="text-sm font-medium text-[#334155]">
                    Video prompt source
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'content', label: 'From post content', desc: 'Auto-built from hook & body' },
                      { value: 'custom', label: 'Custom caption', desc: 'You write the video prompt' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setContentSettings((s) => ({ ...s, video_caption_mode: opt.value }))
                        }
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          (contentSettings?.video_caption_mode || 'content') === opt.value
                            ? 'border-[#6366F1] bg-[#eff6ff]'
                            : 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-white'
                        }`}
                      >
                        <p className={`text-xs font-medium ${
                          (contentSettings?.video_caption_mode || 'content') === opt.value
                            ? 'text-[#6366F1]'
                            : 'text-[#334155]'
                        }`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-[#64748b] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {(contentSettings?.video_caption_mode || 'content') === 'custom' && (
                    <div className="space-y-1">
                      <Textarea
                        value={contentSettings?.custom_video_caption || ''}
                        onChange={(e) =>
                          setContentSettings((s) => ({
                            ...s,
                            custom_video_caption: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="e.g. A time-lapse of a city transforming with technology"
                        className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] resize-none text-sm"
                      />
                      <p className="text-xs text-[#64748b]">
                        This exact text will be sent to KIE as the video prompt
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Separator className="bg-[#e2e8f0]" />
              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#334155]">Niche</Label>
                <div className="flex flex-wrap gap-2">
                  {niches.map((n) => (
                    <button
                      key={n}
                      onClick={() => setContentSettings((s) => ({ ...(s || {}), niche: n === 'Custom' ? 'custom' : n.toLowerCase() }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${niche === (n === 'Custom' ? 'custom' : n.toLowerCase()) ? 'bg-[#6366F1] text-white shadow-sm' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'}`}
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${postTone === t ? 'bg-[#6366F1] text-white shadow-sm' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'}`}
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
                  onChange={(e) => setContentSettings((s) => ({ ...(s || {}), target_audience: e.target.value }))}
                  placeholder="e.g. Sales, marketers"
                  className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engage" className="mt-0 focus-visible:outline-none">
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
                <Switch checked={engageSettings?.auto_liking !== false} onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_liking: checked }))} disabled={!!saving} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <Label className="text-sm font-medium text-[#334155] cursor-pointer">Enable comment on feed posts</Label>
                <Switch checked={engageSettings?.auto_commenting !== false} onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_commenting: checked }))} disabled={!!saving} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">Run feed engagement every</Label>
                <p className="text-xs text-[#64748b]">How often to run the like & comment job (e.g. every 1 hour or 2 hours).</p>
                <select
                  value={Math.min(10080, Math.max(15, Number(engageSettings?.engagement_interval_minutes) || 60))}
                  onChange={(e) => setEngageSettings((s) => ({ ...s, engagement_interval_minutes: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  {ENGAGEMENT_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">Comment prompt</Label>
                <Textarea
                  value={(engageSettings?.comment_prompt as string) || ''}
                  onChange={(e) => setEngageSettings((s) => ({ ...s, comment_prompt: e.target.value }))}
                  rows={3}
                  placeholder="Professional"
                  className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">Active days</Label>
                <p className="text-xs text-[#64748b]">Run every day, or choose specific days only. If no days are selected, it runs every day.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!(Array.isArray(engageSettings?.active_days) && (engageSettings.active_days as string[]).length > 0)}
                      onChange={(e) => {
                        if (e.target.checked) setEngageSettings((s) => ({ ...s, active_days: [] }));
                      }}
                      className="rounded border-[#e2e8f0] text-[#6366F1] focus:ring-[#6366F1]"
                    />
                    <span className="text-sm font-medium text-[#334155]">Run every day</span>
                  </label>
                  <span className="text-xs text-[#64748b]">or select specific days:</span>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const activeDays = Array.isArray(engageSettings?.active_days) ? engageSettings.active_days as string[] : [];
                    const checked = activeDays.includes(day);
                    return (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? activeDays.filter((d) => d !== day) : [...activeDays, day];
                            setEngageSettings((s) => ({ ...s, active_days: next }));
                          }}
                          className="rounded border-[#e2e8f0] text-[#6366F1] focus:ring-[#6366F1]"
                        />
                        <span className="text-sm text-[#334155]">{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#334155]">Active start time</Label>
                  <p className="text-xs text-[#64748b]">Only run after this time (server UTC)</p>
                  <Input
                    type="time"
                    value={String(engageSettings?.active_start_time ?? '08:00').slice(0, 5)}
                    onChange={(e) => setEngageSettings((s) => ({ ...s, active_start_time: e.target.value.slice(0, 5) }))}
                    className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#334155]">Active end time</Label>
                  <p className="text-xs text-[#64748b]">Only run before this time (server UTC)</p>
                  <Input
                    type="time"
                    value={String(engageSettings?.active_end_time ?? '20:00').slice(0, 5)}
                    onChange={(e) => setEngageSettings((s) => ({ ...s, active_end_time: e.target.value.slice(0, 5) }))}
                    className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1]"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={likeCommentLoading || !!saving}
                  className="rounded-lg border-[#e2e8f0]"
                  onClick={async () => {
                    if (!supabase || !user || !accessToken) return;
                    setLikeCommentLoading(true);
                    try {
                      const [settingsRes, connRes] = await Promise.all([
                        supabase.from('engagement_settings').select('*').eq('user_id', user.id).maybeSingle(),
                        supabase.from('linkedin_connections').select('person_urn').eq('user_id', user.id).maybeSingle(),
                      ]);
                      const settings = settingsRes.data as Record<string, unknown> | null;
                      const connection = connRes.data as { person_urn?: string } | null;
                      if (!settings?.user_id) {
                        toast.error('Engagement settings not found. Save settings first.');
                        return;
                      }
                      if (!connection?.person_urn) {
                        toast.error('LinkedIn connection not found. Connect your account first.');
                        return;
                      }
                      const payload = {
                        user_id: String(settings.user_id),
                        person_urn: connection.person_urn,
                        auto_liking: settings.auto_liking !== false,
                        auto_commenting: settings.auto_commenting !== false,
                        engagement_interval_minutes: Number(settings.engagement_interval_minutes) || 60,
                        comment_prompt: (settings.comment_prompt as string) ?? null,
                        active_days: (settings.active_days as string[]) ?? [],
                        active_start_time: (settings.active_start_time as string) ?? '08:00',
                        active_end_time: (settings.active_end_time as string) ?? '20:00',
                        max_engagements_per_day: Number(settings.max_engagements_per_day) || 50,
                        sent_at: new Date().toISOString(),
                      };
                      await apiCalls.triggerLikeAndComment(accessToken, payload);
                      toast.success('Like & Comment job triggered');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to trigger Like & Comment');
                    } finally {
                      setLikeCommentLoading(false);
                    }
                  }}
                >
                  {likeCommentLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Triggering...
                    </span>
                  ) : (
                    'Run Like & Comment Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reply" className="mt-0 focus-visible:outline-none">
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
              {subLoading ? null : !isPro ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Auto-reply to comments is a Pro feature.{' '}
                  <a href="/billing" className="font-semibold underline">
                    Upgrade
                  </a>
                  .
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4">
                <div>
                  <Label className="text-sm font-medium text-[#334155] cursor-pointer">Auto Reply to Comments</Label>
                  <p className="text-xs text-[#64748b] mt-0.5">Automatically reply to comments on your own posts (runs on schedule when enabled)</p>
                </div>
                <Switch
                  checked={engageSettings?.auto_replying === true}
                  onCheckedChange={(checked) => setEngageSettings((s) => ({ ...s, auto_replying: checked }))}
                  disabled={!!saving || subLoading || !isPro}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">Run reply-to-comments every</Label>
                <p className="text-xs text-[#64748b]">How often to run the reply job (same interval options as feed engagement). Uses the same active days and time window (UTC) as above.</p>
                <select
                  value={Math.min(10080, Math.max(15, Number(engageSettings?.reply_interval_minutes) || 60))}
                  onChange={(e) => setEngageSettings((s) => ({ ...s, reply_interval_minutes: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  {ENGAGEMENT_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#334155]">Reply prompt</Label>
                <Textarea
                  value={(contentSettings?.custom_reply_prompt as string) || ''}
                  onChange={(e) => setContentSettings((s) => ({ ...(s || {}), custom_reply_prompt: e.target.value }))}
                  rows={3}
                  placeholder="Reply professionally and helpfully..."
                  className="rounded-lg border-[#e2e8f0] bg-white focus-visible:ring-[#6366F1] resize-none"
                />
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={replyJobLoading || !!saving || engageSettings?.auto_replying !== true || subLoading || !isPro}
                  className="rounded-lg border-[#e2e8f0]"
                  onClick={async () => {
                    if (!supabase || !user || !accessToken) return;
                    setReplyJobLoading(true);
                    try {
                      const [settingsRes, connRes, postedCountRes] = await Promise.all([
                        supabase.from('engagement_settings').select('*').eq('user_id', user.id).maybeSingle(),
                        supabase.from('linkedin_connections').select('person_urn').eq('user_id', user.id).maybeSingle(),
                        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('posted', true).eq('status', 'posted').not('linkedin_post_id', 'is', null),
                      ]);
                      const settings = settingsRes.data as Record<string, unknown> | null;
                      const connection = connRes.data as { person_urn?: string } | null;
                      const postedCount = postedCountRes.count ?? 0;
                      if (!settings?.user_id) {
                        toast.error('Engagement settings not found. Save settings first.');
                        return;
                      }
                      if (!connection?.person_urn) {
                        toast.error('LinkedIn connection not found. Connect your account first.');
                        return;
                      }
                      if (postedCount === 0) {
                        toast.error('No published posts found to monitor for replies.');
                        return;
                      }
                      const payload = {
                        user_id: String(settings.user_id),
                        person_urn: connection.person_urn,
                        auto_replying: true,
                        comment_prompt: (settings.comment_prompt as string) ?? null,
                        active_days: (settings.active_days as string[]) ?? [],
                        active_start_time: (settings.active_start_time as string) ?? '08:00',
                        active_end_time: (settings.active_end_time as string) ?? '20:00',
                        sent_at: new Date().toISOString(),
                      };
                      await apiCalls.triggerReplyToComments(accessToken, payload);
                      toast.success('Reply job triggered successfully');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to trigger reply job');
                    } finally {
                      setReplyJobLoading(false);
                    }
                  }}
                >
                  {replyJobLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Triggering...
                    </span>
                  ) : (
                    'Run Reply Job Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 pt-6 border-t border-[#e2e8f0] flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={!!saving}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-md rounded-xl px-8 py-6 text-base font-medium"
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
