
import React, { useState } from 'react';
import { Button } from './Button';
import { UserRole, User } from '../types';
import { dbService } from '../services/mockService';
import { useToast } from './Toast';

// Antonio Batista - LootFan - 2024-05-23
// Componente de Autenticação: Login e Registro unificados

interface AuthModalProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ role, isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        let user: User;
        
        if (isRegistering) {
            // Fluxo de Cadastro
            if (!name || !email || !password) {
                toast.error("Preencha todos os campos.");
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                toast.error("A senha deve ter pelo menos 6 caracteres.");
                setIsLoading(false);
                return;
            }
            user = await dbService.registerUser(name, email, password, role);
            toast.success("Conta criada com sucesso! Bem-vindo.");
        } else {
            // Fluxo de Login
            if (!email || !password) {
                toast.error("Digite e-mail e senha.");
                setIsLoading(false);
                return;
            }
            user = await dbService.loginByEmail(email, password, role);
            toast.success("Login realizado com sucesso.");
        }

        onSuccess(user);
        // Reset fields
        setName('');
        setEmail('');
        setPassword('');
    } catch (error: any) {
        toast.error(error.message || "Ocorreu um erro na autenticação.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-brand-50 p-6 text-center border-b border-brand-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-3 shadow-sm text-brand-600">
            {role === UserRole.CREATOR ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
             {role === UserRole.CREATOR ? 'Acesso Creator' : 'Acesso Fã'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
             {isRegistering ? 'Crie sua conta para começar' : 'Entre para continuar'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {isRegistering && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Seu Nome</label>
                        <input 
                            type="text" 
                            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" 
                            placeholder="Como quer ser chamado?"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                    <input 
                        type="email" 
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" 
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                    <input 
                        type="password" 
                        className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" 
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {role === UserRole.CREATOR && !isRegistering && (
                        <p className="text-xs text-right mt-1 text-brand-600 cursor-pointer hover:underline">Esqueci minha senha</p>
                    )}
                </div>

                <Button fullWidth size="lg" isLoading={isLoading} type="submit" className="mt-4">
                    {isRegistering ? 'Criar Conta' : 'Entrar na Plataforma'}
                </Button>
            </form>

            <div className="mt-6 text-center pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                    {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="ml-2 font-bold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                        {isRegistering ? 'Fazer Login' : 'Cadastre-se grátis'}
                    </button>
                </p>
            </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>

      </div>
    </div>
  );
};
