
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Post, RATING_METRICS } from '../types';
import { Check, Loader2 } from 'lucide-react';

interface ReviewPageProps {
  onComplete: () => void;
}

const ReviewPage: React.FC<ReviewPageProps> = ({ onComplete }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const [ratings, setRatings] = useState<Record<string, number>>({
    confidence: 5,
    style: 5,
    approachability: 5
  });
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      setPost(data);
    } catch (err) { 
      console.error("Error fetching post:", err);
      navigate('/'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: reviewError } = await supabase.from('reviews').insert([{
        post_id: post.id,
        reviewer_id: user.id,
        confidence_score: ratings.confidence,
        style_score: ratings.style,
        approachability_score: ratings.approachability,
        answers,
        general_feedback: generalFeedback,
        is_anonymous: isAnonymous
      }]);

      if (reviewError) throw reviewError;

      // Update backend counters
      await supabase.rpc('increment_post_reviews', { post_id_input: post.id });
      await supabase.rpc('decrement_profile_unlock_counter', { user_id_input: user.id });

      onComplete();
      navigate('/', { replace: true });
    } catch (err: any) { 
      console.error("Submission error:", err);
      alert(`Submission failed: ${err.message || "Ensure your database functions are correct."}`); 
    } finally { 
      setSubmitting(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Review...</p>
    </div>
  );

  if (!post) return <div className="p-20 text-center">Post not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-6">
        <div className="sticky top-24">
          <div className="relative aspect-[4/5] bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
            <img src={post.image_urls[0]} alt="Review" className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6 flex flex-wrap gap-2 pr-6">
              {post.categories?.map((cat, i) => (
                <div key={i} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold shadow-lg text-indigo-600">
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100">
        <form onSubmit={handleSubmit}>
          <h2 className="text-3xl font-bold mb-8">Critique</h2>
          <div className="space-y-8 mb-12">
            {RATING_METRICS.map((metric) => (
              <div key={metric.key}>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-slate-700">{metric.label}</label>
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg">{ratings[metric.key]}/10</span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  value={ratings[metric.key]}
                  onChange={(e) => setRatings({ ...ratings, [metric.key]: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            ))}
          </div>

          <div className="space-y-6 mb-12">
            {post.questions.map((q, i) => q && (
              <div key={i}>
                <label className="block text-sm font-semibold text-slate-600 mb-2 italic">"{q}"</label>
                <textarea 
                  required 
                  value={answers[i]} 
                  onChange={(e) => { 
                    const next = [...answers]; 
                    next[i] = e.target.value; 
                    setAnswers(next); 
                  }} 
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm" 
                  rows={2} 
                />
              </div>
            ))}
          </div>

          <div className="mb-10">
            <label className="block font-bold text-slate-700 mb-2">General Advice</label>
            <textarea 
              required 
              value={generalFeedback} 
              onChange={(e) => setGeneralFeedback(e.target.value)} 
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm" 
              rows={3} 
              placeholder="What could be improved?"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting...
              </>
            ) : (
              <>Complete & Unlock <Check size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewPage;
