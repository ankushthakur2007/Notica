import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { User, Palette, LogOut, Upload, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

const FONT_OPTIONS = [
  { label: 'Default (Inter)', value: 'font-inter' },
  { label: 'Roboto', value: 'font-roboto' },
  { label: 'Open Sans', value: 'font-opensans' },
  { label: 'Lato', value: 'font-lato' },
];

const SettingsDashboard = () => {
  const { user, signOut: signOutFromStore } = useAppStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>(() => localStorage.getItem('app-font') || 'font-inter');

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', user.id).single();
        if (error && error.code !== 'PGRST116') {
          showError('Failed to load profile data: ' + error.message);
        } else if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setAvatarUrl(data.avatar_url);
        }
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    FONT_OPTIONS.forEach(font => root.classList.remove(font.value));
    root.classList.add(selectedFont);
    localStorage.setItem('app-font', selectedFont);
  }, [selectedFont]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Error signing out: ' + error.message);
    } else {
      signOutFromStore();
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, first_name: firstName, last_name: lastName }, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Profile updated successfully!');
    } catch (error: any) {
      showError('Failed to update profile: ' + error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const filePath = `${user.id}/${user.id}.${file.name.split('.').pop()}`;
    setIsUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (publicUrl) {
        const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' });
        if (updateError) throw updateError;
        setAvatarUrl(publicUrl);
        showSuccess('Profile picture updated!');
      }
    } catch (error: any) {
      showError('Failed to upload avatar: ' + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto overflow-y-auto h-full animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-8 text-foreground">Settings</h1>
      
      <div className="space-y-6">
        {/* Profile Information Card */}
        <Card className="bg-card/50 dark:bg-gray-900/50 border border-white/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>Update your personal details and profile photo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-white/10">
                    <AvatarImage src={avatarUrl || undefined} alt="User Avatar" />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200"
                  >
                    {isUploadingAvatar ? (
                      <Upload className="h-6 w-6 text-white animate-pulse" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </label>
                  <Input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload} 
                    className="hidden" 
                    disabled={isUploadingAvatar} 
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">
                    Hover over the avatar and click to upload a new photo
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input 
                    id="first-name" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder="John"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input 
                    id="last-name" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    placeholder="Doe"
                    className="bg-background/50"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* App Appearance Card */}
        <Card className="bg-card/50 dark:bg-gray-900/50 border border-white/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">App Appearance</CardTitle>
                <CardDescription>Customize how Notica looks and feels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-white/5">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border border-white/5">
              <div className="space-y-1">
                <Label htmlFor="font-select" className="text-sm font-medium">Font Family</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred reading font</p>
              </div>
              <Select value={selectedFont} onValueChange={setSelectedFont}>
                <SelectTrigger id="font-select" className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions Card */}
        <Card className="bg-card/50 dark:bg-gray-900/50 border border-white/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Account Actions</CardTitle>
                <CardDescription>Manage your account session</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border border-white/5">
              <div className="space-y-1">
                <p className="text-sm font-medium">Log Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your Notica account</p>
              </div>
              <Button variant="destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-white/10 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Notica. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>"</span>
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default SettingsDashboard;