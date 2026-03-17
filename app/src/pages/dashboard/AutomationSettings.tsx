import { useState } from 'react';
import { Save, Clock, MessageSquare, Reply, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const niches = ['Tech', 'Marketing', 'Finance', 'Sales', 'HR', 'AI', 'Custom'];
const frequencies = ['Every day', '3x/week', '2x/week', 'Weekly'];
const speeds = ['Slow (safe)', 'Medium', 'Fast'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AutomationSettings = () => {
  const [postSettings, setPostSettings] = useState({
    interval: '6h',
    autoPublish: false,
    publishDelay: 'immediately',
    requireApproval: true,
    pauseGeneration: false,
    niche: 'Tech',
    customIndustry: '',
    frequency: '3x/week',
    randomTime: false,
  });

  const [engageSettings, setEngageSettings] = useState({
    autoLike: true,
    autoComment: false,
    commentPrompt: 'Write a short genuine LinkedIn comment that adds value to the conversation...',
    speed: 'Medium',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '09:00',
    endTime: '17:00',
    maxPerDay: 50,
  });

  const [replySettings, setReplySettings] = useState({
    autoReply: true,
    replyPrompt: 'Reply professionally and helpfully to this comment...',
  });

  const [replyToReplySettings, setReplyToReplySettings] = useState({
    enabled: false,
    prompt: 'Continue the conversation naturally...',
  });

  const handleSave = (section: string) => {
    // Simulate save
    alert(`${section} settings saved!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Automation Settings</h1>
        <p className="text-sm text-[#6B7098]">Configure how PostPilot automates your LinkedIn activity</p>
      </div>

      {/* Post Generation */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Generation Interval</Label>
              <select
                value={postSettings.interval}
                onChange={(e) => setPostSettings({ ...postSettings, interval: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#6B7098]/20 bg-white"
              >
                <option value="1h">Every 1 hour</option>
                <option value="6h">Every 6 hours</option>
                <option value="12h">Every 12 hours</option>
                <option value="24h">Every 24 hours</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Publish Delay</Label>
              <select
                value={postSettings.publishDelay}
                onChange={(e) => setPostSettings({ ...postSettings, publishDelay: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#6B7098]/20 bg-white"
              >
                <option value="immediately">Immediately</option>
                <option value="1h">1 hour</option>
                <option value="6h">6 hours</option>
                <option value="12h">12 hours</option>
                <option value="24h">24 hours</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={postSettings.autoPublish}
                onCheckedChange={(checked) => setPostSettings({ ...postSettings, autoPublish: checked })}
              />
              <Label className="text-sm">Auto-publish</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={postSettings.requireApproval}
                onCheckedChange={(checked) => setPostSettings({ ...postSettings, requireApproval: checked })}
              />
              <Label className="text-sm">Require approval</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={postSettings.pauseGeneration}
                onCheckedChange={(checked) => setPostSettings({ ...postSettings, pauseGeneration: checked })}
              />
              <Label className="text-sm">Pause generation</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={postSettings.randomTime}
                onCheckedChange={(checked) => setPostSettings({ ...postSettings, randomTime: checked })}
              />
              <Label className="text-sm">Post at random time</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Niche</Label>
            <div className="flex flex-wrap gap-2">
              {niches.map((niche) => (
                <button
                  key={niche}
                  onClick={() => setPostSettings({ ...postSettings, niche })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    postSettings.niche === niche
                      ? 'bg-[#2D5AF6] text-white'
                      : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
            {postSettings.niche === 'Custom' && (
              <Input
                value={postSettings.customIndustry}
                onChange={(e) => setPostSettings({ ...postSettings, customIndustry: e.target.value })}
                placeholder="Enter your industry..."
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-4">
            <Label>Posting Frequency</Label>
            <div className="flex flex-wrap gap-2">
              {frequencies.map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPostSettings({ ...postSettings, frequency: freq })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    postSettings.frequency === freq
                      ? 'bg-[#2D5AF6] text-white'
                      : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <Button 
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={() => handleSave('Post Generation')}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Post Generation
          </Button>
        </CardContent>
      </Card>

      {/* Engage Others */}
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
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={engageSettings.autoLike}
                onCheckedChange={(checked) => setEngageSettings({ ...engageSettings, autoLike: checked })}
              />
              <Label className="text-sm">Auto-like posts</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={engageSettings.autoComment}
                onCheckedChange={(checked) => setEngageSettings({ ...engageSettings, autoComment: checked })}
              />
              <Label className="text-sm">Auto-comment on posts</Label>
            </div>
          </div>

          {engageSettings.autoComment && (
            <div className="space-y-2">
              <Label>Comment Prompt</Label>
              <Textarea
                value={engageSettings.commentPrompt}
                onChange={(e) => setEngageSettings({ ...engageSettings, commentPrompt: e.target.value })}
                rows={3}
              />
            </div>
          )}

          <div className="space-y-4">
            <Label>Speed</Label>
            <div className="flex flex-wrap gap-2">
              {speeds.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setEngageSettings({ ...engageSettings, speed })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    engageSettings.speed === speed
                      ? 'bg-[#2D5AF6] text-white'
                      : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    const newDays = engageSettings.activeDays.includes(day)
                      ? engageSettings.activeDays.filter(d => d !== day)
                      : [...engageSettings.activeDays, day];
                    setEngageSettings({ ...engageSettings, activeDays: newDays });
                  }}
                  className={`w-12 h-10 rounded-lg text-sm font-medium transition-all ${
                    engageSettings.activeDays.includes(day)
                      ? 'bg-[#2D5AF6] text-white'
                      : 'bg-[#F6F8FC] text-[#6B7098] hover:bg-[#2D5AF6]/10'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={engageSettings.startTime}
                onChange={(e) => setEngageSettings({ ...engageSettings, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={engageSettings.endTime}
                onChange={(e) => setEngageSettings({ ...engageSettings, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max per day</Label>
              <Input
                type="number"
                value={engageSettings.maxPerDay}
                onChange={(e) => setEngageSettings({ ...engageSettings, maxPerDay: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Button 
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={() => handleSave('Engage Others')}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Engage Others
          </Button>
        </CardContent>
      </Card>

      {/* Reply to Comments */}
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
          <div className="flex items-center gap-3">
            <Switch
              checked={replySettings.autoReply}
              onCheckedChange={(checked) => setReplySettings({ ...replySettings, autoReply: checked })}
            />
            <Label className="text-sm">Auto-reply to comments</Label>
          </div>

          {replySettings.autoReply && (
            <div className="space-y-2">
              <Label>Reply Prompt</Label>
              <Textarea
                value={replySettings.replyPrompt}
                onChange={(e) => setReplySettings({ ...replySettings, replyPrompt: e.target.value })}
                rows={3}
              />
            </div>
          )}

          <Button 
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={() => handleSave('Reply to Comments')}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Reply Settings
          </Button>
        </CardContent>
      </Card>

      {/* Reply to Replies */}
      <Card className="card-shadow border-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Reply to Replies</CardTitle>
              <CardDescription>Continue conversations on reply threads</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={replyToReplySettings.enabled}
              onCheckedChange={(checked) => setReplyToReplySettings({ ...replyToReplySettings, enabled: checked })}
            />
            <Label className="text-sm">Reply to replies</Label>
          </div>

          {replyToReplySettings.enabled && (
            <div className="space-y-2">
              <Label>Reply-to-Reply Prompt</Label>
              <Textarea
                value={replyToReplySettings.prompt}
                onChange={(e) => setReplyToReplySettings({ ...replyToReplySettings, prompt: e.target.value })}
                rows={3}
              />
            </div>
          )}

          <Button 
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
            onClick={() => handleSave('Reply to Replies')}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Reply-to-Reply
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationSettings;
