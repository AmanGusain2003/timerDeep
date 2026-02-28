import React, { useState } from 'react';
import { useTimerStore } from '../store/useTimerStore.js';
import { api } from '../services/api.js';

export const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const setAuth = useTimerStore((state) => state.setAuth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const data = await api.post(endpoint, { username, password });
            setAuth({ username: data.username }, data.token);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-sm border-4 border-white p-6 bg-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b-4 border-white pb-2">
                    {isLogin ? 'SYSTEM_ACCESS' : 'NEW_IDENT'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1">IDENT_NAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border-2 border-white p-2 text-white focus:bg-white focus:text-black outline-none transition-none placeholder:text-zinc-700"
                            placeholder="USER_001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1">ACCESS_KEY</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border-2 border-white p-2 text-white focus:bg-white focus:text-black outline-none transition-none placeholder:text-zinc-700"
                            placeholder="********"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-white text-black p-2 text-xs font-bold uppercase">
                            ERROR: {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-black uppercase py-3 tracking-widest hover:bg-black hover:text-white border-2 border-white transition-none disabled:opacity-50"
                    >
                        {loading ? 'PROCESSING...' : (isLogin ? '[ INITIALIZE ]' : '[ REGISTER ]')}
                    </button>
                </form>

                <div className="mt-8 pt-4 border-t-2 border-zinc-800 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white underline underline-offset-4"
                    >
                        {isLogin ? 'NEED_NEW_IDENT? REGISTER' : 'ALREADY_HAVE_IDENT? LOGIN'}
                    </button>
                </div>
            </div>
        </div>
    );
};
