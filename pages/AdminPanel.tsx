
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
  Check
} from 'lucide-react';

interface AdminPanelProps {
  profile: Profile;
  onUpdate: () => void;
}

const SAMPLE_POSTS = [
  {
    username: 'FashionBot',
    categories: ['Fashion', 'Lifestyle'] as Category[],
    image: 'https://images.unsplash.com/photo-1488161628813-244a26a2f690?q=80&w=800',
    question: 'Rate my summer street style'
  },
  {
    username: 'CareerBot',
    categories: ['Professional'] as Category[],
    image: 'https://images.unsplash.com/photo-1519085186583-fbc1192759e2?q=80&w=800',
    question: 'Is this headshot too serious for LinkedIn?'
  },
  {
    username: 'DatingBot',
    categories: ['Dating'] as Category[],
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800',
    question: 'Does this vibe work for a dating profile?'
  }
];

const AdminPanel: React.FC<AdminPanelProps> = ({ profile, onUpdate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const SQL_FIX = `-- 1. FIX POSTS TABLE RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- 2. FIX STORAGE BUCKET RLS (Run this to allow uploads)
-- Ensure you have a bucket named 'photos' created in the Supabase UI first!
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');`;

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

  const forceUnlockAccount = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ posts_remaining_to_unlock: 0 })
        .eq('id', profile.id);
      
      if (error) throw error;
      onUpdate();
      alert("Account Unlocked! You can now post live content immediately.");
    } catch (err) {
      console.error(err);
      alert("Failed to unlock account. Ensure 'profiles' table has 'Update' RLS enabled.");
    } finally {
      setActionLoading(false);
    }
  };

  const makePostLive = async (postId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_live: true })
        .eq('id', postId);
      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Failed to make post live.");
    } finally {
      setActionLoading(false);
    }
  };

  const seedGlobalPosts = async () => {
    setActionLoading(true);
    try {
      const botId = '00000000-0000-0000-0000-000000000000'; 
      
      await supabase.from('profiles').upsert({
        id: botId,
        username: 'SystemBot',
        interests: ['Social', 'Lifestyle'],
        posts_remaining_to_unlock: 0,
        review_count: 999
      });

      for (const sample of SAMPLE_POSTS) {
        await supabase.from('posts').insert({
          user_id: botId,
          categories: sample.categories,
          image_urls: [sample.image],
          questions: [sample.question],
          is_live: true,
          reviews_required: 5,
          reviews_received: 0
        });
      }
      
      await fetchPosts();
      alert("Seeded global live posts successfully!");
    } catch (err) {
      console.error(err);
      alert("Seeding failed. Check console for details.");
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

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-12">
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl mb-10 border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="text-indigo-400" />
              <h1 className="text-3xl font-black tracking-tight uppercase">Admin Engine</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium">Bypass restrictions and fix database issues.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={forceUnlockAccount} disabled={actionLoading} className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <Zap size={18} fill="currentColor" /> Unlock Me
            </button>
            <button onClick={seedGlobalPosts} disabled={actionLoading} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <PlusCircle size={18} /> Seed Bot Posts
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SQL Fix Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <Code size={18} className="text-indigo-600" />
                RLS Fix SQL
              </h2>
              <button onClick={copySql} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Copy and run this in your <b>Supabase SQL Editor</b> to fix "New row violates RLS" errors for posts and image uploads.
            </p>
            <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto h-[400px] leading-relaxed border border-indigo-900/30">
              {SQL_FIX}
            </pre>
          </div>
        </div>

        {/* Posts Management Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-indigo-600" />
                Database Registry ({posts.length})
              </h2>
              <button onClick={fetchPosts} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
              ) : posts.length === 0 ? (
                <div className="p-20 text-center text-slate-400 italic font-medium uppercase text-xs tracking-widest">No data entries found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {posts.map(post => (
                    <div key={post.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                      <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                        <img src={post.image_urls[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-slate-800">@{post.profiles?.username || 'user'}</span>
                          {!post.is_live && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Locked</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{post.id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!post.is_live && (
                          <button 
                            onClick={() => makePostLive(post.id)}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="Make Live"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => deletePost(post.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
};

export default AdminPanel;
