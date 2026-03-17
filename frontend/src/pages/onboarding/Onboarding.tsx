import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PostoraLogo } from '@/components/PostoraLogo';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const niches = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI'];
const nicheMap: Record<string, string> = {
  Tech: 'tech',
  Marketing: 'marketing',
  Finance: 'finance',
  Sales: 'sales',
  HR: 'hr',
  AI: 'ai',
};
const tones = ['Professional', 'Conversational', 'Bold', 'Educational'];
const toneMap: Record<string, string> = {
  Professional: 'professional',
  Conversational: 'conversational',
  Bold: 'bold',
  Educational: 'educational',
};
const frequencies = ['Daily', '3x/week', '2x/week', 'Weekly'];
const dayMap: Record<string, string[]> = {
  Daily: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  '3x/week': ['Monday', 'Wednesday', 'Friday'],
  '2x/week': ['Tuesday', 'Thursday'],
  Weekly: ['Wednesday'],
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const welcomeShown = useRef(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    niche: '',
    audience: '',
    tone: '',
    frequency: '',
  });

  useEffect(() => {
    if (welcomeShown.current) return;
    if (searchParams.get('welcome_trial') !== '1') return;
    welcomeShown.current = true;
    toast.success('Your 3-day free trial has started!');
    const next = new URLSearchParams(searchParams);
    next.delete('welcome_trial');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleNext = async () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      if (!supabase || !user) {
        setError('Not authenticated');
        return;
      }
      const userId = user.id;

      const niche = formData.niche ? (nicheMap[formData.niche] || 'tech') : 'tech';
      const postTone = formData.tone ? (toneMap[formData.tone] || 'professional') : 'professional';
      await supabase.from('user_content_settings').upsert(
        {
          user_id: userId,
          niche,
          post_tone: postTone,
          target_audience: formData.audience.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      const days = formData.frequency ? dayMap[formData.frequency] || dayMap['3x/week'] : dayMap['3x/week'];
      await supabase.from('schedules').delete().eq('user_id', userId);
      for (const day of days) {
        await supabase.from('schedules').insert({
          user_id: userId,
          day,
          time_slots: ['09:00', '12:00', '18:00'],
          enabled: true,
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /** Skip onboarding: save minimal defaults so user is marked as onboarded, then go to dashboard. */
  const handleSkip = async () => {
    if (!supabase || !user) return;
    setError(null);
    setIsLoading(true);
    try {
      const userId = user.id;
      await supabase.from('user_content_settings').upsert(
        {
          user_id: userId,
          niche: 'tech',
          post_tone: 'professional',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      const days = ['Monday', 'Wednesday', 'Friday'];
      await supabase.from('schedules').delete().eq('user_id', userId);
      for (const day of days) {
        await supabase.from('schedules').insert({
          user_id: userId,
          day,
          time_slots: ['09:00', '12:00', '18:00'],
          enabled: true,
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not skip');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 2) * 100;

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col overflow-x-hidden">
      <header className="bg-white border-b border-[#6B7098]/10 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2">
              <PostoraLogo variant="horizontal" showTagline={false} size="sm" />
            </Link>
            <span className="text-sm text-[#6B7098]">Step {currentStep} of 2</span>
          </div>
          <Progress value={progress} className="h-2 bg-[#F6F8FC]" />
        </div>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-xl">
          {currentStep === 1 && (
            <div className="bg-white rounded-[28px] p-8 card-shadow">
              <h1 className="text-2xl font-bold text-[#10153E] mb-2">Tell us about yourself</h1>
              <p className="text-[#6B7098] mb-8">This helps us create content that matches your style.</p>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[#10153E]">What&apos;s your niche?</Label>
                  <div className="flex flex-wrap gap-2">
                    {niches.map((niche) => (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => setFormData({ ...formData, niche })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.niche === niche
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#6366F1]/10'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience" className="text-[#10153E]">Target audience (optional)</Label>
                  <Input
                    id="audience"
                    type="text"
                    placeholder="e.g., SaaS founders, marketers, engineers"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#6366F1] focus:ring-[#6366F1]/20"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[#10153E]">Preferred tone</Label>
                  <div className="flex flex-wrap gap-2">
                    {tones.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setFormData({ ...formData, tone })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.tone === tone
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#6366F1]/10'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[#10153E]">Posting frequency</Label>
                  <div className="flex flex-wrap gap-2">
                    {frequencies.map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: freq })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.frequency === freq
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#6366F1]/10'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white rounded-[28px] p-8 card-shadow text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-[#10153E] mb-2">You&apos;re all set!</h1>
              <p className="text-[#6B7098] mb-8">Here&apos;s a summary of your setup:</p>

              <div className="bg-[#F6F8FC] rounded-2xl p-6 text-left space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7098]">LinkedIn</span>
                  <span className="text-[#10153E] font-medium">Connect in Settings</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7098]">Niche</span>
                  <span className="text-[#10153E] font-medium">{formData.niche || 'Tech'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7098]">Posting</span>
                  <span className="text-[#10153E] font-medium">{formData.frequency || '3x/week'}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-[#6B7098] hover:text-[#10153E]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-[#6B7098] hover:text-[#10153E]"
                onClick={handleSkip}
                disabled={isLoading}
              >
                I&apos;ll do this later
              </Button>
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-full px-8 h-12"
              >
                {isLoading ? 'Loading...' : currentStep === 2 ? 'Go to Dashboard' : 'Next'}
                {currentStep < 3 && !isLoading && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
