import React, { useState, useEffect } from 'react';
import { User, Globe, Twitter, Instagram, Youtube, Sparkles, UserCircle, Briefcase } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getPendingWallet } from '../lib/walletAuth';

interface ProfileSetupProps {
    onNavigate: (page: string) => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onNavigate }) => {
    const { handleCompleteSetup, walletAddress, isAuthenticating, authError } = useAuth();
    const [pendingWallet, setPendingWallet] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        bio: '',
        website: '',
        twitter: '',
        instagram: '',
        youtube: '',
        role: 'user' as 'user' | 'creator',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Load pending wallet address on mount
    useEffect(() => {
        const wallet = getPendingWallet() || walletAddress;
        if (wallet) {
            setPendingWallet(wallet);
        } else {
            // No wallet found - redirect to home
            console.warn('No wallet address found - redirecting to home');
            onNavigate('home');
        }
    }, [walletAddress, onNavigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleRoleSelect = (role: 'user' | 'creator') => {
        setFormData({ ...formData, role });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        setFieldErrors({});

        try {
            console.log('Submitting setup form:', formData);

            // Navigation is handled by AuthContext.handleCompleteSetup which
            // redirects to setup_redirect (stored in sessionStorage) or role-based default
            await handleCompleteSetup(formData);

        } catch (error: any) {
            console.error('Setup failed:', error);

            // Parse field-specific errors from API response
            if (error.response?.data && typeof error.response.data === 'object') {
                const errors: { [key: string]: string } = {};
                Object.keys(error.response.data).forEach(key => {
                    const errorValue = error.response.data[key];
                    errors[key] = Array.isArray(errorValue) ? errorValue[0] : errorValue;
                });
                setFieldErrors(errors);
                setSubmitError('Please fix the errors below.');
            } else {
                setSubmitError(error.message || 'Failed to complete setup. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pendingWallet) {
        return (
            <div className="min-h-screen pt-24 pb-20 bg-canvas flex items-center justify-center">
                <div className="text-center">
                    <p className="text-ink text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 bg-canvas">
            <div className="container max-w-[800px] mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span className="text-gold font-bold text-sm uppercase tracking-wider">Welcome to Deorganized</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4 tracking-tight">
                        Complete Your <span className="text-gold">Profile</span>
                    </h1>
                    <p className="text-xl text-inkLight font-medium max-w-2xl mx-auto">
                        You're almost there! Let's set up your profile and get you started.
                    </p>

                    {/* Wallet Info */}
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-surface border border-borderSubtle rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-ink">
                            Connected: {pendingWallet.slice(0, 8)}...{pendingWallet.slice(-6)}
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {(authError || submitError) && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-700 text-sm font-medium">
                            {authError || submitError}
                        </p>
                    </div>
                )}

                {/* Role Selection */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-ink mb-4">Choose Your Role</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* User Role */}
                        <button
                            type="button"
                            onClick={() => handleRoleSelect('user')}
                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${formData.role === 'user'
                                ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                                : 'border-borderSubtle bg-canvas hover:border-gold/50 hover:shadow-md'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'user' ? 'bg-gold text-white' : 'bg-surface text-inkLight group-hover:bg-gold/10 group-hover:text-gold'
                                }`}>
                                <UserCircle className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-2 transition-colors ${formData.role === 'user' ? 'text-gold' : 'text-ink'
                                }`}>
                                User
                            </h3>
                            <p className="text-sm text-inkLight leading-relaxed">
                                Discover content, follow creators, attend events, and engage with the community.
                            </p>
                            {formData.role === 'user' && (
                                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* Creator Role */}
                        <button
                            type="button"
                            onClick={() => handleRoleSelect('creator')}
                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${formData.role === 'creator'
                                ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                                : 'border-borderSubtle bg-canvas hover:border-gold/50 hover:shadow-md'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${formData.role === 'creator' ? 'bg-gold text-white' : 'bg-surface text-inkLight group-hover:bg-gold/10 group-hover:text-gold'
                                }`}>
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-bold mb-2 transition-colors ${formData.role === 'creator' ? 'text-gold' : 'text-ink'
                                }`}>
                                Creator
                            </h3>
                            <p className="text-sm text-inkLight leading-relaxed">
                                Create shows, host events, publish news, and build your community.
                            </p>
                            {formData.role === 'creator' && (
                                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="bg-canvas rounded-3xl border border-borderSubtle shadow-soft p-8 md:p-10">
                    <h2 className="text-2xl font-bold text-ink mb-6">Profile Details</h2>

                    {/* Username */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink mb-2">
                            Username <span className="text-inkLight text-xs font-normal">(optional - auto-generated if left empty)</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="e.g. johndoe123 (letters, numbers, underscores)"
                                className={`w-full pl-12 pr-4 py-3 bg-surface border rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all ${fieldErrors.username ? 'border-red-500' : 'border-borderSubtle'}`}
                            />
                        </div>
                        {fieldErrors.username && (
                            <p className="text-red-500 text-sm mt-1 font-medium">{fieldErrors.username}</p>
                        )}
                    </div>

                    {/* Display Name */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink mb-2">
                            Display Name <span className="text-inkLight text-xs font-normal">(optional - shown to others)</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                            <input
                                type="text"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleInputChange}
                                placeholder="e.g. John Doe"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink mb-2">Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows={4}
                            placeholder="Tell us about yourself..."
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                        />
                    </div>

                    {/* Website */}
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-ink mb-2">Website</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                placeholder="https://yourwebsite.com"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="border-t border-borderSubtle pt-8 mb-8">
                        <h3 className="text-lg font-bold text-ink mb-4">Social Links (Optional)</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Twitter */}
                            <div className="relative">
                                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                                <input
                                    type="text"
                                    name="twitter"
                                    value={formData.twitter}
                                    onChange={handleInputChange}
                                    placeholder="@username"
                                    className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                />
                            </div>

                            {/* Instagram */}
                            <div className="relative">
                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                                <input
                                    type="text"
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={handleInputChange}
                                    placeholder="@username"
                                    className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                />
                            </div>

                            {/* YouTube */}
                            <div className="relative md:col-span-2">
                                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                                <input
                                    type="text"
                                    name="youtube"
                                    value={formData.youtube}
                                    onChange={handleInputChange}
                                    placeholder="Channel URL"
                                    className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || isAuthenticating}
                        className="w-full bg-gold-gradient text-white font-bold py-4 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {(isSubmitting || isAuthenticating) ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Creating Profile...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Complete Setup
                            </>
                        )}
                    </button>

                    {/* Community prompt */}
                    <p className="text-center text-sm text-inkLight mt-4">
                        Want to build a community?{' '}
                        <button
                            type="button"
                            onClick={() => onNavigate('communities')}
                            className="text-gold font-bold hover:text-gold/80 transition-colors"
                        >
                            Explore Communities →
                        </button>
                    </p>
                </form>

            </div>
        </div>
    );
};

