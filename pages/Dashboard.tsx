
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Post, Profile, Category } from '../types';
import { Filter, Star, Zap, Info, Loader2, Database } from 'lucide-react';

interface DashboardProps {
  profile: Profile;
  refreshProfile: () => void;
}

const DEMO_POSTS = [
  {
    username: 'StyleExpert',
    categories: ['Fashion', 'Lifestyle'] as Category[],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800',
    question: 'Does this outfit work for a first date in the city?'
  },
  {
    username: 'CareerPro',
    categories: ['Professional'] as Category[],
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800',
    question: 'How does my headshot look for LinkedIn? Is it too casual?'
  },
  {
    username: 'SocialVibe',
    categories: ['Dating', 'Social'] as Category[],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800',
    question: 'Which photo gives off better energy for a social profile?'
  }
];

const Dashboard: React.FC<DashboardProps> = ({ profile, refreshProfile }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<'recommended' | 'recent'>('recommended');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, [filter, profile.interests]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(username)')
        .eq('is_live', true)
        .neq('user_id', profile.id);
      
      if (filter === 'recommended' && profile.interests && profile.interests.length > 0) {
        query = query.overlaps('categories', profile.interests);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("Fetch posts error:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    setSeeding(true);
    try {
      for (const demo of DEMO_POSTS) {
        // 1. Create a dummy bot profile (ignore error if exists)
        const botId = `00000000-0000-0000-0000-${Math.random().toString(16).slice(2, 14)}`;
        await supabase.from('profiles').upsert({
          id: botId,
          username: demo.username,
          interests: demo.categories,
          total_confidence: 7,
          total_style: 8,
          total_approachability: 6,
          review_count: 5,
          posts_remaining_to_unlock: 0
        });

        // 2. Create the post
        await supabase.from('posts').insert({
          user_id: botId,
          categories: demo.categories,
          image_urls: [demo.image],
          questions: [demo.question],
          is_live: true,
          reviews_required: 5,
          reviews_received: 0
        });
      }
      await fetchPosts();
      alert("Successfully seeded 3 demo posts. You can now review them to unlock your own posts!");
    } catch (err) {
      console.error("Seeding error:", err);
      alert("Seeding failed. Ensure your database tables and RLS policies allow these inserts.");
    } finally {
      setSeeding(false);
    }
  };

  const handleRandomMatch = () => {
    if (posts.length > 0) {
      const randomIdx = Math.floor(Math.random() * posts.length);
      navigate(`/review/${posts[randomIdx].id}`);
    } else {
      alert("No matching posts found. Use the 'Seed Demo Data' button to create sample posts!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:py-8">
      <div className="bg-indigo-600 rounded-3xl p-6 mb-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Welcome, {profile.username}!</h2>
          <p className="text-indigo-100 mb-4 max-w-sm">Help others improve and unlock feedback for your own photos.</p>
          <div className="flex gap-4">
            <button onClick={handleRandomMatch} className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg">
              <Zap size={18} fill="currentColor" /> Lucky Match
            </button>
            <div className="flex items-center gap-2 bg-indigo-500/50 px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm">
              <Star size={16} fill="white" /> {profile.posts_remaining_to_unlock} more needed
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
          <button onClick={() => setFilter('recommended')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'recommended' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Recommended</button>
          <button onClick={() => setFilter('recent')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'recent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Recent</button>
        </div>
        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
          <Filter size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-400 font-medium">Finding photos for you...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Info size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No posts available</h3>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">Check back later or expand your interests to see more content from the community.</p>
          
          <div className="max-w-xs mx-auto space-y-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Developer Tools</p>
              <p className="text-xs text-indigo-500 mb-4 leading-relaxed">Empty database? Click below to seed 3 demo posts so you can test the review flow.</p>
              <button 
                onClick={seedDemoData} 
                disabled={seeding}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {seeding ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                {seeding ? 'Seeding...' : 'Seed Demo Data'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <div key={post.id} onClick={() => navigate(`/review/${post.id}`)} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-slate-100">
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                <img src={post.image_urls[0]} alt="Review" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-1 max-w-[80%]">
                  {post.categories?.map((cat, idx) => (
                    <div key={idx} className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm text-indigo-600">
                      {cat}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">@{post.profiles?.username || 'user'}</span>
                  <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 italic">
                  "{post.questions?.[0] || "General feedback please!"}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
