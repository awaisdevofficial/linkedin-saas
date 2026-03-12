import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const STEPS = 3;
const NICHES = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI'] as const;
const TONES = ['Professional', 'Conversational', 'Bold', 'Educational'] as const;
const FREQUENCIES = [
  { id: 'daily', label: 'Daily', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], time: '09:00' },
  { id: '3x', label: '3x/week', days: ['Monday', 'Wednesday', 'Friday'], time: '09:00' },
  { id: '2x', label: '2x/week', days: ['Tuesday', 'Thursday'], time: '09:00' },
  { id: 'weekly', label: 'Weekly', days: ['Monday'], time: '09:00' },
] as const;

function validateLiAt(raw: string): { value: string; error: string | null } {
  let value = raw.trim();
  if (!value) return { value: '', error: 'Paste the li_at cookie value.' };
  if (value.toLowerCase().startsWith('li_at=')) value = value.slice(6).trim();
  if (/[\s\r\n]/.test(value)) return { value: raw, error: 'Remove spaces and line breaks.' };
  if (value.length < 20) return { value: raw, error: 'Cookie value is too short. Copy the full value from DevTools.' };
  return { value, error: null };
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [liAt, setLiAt] = useState('');
  const [liAtError, setLiAtError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const [niche, setNiche] = useState<string>('tech');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [frequency, setFrequency] = useState<string>('3x');

  const handleStep1Next = async () => {
    const { value, error } = validateLiAt(liAt);
    if (error) {
      setLiAtError(error);
      return;
    }
    setLiAtError(null);
    setSaving(true);
    const { data: existing } = await supabase.from('linkedin_connections').select('id').eq('user_id', user?.id).maybeSingle();
    const payload = {
      user_id: user?.id,
      li_at_cookie: value,
      access_token: existing ? undefined : 'cookie-auth',
      person_urn: existing ? undefined : '',
      is_active: true,
      last_connected_at: new Date().toISOString(),
    };
    const { error: saveErr } = await supabase.from('linkedin_connections').upsert(payload as Record<string, unknown>, { onConflict: 'user_id' });
    setSaving(false);
    if (saveErr) {
      setLiAtError(saveErr.message);
      return;
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    if (!user?.id) return;
    setSaving(true);
    const nicheLower = niche.toLowerCase();
    await supabase.from('user_content_settings').upsert(
      {
        user_id: user.id,
        niche: nicheLower,
        target_audience: audience.trim() || null,
        post_tone: tone.toLowerCase(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    const freqConfig = FREQUENCIES.find((f) => f.id === frequency) ?? FREQUENCIES[1];
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of DAYS) {
      const enabled = freqConfig.days.includes(day);
      await supabase.from('schedules').upsert(
        {
          user_id: user.id,
          day,
          enabled,
          time_slots: enabled ? [freqConfig.time] : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,day' }
      );
    }
    setSaving(false);
    setStep(3);
  };

  const frequencyLabel = FREQUENCIES.find((f) => f.id === frequency)?.label ?? '3x/week';
  const nicheLabel = NICHES.find((n) => n.toLowerCase() === niche) ?? 'Tech';

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-[#A7B1D8] mb-2">
            <span>Step {step} of {STEPS}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#4F6DFF] rounded-full transition-all duration-300"
              style={{ width: `${(step / STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-white/10">
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold text-[#F2F5FF]">Connect your LinkedIn</h2>
              <p className="text-[#A7B1D8] mt-1 mb-6 text-sm">We use your LinkedIn session to post and engage on your behalf. Your cookie is stored securely.</p>
              <div className="space-y-2">
                <Label className="text-[#F2F5FF]">LinkedIn Cookie (li_at)</Label>
                <Input
                  type="password"
                  placeholder="Paste your li_at cookie here"
                  value={liAt}
                  onChange={(e) => { setLiAt(e.target.value); setLiAtError(null); }}
                  className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setHowToOpen(!howToOpen)}
                  className="flex items-center gap-2 text-sm text-[#4F6DFF] hover:underline"
                >
                  {howToOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  How to get this?
                </button>
                {howToOpen && (
                  <ol className="list-decimal list-inside text-sm text-[#A7B1D8] space-y-1 pl-2 border-l border-white/10">
                    <li>Open linkedin.com in your browser</li>
                    <li>Press F12 → Application → Cookies → www.linkedin.com</li>
                    <li>Find &quot;li_at&quot; → copy the value → paste here</li>
                  </ol>
                )}
                {liAtError && <p className="text-sm text-[#FF6B6B]">{liAtError}</p>}
              </div>
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-[#A7B1D8]">
                🔒 Your cookie is encrypted and stored securely. It&apos;s only used to post and engage on your behalf.
              </div>
              <Button
                onClick={handleStep1Next}
                disabled={saving || !liAt.trim()}
                className="w-full mt-6 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Next'}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold text-[#F2F5FF]">Tell us about yourself</h2>
              <p className="text-[#A7B1D8] mt-1 mb-6 text-sm">We&apos;ll use this to create posts that match your style and audience.</p>
              <div className="space-y-6">
                <div>
                  <Label className="text-[#F2F5FF] block mb-2">What&apos;s your niche?</Label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNiche(n.toLowerCase())}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          niche === n.toLowerCase() ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#F2F5FF] block mb-2">Who is your audience? (optional)</Label>
                  <Input
                    placeholder="e.g. founders, product managers, developers"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[#F2F5FF] block mb-2">Your tone</Label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t.toLowerCase())}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          tone === t.toLowerCase() ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#F2F5FF] block mb-2">How often to post?</Label>
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrequency(f.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          frequency === f.id ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 border-white/20 text-[#F2F5FF] rounded-xl" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleStep2Next} disabled={saving} className="flex-1 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Next'}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold text-[#F2F5FF]">You&apos;re all set</h2>
              <p className="text-[#A7B1D8] mt-1 mb-6 text-sm">We&apos;ll generate posts for you on your schedule. You can change these anytime in Settings.</p>
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="flex items-center gap-2 text-[#F2F5FF]"><CheckCircle className="w-5 h-5 text-[#27C696]" /> LinkedIn Connected</p>
                <p className="flex items-center gap-2 text-[#F2F5FF]"><CheckCircle className="w-5 h-5 text-[#27C696]" /> Niche: {nicheLabel}</p>
                <p className="flex items-center gap-2 text-[#F2F5FF]"><CheckCircle className="w-5 h-5 text-[#27C696]" /> Posting {frequencyLabel} starting Monday</p>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full mt-6 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl"
              >
                Go to Dashboard →
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
