import { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Every day', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '09:00' },
  { id: '3x', label: '3x/week', days: ['Monday', 'Wednesday', 'Friday'], time: '09:00' },
  { id: '2x', label: '2x/week', days: ['Tuesday', 'Thursday'], time: '09:00' },
  { id: 'weekly', label: 'Weekly', days: ['Monday'], time: '09:00' },
] as const;

type FrequencyId = typeof FREQUENCY_OPTIONS[number]['id'];

const NICHE_LIST = ['tech', 'marketing', 'finance', 'sales', 'hr', 'ai'] as const;

/** Display label for niche (stored value is lowercase) */
const NICHE_LABELS: Record<string, string> = {
  tech: 'Tech',
  marketing: 'Marketing',
  finance: 'Finance',
  sales: 'Sales',
  hr: 'HR',
  ai: 'AI',
};

function buildGoogleNewsRssUrl(industry: string): string {
  const t = industry.trim().replace(/\s+/g, '+').replace(/"/g, '');
  if (!t) return '';
  const q = `("${t}")`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&hl=en&gl=US&ceid=US:en`;
}

export default function PostsSettings() {
  const { user } = useAuth();
  const [frequencyId, setFrequencyId] = useState<FrequencyId>('daily');
  const [postAtRandomTime, setPostAtRandomTime] = useState(false);
  const [nicheSelect, setNicheSelect] = useState<string>('tech');
  const [customIndustry, setCustomIndustry] = useState('');
  const [freqSaved, setFreqSaved] = useState(false);
  const [nicheSaved, setNicheSaved] = useState(false);
  const [freqSaving, setFreqSaving] = useState(false);
  const [nicheSaving, setNicheSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: scheduleRows } = await supabase.from('schedules').select('day, enabled, time_slots').eq('user_id', user.id);
      const init: Record<string, { enabled: boolean; slots: string[] }> = {};
      DAYS.forEach((d) => { init[d] = { enabled: d !== 'Saturday' && d !== 'Sunday', slots: ['09:00'] }; });
      if (scheduleRows?.length) {
        for (const row of scheduleRows) {
          const day = row.day as string;
          if (init[day] !== undefined) {
            init[day] = { enabled: row.enabled ?? true, slots: Array.isArray(row.time_slots) ? row.time_slots : ['09:00'] };
          }
        }
      }
      const match = FREQUENCY_OPTIONS.find((f) => {
        const sameDays = f.days.length === DAYS.filter((d) => init[d]?.enabled).length && f.days.every((d) => init[d]?.enabled);
        return sameDays;
      });
      setFrequencyId(match?.id ?? 'daily');

      const { data: settings } = await supabase.from('user_content_settings').select('niche').eq('user_id', user.id).maybeSingle();
      const savedNiche = settings?.niche ?? 'tech';
      if (NICHE_LIST.includes(savedNiche as typeof NICHE_LIST[number])) {
        setNicheSelect(savedNiche);
        setCustomIndustry('');
      } else {
        setNicheSelect('custom');
        setCustomIndustry(savedNiche);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const applyFrequency = async (id: FrequencyId) => {
    if (!user?.id) return;
    setFreqSaving(true);
    setFreqSaved(false);
    const config = FREQUENCY_OPTIONS.find((f) => f.id === id) ?? FREQUENCY_OPTIONS[0];
    let time: string = config.time;
    if (postAtRandomTime) {
      const hour = 8 + Math.floor(Math.random() * 11);
      const min = Math.floor(Math.random() * 60);
      time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
    for (const day of DAYS) {
      const enabled = (config.days as readonly string[]).includes(day);
      await supabase.from('schedules').upsert(
        { user_id: user.id, day, enabled, time_slots: enabled ? [time] : [], updated_at: new Date().toISOString() },
        { onConflict: 'user_id,day' }
      );
    }
    setFrequencyId(id);
    setFreqSaving(false);
    setFreqSaved(true);
    setTimeout(() => setFreqSaved(false), 2500);
  };

  const handlePostAtRandomTimeChange = async (checked: boolean) => {
    setPostAtRandomTime(checked);
    if (!user?.id) return;
    await applyFrequency(frequencyId);
  };

  const saveNiche = async () => {
    if (!user?.id) return;
    setNicheSaving(true);
    setNicheSaved(false);
    const nicheValue = nicheSelect === 'custom' ? customIndustry.trim() : nicheSelect;
    if (!nicheValue) {
      setNicheSaving(false);
      return;
    }
    const { data: existing } = await supabase.from('user_content_settings').select('*').eq('user_id', user.id).maybeSingle();
    const payload: Record<string, unknown> = {
      user_id: user.id,
      niche: nicheValue,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      Object.keys(existing).forEach((k) => {
        if (payload[k] === undefined && (existing as Record<string, unknown>)[k] !== undefined) payload[k] = (existing as Record<string, unknown>)[k];
      });
    }
    await supabase.from('user_content_settings').upsert(payload, { onConflict: 'user_id' });

    if (nicheSelect === 'custom' && nicheValue) {
      const feedUrl = buildGoogleNewsRssUrl(nicheValue);
      if (feedUrl) {
        await supabase.from('user_rss_feeds').update({ is_active: false }).eq('user_id', user.id).like('label', 'Google News%');
        await supabase.from('user_rss_feeds').insert({
          user_id: user.id,
          feed_url: feedUrl,
          label: `Google News: ${nicheValue}`,
          is_custom: true,
          is_active: true,
        });
      }
    }
    setNicheSaving(false);
    setNicheSaved(true);
    setTimeout(() => setNicheSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] w-full">
        <Loader2 className="w-8 h-8 text-[#4F6DFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Auto-generate posts</h3>
        <p className="text-base text-[#A7B1D8] mb-6">Posts are generated every hour from your niche feed. Choose how often to publish.</p>

        <div className="space-y-4">
          <div>
            <Label className="text-[#F2F5FF] block mb-2">Posting frequency</Label>
            <div className="flex flex-wrap gap-2 items-center">
              {FREQUENCY_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => applyFrequency(f.id)}
                  disabled={freqSaving}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    frequencyId === f.id ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {freqSaved && <span className="text-sm text-[#27C696] flex items-center gap-1">✓ Saved</span>}
              {freqSaving && <Loader2 className="w-4 h-4 animate-spin text-[#A7B1D8]" />}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <span className="text-[#F2F5FF] font-medium">Post at random time</span>
              <p className="text-base text-[#A7B1D8] mt-0.5">Pick a random time each day within business hours.</p>
            </div>
            <Switch checked={postAtRandomTime} onCheckedChange={handlePostAtRandomTimeChange} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Industry (Niche)</h3>
        <p className="text-base text-[#A7B1D8] mb-6">Select an industry or add a custom one. A Google News RSS feed is used to generate one post per hour.</p>

        <div className="space-y-4">
          <div>
            <Label className="text-[#F2F5FF] block mb-2">Niche</Label>
            <select
              value={nicheSelect}
              onChange={(e) => setNicheSelect(e.target.value)}
              className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] text-base font-normal focus:outline-none focus:ring-2 focus:ring-[#4F6DFF]"
            >
              {NICHE_LIST.map((n) => (
                <option key={n} value={n} className="bg-[#0f1420] text-[#F2F5FF]">
                  {NICHE_LABELS[n] ?? n.charAt(0).toUpperCase() + n.slice(1)}
                </option>
              ))}
              <option value="custom" className="bg-[#0f1420] text-[#F2F5FF]">Custom industry</option>
            </select>
          </div>
          {nicheSelect === 'custom' && (
            <div>
              <Label className="text-[#F2F5FF] block mb-2">Custom industry name</Label>
              <Input
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                placeholder="e.g. System Design, Microservices"
                className="max-w-md bg-white/5 border-white/10 text-[#F2F5FF] text-base rounded-xl"
              />
              <p className="text-sm text-[#A7B1D8] mt-1">A Google News RSS feed will be created for this industry.</p>
            </div>
          )}
          <Button onClick={saveNiche} disabled={nicheSaving || (nicheSelect === 'custom' && !customIndustry.trim())} className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
            {nicheSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : nicheSaved ? <CheckCircle className="w-4 h-4 mr-2" /> : null}
            Save niche
          </Button>
          {nicheSaved && <span className="text-sm text-[#27C696] ml-2">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
