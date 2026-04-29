import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { t } from '../i18n';

interface PopupAdProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  imageUrl?: string;
  lang?: 'en' | 'sw';
}

export default function PopupAd({ isOpen, onClose, title, message, imageUrl, lang = 'sw' }: PopupAdProps) {
  if (!imageUrl && !title && !message) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glassmorphism rounded-[40px] shadow-2xl overflow-hidden relative z-10 max-w-lg w-full border border-white/10"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-gray-900/10 hover:bg-gray-900/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img 
              src={imageUrl} 
              alt="COTY Advertisement" 
              className="w-full h-64 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="p-8 text-center">
              <h3 className="text-3xl font-bold italic mb-4 text-primary">{title}</h3>
              <p className="text-text/70 mb-8">{message}</p>
              <button 
                onClick={onClose}
                className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-secondary transition-colors"
              >
                {t(lang, 'shopNow')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
