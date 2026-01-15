
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import { Database, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';

// Pages
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import ProfilePage from './pages/ProfilePage';
import ReviewPage from './pages/ReviewPage';
import AdminPanel from './pages/AdminPanel';

// Components
import Navbar from './components/Navbar';

interface ProtectedRouteProps {
  session: any;
  profile: Profile | null;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session, profile, children }) => {
  if (!session) return <Navigate to="/auth" />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium animate-pulse">Syncing profile...</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-2"
          >
            <RefreshCcw size={12} /> Stays loading? Refresh app
          </button>
        </div>
      </div>
    );
  }

  // Check if interests is empty or null - if so, redirect to onboarding
  if (!profile.interests || profile.interests.length === 0) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === '42P01' || error.message.toLowerCase().includes('relation "profiles" does not exist')) {
          setDbError("The 'profiles' table is missing. Did you run the SQL script in Supabase?");
          return;
        }
        
        if (error.code === 'PGRST116') {
          // Self-heal
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({ id: userId, username: session?.user?.email?.split('@')[0] || 'user', interests: [] })
            .select().single();
          if (newProfile) setProfile(newProfile);
          return;
        }
        throw error;
      }
      setProfile(data);
      setDbError(null);
    } catch (err: any) {
      console.error("Profile Fetch Exception:", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (e: any) {
        console.error("Auth initialization failed:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
        {session && profile && <Navbar profile={profile} />}
        <Routes>
          <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/onboarding" element={session ? (profile ? <Onboarding onComplete={() => fetchProfile(session.user.id)} /> : <Loader2 className="animate-spin mx-auto mt-20" />) : <Navigate to="/auth" />} />
          
          <Route path="/" element={<ProtectedRoute session={session} profile={profile}><Dashboard profile={profile!} refreshProfile={() => fetchProfile(session!.user.id)} /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute session={session} profile={profile}><CreatePost profile={profile!} onCreated={() => fetchProfile(session!.user.id)} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute session={session} profile={profile}><ProfilePage profile={profile!} /></ProtectedRoute>} />
          <Route path="/review/:postId" element={<ProtectedRoute session={session} profile={profile}><ReviewPage onComplete={() => fetchProfile(session!.user.id)} /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute session={session} profile={profile}><AdminPanel profile={profile!} onUpdate={() => fetchProfile(session!.user.id)} /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
