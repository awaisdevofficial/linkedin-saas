import { useState, useEffect } from 'react';
import { MessageSquare, Loader2, Heart, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';

const SPEED_OPTIONS = [
  { id: 'slow', label: 'Slow (safe)', interval: 60, max: 10 },
  { id: 'medium', label: 'Medium', interval: 30, max: 25 },
  { id: 'fast', label: 'Fast', interval: 15, max: 50 },
] as const;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TONE_OPTIONS = ['Thoughtful', 'Professional', 'Friendly', 'Curious'] as const;

export default function CommentsSettings() {
  const { user } = useAuth();
  const [autoLike, setAutoLike] = useState(false);
  const [autoComment, setAutoComment] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [speedId, setSpeedId] = useState<string>('medium');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeDays, setActiveDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [activeStartTime, setActiveStartTime] = useState('08:00');
  const [activeEndTime, setActiveEndTime] = useState('20:00');
  const [maxPerDayOverride, setMaxPerDayOverride] = useState<number | null>(null);
  const [commentTone, setCommentTone] = useState('thoughtful');
  const [useDefaultCommentPrompt, setUseDefaultCommentPrompt] = useState(true);
  const [customCommentPrompt, setCustomCommentPrompt] = useState('');
  const [useDefaultReplyPrompt, setUseDefaultReplyPrompt] = useState(true);
  const [customReplyPrompt, setCustomReplyPrompt] = useState('');
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedSaved, setAdvancedSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('engagement_settings')
        .select('auto_liking, auto_commenting, auto_replying, engagement_interval_minutes, max_engagements_per_day, active_days, active_start_time, active_end_time')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setAutoLike(data.auto_liking ?? false);
        setAutoComment(data.auto_commenting ?? false);
        setAutoReply(data.auto_replying ?? false);
        const interval = Number(data.engagement_interval_minutes);
        const max = Number(data.max_engagements_per_day);
        const match = SPEED_OPTIONS.find((s) => s.interval === interval && s.max === max);
        setSpeedId(match?.id ?? 'medium');
        if (match && max !== match.max) setMaxPerDayOverride(max);
        setActiveDays(Array.isArray(data.active_days) ? data.active_days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        setActiveStartTime(String(data.active_start_time || '08:00').slice(0, 5));
        setActiveEndTime(String(data.active_end_time || '20:00').slice(0, 5));
      }
      const { data: content } = await supabase
        .from('user_content_settings')
        .select('comment_tone, use_default_comment_prompt, custom_comment_prompt, use_default_reply_prompt, custom_reply_prompt')
        .eq('user_id', user.id)
        .maybeSingle();
      if (content) {
        setCommentTone(content.comment_tone ?? 'thoughtful');
        setUseDefaultCommentPrompt(content.use_default_comment_prompt ?? true);
        setCustomCommentPrompt(content.custom_comment_prompt ?? '');
        setUseDefaultReplyPrompt(content.use_default_reply_prompt ?? true);
        setCustomReplyPrompt(content.custom_reply_prompt ?? '');
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    const speed = SPEED_OPTIONS.find((s) => s.id === speedId) ?? SPEED_OPTIONS[1];
    const maxPerDay = maxPerDayOverride ?? speed.max;
    const { data: existing } = await supabase.from('engagement_settings').select('*').eq('user_id', user.id).maybeSingle();
    const payload: Record<string, unknown> = {
      user_id: user.id,
      auto_liking: autoLike,
      auto_commenting: autoComment,
      auto_replying: autoReply,
      engagement_interval_minutes: speed.interval,
      max_engagements_per_day: Math.min(200, Math.max(10, maxPerDay)),
      active_days: activeDays,
      active_start_time: activeStartTime,
      active_end_time: activeEndTime,
      updated_at: new Date().toISOString(),
    };
    if (existing && typeof existing === 'object') {
      ['id', 'created_at', 'post_interval_minutes'].forEach((k) => {
        if ((existing as Record<string, unknown>)[k] !== undefined) payload[k] = (existing as Record<string, unknown>)[k];
      });
    }
    const { error } = await supabase.from('engagement_settings').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const saveAdvancedContent = async () => {
    if (!user?.id) return;
    setAdvancedSaving(true);
    const { data: existing } = await supabase.from('user_content_settings').select('*').eq('user_id', user.id).maybeSingle();
    await supabase.from('user_content_settings').upsert(
      {
        user_id: user.id,
        niche: existing?.niche ?? 'tech',
        target_audience: existing?.target_audience ?? null,
        brand_voice_description: existing?.brand_voice_description ?? null,
        custom_keywords: existing?.custom_keywords ?? [],
        topics_to_avoid: existing?.topics_to_avoid ?? [],
        post_tone: existing?.post_tone ?? 'authoritative',
        cta_style: existing?.cta_style ?? 'dm',
        custom_cta: existing?.custom_cta ?? null,
        use_default_post_prompt: existing?.use_default_post_prompt ?? true,
        custom_post_prompt: existing?.custom_post_prompt ?? null,
        comment_tone: commentTone,
        use_default_comment_prompt: useDefaultCommentPrompt,
        custom_comment_prompt: customCommentPrompt || null,
        use_default_reply_prompt: useDefaultReplyPrompt,
        custom_reply_prompt: customReplyPrompt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    setAdvancedSaving(false);
    setAdvancedSaved(true);
    setTimeout(() => setAdvancedSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full">
        <Loader2 className="w-8 h-8 text-[#4F6DFF] animate-spin" />
      </div>
    );
  }

  const speed = SPEED_OPTIONS.find((s) => s.id === speedId) ?? SPEED_OPTIONS[1];
  const isFast = speedId === 'fast';

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
        <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Quick setup</h3>
        <p className="text-base text-[#A7B1D8]">Control how PostPilot engages with your LinkedIn feed—likes, comments, and replies.</p>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-[#E11D48]" />
            <div>
              <p className="text-[#F2F5FF] font-medium">Auto-like posts</p>
              <p className="text-base text-[#A7B1D8]">Automatically like posts from your LinkedIn feed.</p>
            </div>
          </div>
          <Switch checked={autoLike} onCheckedChange={setAutoLike} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#4F6DFF]" />
            <div>
              <p className="text-[#F2F5FF] font-medium">Auto-comment on posts</p>
              <p className="text-base text-[#A7B1D8]">Post AI-generated comments on trending posts in your feed.</p>
            </div>
          </div>
          <Switch checked={autoComment} onCheckedChange={setAutoComment} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#27C696]" />
            <div>
              <p className="text-[#F2F5FF] font-medium">Auto-reply to comments</p>
              <p className="text-base text-[#A7B1D8]">Reply to comments left on your own posts.</p>
            </div>
          </div>
          <Switch checked={autoReply} onCheckedChange={setAutoReply} />
        </div>

        <div>
          <Label className="text-[#F2F5FF] block mb-2">Engagement speed</Label>
          <div className="flex flex-wrap gap-2">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpeedId(s.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  speedId === s.id ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {isFast && (
            <p className="text-amber-400/90 text-sm mt-2">⚠ Higher activity may increase account risk</p>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : saved ? <><CheckCircle className="w-4 h-4 mr-2" /> ✓ Saved</> : 'Save'}
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 text-[#F2F5FF] font-medium hover:text-[#4F6DFF] transition-colors"
        >
          {advancedOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          ⚙ Advanced Settings
        </button>

        {advancedOpen && (
          <div className="mt-6 space-y-6 pt-6 border-t border-white/10">
            <div>
              <Label className="text-[#F2F5FF] block mb-2">Active days</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeDays.includes(day) ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[#F2F5FF] block mb-2">Active hours</Label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#A7B1D8] text-sm">Start</span>
                  <input
                    type="time"
                    value={activeStartTime}
                    onChange={(e) => setActiveStartTime(e.target.value.slice(0, 5))}
                    className="rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] px-3 py-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#A7B1D8] text-sm">End</span>
                  <input
                    type="time"
                    value={activeEndTime}
                    onChange={(e) => setActiveEndTime(e.target.value.slice(0, 5))}
                    className="rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-[#F2F5FF] block mb-2">Max per day (override)</Label>
              <input
                type="number"
                min={10}
                max={200}
                value={maxPerDayOverride ?? speed.max}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setMaxPerDayOverride(v);
                }}
                className="rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] px-3 py-2 w-24"
              />
              <p className="text-sm text-[#A7B1D8] mt-1">Override the speed preset. Save above to apply.</p>
            </div>
            <div>
              <Label className="text-[#F2F5FF] block mb-2">Comment tone</Label>
              <select
                value={commentTone}
                onChange={(e) => setCommentTone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] text-base font-normal focus:outline-none focus:ring-2 focus:ring-[#4F6DFF]"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t.toLowerCase()} className="bg-[#0f1420] text-[#F2F5FF]">{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <span className="text-[#F2F5FF]">Custom comment prompt</span>
              <Switch checked={!useDefaultCommentPrompt} onCheckedChange={(c) => setUseDefaultCommentPrompt(!c)} />
            </div>
            {!useDefaultCommentPrompt && (
              <Textarea
                value={customCommentPrompt}
                onChange={(e) => setCustomCommentPrompt(e.target.value)}
                placeholder="Prompt for generating comments..."
                className="min-h-[80px] bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
              />
            )}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <span className="text-[#F2F5FF]">Custom reply prompt</span>
              <Switch checked={!useDefaultReplyPrompt} onCheckedChange={(c) => setUseDefaultReplyPrompt(!c)} />
            </div>
            {!useDefaultReplyPrompt && (
              <Textarea
                value={customReplyPrompt}
                onChange={(e) => setCustomReplyPrompt(e.target.value)}
                placeholder="Prompt for replying to comments..."
                className="min-h-[80px] bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
              />
            )}
            <Button onClick={saveAdvancedContent} disabled={advancedSaving} className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
              {advancedSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : advancedSaved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : 'Save advanced'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
