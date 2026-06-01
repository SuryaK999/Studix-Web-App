import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Volume2, Bell, ShieldAlert, Check, Loader2, 
  LogOut, X, Palette, Camera, Smile, Sparkles,
  ChevronRight, Laptop, Moon, Sun, Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchUserProfile, updateUserProfile, checkUsernameAvailability } from '@/services/api';
import { toast } from 'sonner';
import { Tip } from '@/components/ui/tip';
import { cn } from '@/lib/utils';
import { updateProfile, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSocket } from '@/hooks/useSocket';
import { storageService } from '@/lib/storage/storageService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { useStudyRoomTheme } from '@/hooks/useStudyRoomTheme';

const MotionButton = motion(Button);

export function UserSettings({ open, onOpenChange, roomId }) {
  const { user } = useAuth();
  const { socket } = useSocket(roomId || '');
  const [activeSection, setActiveSection] = useState('my_account');
  const [profile, setProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [prefFeedback, setPrefFeedback] = useState(null);

  const triggerPrefFeedback = (id) => {
    setPrefFeedback(id);
    setTimeout(() => setPrefFeedback(null), 1000);
  };

  const [preferences, setPreferences] = useState({
    micDefault: true,
    autoJoinVoice: false,
    mentions: true,
    dmOnly: false,
    anyoneMessage: true,
    anyoneInvite: true,
    fontSize: 'medium',
    compactMode: false
  });
  
  const { theme: globalTheme, setTheme: setGlobalTheme } = useGlobalTheme();

  let roomThemeCtrl = null;
  try {
    
    roomThemeCtrl = useStudyRoomTheme();
  } catch {
    
  }
  
  const activeRoomTheme = roomThemeCtrl?.roomTheme;
  const setRoomTheme = roomThemeCtrl?.setRoomTheme;
  const resolvedActiveTheme = roomId ? activeRoomTheme || globalTheme : globalTheme;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open && user) {
      loadProfile();
      
      const cached = localStorage.getItem('studix_prefs');
      if (cached) {
        const parsed = JSON.parse(cached);
        setPreferences({
          ...preferences,
          ...parsed
        });
      }
    }
  }, [open, user]);

  async function savePrefs(newPrefs) {
    setPreferences(newPrefs);
    localStorage.setItem('studix_prefs', JSON.stringify(newPrefs));
  }

  const handleSetTheme = (newTheme) => {
    
    if (roomId && setRoomTheme) {
      if (activeRoomTheme === newTheme) {
        
        setRoomTheme(null);
      } else {
        setRoomTheme(newTheme);
      }
    } else {
      setGlobalTheme(newTheme);
    }
  };

  async function loadProfile() {
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setDisplayName(data.displayName || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setStatusText(data.status || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile settings');
    }
  }

  const handleUsernameChange = async (val) => {
    const normalized = val.toLowerCase().trim();
    setUsername(normalized);
    if (normalized === profile?.username) {
      setUsernameStatus('available');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setUsernameStatus(normalized.length > 0 ? 'invalid' : 'idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      const { available } = await checkUsernameAvailability(normalized);
      setUsernameStatus(available ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  };

  async function handleSaveProfile() {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      toast.error('Please fix the username errors');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateUserProfile({ displayName, username, bio, status: statusText });
      if (auth.currentUser && displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      setProfile(updated);
      toast.success('Profile updated successfully');
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updated }));
      if (socket && roomId) {
        socket.emit('presence:profile_update', { roomId, updates: { displayName: updated.displayName, username: updated.username } });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
      if (usernameStatus === 'available' || usernameStatus === 'idle') {
        setTimeout(() => setProfileSuccess(true), 100);
        setTimeout(() => setProfileSuccess(false), 2000);
      }
    }
  }

  async function handleAvatarUpload(file) {
    if (!file || file.size === 0) {
      toast.error('Selected file is empty.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfile(prev => prev ? { ...prev, photoURL: previewUrl } : null);

    setIsSaving(true);
    try {
      const { url } = await storageService.uploadFile(file, { folder: 'avatars' });
      
      const cacheBustedUrl = `${url}?t=${Date.now()}`;
      const updated = await updateUserProfile({ photoURL: cacheBustedUrl });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: cacheBustedUrl });
      }
      setProfile(updated);
      toast.success('Profile picture updated');
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: { ...updated, photoURL: cacheBustedUrl } }));
    } catch (error) {
      
      setProfile(prev => prev ? { ...prev, photoURL: profile?.photoURL || null } : null);
      toast.error(error.message || 'Upload failed');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsSaving(false);
    }
  }

