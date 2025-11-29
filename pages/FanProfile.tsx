
import React, { useState, useEffect } from 'react';
import { User, PersonalData } from '../types';
import { dbService } from '../services/mockService';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';

interface FanProfileProps {
  user: User;
}

export const FanProfile: React.FC<FanProfileProps> = ({ user }) => {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [personalForm, setPersonalForm] = useState<PersonalData>({
      fullName: '',
      cpf: '',
      birthDate: '',
      phoneNumber: '',
      address: {
          zipCode: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: ''
      }
  });

  useEffect(() => {
      if (user.personalData) {
          setPersonalForm({
            fullName: user.personalData.fullName || '',
            cpf: user.personalData.cpf || '',
            birthDate: user.personalData.birthDate || '',
            phoneNumber: user.personalData.phoneNumber || '',
            address: user.personalData.address || {
                zipCode: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: ''
            }
          });
      }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (personalForm.cpf.length < 11) {
        toast.error("CPF inválido.");
        return;
    }
    
    setIsSaving(true);
    try {
        await dbService.updateUserProfile(user.id, {
            personalData: personalForm
        });
        toast.success("Dados salvos com sucesso.");
    } catch (e: any) {
        toast.error("Erro ao salvar: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            Meu Perfil
        </h1>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100 flex gap-3 items-start">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                 <p>Seus dados são protegidos pela LGPD e utilizados apenas para emissão de Nota Fiscal (caso necessário) e entrega de produtos físicos.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Identificação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                            <input type="text" value={personalForm.fullName} onChange={e => setPersonalForm({...personalForm, fullName: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF</label>
                            <input type="text" value={personalForm.cpf} onChange={e => setPersonalForm({...personalForm, cpf: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="000.000.000-00" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento</label>
                            <input type="date" value={personalForm.birthDate} onChange={e => setPersonalForm({...personalForm, birthDate: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
                            <input type="tel" value={personalForm.phoneNumber} onChange={e => setPersonalForm({...personalForm, phoneNumber: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300" placeholder="(11) 99999-9999" required />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Endereço de Entrega</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
                            <input type="text" value={personalForm.address.zipCode} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address, zipCode: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Rua</label>
                            <input type="text" value={personalForm.address.street} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address, street: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                            <input type="text" value={personalForm.address.number} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address, number: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Cidade</label>
                            <input type="text" value={personalForm.address.city} onChange={e => setPersonalForm({...personalForm, address: {...personalForm.address, city: e.target.value}})} className="w-full p-2.5 rounded-lg border border-slate-300" required />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button type="submit" isLoading={isSaving} size="lg">Salvar Alterações</Button>
                </div>
            </form>
        </div>
    </div>
  );
};
