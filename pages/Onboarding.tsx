
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CATEGORIES, Category } from '../types';
import { Check, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [selectedInterests, setSelectedInterests] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (category: Category) => {
    setSelectedInterests(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleFinish = async () => {
    if (selectedInterests.length === 0) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          interests: selectedInterests,
          posts_remaining_to_unlock: 3 // Reset counter on first onboarding
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete();
    } catch (err) {
      console.error("Onboarding Save Error:", err);
      alert("Failed to save interests. Make sure your database tables are created correctly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Pick Your Interests</h1>
        <p className="text-slate-600 mb-8 text-lg">
          We'll show you photos in these categories to review first.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleInterest(cat)}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                selectedInterests.includes(cat)
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedInterests.includes(cat) ? 'bg-indigo-600 text-white' : 'border border-slate-300'}`}>
                {selectedInterests.includes(cat) && <Check size={14} />}
              </div>
              <span className="font-semibold text-lg">{cat}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleFinish}
          disabled={selectedInterests.length === 0 || loading}
          className="w-full max-w-xs bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mx-auto"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : 'Start Reviewing'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
