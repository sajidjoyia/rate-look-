
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Post, Review, RATING_METRICS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Star, MessageSquare, Image as ImageIcon, Settings } from 'lucide-react';

interface ProfilePageProps {
  profile: Profile;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      setPosts(postsData || []);

      // Fetch reviews received on user's posts
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, profiles(username)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false });
        
        setReviews(reviewsData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Confidence', value: profile.total_confidence || 0 },
    { name: 'Style', value: profile.total_style || 0 },
    { name: 'Approachability', value: profile.total_approachability || 0 },
  ];

  const colors = ['#6366f1', '#a855f7', '#ec4899'];

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-[2rem] mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {profile.username[0].toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">@{profile.username}</h2>
            <p className="text-slate-400 text-sm mb-6">{profile.interests?.join(' • ') || 'No interests set'}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Posts</p>
                <p className="text-xl font-black text-indigo-600">{posts.length}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reviews</p>
                <p className="text-xl font-black text-indigo-600">{profile.review_count}</p>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
              <Settings size={18} />
              Edit Interests
            </button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Star size={18} className="text-amber-500" fill="currentColor" />
              Impact Analytics
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>{d.name}</span>
                  <span className="text-slate-900">{d.value}/10</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Feed/History Switcher */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ImageIcon size={22} className="text-indigo-600" />
              My Gallery
            </h3>
            {posts.length === 0 ? (
              <p className="text-slate-400 text-center py-12 italic">No photos uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {posts.map(post => (
                  <div key={post.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                    <img src={post.image_urls[0]} alt="Post" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
                      <div className="flex items-center gap-1 font-bold mb-1">
                        <MessageSquare size={16} />
                        {post.reviews_received}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {post.categories?.slice(0, 2).map((cat, ci) => (
                          <span key={ci} className="text-[8px] uppercase font-bold tracking-tighter bg-white/20 px-1 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!post.is_live && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                        Locked
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare size={22} className="text-indigo-600" />
              Received Feedback
            </h3>
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-slate-400 text-center py-12 italic">Feedback will appear here once others review your posts.</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {review.is_anonymous ? '?' : review.profiles?.username?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{review.is_anonymous ? 'Anonymous User' : `@${review.profiles?.username}`}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {['confidence', 'style', 'approachability'].map(key => (
                          <div key={key} className="w-2 h-2 rounded-full bg-indigo-200" title={`${key}: ${review[key + '_score']}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm italic leading-relaxed mb-4">"{review.general_feedback}"</p>
                    {review.answers?.length > 0 && review.answers[0] && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Answer Highlight</p>
                        <p className="text-xs text-slate-500">{review.answers[0]}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
