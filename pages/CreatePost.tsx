
import React, { useState, useEffect } from 'react';
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
  ShieldAlert
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
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['Social']);
  const [questions, setQuestions] = useState<string[]>(['', '', '']);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [notification, setNotification] = useState<Notification | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (notification && notification.type !== 'rls') {
      const timer = setTimeout(() => setNotification(null), 5000);
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
    setImages(images.filter((_, i) => i !== index));
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
    setUploadStep('Connecting to Supabase...');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) throw new Error("Authentication session not found. Please log in again.");

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
          if (uploadError.message.includes('row-level security')) {
            setNotification({ 
              message: "Storage RLS Error: You don't have permission to upload files. Go to Admin Panel > SQL Fix Guide.", 
              type: 'rls' 
            });
            throw new Error("RLS Violation");
          }
          throw new Error(`Storage error: ${uploadError.message}. Ensure a 'photos' bucket exists.`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        imageUrls.push(publicUrl);
      }

      // 2. Prepare Data
      setUploadStep('Publishing content...');
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
        if (postError.message.includes('row-level security')) {
          setNotification({ 
            message: "Table RLS Error: Permission denied to insert post. Check Admin Panel > SQL Fix Guide.", 
            type: 'rls' 
          });
          throw new Error("RLS Violation");
        }
        throw postError;
      }

      // 4. Success handling
      setNotification({ message: "Post Published Successfully!", type: 'success' });
      onCreated();
      setTimeout(() => navigate('/'), 2000);

    } catch (err: any) {
      if (err.message !== "RLS Violation") {
        setNotification({ message: err.message || "Failed to create post.", type: 'error' });
      }
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  const isRequirementMet = (profile.posts_remaining_to_unlock || 0) <= 0;

  return (
    <div className="max-w-2xl mx-auto p-4 md:py-12 relative">
      {/* Toast Notification Overlay */}
      {notification && (
        <div className={`fixed top-20 right-4 left-4 md:left-auto md:w-96 z-[100] p-4 rounded-2xl shadow-2xl border flex items-start gap-4 animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : notification.type === 'rls' 
              ? 'bg-indigo-50 border-indigo-100 text-indigo-900' 
              : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <div className="bg-emerald-500 p-1 rounded-full text-white mt-0.5"><Check size={16} /></div>
          ) : notification.type === 'rls' ? (
            <div className="bg-indigo-600 p-1 rounded-full text-white mt-0.5"><ShieldAlert size={16} /></div>
          ) : (
            <div className="bg-red-500 p-1 rounded-full text-white mt-0.5"><X size={16} /></div>
          )}
          <div className="flex-1">
            <p className="font-black text-[10px] uppercase tracking-widest">{notification.type === 'success' ? 'Success' : notification.type === 'rls' ? 'Security Config Needed' : 'Error'}</p>
            <p className="text-xs font-medium leading-tight mt-1">{notification.message}</p>
            {notification.type === 'rls' && (
              <button onClick={() => navigate('/admin')} className="mt-2 text-[10px] font-black underline uppercase text-indigo-600 hover:text-indigo-800">Go to Admin Fix Guide</button>
            )}
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16} /></button>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 relative overflow-hidden">
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 relative mb-6">
              <Loader2 className="animate-spin text-indigo-600 w-full h-full" strokeWidth={1} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Publishing Post</h3>
            <p className="text-slate-500 font-medium text-sm animate-pulse">{uploadStep}</p>
          </div>
        )}

        <h1 className="text-3xl font-black mb-6 tracking-tight">Create New Post</h1>

        <div className={`mb-8 p-5 rounded-3xl flex items-start gap-4 ${isRequirementMet ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
          {isRequirementMet ? <CheckCircle className="mt-1 flex-shrink-0" /> : <AlertTriangle className="mt-1 flex-shrink-0" />}
          <div>
            <p className="font-bold">{isRequirementMet ? 'Fast-Track Enabled' : 'Action Required'}</p>
            <p className="text-xs font-medium opacity-80">
              {isRequirementMet 
                ? "You've reviewed enough! This post will go live immediately." 
                : `You still need to review ${profile.posts_remaining_to_unlock} more posts first.`}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Photos (1-3)</label>
          <div className="grid grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={i} className="aspect-square relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="Preview" />
                <button onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition-all">
                  <X size={14} />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all text-slate-300 hover:text-indigo-500 group">
                <Upload size={32} strokeWidth={1.5} className="transition-transform group-hover:-translate-y-1" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedCategories.includes(cat) 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10 space-y-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specific Questions</label>
          {questions.map((q, i) => (
            <input
              key={i}
              type="text"
              value={q}
              onChange={(e) => {
                const next = [...questions];
                next[i] = e.target.value;
                setQuestions(next);
              }}
              placeholder={`e.g. "Is the lighting okay here?"`}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={images.length === 0 || uploading}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
        >
          {uploading ? <Loader2 className="animate-spin" size={24} /> : 'Confirm & Post'}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
