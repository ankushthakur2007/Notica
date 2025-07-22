import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { User } from 'lucide-react';
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
    document.documentElement.className = selectedFont;
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
    <div className="p-6 w-full max-w-2xl mx-auto overflow-y-auto h-full flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <h1 className="text-4xl font-extrabold tracking-tight mb-6 text-foreground">Settings</h1>
      <Card className="mb-6 bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md">
        <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} alt="User Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground"><User className="h-10 w-10" /></AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer text-blue-600 hover:underline">
                  {isUploadingAvatar ? 'Uploading...' : 'Change Profile Photo'}
                </Label>
                <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
              </div>
            </div>
            <div>
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
            </div>
            <Button type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mb-6 bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md">
        <CardHeader><CardTitle>App Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <ThemeToggle />
          </div>
          <div>
            <Label htmlFor="font-select">Font Family</Label>
            <Select value={selectedFont} onValueChange={setSelectedFont}>
              <SelectTrigger id="font-select" className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-6 bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md">
        <CardHeader><CardTitle>Account Actions</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>Log Out</Button>
        </CardContent>
      </Card>
      <footer className="mt-auto pt-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Notica. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:underline">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default SettingsDashboard;