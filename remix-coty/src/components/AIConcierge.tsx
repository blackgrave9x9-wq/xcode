import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, UserProfile } from '../types';
import { MessageSquare, Send, X, ChefHat, ShoppingCart, Sparkles, Languages, Info, ArrowRight, Image as ImageIcon, Camera, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { t } from '../i18n';
import { chatCompletion, Message as OpenRouterMessage } from '../services/openRouterService';

// Removed GoogleGenAI initialization

interface Message {
  role: 'user' | 'model';
  text: string;
  isOrder?: boolean;
  image?: string;
}

export default function AIConcierge({ 
  user, 
  lang, 
  onAddToCart, 
  onShowRegistration 
}: { 
  user: UserProfile | null, 
  lang: 'en' | 'sw', 
  onAddToCart: (productId: string) => void, 
  onShowRegistration?: () => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize messages when language changes
  useEffect(() => {
    setMessages([{ role: 'model', text: t(lang, 'aiWelcome') }]);
  }, [lang]);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(productsData.filter(p => p.isAvailable !== false));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setMessages(prev => [...prev, { role: 'user', text: userMessage || (lang === 'sw' ? "Picha imeambatanishwa" : "Image attached"), image: currentImage || undefined }]);
    setIsLoading(true);

    try {
      const openRouterMessages: OpenRouterMessage[] = messages.filter(msg => msg.text !== t(lang, 'aiWelcome')).map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      }));

      const systemPrompt = `You are "LYRA", the elite luxury concierge for Coty Luxury Butchery & African Market. 
            
            Current Context:
            - User: ${user ? `${user.displayName} (Member)` : 'Guest'}
            - Language: ${lang === 'sw' ? 'Swahili' : 'English'}
            - Product Catalog: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit, category: p.category })))}
            
            Persona Guidelines:
            - You represent the pinnacle of Tanzanian luxury service.
            - Be sophisticated, knowledgeable, and proactive but extremely concise.
            - Speak to the customer with deep respect (use "Ndugu", "Mpendwa", "Sir/Madam" where appropriate in Swahili).
            - If an image is provided, identify the meat or product and offer elite culinary advice.
            
            Interaction Rules:
            1. If they mention items they like, help them select from the catalog.
            2. After suggesting or confirming items, list them clearly with prices and a bold TOTAL.
            3. MANDATORY: After every list, you MUST ask: "Je, unathibitisha oda hii ya kifahari? Jibu 'ndio' au 'hapana'." (Or English equivalent if lang is en).
            4. If they say 'ndio', call placeOrder.
            5. If they say 'hapana', ask for their desired adjustments.
            6. ALWAYS stick to the provided language: ${lang}.`;

      const userContent: any[] = [];
      if (userMessage) {
        userContent.push({ type: 'text', text: userMessage });
      }
      if (currentImage) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: currentImage
          }
        });
      }

      const finalMessages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        ...openRouterMessages,
        { role: 'user', content: userContent.length > 0 ? userContent : (userMessage || "Image analysis required.") }
      ];

      const tools = [
        {
          type: "function",
          function: {
            name: "placeOrder",
            description: "Finalize a luxury order. Only call this after a clear 'ndio' or 'yes' confirmation.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      productId: { type: "string" },
                      name: { type: "string" },
                      quantity: { type: "number" },
                      price: { type: "number" }
                    },
                    required: ["productId", "name", "quantity", "price"]
                  }
                },
                totalAmount: { type: "number" }
              },
              required: ["items", "totalAmount"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "showRegistrationForm",
            description: "Open the registration interface for the user.",
            parameters: { type: "object", properties: {} }
          }
        },
        {
          type: "function",
          function: {
            name: "checkLoyalty",
            description: "Retrieve user's prestige loyalty status.",
            parameters: { type: "object", properties: {} }
          }
        }
      ];

      const responseData = await chatCompletion(finalMessages, tools);
      const choice = responseData.choices[0];
      const toolCalls = choice.message.tool_calls;
      
      if (toolCalls && toolCalls.length > 0) {
        const call = toolCalls[0].function;
        
        if (call.name === 'checkLoyalty') {
          const credits = user?.loyaltyCredits || 0;
          const text = lang === 'sw' 
            ? `Hali yako ya Uanachama wa Kifahari: Una krediti **${credits}**. Bado krediti **${30 - (credits % 30)}** pekee ili ujipatie zawadi yako ya kipekee inayofuata.`
            : `Your Prestige Status: You have **${credits}** credits. Only **${30 - (credits % 30)}** more until your next exclusive reward is unlocked.`;
          setMessages(prev => [...prev, { role: 'model', text }]);
          setIsLoading(false);
          return;
        }

        if (call.name === 'showRegistrationForm') {
          onShowRegistration?.();
          setMessages(prev => [...prev, { role: 'model', text: lang === 'sw' ? "_Tayari nimekuandalia fomu yako ya uanachama. Tafadhali kamilisha hapo juu._" : "_I have prepared your membership registration. Kindly complete it above._" }]);
          setIsLoading(false);
          return;
        }

        if (call.name === 'placeOrder') {
          if (!user || (!user.phoneNumber && !localStorage.getItem('coty_user_id'))) {
            onShowRegistration?.();
            setMessages(prev => [...prev, { role: 'model', text: t(lang, 'aiLoginRequired') }]);
            setIsLoading(false);
            return;
          }

          const args = JSON.parse(call.arguments);
          const userId = user?.uid || localStorage.getItem('coty_user_id') || 'guest';
          const newOrder: any = {
            userId: userId,
            items: args.items,
            totalAmount: args.totalAmount,
            status: 'pending',
            createdAt: new Date().toISOString(),
            customerName: user?.displayName || 'Guest',
            customerPhone: user?.phoneNumber || '',
            customerEmail: user?.email || '',
            source: 'lyra',
            pointsAwarded: true
          };

          await addDoc(collection(db, 'orders'), newOrder);
          
          if (user) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              loyaltyCredits: increment(3 * args.items.length),
              loyaltyPoints: increment(Math.floor(args.totalAmount / 1000))
            });
          }
          
          let successMsg = t(lang, 'aiOrderSuccess')
            .replace('{name}', user?.displayName || 'Guest')
            .replace('{amount}', args.totalAmount.toLocaleString())
            .replace('{phone}', user?.phoneNumber || 'provided');

          setMessages(prev => [...prev, { role: 'model', text: successMsg, isOrder: true }]);
          setIsLoading(false);
          return;
        }
      }

      const text = choice.message.content || t(lang, 'aiFallbackError');
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: t(lang, 'aiError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isProfileComplete = useMemo(() => {
    return user && user.displayName && user.phoneNumber && user.location;
  }, [user]);

  return (
    <>
      <button
        onClick={() => {
          if (!isProfileComplete) {
            onShowRegistration?.();
          } else {
            setIsOpen(true);
          }
        }}
        className="fixed bottom-6 right-6 bg-primary text-white pl-5 pr-7 py-4 rounded-full shadow-[0_20px_50px_rgba(27,94,32,0.4)] hover:scale-105 active:scale-95 transition-all z-50 flex items-center gap-4 group ring-4 ring-primary/10 overflow-hidden"
        id="concierge-trigger"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="animate-dancing relative flex-shrink-0">
          <ChefHat size={28} />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-primary" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-60 mb-1">Lyra AI</span>
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">Weka oder yako hapa</span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 right-6 w-[360px] h-[520px] max-h-[80vh] bg-white rounded-[32px] z-[60] flex flex-col overflow-hidden shadow-2xl border border-primary/5"
          >
            {/* Header */}
            <div className="pt-6 pb-4 px-8 relative group border-b border-primary/5 bg-white">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[16px] bg-primary text-white flex items-center justify-center shadow-lg rotate-2">
                    <ChefHat size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-primary font-bold text-xl tracking-tighter leading-none">LYRA</h3>
                      <div className="px-2 py-0.5 rounded-full bg-accent text-[#064e3b] text-[8px] font-black uppercase tracking-[0.1em] leading-none">Prestige</div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                       <p className="text-[9px] uppercase tracking-[0.1em] text-primary/40 font-black">Concierge Elite</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 hover:text-primary transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide bg-gray-50/30">
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`relative max-w-[85%] ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    {msg.image && (
                      <div className="mb-2 rounded-2xl overflow-hidden border border-primary/10 shadow-lg">
                        <img src={msg.image} alt="Upload" className="max-w-full h-auto object-cover max-h-[140px]" />
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-[24px] shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white text-primary border border-primary/5 rounded-tl-none'
                    }`}>
                      <div className={`prose prose-sm font-bold leading-tight ${msg.role === 'user' ? 'prose-invert' : 'text-primary'}`}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-primary/5 px-4 py-3 rounded-full flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-primary rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-primary rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-primary rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="px-6 py-4 flex gap-2 overflow-x-auto scrollbar-hide border-t border-primary/5 bg-white">
              {(lang === 'sw' ? ['Mawazo', 'Nyama', 'Viungo'] : ['Ideas', 'Meat', 'Spices']).map((suggestion) => (
                <button 
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Overlay */}
            <div className="p-6 pt-0 bg-white">
              <div className="relative flex items-center gap-3 p-2 bg-gray-50 rounded-[28px] border border-primary/5 shadow-inner">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 flex-shrink-0 bg-white text-primary rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/5"
                >
                  <Camera size={18} />
                </button>
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t(lang, 'aiPlaceholder')}
                  className="flex-1 bg-transparent border-none text-primary placeholder:text-primary/20 text-xs font-bold focus:ring-0"
                />
                
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="w-10 h-10 flex-shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-lg shadow-primary/20"
                >
                  <Send size={18} />
                </button>
              </div>
              
              {selectedImage && (
                <div className="mt-4 flex items-center gap-3 p-2 bg-primary/5 rounded-xl inline-flex border border-primary/10">
                  <div className="relative">
                    <img 
                      src={selectedImage} 
                      className="w-10 h-10 object-cover rounded-lg shadow-sm" 
                    />
                    <button 
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] pr-2">Media Ready</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


