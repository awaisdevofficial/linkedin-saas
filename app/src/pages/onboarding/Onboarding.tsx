import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

const niches = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI'];
const tones = ['Professional', 'Conversational', 'Bold', 'Educational'];
const frequencies = ['Daily', '3x/week', '2x/week', 'Weekly'];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [showCookie, setShowCookie] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    liAtCookie: '',
    niche: '',
    audience: '',
    tone: '',
    frequency: '',
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setIsLoading(true);
      setTimeout(() => {
        const auth = JSON.parse(localStorage.getItem('postpilot_auth') || '{}');
        localStorage.setItem('postpilot_auth', JSON.stringify({
          ...auth,
          onboardingComplete: true,
        }));
        navigate('/dashboard');
      }, 1000);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#6B7098]/10 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
                <span className="text-white font-bold text-sm">PP</span>
              </div>
              <span className="font-semibold text-[#10153E]">PostPilot</span>
            </div>
            <span className="text-sm text-[#6B7098]">
              Step {currentStep} of 3
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-[#F6F8FC]" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Step 1: Connect LinkedIn */}
          {currentStep === 1 && (
            <div className="bg-white rounded-[28px] p-8 card-shadow">
              <h1 className="text-2xl font-bold text-[#10153E] mb-2">
                Connect your LinkedIn
              </h1>
              <p className="text-[#6B7098] mb-8">
                We use your LinkedIn session to post and engage on your behalf.
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="liAt" className="text-[#10153E]">LinkedIn Cookie (li_at)</Label>
                    <button
                      type="button"
                      onClick={() => setShowCookieHelp(!showCookieHelp)}
                      className="text-xs text-[#2D5AF6] flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      How to get this?
                    </button>
                  </div>
                  
                  {showCookieHelp && (
                    <div className="bg-[#F6F8FC] rounded-xl p-4 text-sm text-[#6B7098] space-y-2">
                      <p className="font-medium text-[#10153E]">To find your li_at cookie:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open linkedin.com in your browser</li>
                        <li>Press F12 → Application → Cookies</li>
                        <li>Find "li_at" and copy the value</li>
                      </ol>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      id="liAt"
                      type={showCookie ? 'text' : 'password'}
                      placeholder="Paste your li_at cookie here"
                      value={formData.liAtCookie}
                      onChange={(e) => setFormData({ ...formData, liAtCookie: e.target.value })}
                      className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pr-12 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCookie(!showCookie)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7098] hover:text-[#10153E]"
                    >
                      {showCookie ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#6B7098]">
                    Your cookie is encrypted and stored securely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tell us about yourself */}
          {currentStep === 2 && (
            <div className="bg-white rounded-[28px] p-8 card-shadow">
              <h1 className="text-2xl font-bold text-[#10153E] mb-2">
                Tell us about yourself
              </h1>
              <p className="text-[#6B7098] mb-8">
                This helps us create content that matches your style.
              </p>

              <div className="space-y-6">
                {/* Niche */}
                <div className="space-y-3">
                  <Label className="text-[#10153E]">What's your niche?</Label>
                  <div className="flex flex-wrap gap-2">
                    {niches.map((niche) => (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => setFormData({ ...formData, niche })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.niche === niche
                            ? 'bg-[#2D5AF6] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience */}
                <div className="space-y-2">
                  <Label htmlFor="audience" className="text-[#10153E]">Target audience (optional)</Label>
                  <Input
                    id="audience"
                    type="text"
                    placeholder="e.g., SaaS founders, marketers, engineers"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20"
                  />
                </div>

                {/* Tone */}
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
                            ? 'bg-[#2D5AF6] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
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
                            ? 'bg-[#2D5AF6] text-white'
                            : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
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

          {/* Step 3: You're all set */}
          {currentStep === 3 && (
            <div className="bg-white rounded-[28px] p-8 card-shadow text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-[#10153E] mb-2">
                You're all set!
              </h1>
              <p className="text-[#6B7098] mb-8">
                Here's a summary of your setup:
              </p>

              <div className="bg-[#F6F8FC] rounded-2xl p-6 text-left space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7098]">LinkedIn</span>
                  <span className="flex items-center gap-2 text-[#27C696] font-medium">
                    <Check className="w-4 h-4" /> Connected
                  </span>
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

          {/* Navigation Buttons */}
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

            <Button
              onClick={handleNext}
              disabled={isLoading || (currentStep === 1 && !formData.liAtCookie)}
              className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full px-8 h-12"
            >
              {isLoading ? (
                'Loading...'
              ) : currentStep === 3 ? (
                'Go to Dashboard'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
