import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, MeshDistortMaterial, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  User, 
  MessageSquare, 
  ChevronRight, 
  Menu, 
  X, 
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Send,
  Loader2,
  Bell
} from 'lucide-react';
import { db, auth } from './lib/firebase';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// --- 3D Components ---
function LuxuryMeatStage() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Fixing the Clock deprecation by using state from useFrame
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial
            color="#1B5E20"
            speed={3}
            distort={0.4}
            radius={1}
            roughness={0}
            metalness={0.8}
          />
        </mesh>
      </Float>
      <ContactShadows
        position={[0, -2, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4.5}
      />
    </group>
  );
}

// --- Main App ---
export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Habari! Mimi ni Coty AI Concierge. Karibu kwenye Coty Luxury Butchery. Nikusaidie nini leo?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch products
  useEffect(() => {
    const q = query(collection(db, 'products'), limit(6));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(p.length > 0 ? p : [
        { id: '1', name: 'Wagyu Ribeye Steak', price: 125000, category: 'Butchery', description: 'Premium grade fat-marbled beef.' },
        { id: '2', name: 'Alfonso Lamb Chops', price: 45000, category: 'Poultry', description: 'Fresh succulent lamb chops.' },
        { id: '3', name: 'Okra - Swahili Fresh', price: 8000, category: 'African Market', description: 'Organic fresh okra.' }
      ]);
    });
    return () => unsubscribe();
  }, []);

  // Chat handling - OpenRouter fix
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || JSON.stringify(data);
        throw new Error(`AI Provider Error: ${errorMsg}`);
      }
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.choices[0].message.content 
        }]);
      } else {
        console.error("Unexpected response structure:", data);
        throw new Error("Invalid AI response format from OpenRouter");
      }
    } catch (error) {
      console.error("Chat Interaction Failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Samahani, kuna tatizo la kiufundi.";
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMessage}. Tafadhali hakikisha OPENROUTER_API_KEY imewekwa vizuri.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscription Checker simulation from logs
  useEffect(() => {
    console.log("Starting Subscription Checker (EAT)...");
    const interval = setInterval(() => {
      console.log(`Checking subscriptions at ${new Date().toISOString()} (EAT)`);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1B1B1B] font-sans selection:bg-[#1B5E20] selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#E0E0D6]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold tracking-tighter text-[#1B5E20]">COTY LUXURY</h1>
            <div className="hidden md:flex gap-6 text-sm font-medium uppercase tracking-widest opacity-60">
              <a href="#" className="hover:opacity-100 transition-opacity">Butchery</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Poultry</a>
              <a href="#" className="hover:opacity-100 transition-opacity">African Market</a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#F0F0E0] rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#1B5E20] rounded-full" />
            </button>
            <button className="hidden md:flex items-center gap-2 bg-[#1B5E20] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#2E7D32] transition-all">
              <ShoppingBag size={18} />
              Cart (0)
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with 3D */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 bg-[#E8F5E9] text-[#1B5E20] rounded-full text-xs font-bold tracking-widest uppercase"
            >
              The Finest Cuts in East Africa
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9]"
            >
              Luxury <br /> Meat <span className="text-[#1B5E20]">Gallery.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-[#666] max-w-md"
            >
              Experience the pinnacle of butchery and traditional staples, delivered with the elegance they deserve.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button className="px-8 py-4 bg-[#1B5E20] text-white rounded-full font-bold flex items-center gap-2 hover:translate-x-1 transition-transform group">
                Explore The Market <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border-2 border-[#1B5E20] text-[#1B5E20] rounded-full font-bold hover:bg-[#E8F5E9] transition-colors">
                View 3D Showroom
              </button>
            </motion.div>
          </div>

          <div className="h-[500px] bg-[#E0E0D6] rounded-3xl overflow-hidden relative shadow-2xl">
            <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
              <PerspectiveCamera makeDefault position={[0, 0, 5]} />
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <pointLight position={[-10, -10, -10]} />
              <Suspense fallback={null}>
                <LuxuryMeatStage />
                <Environment preset="studio" />
              </Suspense>
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
            <div className="absolute bottom-8 left-8 text-[#1B5E20]/60 text-xs font-mono uppercase tracking-[0.3em]">
              Interaction Mode: Active
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-end justify-between">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold tracking-tight">Today's Specials</h3>
              <p className="text-[#666]">Fresh from the premium supply chain, hand-selected for excellence.</p>
            </div>
            <a href="#" className="text-[#1B5E20] font-bold flex items-center gap-1 group">
              See All <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p, idx) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/5] bg-[#F5F5F0] rounded-2xl mb-4 overflow-hidden relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#E0E0D6]">
                      <ShoppingBag size={64} strokeWidth={0.5} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {p.category}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-lg">{p.name}</h4>
                  <p className="text-sm text-[#666] line-clamp-1">{p.description}</p>
                  <p className="text-[#1B5E20] font-bold">TZS {p.price.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Concierge Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col"
          >
            <div className="p-6 border-b border-[#F0F0E0] flex items-center justify-between bg-[#1B5E20] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="font-bold">Coty AI Concierge</h4>
                  <p className="text-[10px] uppercase tracking-widest opacity-70">Always Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F5F5F0]">
              {messages.map((m, i) => (
                <div 
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-[#1B5E20] text-white rounded-tr-none' 
                      : 'bg-white text-[#1B1B1B] shadow-sm rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[#1B5E20]" />
                    <span className="text-xs font-medium text-[#666]">Concierge is typing...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-[#F0F0E0]">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Uliza chochote kuhusu bidhaa zetu..."
                  className="w-full pl-4 pr-12 py-4 bg-[#F5F5F0] rounded-2xl border-none focus:ring-2 focus:ring-[#1B5E20] transition-all"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="absolute right-2 top-2 p-3 bg-[#1B5E20] text-white rounded-xl hover:bg-[#2E7D32] transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Trigger Button */}
      {!isChatOpen && (
        <motion.button 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#1B5E20] text-white rounded-full shadow-2xl flex items-center justify-center z-50 group hover:bg-[#2E7D32] transition-all"
        >
          <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-bold animate-bounce">
            1
          </span>
        </motion.button>
      )}

      {/* Footer Section */}
      <footer className="bg-[#1B1B1B] text-white py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-6 col-span-2">
            <h1 className="text-2xl font-bold tracking-tighter text-[#4CAF50]">COTY LUXURY</h1>
            <p className="text-white/40 max-w-sm">
              Experience the pinnacle of luxury butchery and market staples in Dar es Salaam.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                < Award size={20} />
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                < TrendingUp size={20} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold uppercase tracking-widest text-xs text-[#4CAF50]">Quick Links</h5>
            <div className="flex flex-col gap-2 text-white/60">
              <a href="#" className="hover:text-white">Butchery</a>
              <a href="#" className="hover:text-white">Poultry</a>
              <a href="#" className="hover:text-white">Meat Wallet</a>
              <a href="#" className="hover:text-white">Subscriptions</a>
            </div>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold uppercase tracking-widest text-xs text-[#4CAF50]">Support</h5>
            <div className="flex flex-col gap-2 text-white/60">
              <a href="#" className="hover:text-white">Help Center</a>
              <a href="#" className="hover:text-white">Delivery Areas</a>
              <a href="#" className="hover:text-white">Contact AI Concierge</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
