
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Post, Profile, Category } from '../types';
import { 
  Database, 
  Trash2, 
  Zap, 
  ShieldAlert, 
  PlusCircle, 
  Loader2, 
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Code,
  Copy,
  Check,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

interface AdminPanelProps {
  profile: Profile;
  onUpdate: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ profile, onUpdate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const SQL_FIX = `-- 1. CREATE ALL NECESSARY TABLES
-- Paste this into your Supabase SQL Editor and click 'Run'

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  interests text[],
  total_confidence int DEFAULT 0,
  total_style int DEFAULT 0,
  total_approachability int DEFAULT 0,
  review_count int DEFAULT 0,
  posts_remaining_to_unlock int DEFAULT 3,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create Posts Table (Crucial: categories is text[])
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  categories text[] NOT NULL,
  image_urls text[] NOT NULL,
  questions text[],
  is_live boolean DEFAULT false,
  reviews_required int DEFAULT 3,
  reviews_received int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  confidence_score int NOT NULL,
  style_score int NOT NULL,
  approachability_score int NOT NULL,
  answers text[],
  general_feedback text NOT NULL,
  is_anonymous boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. ENABLE RLS AND SET POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public insert" ON public.profiles FOR INSERT WITH CHECK (true);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public insert posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update posts" ON public.posts FOR UPDATE USING (true);
CREATE POLICY "Public delete posts" ON public.posts FOR DELETE USING (true);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- 3. STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Storage Access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Public Storage All" ON storage.objects FOR ALL USING (bucket_id = 'photos');

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION increment_post_reviews(post_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET reviews_received = reviews_received + 1 WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_profile_unlock_counter(user_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET posts_remaining_to_unlock = GREATEST(0, posts_remaining_to_unlock - 1) WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_FIX);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createInstantPost = async () => {
    setActionLoading(true);
    try {
      const randomImg = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&w=800&q=80`;
      
      // Ensure profile exists
      await supabase.from('profiles').upsert({
        id: profile.id,
        username: profile.username,
        interests: ['Fashion', 'Social']
      });

      const { error } = await supabase.from('posts').insert({
        user_id: profile.id,
        categories: ['Social', 'Lifestyle'],
        image_urls: [randomImg],
        questions: ["Is the lighting on this Unsplash photo good?"],
        is_live: true,
        reviews_required: 3,
        reviews_received: 0
      });

      if (error) throw error;
      await fetchPosts();
      alert("Instant Post Created!");
    } catch (err: any) {
      console.error(err);
      alert(`Failed: ${err.message}. If 'categories' error persists, please run the SQL Fix.`);
    } finally {
      setActionLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error(err);
      alert("Delete failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const makePostLive = async (postId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('posts').update({ is_live: true }).eq('id', postId);
      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Status update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:py-12">
      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <ShieldAlert size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-indigo-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">Setup Tool</span>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Admin Panel</h1>
            </div>
            <p className="text-slate-400 font-medium max-w-lg italic">
              Fix schema errors like missing "categories" column by running the SQL script below.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button 
              onClick={createInstantPost} 
              disabled={actionLoading} 
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95"
            >
              {actionLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
              Instant Post (Test Feed)
            </button>
            <button 
              onClick={() => {
                supabase.from('profiles').update({ posts_remaining_to_unlock: 0 }).eq('id', profile.id).then(() => {
                  onUpdate();
                  alert("Account Unlocked!");
                });
              }} 
              className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/20"
            >
              <Zap size={20} fill="currentColor" /> Force Unlock Me
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Code size={24} className="text-indigo-600" />
                Schema & RLS Fix
              </h2>
              <button 
                onClick={copySql} 
                className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6">
               <p className="text-xs text-amber-800 font-bold leading-relaxed">
                 <span className="inline-block mr-1">⚠️</span> 
                 Paste this into your Supabase Dashboard > SQL Editor to resolve the "Could not find categories column" error.
               </p>
            </div>
            <pre className="bg-slate-900 text-indigo-300 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto h-[450px] leading-relaxed border border-indigo-900/30">
              {SQL_FIX}
            </pre>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                <Database size={24} className="text-indigo-600" />
                Data Registry
              </h2>
              <button onClick={fetchPosts} className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-500">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="p-40 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Refreshing...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-40 text-center text-slate-300">
                <ImageIcon size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase text-[10px] tracking-widest">No entries found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {posts.map(post => (
                  <div key={post.id} className="p-6 flex items-center gap-6 hover:bg-slate-50/50 transition-colors">
                    <img src={post.image_urls[0]} className="w-16 h-20 rounded-xl object-cover border border-slate-200 shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 text-sm">@{post.profiles?.username || 'user'}</span>
                        {!post.is_live && <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black uppercase">Locked</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{post.id}</p>
                    </div>
                    <div className="flex gap-2">
                       {!post.is_live && (
                         <button onClick={() => makePostLive(post.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                           <CheckCircle size={20} />
                         </button>
                       )}
                       <button onClick={() => deletePost(post.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                         <Trash2 size={20} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
