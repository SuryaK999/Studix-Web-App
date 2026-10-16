import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Loader2, Chrome } from 'lucide-react';
import LightRays from '@/components/ui/LightRays';

export function LoginForm({ onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[380px] mx-auto px-4 sm:px-0 relative z-10"
    >
      <div className="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none -z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#9333ea"
          raysSpeed={1.2}
          lightSpread={1.5}
          rayLength={2.5}
          followMouse={false}
          pulsating={true}
          saturation={1.5}
        />
      </div>

      <div className="space-y-2 pb-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent pb-1 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-gray-400 text-[14px] sm:text-[15px]">
            Sign in to start collaborating
          </p>
        </div>
      <div className="space-y-5">
        {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-semibold text-white/70">Email</Label>
              <div className="relative group">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] transition-colors group-focus-within:text-purple-400 ${email.length > 0 ? 'text-purple-400' : 'text-white/50'}`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 rounded-[10px] text-[14px] transition-all hover:bg-white/10 hover:border-white/20 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0a071c_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-semibold text-gray-300">Password</Label>
              <div className="relative group">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] transition-colors group-focus-within:text-purple-400 ${password.length > 0 ? 'text-purple-400' : 'text-gray-500'}`} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 rounded-[10px] text-[14px] transition-all hover:bg-white/10 hover:border-white/20 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#0a071c_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-[10px] transition-all duration-300 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] text-[14px] border border-purple-500/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>

          <div className="relative pt-1 pb-1">
            <div className="absolute inset-0 flex items-center pt-2">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-widest mt-1">
              <span className="bg-[#0a071c] px-3 text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-11 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-purple-500/30 hover:text-white rounded-[10px] text-[13px] font-medium transition-all group"
          >
            <Chrome className="h-[18px] w-[18px] mr-2.5 text-gray-400 group-hover:text-purple-400 transition-colors" />
            Google
          </Button>

        <p className="text-center text-[13px] text-gray-400 pt-1">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onToggle}
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors focus:outline-none hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  );
}
