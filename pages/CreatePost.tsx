
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CATEGORIES, Category, Profile } from '../types';
import { 
  Upload, 
  X, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Bell,
  Check,
  ShieldAlert,
  ChevronRight,
  // Fix: Added missing Sparkles import
  Sparkles
} from 'lucide-react';

interface CreatePostProps {
  profile: Profile;
  onCreated: () => void;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'rls';
}

const CreatePost: React.FC<CreatePostProps> = ({ profile, onCreated }) => {
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['Social']);
  const [questions, setQuestions] = useState<string[]>(['', '', '']);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [notification, setNotification] = useState<Notification | null>(null);
  
  const navigate = useNavigate();

  // Create and cleanup object URLs for previews
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    
    // Cleanup function
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  useEffect(() => {
    if (notification && notification.type !== 'rls') {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (images.length + newFiles.length > 3) {
        setNotification({ message: "Maximum 3 images allowed", type: 'error' });
        return;
      }
      setImages([...images, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    const nextImages = [...images];
    nextImages.splice(index, 1);
    setImages(nextImages);
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    );
  };

  const handleCreate = async () => {
    if (images.length === 0) {
      setNotification({ message: "Please upload at least one photo.", type: 'error' });
      return;
    }
    if (selectedCategories.length === 0) {
      setNotification({ message: "Please select at least one category.", type: 'error' });
      return;
    }
    
    setUploading(true);
    setUploadStep('Connecting to Vault...');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) throw new Error("Session expired. Please log in again.");

      const userId = session.user.id;
      const imageUrls = [];

      // 1. Upload Images
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        setUploadStep(`Uploading image ${i + 1} of ${images.length}...`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file);

        if (uploadError) {
          if (uploadError.message.toLowerCase().includes('row-level security') || uploadError.message.toLowerCase().includes('violates row-level security')) {
            setNotification({ 
              message: "Storage Permission Denied: You need to apply the RLS Fix in the Admin Panel to allow photo uploads.", 
              type: 'rls' 
            });
            throw new Error("RLS Violation");
          }
          throw new Error(`Storage error: ${uploadError.message}. Make sure 'photos' bucket exists.`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        imageUrls.push(publicUrl);
      }

      // 2. Prepare Data
      setUploadStep('Broadcasting to Community...');
      const isLive = (profile.posts_remaining_to_unlock || 0) <= 0;
      const cleanedQuestions = questions.filter(q => q.trim() !== "");

      const postPayload = {
        user_id: userId,
        categories: selectedCategories,
        image_urls: imageUrls,
        questions: cleanedQuestions,
        is_live: isLive,
        reviews_required: 3,
        reviews_received: 0
      };

      // 3. Insert into DB
      const { error: postError } = await supabase
        .from('posts')
        .insert([postPayload]);

      if (postError) {
        if (postError.message.toLowerCase().includes('row-level security')) {
          setNotification({ 
            message: "Table Permission Denied: The 'posts' table is restricted. Apply the SQL Fix in the Admin Panel.", 
            type: 'rls' 
          });
          throw new Error("RLS Violation");
        }
        throw postError;
      }

      // 4. Success handling
      setNotification({ message: "Post Published! Your content is now being shared.", type: 'success' });
      onCreated();
      setTimeout(() => navigate('/'), 2500);

    } catch (err: any) {
      if (err.message !== "RLS Violation") {
        console.error("Creation Error:", err);
        setNotification({ message: err.message || "An unexpected error occurred during publication.", type: 'error' });
      }
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  const isRequirementMet = (profile.posts_remaining_to_unlock || 0) <= 0;

  return (
    <div className="max-w-3xl mx-auto p-4 md:py-12 relative">
      {/* Dynamic Notifications */}
      {notification && (
        <div className={`fixed top-24 right-4 left-4 md:left-auto md:w-[450px] z-[100] p-6 rounded-3xl shadow-2xl border flex items-start gap-4 animate-in slide-in-from-top-12 duration-500 ${
          notification.type === 'success' 
            ? 'bg-emerald-600 border-emerald-400 text-white' 
            : notification.type === 'rls' 
              ? 'bg-indigo-900 border-indigo-700 text-indigo-100' 
              : 'bg-red-600 border-red-400 text-white'
        }`}>
          <div className="bg-white/20 p-2 rounded-2xl">
            {notification.type === 'success' ? <CheckCircle size={24} /> : notification.type === 'rls' ? <ShieldAlert size={24} /> : <X size={24} />}
          </div>
          <div className="flex-1">
            <h4 className="font-black text-xs uppercase tracking-widest mb-1 opacity-80">
              {notification.type === 'success' ? 'Publication Status' : notification.type === 'rls' ? 'Security Restriction Detected' : 'Issue Encountered'}
            </h4>
            <p className="text-sm font-bold leading-relaxed">{notification.message}</p>
            {notification.type === 'rls' && (
              <button 
                onClick={() => navigate('/admin')} 
                className="mt-3 flex items-center gap-1.5 bg-white text-indigo-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-indigo-50 transition-all"
              >
                Go to Admin SQL Guide <ChevronRight size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100"><X size={20} /></button>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 relative overflow-hidden">
        {uploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="relative">
              <Loader2 className="animate-spin text-indigo-600 w-24 h-24 mb-6" strokeWidth={1} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-indigo-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Broadcasting Live</h3>
            <p className="text-slate-500 font-bold text-sm tracking-wide">{uploadStep}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">Create Post</h1>
            <p className="text-slate-400 font-medium">Share your photos for community critique.</p>
          </div>
          <div className={`p-4 rounded-3xl flex flex-col items-center justify-center border ${isRequirementMet ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isRequirementMet ? 'text-indigo-600' : 'text-amber-600'}`}>
              {isRequirementMet ? 'Live Ready' : 'Locked Mode'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            {/* Photo Section */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">The Visuals (Max 3)</label>
              <div className="grid grid-cols-2 gap-4">
                {previewUrls.map((url, i) => (
                  <div key={i} className="aspect-[3/4] relative rounded-[2rem] overflow-hidden bg-slate-50 border-2 border-slate-100 shadow-sm group">
                    <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Preview" />
                    <button 
                      onClick={() => removeImage(i)} 
                      className="absolute top-3 right-3 bg-black/50 backdrop-blur-md hover:bg-red-500 text-white rounded-2xl p-2 transition-all shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="aspect-[3/4] flex flex-col items-center justify-center border-3 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-300 hover:text-indigo-500 group relative">
                    <Upload size={40} strokeWidth={1} className="transition-transform group-hover:-translate-y-2" />
                    <span className="text-[10px] font-black mt-3 uppercase tracking-widest opacity-60">Add Shot</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Categories Section */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">Categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-5 py-3 rounded-2xl text-xs font-black transition-all border-2 ${
                      selectedCategories.includes(cat) 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Specific Advice</label>
                <HelpCircle size={14} className="text-slate-300" />
              </div>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="relative group">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const next = [...questions];
                        next[i] = e.target.value;
                        setQuestions(next);
                      }}
                      placeholder={i === 0 ? "e.g. Rate the styling 1-10" : "Ask something else..."}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-bold text-slate-700"
                    />
                    {q && (
                      <button onClick={() => {
                         const next = [...questions];
                         next[i] = '';
                         setQuestions(next);
                      }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <button
            onClick={handleCreate}
            disabled={images.length === 0 || selectedCategories.length === 0 || uploading}
            className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-2xl flex items-center justify-center gap-4 uppercase tracking-tighter"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={28} />
            ) : (
              <>
                <CheckCircle size={28} strokeWidth={2.5} />
                Publish to Community
              </>
            )}
          </button>
          <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isRequirementMet ? 'Post will be visible immediately' : 'Unlock by reviewing others first'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