const eliteSpring = { type: 'spring', stiffness: 400, damping: 40 };
const mechTap = { scale: 0.96 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 40 }
  }
};

const sections = [
  { id: 'my_account', label: 'My Account', icon: User, category: 'USER SETTINGS' },
  { id: 'profile', label: 'Profile Customization', icon: Palette },
  { id: 'study', label: 'Study Preferences', icon: Info, category: 'APP SETTINGS' },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
  { id: 'devices', label: 'Devices', icon: Volume2 },
  { id: 'logout', label: 'Log Out', icon: LogOut, danger: true },
];

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background flex overflow-hidden"
        >
          {}
          <aside className="w-[280px] bg-sidebar/80 backdrop-blur-xl border-r border-border flex flex-col pt-16 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/5 blur-[120px] pointer-events-none" />
            
            <div className="px-6 pb-20 overflow-y-auto no-scrollbar relative z-10 scroll-smooth">
              <div className="space-y-6">
                {(['USER SETTINGS', 'APP SETTINGS']).map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="px-4 mb-4 text-[10px] font-black text-[#8E9297] uppercase tracking-[0.2em] opacity-30">
                      {category}
                    </h4>
                    {sections.filter(s => s.category === category || (!s.category && category === 'USER SETTINGS' && s.id !== 'logout')).map((section) => (
                      <motion.button
                        key={section.id}
                        whileHover={{ x: 4 }}
                        whileTap={mechTap}
                        onClick={() => {
                          if (section.id === 'logout') handleLogout();
                          else setActiveSection(section.id);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                          activeSection === section.id 
                            ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(113,72,235,0.05)]" 
                            : section.danger 
                              ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                              : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        )}
                      >
                        {activeSection === section.id && (
                          <>
                            <motion.div 
                              layoutId="active-pill"
                              className="absolute left-0 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_15px_rgba(113,72,235,0.5)]" 
                              transition={eliteSpring}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                          </>
                        )}
                        <span className={cn("text-[13.5px] font-bold tracking-tight transition-colors", 
                          activeSection === section.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {section.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                ))}

                {}
                <div className="pt-4 border-t border-border">
                  {sections.filter(s => s.id === 'logout').map(section => (
                    <AlertDialog key={section.id}>
                      <AlertDialogTrigger asChild>
                        <motion.button
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
                        >
                          <LogOut className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                          <span className="text-[13.5px] font-bold tracking-tight">Log Out</span>
                        </motion.button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-background/95 backdrop-blur-xl border border-white/10 dark:border-white/10 shadow-2xl z-[150]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">Are you sure you want to log out?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground text-sm">
                            You will need to sign back in to access your study rooms and collaborate with peers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                          <AlertDialogCancel className="border-border hover:bg-secondary/50">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all border-0">
                            Yes, log out
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {}
          <main className="flex-1 bg-card relative flex flex-col">
            <motion.button 
              whileTap={mechTap}
              onClick={() => onOpenChange(false)}
              className="absolute right-12 top-16 flex flex-col items-center gap-2 z-50 group"
            >
              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] hover:border-border/60 transition-all">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30 group-hover:opacity-100 transition-opacity">ESC</span>
            </motion.button>

            <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden relative">
              {}
              <div className="sticky top-0 z-40 px-12 pt-16 pb-4 bg-card/90 backdrop-blur-md flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <span className="opacity-40">Settings</span>
                <ChevronRight className="w-3 h-3 opacity-20" />
                <span className="text-foreground">{sections.find(s => s.id === activeSection)?.label}</span>
              </div>

              <div className="max-w-[740px] px-12 py-6 pb-32 space-y-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, scale: 0.995, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.005, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="w-full"
                  >
                    {activeSection === 'my_account' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                         <motion.div variants={itemVariants}>
                          <h2 className="text-2xl font-black text-foreground mb-8 tracking-tight">My Account</h2>
                          <div className="bg-secondary/20 rounded-2xl border border-border shadow-2xl overflow-hidden group/card shadow-black/40">
                             {}
                             <div className="h-28 bg-gradient-to-r from-[#7148EB] to-[#9455FF] relative">
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  className="absolute inset-0 bg-black/20 backdrop-blur-[1px] cursor-pointer flex items-center justify-center transition-opacity z-10"
                                >
                                   <div className="flex flex-col items-center gap-1.5 translate-y-[-10px]">
                                     <Camera className="w-6 h-6 text-white" />
                                     <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Change Banner</span>
                                   </div>
                                </motion.div>
                             </div>
                             
                             <div className="relative px-6 pb-6 mt-[-45px] z-20">
                               <div className="flex items-end justify-between">
                                  <div className="relative group/avatar">
                                    <Avatar className="w-24 h-24 rounded-full ring-[8px] ring-background shadow-2xl relative overflow-hidden transition-all duration-300 group-hover/avatar:scale-105">
                                      <AvatarImage src={profile?.photoURL || undefined} className="object-cover" />
                                      <AvatarFallback className="bg-secondary text-3xl font-black text-foreground/40">
                                        {displayName[0] || '?'}
                                      </AvatarFallback>
                                      <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all duration-300">
                                        <Camera className="w-5 h-5 text-white mb-1" />
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleAvatarUpload(file);
                                          }}
                                        />
                                      </label>
                                    </Avatar>
                                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#22C55E] border-4 border-[#1C1D24] rounded-full shadow-lg" />
                                  </div>

                                  <MotionButton 
                                    size="sm" 
                                    whileTap={mechTap}
                                    onClick={() => setActiveSection('profile')}
                                    className="bg-primary hover:bg-primary/90 text-white font-black h-10 px-8 rounded-xl shadow-[0_8px_20px_rgba(113,72,235,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0"
                                  >
                                    Edit User Profile
                                  </MotionButton>
                               </div>

                               <div className="mt-5 space-y-1">
                                 <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                                   {displayName}
                                 </h3>
                                 <p className="text-[#B5BAC1] font-bold text-sm tracking-tight opacity-60 uppercase">@{username || 'anonymous_user'}</p>
                               </div>
                             </div>

                             <div className="mx-6 mb-6 p-5 rounded-2xl bg-background/40 border border-border space-y-6">
                               <div className="flex justify-between items-center group/field">
                                 <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Username</label>
                                   <p className="text-[15px] font-bold text-foreground/90 tracking-tight">{username || 'No username set'}</p>
                                 </div>
                                 <Button 
                                   variant="secondary" 
                                   size="sm" 
                                   onClick={() => setActiveSection('profile')}
                                   className="h-8 bg-foreground/[0.03] hover:bg-foreground/[0.08] border-border text-[10px] font-black uppercase tracking-widest px-4 rounded-lg text-foreground"
                                 >
                                   Edit
                                 </Button>
                               </div>
                               <div className="flex justify-between items-center group/field border-t border-border pt-6">
                                   <div className="space-y-1.5">
                                     <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Email</label>
                                     <p className="text-[15px] font-bold text-foreground/90 tracking-tight">{user?.email}</p>
                                   </div>
                                   <Tip label="Email cannot be changed directly." side="left">
                                     <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-foreground/5 transition-colors cursor-help">
                                       <Info className="w-4 h-4 text-muted-foreground/60" />
                                     </div>
                                   </Tip>
                               </div>
                             </div>
                          </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6 pt-4">
                           <h3 className="text-xl font-black text-foreground tracking-tight px-1 flex items-center gap-2">
                             Security & Access
                             <div className="h-px flex-1 bg-gradient-to-r from-foreground/10 to-transparent ml-2" />
                           </h3>
                           <div className="bg-secondary/20 p-6 rounded-2xl border border-border flex items-center justify-between group cursor-pointer hover:bg-secondary/30 transition-all hover:scale-[1.01] hover:shadow-xl shadow-black/10">
                             <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                                   <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="font-black text-foreground text-lg tracking-tight">Password</p>
                                   <p className="text-sm font-medium text-muted-foreground">Secure your account with a strong password.</p>
                                </div>
                             </div>
                             <Button variant="secondary" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-black px-8 h-11 rounded-xl shadow-lg shadow-[#5865F2]/20">Update</Button>
                           </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'profile' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Profile Customization</h2>
                            <p className="text-[#8E9297] text-sm mt-1">Manage your identity and how others see you across Studix.</p>
                          </header>
                        </motion.div>
                        
                        <motion.div variants={itemVariants} className="bg-[#1C1D24] p-8 rounded-2xl border border-white/5 space-y-8 shadow-xl shadow-black/20">
                           <div className="grid gap-3">
                             <Label className="text-[#8E9297] uppercase text-[10px] font-black tracking-widest pl-1">Display Name</Label>
                             <Input 
                               value={displayName} 
                               onChange={(e) => setDisplayName(e.target.value)}
                               className="bg-background border-border h-12 px-5 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-foreground/90 placeholder:text-foreground/20 rounded-xl"
                               placeholder="What should we call you?"
                             />
                           </div>
                           
                           <div className="grid gap-3">
                             <Label className="text-[#8E9297] uppercase text-[10px] font-black tracking-widest pl-1">Username</Label>
                             <div className="relative group/input">
                               <Input 
                                 value={username} 
                                 onChange={(e) => handleUsernameChange(e.target.value)}
                                 className={cn(
                                   "bg-background border-border h-12 pl-5 pr-12 focus:ring-primary/20 focus:border-primary/30 transition-all font-mono font-bold text-primary rounded-xl",
                                   usernameStatus === 'available' && "border-green-500/30 bg-green-500/[0.02]",
                                   usernameStatus === 'taken' && "border-red-500/30 bg-red-500/[0.02]"
                                 )}
                                 placeholder="username_here"
                               />
                               <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                 {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 animate-spin text-primary/50" />}
                                 {usernameStatus === 'available' && <Check className="w-5 h-5 text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />}
                                 {usernameStatus === 'taken' && <X className="w-5 h-5 text-red-500/80" />}
                               </div>
                               {usernameStatus === 'taken' && (
                                 <motion.p 
                                   initial={{ opacity: 0, y: -5 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   className="text-[11px] text-red-400 mt-2 font-bold pl-1 flex items-center gap-1.5"
                                 >
                                   <ShieldAlert className="w-3.5 h-3.5" /> This username is already taken.
                                 </motion.p>
                               )}
                             </div>
                           </div>

                           <div className="grid gap-3">
                             <Label className="text-[#8E9297] uppercase text-[10px] font-black tracking-widest pl-1">Custom Status</Label>
                             <div className="relative group/status">
                               <Input 
                                 value={statusText} 
                                 onChange={(e) => setStatusText(e.target.value)}
                                 placeholder="What's on your mind?"
                                 className="bg-background border-border h-12 pl-12 pr-5 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-foreground/90 placeholder:text-foreground/20 rounded-xl"
                               />
                               <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground group-focus-within/status:text-primary transition-colors">
                                 <Smile className="w-4 h-4" />
                               </div>
                             </div>
                             <p className="text-[11px] text-[#4F545C] font-bold pl-1 italic opacity-80">Visible to everyone in your study rooms.</p>
                           </div>

                           <div className="grid gap-4">
                             <Label className="text-[#8E9297] uppercase text-[10px] font-black tracking-[0.2em] pl-1 opacity-40">About Me (Bio)</Label>
                             <textarea 
                               value={bio}
                               onChange={(e) => setBio(e.target.value)}
                               className="w-full bg-background border border-border rounded-2xl h-32 p-5 text-[14px] font-bold text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none placeholder:text-foreground/10 shadow-inner"
                               placeholder="Share something about your study journey..."
                             />
                           </div>

                           <motion.div variants={itemVariants} className="pt-6 flex justify-end gap-3">
                             <Button variant="ghost" onClick={loadProfile} className="text-[#8E9297] hover:text-white font-black uppercase tracking-[0.15em] text-[10px] h-11 px-6 rounded-xl">Discard Changes</Button>
                             <MotionButton 
                               onClick={handleSaveProfile} 
                               disabled={isSaving}
                               whileTap={mechTap}
                               className={cn(
                                 "min-w-[160px] font-black px-10 h-11 rounded-xl shadow-[0_8px_20px_rgba(113,72,235,0.2)] flex items-center justify-center gap-2.5 transition-all hover:translate-y-[-2px] active:translate-y-0",
                                 profileSuccess ? "bg-green-500 hover:bg-green-500 text-white shadow-green-500/20" : "bg-primary hover:bg-primary/90 text-white"
                               )}
                             >
                               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                               {profileSuccess ? 'Profile Saved' : 'Save Changes'}
                             </MotionButton>
                           </motion.div>
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'study' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Study Preferences</h2>
                            <p className="text-[#8E9297] text-sm mt-1">Customize how you interact with study rooms and voice channels.</p>
                          </header>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6 bg-secondary/20 p-8 rounded-2xl border border-border shadow-xl shadow-black/20">
                           {[
                             { id: 'micDefault', label: 'Microphone Default On', desc: 'Start in rooms with your mic active automatically.', icon: Volume2 },
                             { id: 'autoJoinVoice', label: 'Auto-join Voice', desc: 'Automatically connect to voice when entering a room.', icon: Check }
                           ].map((item, idx) => (
                             <div key={item.id} className="space-y-6">
                               {idx > 0 && <Separator className="bg-border/40" />}
                               <div className="flex items-center justify-between group py-2">
                                 <div className="flex items-center gap-5">
                                   <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/60 group-hover:text-primary transition-all">
                                      <item.icon className="w-5 h-5" />
                                   </div>
                                   <div className="space-y-0.5">
                                     <Label className="text-[15px] font-black text-foreground group-hover:text-primary transition-colors cursor-pointer">{item.label}</Label>
                                     <p className="text-[13px] font-medium text-muted-foreground opacity-60 leading-tight">{item.desc}</p>
                                   </div>
                                 </div>
                                 <div className="relative">
                                   <Switch 
                                     checked={(preferences)[item.id]} 
                                     onCheckedChange={v => {
                                       savePrefs({...preferences, [item.id]: v});
                                       triggerPrefFeedback(item.id);
                                     }}
                                     className="data-[state=checked]:bg-primary shadow-[0_0_15px_rgba(113,72,235,0.2)] scale-110"
                                   />
                                   <AnimatePresence>
                                     {prefFeedback === item.id && (
                                       <motion.div 
                                         initial={{ scale: 0.8, opacity: 0 }}
                                         animate={{ scale: 1.5, opacity: 1 }}
                                         exit={{ scale: 2, opacity: 0 }}
                                         className="absolute inset-0 bg-primary/20 rounded-full filter blur-md pointer-events-none"
                                       />
                                     )}
                                   </AnimatePresence>
                                 </div>
                               </div>
                             </div>
                           ))}
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'notifications' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Notifications</h2>
                            <p className="text-[#8E9297] text-sm mt-1">Control how Studix communicates with you.</p>
                          </header>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6 bg-secondary/20 p-8 rounded-2xl border border-border shadow-xl shadow-black/20">
                           {[
                             { id: 'mentions', label: '@Room Mentions', desc: 'Get notified when someone pings the room.', icon: Bell },
                             { id: 'dmOnly', label: 'Direct Message Alerts', desc: 'Show desktop notifications for new messages.', icon: Sparkles }
                           ].map((item, idx) => (
                             <div key={item.id} className="space-y-6">
                               {idx > 0 && <Separator className="bg-border/40" />}
                               <div className="flex items-center justify-between group py-2">
                                 <div className="flex items-center gap-5">
                                   <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/60 group-hover:text-primary transition-all">
                                      <item.icon className="w-5 h-5" />
                                   </div>
                                   <div className="space-y-0.5">
                                     <Label className="text-[15px] font-black text-foreground group-hover:text-primary transition-colors cursor-pointer">{item.label}</Label>
                                     <p className="text-[13px] font-medium text-muted-foreground opacity-60 leading-tight">{item.desc}</p>
                                   </div>
                                 </div>
                                 <div className="relative">
                                   <Switch 
                                     checked={(preferences)[item.id]} 
                                     onCheckedChange={v => {
                                       savePrefs({...preferences, [item.id]: v});
                                       triggerPrefFeedback(item.id);
                                     }}
                                     className="data-[state=checked]:bg-primary shadow-[0_0_15px_rgba(113,72,235,0.2)] scale-110"
                                   />
                                   <AnimatePresence>
                                     {prefFeedback === item.id && (
                                       <motion.div 
                                         initial={{ scale: 0.8, opacity: 0 }}
                                         animate={{ scale: 1.5, opacity: 1 }}
                                         exit={{ scale: 2, opacity: 0 }}
                                         className="absolute inset-0 bg-primary/20 rounded-full filter blur-md pointer-events-none"
                                       />
                                     )}
                                   </AnimatePresence>
                                 </div>
                               </div>
                             </div>
                           ))}
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'privacy' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Privacy & Safety</h2>
                            <p className="text-[#8E9297] text-sm mt-1">Keep your study sessions secure and private.</p>
                          </header>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-6 bg-secondary/20 p-8 rounded-2xl border border-border shadow-xl shadow-black/20">
                           {[
                             { id: 'anyoneMessage', label: 'Allow Messages from Anyone', desc: 'Let any study room member message you directly.', icon: Shield },
                             { id: 'anyoneInvite', label: 'Room Invite Permissions', desc: 'Allow others to invite you to private study sessions.', icon: User }
                           ].map((item, idx) => (
                             <div key={item.id} className="space-y-6">
                               {idx > 0 && <Separator className="bg-border/40" />}
                               <div className="flex items-center justify-between group py-2">
                                 <div className="flex items-center gap-5">
                                   <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/60 group-hover:text-primary transition-all">
                                      <item.icon className="w-5 h-5" />
                                   </div>
                                   <div className="space-y-0.5">
                                     <Label className="text-[15px] font-black text-foreground group-hover:text-primary transition-colors cursor-pointer">{item.label}</Label>
                                     <p className="text-[13px] font-medium text-muted-foreground opacity-60 leading-tight">{item.desc}</p>
                                   </div>
                                 </div>
                                 <div className="relative">
                                   <Switch 
                                     checked={(preferences)[item.id]} 
                                     onCheckedChange={v => {
                                       savePrefs({...preferences, [item.id]: v});
                                       triggerPrefFeedback(item.id);
                                     }}
                                     className="data-[state=checked]:bg-primary shadow-[0_0_15px_rgba(113,72,235,0.2)] scale-110"
                                   />
                                   <AnimatePresence>
                                     {prefFeedback === item.id && (
                                       <motion.div 
                                         initial={{ scale: 0.8, opacity: 0 }}
                                         animate={{ scale: 1.5, opacity: 1 }}
                                         exit={{ scale: 2, opacity: 0 }}
                                         className="absolute inset-0 bg-primary/20 rounded-full filter blur-md pointer-events-none"
                                       />
                                     )}
                                   </AnimatePresence>
                                 </div>
                               </div>
                             </div>
                           ))}
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'appearance' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Appearance</h2>
                            <p className="text-[#8E9297] text-sm mt-1">
                              {roomId ? "Change your study room's theme and personalize your local workspace." : "Personalize the look and feel of your workspace."}
                            </p>
                          </header>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-secondary/20 p-8 rounded-2xl border border-border space-y-12 shadow-xl shadow-black/20">
                             <div className="space-y-6">
                               <Label className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em] mb-6 block opacity-40">Theme Hierarchy</Label>
                               <div className="grid grid-cols-3 gap-5">
                                 {[
                                   { id: 'dark', label: 'Pro Dark', icon: Moon, color: 'bg-background border-border' },
                                   { id: 'light', label: 'Pro Light', icon: Sun, color: 'bg-white text-black border-black/5' },
                                   { id: 'amoled', label: 'Eclipse', icon: Laptop, color: 'bg-black border-white/10' },
                                 ].map(t => (
                                   <motion.button
                                     key={t.id}
                                     whileHover={{ y: -4, backgroundColor: 'rgba(var(--foreground), 0.04)' }}
                                     whileTap={mechTap}
                                     onClick={() => handleSetTheme(t.id)}
                                     className={cn(
                                       "flex flex-col items-center gap-4 p-5 rounded-2xl border transition-all relative overflow-hidden group/theme",
                                       resolvedActiveTheme === t.id ? "border-primary bg-primary/10 shadow-[0_15px_40px_rgba(113,72,235,0.15)] ring-1 ring-primary/20" : "border-border bg-background/40"
                                     )}
                                   >
                                     <div className={cn("w-full h-16 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover/theme:scale-105", t.color)}>
                                       <t.icon className={cn("w-6 h-6 transition-all duration-500", resolvedActiveTheme === t.id ? "text-primary scale-110 drop-shadow-[0_0_10px_rgba(113,72,235,0.6)]" : "text-muted-foreground")} />
                                     </div>
                                     <span className={cn("text-[11px] font-black tracking-[0.1em] uppercase transition-colors", resolvedActiveTheme === t.id ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
                                   {resolvedActiveTheme === t.id && (
                                     <>
                                       <motion.div layoutId="theme-active" className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_15px_rgba(113,72,235,1)]" />
                                       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent animate-pulse pointer-events-none" />
                                     </>
                                   )}
                                 </motion.button>
                               ))}
                             </div>
                           </div>

                           <div className="space-y-6">
                             <Label className="text-[#8E9297] uppercase text-[10px] font-black tracking-[0.2em] block opacity-40">Interface Scaling</Label>
                             <div className="relative">
                              <div className="flex gap-4">
                                {(['small', 'medium', 'large']).map(size => (
                                  <MotionButton
                                    key={size}
                                    variant={preferences.fontSize === size ? 'default' : 'secondary'}
                                    whileTap={mechTap}
                                    onClick={() => {
                                      savePrefs({...preferences, fontSize: size});
                                      triggerPrefFeedback('fontSize');
                                    }}
                                     className={cn(
                                       "flex-1 capitalize font-black h-11 rounded-xl transition-all text-[10px] tracking-widest relative overflow-hidden",
                                       preferences.fontSize === size ? "bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(113,72,235,0.3)] border-transparent" : "bg-foreground/5 hover:bg-foreground/10 text-muted-foreground border-border/40"
                                     )}
                                  >
                                    {size}
                                    {preferences.fontSize === size && (
                                      <motion.div 
                                        layoutId="fontSize-active-glow" 
                                        className="absolute inset-0 bg-white/10" 
                                        initial={false}
                                      />
                                    )}
                                  </MotionButton>
                                ))}
                              </div>
                              <AnimatePresence>
                                {prefFeedback === 'fontSize' && (
                                  <motion.div 
                                    initial={{ opacity: 0, scaleY: 0.5 }}
                                    animate={{ opacity: 1, scaleY: 1 }}
                                    exit={{ opacity: 0, scaleY: 1.5 }}
                                    className="absolute -inset-2 border-2 border-primary/20 rounded-2xl filter blur-sm pointer-events-none"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                           </div>

                             <Separator className="bg-border/40" />

                           <div className="flex items-center justify-between group pt-2">
                             <div className="space-y-1.5">
                               <Label className="text-[16px] font-black text-foreground group-hover:text-primary transition-colors cursor-pointer">Compact Mode</Label>
                               <p className="text-sm font-medium text-muted-foreground">Minimize spacing in the room view for higher information density.</p>
                             </div>
                              <div className="relative">
                                <Switch 
                                  checked={preferences.compactMode} 
                                  onCheckedChange={v => {
                                    savePrefs({...preferences, compactMode: v});
                                    triggerPrefFeedback('compactMode');
                                  }}
                                  className="data-[state=checked]:bg-primary shadow-[0_0_10px_rgba(113,72,235,0.3)] scale-110"
                                />
                                <AnimatePresence>
                                  {prefFeedback === 'compactMode' && (
                                    <motion.div 
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1.5, opacity: 1 }}
                                      exit={{ scale: 2, opacity: 0 }}
                                      className="absolute inset-0 bg-primary/20 rounded-full filter blur-md pointer-events-none"
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                           </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {activeSection === 'devices' && (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-10"
                      >
                        <motion.div variants={itemVariants}>
                          <header>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">Audio & Video</h2>
                            <p className="text-muted-foreground text-sm mt-1">Configure your hardware for the best collaborative experience.</p>
                          </header>
                        </motion.div>
                        
                        <motion.div variants={itemVariants} className="bg-secondary/20 p-8 rounded-2xl border border-border space-y-8 shadow-xl shadow-black/20">
                           <div className="space-y-4">
                             <Label className="text-muted-foreground uppercase text-[10px] font-black tracking-widest pl-1 block opacity-60">Input Device</Label>
                             <div className="relative group/select">
                               <select className="w-full bg-background border border-border rounded-xl h-12 px-5 text-sm appearance-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-foreground/90">
                                 <option>Default Communication Device (Microphone)</option>
                                 <option>System Default</option>
                               </select>
                               <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 transition-transform group-hover/select:translate-y-[-40%]" />
                             </div>
                           </div>

                           <div className="space-y-4">
                             <Label className="text-muted-foreground uppercase text-[10px] font-black tracking-widest pl-1 block opacity-60">Output Device</Label>
                             <div className="relative group/select">
                               <select className="w-full bg-background border border-border rounded-xl h-12 px-5 text-sm appearance-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-foreground/90">
                                 <option>Default High Definition Audio (Speakers)</option>
                                 <option>System Default</option>
                               </select>
                               <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 transition-transform group-hover/select:translate-y-[-40%]" />
                             </div>
                           </div>

                           <div className="py-10 opacity-30 text-center">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Hardware settings managed by browser</p>
                           </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
