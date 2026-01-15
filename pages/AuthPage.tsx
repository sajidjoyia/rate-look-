
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, Mail, Terminal } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type?: 'confirmation' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0]
            }
          }
        });

        if (authError) throw authError;
        
        // If we get here without error, sign up was successful.
        // If email confirmation is ON, the user won't be signed in automatically.
        setError({ 
          message: "Check your email for a confirmation link to activate your account.", 
          type: 'confirmation' 
        });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            throw { message: "Your email is not confirmed yet. Please check your inbox for the verification link.", type: 'confirmation' };
          }
          throw signInError;
        }
      }
    } catch (err: any) {
      setError({ 
        message: err.message || "An unexpected error occurred", 
        type: err.type 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Terminal className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">LensCritique</h1>
          <p className="text-slate-500 text-center mb-10 text-sm font-medium">
            {isSignUp ? 'Join for honest peer feedback' : 'Improve your social presence with peer reviews'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                  placeholder="cool_user_99"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${error.type === 'confirmation' ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                {error.type === 'confirmation' ? (
                  <Mail size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-xs font-medium leading-tight ${error.type === 'confirmation' ? 'text-indigo-700' : 'text-red-600'}`}>
                  {error.message}
                </p>
              </div>
            )}

            {!error?.type && (
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            )}

            {error?.type === 'confirmation' && (
              <button
                type="button"
                onClick={() => setError(null)}
                className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Back to Sign In
              </button>
            )}
          </form>

          <div className="pt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-slate-500 hover:text-indigo-600 text-xs font-semibold transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
