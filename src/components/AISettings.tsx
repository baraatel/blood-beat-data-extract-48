
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Key, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getAISettings, saveAISettings, testAPIKey } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState({
    provider: 'gemini' as const,
    apiKey: '',
    model: 'gemini-1.5-flash'
  });
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    const currentSettings = getAISettings();
    setSettings(currentSettings);
    if (currentSettings.apiKey) {
      setKeyStatus('unknown');
    }
  }, []);

  const handleTestAPIKey = async () => {
    if (!settings.apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive"
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const isValid = await testAPIKey(settings.apiKey);
      setKeyStatus(isValid ? 'valid' : 'invalid');
      
      toast({
        title: isValid ? "API Key Valid" : "API Key Invalid",
        description: isValid 
          ? "Your Gemini API key is working correctly." 
          : "The API key is invalid or has no access. Please check your key.",
        variant: isValid ? "default" : "destructive"
      });
    } catch (error) {
      setKeyStatus('invalid');
      toast({
        title: "Connection Error",
        description: "Could not test the API key. Please check your internet connection.",
        variant: "destructive"
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSave = () => {
    if (!settings.apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive"
      });
      return;
    }

    saveAISettings(settings);
    toast({
      title: "Settings Saved",
      description: "AI provider settings have been updated successfully.",
    });
  };

  const handleAPIKeyChange = (value: string) => {
    setSettings({...settings, apiKey: value});
    setKeyStatus('unknown');
  };

  const models = {
    gemini: [
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Recommended)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
    ]
  };

  const getKeyStatusIcon = () => {
    switch (keyStatus) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Selection */}
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-5 w-5 text-purple-600" />
              <Label className="text-purple-800 font-medium">AI Provider</Label>
            </div>
            <Select value={settings.provider} onValueChange={(value: 'gemini') => setSettings({...settings, provider: value})}>
              <SelectTrigger className="border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-5 w-5 text-indigo-600" />
              <Label className="text-indigo-800 font-medium">Model</Label>
            </div>
            <Select value={settings.model} onValueChange={(value) => setSettings({...settings, model: value})}>
              <SelectTrigger className="border-indigo-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models[settings.provider].map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* API Key */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Key className="h-5 w-5 text-green-600" />
            <Label className="text-green-800 font-medium">API Key</Label>
            {getKeyStatusIcon()}
          </div>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                type="password"
                value={settings.apiKey}
                onChange={(e) => handleAPIKeyChange(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="border-green-200 focus:border-green-400 flex-1"
              />
              <Button
                onClick={handleTestAPIKey}
                disabled={isTestingKey || !settings.apiKey.trim()}
                variant="outline"
                className="border-green-200 text-green-600 hover:bg-green-50"
              >
                {isTestingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            <p className="text-xs text-green-700">
              Get your free API key from Google AI Studio: 
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1 hover:text-green-800"
              >
                https://aistudio.google.com/app/apikey
              </a>
            </p>
            {keyStatus === 'invalid' && (
              <p className="text-xs text-red-600">
                ⚠️ API key is invalid or has exceeded quota limits. Please check your key and usage.
              </p>
            )}
            {keyStatus === 'valid' && (
              <p className="text-xs text-green-600">
                ✅ API key is valid and ready to use.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Usage Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 Tips for Better Results:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure images are clear and well-lit</li>
            <li>• The LCD display should be fully visible</li>
            <li>• Avoid reflections or shadows on the screen</li>
            <li>• Multiple images can be processed at once</li>
            <li>• API quota: 50 requests per day for free tier</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISettings;
