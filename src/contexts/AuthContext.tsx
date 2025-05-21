import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isVisitor: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  loginAttempts: LoginAttempt[];
}

interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [isConfigured] = useState(isSupabaseConfigured());
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);

  useEffect(() => {
    if (!isConfigured) return;
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
    });

    // Load login attempts from local storage
    const storedAttempts = localStorage.getItem('loginAttempts');
    if (storedAttempts) {
      try {
        const parsedAttempts = JSON.parse(storedAttempts);
        // Convert string timestamps back to Date objects
        const formattedAttempts = parsedAttempts.map((attempt: any) => ({
          ...attempt,
          timestamp: new Date(attempt.timestamp)
        }));
        setLoginAttempts(formattedAttempts);
      } catch (error) {
        console.error('Erro ao carregar tentativas de login:', error);
      }
    }

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  async function checkUserRole(userId: string | undefined) {
    if (!userId || !isConfigured) {
      setIsAdmin(false);
      setIsVisitor(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      setIsAdmin(data?.role === 'admin');
      setIsVisitor(data?.role === 'visitante');
    } catch (error) {
      console.error('Erro ao verificar função do usuário:', error);
      setIsAdmin(false);
      setIsVisitor(false);
    }
  }

  async function signIn(email: string, password: string, rememberMe: boolean) {
    if (!isConfigured) {
      throw new Error('Supabase não está configurado');
    }
    
    try {
      // Record login attempt
      const newAttempt: LoginAttempt = {
        email,
        timestamp: new Date(),
        success: false,
        userAgent: navigator.userAgent
      };

      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Update login attempts with failure
        const updatedAttempts = [...loginAttempts, newAttempt];
        setLoginAttempts(updatedAttempts);
        
        // Store in localStorage
        localStorage.setItem('loginAttempts', JSON.stringify(updatedAttempts));
        
        throw error;
      }

      // Update login attempt to success
      newAttempt.success = true;
      const updatedAttempts = [...loginAttempts, newAttempt];
      setLoginAttempts(updatedAttempts);
      
      // Store in localStorage
      localStorage.setItem('loginAttempts', JSON.stringify(updatedAttempts));

      // If remember me is checked, store credentials in localStorage
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    } catch (error: any) {
      console.error('Erro ao entrar:', error);
      throw error;
    }
  }

  async function signOut() {
    if (!isConfigured) {
      throw new Error('Supabase não está configurado');
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    user,
    isAdmin,
    isVisitor,
    signIn,
    signOut,
    isConfigured,
    loginAttempts,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}