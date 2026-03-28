import React, { useState, useEffect } from 'react';
import {
  Settings, DollarSign, Bell, Globe, Clock,
  Shield, Save, Loader2, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { updateUserProfile, UserProfile } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface CreatorPreferencesProps {
  profile: UserProfile | null;
  onSaved?: () => void;
}

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'paywall', label: 'DM Paywall', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'broadcast', label: 'Broadcast Schedule', icon: <Clock className="w-4 h-4" /> },
  { id: 'payout', label: 'Payout Address', icon: <Globe className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

export const CreatorPreferences: React.FC<CreatorPreferencesProps> = ({ profile, onSaved }) => {
  const { accessToken, backendUser } = useAuth();
  const [activeSection, setActiveSection] = useState('paywall');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- DM Paywall ---
  const [dmPaygateEnabled, setDmPaygateEnabled] = useState(false);
  const [dmPriceStx, setDmPriceStx] = useState('0');
  const [dmPriceUsdcx, setDmPriceUsdcx] = useState('0');

  // --- Broadcast Schedule ---
  const [broadcastTime, setBroadcastTime] = useState('');
  const [broadcastDays, setBroadcastDays] = useState<number[]>([]);
  const [broadcastTimezone, setBroadcastTimezone] = useState('UTC');

  // --- Payout Address ---
  const [payoutAddress, setPayoutAddress] = useState('');

  // --- Notification prefs ---
  const [notifFollow, setNotifFollow] = useState(true);
  const [notifLike, setNotifLike] = useState(true);
  const [notifComment, setNotifComment] = useState(true);
  const [notifMessage, setNotifMessage] = useState(true);
  const [notifMerchSale, setNotifMerchSale] = useState(true);
  const [notifTip, setNotifTip] = useState(true);

  // Populate from profile on mount
  useEffect(() => {
    if (!profile) return;
    setDmPaygateEnabled((profile as any).dm_paygate_enabled ?? false);
    setDmPriceStx(String((profile as any).dm_price_stx ?? 0));
    setDmPriceUsdcx(String((profile as any).dm_price_usdcx ?? 0));
    setBroadcastTime((profile as any).broadcast_time ?? '');
    setBroadcastDays((profile as any).broadcast_days ?? []);
    setBroadcastTimezone((profile as any).broadcast_timezone ?? 'UTC');
    setPayoutAddress((profile as any).payout_stx_address ?? '');
    const prefs = (profile as any).notification_prefs ?? {};
    setNotifFollow(prefs.follow ?? true);
    setNotifLike(prefs.like ?? true);
    setNotifComment(prefs.comment ?? true);
    setNotifMessage(prefs.new_message ?? true);
    setNotifMerchSale(prefs.merch_sale ?? true);
    setNotifTip(prefs.tip_received ?? true);
  }, [profile]);

  const toggleDay = (idx: number) => {
    setBroadcastDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    );
  };

  const handleSave = async () => {
    if (!accessToken || !backendUser?.id) return;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const fd = new FormData();
      fd.append('dm_paygate_enabled', String(dmPaygateEnabled));
      fd.append('dm_price_stx', dmPriceStx);
      fd.append('dm_price_usdcx', dmPriceUsdcx);
      fd.append('broadcast_time', broadcastTime);
      fd.append('broadcast_timezone', broadcastTimezone);
      // JSON fields must be stringified
      fd.append('broadcast_days', JSON.stringify(broadcastDays));
      fd.append('payout_stx_address', payoutAddress);
      fd.append('notification_prefs', JSON.stringify({
        follow: notifFollow,
        like: notifLike,
        comment: notifComment,
        new_message: notifMessage,
        merch_sale: notifMerchSale,
        tip_received: notifTip,
      }));
      await updateUserProfile(backendUser.id, fd, accessToken);
      setSaveMsg({ type: 'success', text: 'Preferences saved successfully!' });
      onSaved?.();
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save preferences.' });
    } finally {
      setIsSaving(false);
    }
  };

  const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }> = ({
    value, onChange, label, desc
  }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-borderSubtle last:border-0">
      <div>
        <p className="text-sm font-bold text-ink">{label}</p>
        {desc && <p className="text-xs text-inkLight mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`shrink-0 flex items-center gap-1 text-sm font-bold transition-colors ${value ? 'text-gold' : 'text-inkLight'}`}
      >
        {value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink mb-1">Preferences</h1>
        <p className="text-inkLight text-sm">Control how your profile, payments, and notifications work.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 bg-surface rounded-2xl border border-borderSubtle p-2">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeSection === s.id
                    ? 'bg-gold text-white shadow-md'
                    : 'text-inkLight hover:text-ink hover:bg-canvas'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-canvas border border-borderSubtle rounded-2xl p-6 space-y-6">

          {/* DM Paywall */}
          {activeSection === 'paywall' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-ink">DM Paywall</h2>
              </div>
              <div className="space-y-2 mb-6">
                <Toggle
                  value={dmPaygateEnabled}
                  onChange={setDmPaygateEnabled}
                  label="Require payment to DM you"
                  desc="Non-followers must pay to send you a direct message."
                />
              </div>
              {dmPaygateEnabled && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-inkLight mb-1.5 uppercase tracking-wider">
                      Price in STX (micro-units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dmPriceStx}
                      onChange={e => setDmPriceStx(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface border border-borderSubtle rounded-xl text-ink text-sm focus:outline-none focus:border-gold"
                      placeholder="e.g. 1000000 = 1 STX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-inkLight mb-1.5 uppercase tracking-wider">
                      Price in USDCx (micro-units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dmPriceUsdcx}
                      onChange={e => setDmPriceUsdcx(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface border border-borderSubtle rounded-xl text-ink text-sm focus:outline-none focus:border-gold"
                      placeholder="e.g. 1000000 = 1 USDCx"
                    />
                  </div>
                  <p className="col-span-2 text-xs text-inkLight flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    1 STX = 1,000,000 micro-units. Set to 0 to allow free DMs.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Broadcast Schedule */}
          {activeSection === 'broadcast' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-ink">Broadcast Schedule</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-inkLight mb-1.5 uppercase tracking-wider">
                    Broadcast Time
                  </label>
                  <input
                    type="time"
                    value={broadcastTime}
                    onChange={e => setBroadcastTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface border border-borderSubtle rounded-xl text-ink text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-inkLight mb-2 uppercase tracking-wider">
                    Broadcast Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          broadcastDays.includes(idx)
                            ? 'bg-gold text-white shadow-sm'
                            : 'bg-surface text-inkLight hover:text-ink hover:bg-canvas border border-borderSubtle'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-inkLight mb-1.5 uppercase tracking-wider">
                    Timezone
                  </label>
                  <select
                    value={broadcastTimezone}
                    onChange={e => setBroadcastTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface border border-borderSubtle rounded-xl text-ink text-sm focus:outline-none focus:border-gold"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Payout Address */}
          {activeSection === 'payout' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-ink">Payout Address</h2>
              </div>
              <p className="text-sm text-inkLight mb-4">
                Where tips and merch sale proceeds are sent. Falls back to your connected wallet if left empty.
              </p>
              <div>
                <label className="block text-xs font-bold text-inkLight mb-1.5 uppercase tracking-wider">
                  Stacks Address (SP...)
                </label>
                <input
                  type="text"
                  value={payoutAddress}
                  onChange={e => setPayoutAddress(e.target.value)}
                  placeholder="SP2CY5V39..."
                  className="w-full px-3 py-2.5 bg-surface border border-borderSubtle rounded-xl text-ink text-sm focus:outline-none focus:border-gold font-mono"
                />
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 bg-gold/5 border border-gold/20 rounded-xl">
                <Shield className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <p className="text-xs text-inkLight">
                  This address is only used for payments. Your login wallet address is separate and immutable.
                </p>
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          {activeSection === 'notifications' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-gold" />
                <h2 className="text-lg font-bold text-ink">Notification Preferences</h2>
              </div>
              <p className="text-sm text-inkLight mb-4">Choose which activities send you in-app notifications.</p>
              <div className="divide-y divide-borderSubtle">
                <Toggle value={notifFollow} onChange={setNotifFollow} label="New followers" desc="When someone follows your profile." />
                <Toggle value={notifLike} onChange={setNotifLike} label="Likes" desc="When someone likes your show or post." />
                <Toggle value={notifComment} onChange={setNotifComment} label="Comments" desc="When someone comments on your content." />
                <Toggle value={notifMessage} onChange={setNotifMessage} label="New messages" desc="When you receive a direct message." />
                <Toggle value={notifMerchSale} onChange={setNotifMerchSale} label="Merch sales" desc="When someone purchases your merchandise." />
                <Toggle value={notifTip} onChange={setNotifTip} label="Tips received" desc="When someone tips you." />
              </div>
            </div>
          )}

          {/* Save button */}
          {saveMsg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
              saveMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMsg.text}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold text-white font-bold rounded-xl hover:bg-gold/90 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};
