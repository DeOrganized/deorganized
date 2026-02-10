import React, { useState, useEffect } from 'react';
import { User, Globe, Twitter, Instagram, Youtube, Save, X, Upload, Loader2, Crown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getCurrentUser, updateUserProfile } from '../lib/api';

interface EditProfileProps {
    onNavigate: (page: string) => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ onNavigate }) => {
    const { accessToken, userData, refreshUser } = useAuth();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        bio: '',
        website: '',
        twitter: '',
        instagram: '',
        youtube: '',
        upgradeToCreator: false,
    });

    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Load current user data
    useEffect(() => {
        const loadUserData = async () => {
            if (!accessToken) {
                onNavigate('home');
                return;
            }

            try {
                setIsLoading(true);
                const user = await getCurrentUser(accessToken);
                setCurrentUser(user);

                // Pre-populate form
                setFormData({
                    username: user.username || '',
                    display_name: user.display_name || '',
                    bio: user.bio || '',
                    website: user.website || '',
                    twitter: user.twitter || '',
                    instagram: user.instagram || '',
                    youtube: user.youtube || '',
                    upgradeToCreator: false,
                });

                setProfilePicturePreview(user.profile_picture);
            } catch (error) {
                console.error('Failed to load user:', error);
                setSubmitError('Failed to load profile. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, [accessToken, onNavigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !currentUser) return;

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            const updateData = new FormData();
            updateData.append('username', formData.username);
            updateData.append('display_name', formData.display_name);
            updateData.append('bio', formData.bio);
            updateData.append('website', formData.website);
            updateData.append('twitter', formData.twitter);
            updateData.append('instagram', formData.instagram);
            updateData.append('youtube', formData.youtube);

            // Add role upgrade if checked
            if (formData.upgradeToCreator && currentUser.role === 'user') {
                updateData.append('role', 'creator');
            }

            // Add profile picture if changed
            if (profilePictureFile) {
                updateData.append('profile_picture', profilePictureFile);
            }

            const updatedUser = await updateUserProfile(currentUser.id, updateData, accessToken);

            setSubmitSuccess(true);
            await refreshUser();

            // If upgraded to creator, redirect to creator dashboard
            if (updatedUser.role === 'creator' && currentUser.role !== 'creator') {
                setTimeout(() => {
                    onNavigate('dashboard');
                }, 1500);
            } else {
                // Just show success message
                setTimeout(() => {
                    onNavigate('user-profile');
                }, 1500);
            }
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            setSubmitError(error.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-20 bg-canvas flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 bg-canvas">
            <div className="container max-w-[800px] mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4 tracking-tight">
                        Edit <span className="text-gold">Profile</span>
                    </h1>
                    <p className="text-xl text-inkLight font-medium max-w-2xl mx-auto">
                        Update your profile information and preferences
                    </p>
                </div>

                {/* Success Message */}
                {submitSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-700 text-sm font-medium">
                            ✨ Profile updated successfully!
                        </p>
                    </div>
                )}

                {/* Error Display */}
                {submitError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-700 text-sm font-medium">{submitError}</p>
                    </div>
                )}

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="bg-canvas rounded-3xl border border-borderSubtle shadow-soft p-8 md:p-10">

                    {/* Profile Picture */}
                    <div className="mb-8 text-center">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-borderSubtle bg-surface mb-4">
                                {profilePicturePreview ? (
                                    <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-12 h-12 text-inkLight" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 bg-gold text-white p-2 rounded-full cursor-pointer hover:bg-gold-dark transition-colors">
                                <Upload className="w-4 h-4" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePictureChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-inkLight">Click to upload new profile picture</p>
                    </div>

                    {/* Username */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter your username"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Display Name */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-ink mb-2">
                            Display Name <span className="text-inkLight text-xs font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                            <input
                                type="text"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleInputChange}
                                placeholder="Your display name"
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
                        <h3 className="text-lg font-bold text-ink mb-4">Social Links</h3>

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

                    {/* Role Upgrade Section */}
                    {currentUser?.role === 'user' && (
                        <div className="border-t border-borderSubtle pt-8 mb-8">
                            <div className="bg-gold/5 border border-gold/20 rounded-2xl p-6">
                                <div className="flex items-start gap-4">
                                    <Crown className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-ink mb-2">Become a Creator</h3>
                                        <p className="text-sm text-inkLight mb-4">
                                            Upgrade your account to create shows, host events, and build your community.
                                        </p>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.upgradeToCreator}
                                                onChange={(e) => setFormData({ ...formData, upgradeToCreator: e.target.checked })}
                                                className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-2 focus:ring-gold/20"
                                            />
                                            <span className="text-sm font-bold text-ink">Yes, upgrade me to Creator!</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => onNavigate('user-profile')}
                            disabled={isSubmitting}
                            className="flex-1 bg-surface text-ink font-bold py-4 rounded-xl border border-borderSubtle hover:bg-surface-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-gold-gradient text-white font-bold py-4 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

