import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, CreditCard, ExternalLink } from 'lucide-react';

export type PaymentToken = "STX" | "USDCx" | "sBTC";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (token: PaymentToken) => void;
  title: string;
  description: string;
  priceSTX: number;
  priceUSDCx: number;
  priceSBTC?: number;
  isLoading: boolean;
  resourceType?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  priceSTX,
  priceUSDCx,
  priceSBTC,
  isLoading,
  resourceType = "content"
}) => {
  const [selectedToken, setSelectedToken] = React.useState<PaymentToken>("USDCx");

  // Format amounts
  const displaySTX = (priceSTX / 1_000_000).toFixed(2);
  const displayUSDCx = (priceUSDCx / 1_000_000).toFixed(2);
  const displaySBTC = priceSBTC ? (priceSBTC / 100_000_000).toFixed(8) : '0.00000000';

  if (!isOpen) return null;

  const tokenOptions: { key: PaymentToken; label: string; sublabel: string; price: string; color: string; activeColor: string }[] = [
    { key: 'USDCx', label: `${displayUSDCx} USDCx`, sublabel: 'Bridged Stable', price: displayUSDCx, color: 'indigo-500', activeColor: 'bg-indigo-500/5 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' },
    { key: 'STX', label: `${displaySTX} STX`, sublabel: 'Stacks Native', price: displaySTX, color: 'primary', activeColor: 'bg-primary/5 border-primary text-white shadow-lg shadow-primary/10' },
    { key: 'sBTC', label: `${displaySBTC} sBTC`, sublabel: 'Bitcoin on Stacks', price: displaySBTC, color: 'orange-500', activeColor: 'bg-orange-500/5 border-orange-500 text-white shadow-lg shadow-orange-500/10' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-canvas border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-canvas-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2 text-primary">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock size={20} />
              </div>
              <span className="font-semibold uppercase tracking-wider text-sm">Gated {resourceType}</span>
            </div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <p className="text-canvas-muted">
              {description}
            </p>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-canvas-muted">Select Payment Method</label>
              
              <div className="grid grid-cols-3 gap-3">
                {tokenOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedToken(opt.key)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      selectedToken === opt.key 
                      ? opt.activeColor
                      : "bg-white/5 border-white/10 text-canvas-muted hover:border-white/20"
                    }`}
                  >
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-[10px] opacity-60">{opt.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
              <div className="text-green-400 mt-1">
                <Shield size={16} />
              </div>
              <p className="text-xs text-canvas-muted leading-relaxed">
                Payments are handled securely on-chain via the x402 protocol. Your transaction is verified immediately after confirmation.
              </p>
            </div>
          </div>

          {/* Action */}
          <div className="p-6 bg-white/5 flex flex-col gap-3">
            <button
              onClick={() => onConfirm(selectedToken)}
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <CreditCard size={20} />
                  Pay and Unlock
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-canvas-muted flex items-center justify-center gap-1">
              Secured by Stacks Blockchain <ExternalLink size={10} />
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
