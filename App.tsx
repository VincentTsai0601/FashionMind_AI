import React, { useState, useRef, useEffect } from 'react';
import { AppTab, ChatMessage, WardrobeItem } from './types';
import * as GeminiService from './services/geminiService';
import FileUpload from './components/FileUpload';
import CameraCapture from './components/CameraCapture';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  
  // Data States
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  
  // Try-On State
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [stylistAdvice, setStylistAdvice] = useState<string | null>(null);
  const [itemDescription, setItemDescription] = useState<string>('');
  const [categories, setCategories] = useState<string[]>(['tops']);
  
  // Video Generation State
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  
  // Demographics
  const [gender, setGender] = useState<string>('Woman');
  const [skinTone, setSkinTone] = useState<string>('East Asian');
  const [nationality, setNationality] = useState<string>('');
  const [season, setSeason] = useState<string>('Summer');
  
  // Weather State
  const [location, setLocation] = useState<string>('');
  const [weatherData, setWeatherData] = useState<string>('');
  const [weatherSource, setWeatherSource] = useState<{title: string, uri: string} | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  
  // Loading State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('INITIATING');
  
  // 3D Tilt State
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});

  // Chat State (Outfit Tab)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Welcome to the FashionMind AI Outfit Lab. I am Vortex, your personal style director. Let’s curate your next signature look. What is the occasion?', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === AppTab.OUTFIT) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  // --- 3D Tilt Effect Logic ---
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTiltStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
        transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: 'transform 0.5s ease-out'
    });
  };

  // --- Handlers ---

  const handleFetchWeather = async (query: string) => {
    setIsFetchingWeather(true);
    try {
        const result = await GeminiService.getWeather(query);
        setWeatherData(result.text);
        if (result.sources && result.sources.length > 0) {
            setWeatherSource(result.sources[0]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsFetchingWeather(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    setIsFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            handleFetchWeather(`latitude ${latitude}, longitude ${longitude}`);
        },
        () => {
            setIsFetchingWeather(false);
            alert("Unable to retrieve your location");
        }
    );
  };

  const toggleCategory = (cat: string) => {
    setCategories(prev => {
        if (prev.includes(cat)) {
            return prev.filter(c => c !== cat);
        } else {
            return [...prev, cat];
        }
    });
  };

  const handleSaveToWardrobe = () => {
    if (generatedImage) {
        const newItem: WardrobeItem = {
            id: Date.now().toString(),
            image: generatedImage,
            description: stylistAdvice || itemDescription || "Custom Look",
            season: season,
            timestamp: Date.now()
        };
        setWardrobe(prev => [newItem, ...prev]);
        setActiveTab(AppTab.WARDROBE);
    }
  };

  const handleDeleteWardrobeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  const handleTryOn = async () => {
    if (!userImage) return;

    setIsGenerating(true);
    setGeneratedImage(null);
    setGeneratedVideo(null); // Reset video
    setStylistAdvice(null);

    try {
      // Step 1: Analyze Context (Weather, Demographics, User Vision)
      setLoadingStage('ANALYZING CONTEXT...'); 
      
      const suggestion = await GeminiService.suggestOutfit(
          userImage, 
          itemDescription, 
          categories, 
          nationality, 
          season, 
          weatherData,
          gender,
          skinTone
      );
      
      const finalDescription = suggestion.description;
      setStylistAdvice(suggestion.advice);
      setItemDescription(finalDescription); 

      // Step 2: Generate 3D Assets (Image)
      setLoadingStage('RENDERING 3D ASSETS...');
      const resultBase64 = await GeminiService.generateVirtualTryOn(
        userImage,
        finalDescription,
        categories,
        season,
        weatherData,
        gender,
        skinTone
      );
      setGeneratedImage(resultBase64);
    } catch (error) {
      console.error(error);
      alert("The atelier is currently busy. Please try again.");
    } finally {
      setIsGenerating(false);
      setLoadingStage('READY');
    }
  };

  const handleGenerateVideo = async () => {
    if (!generatedImage || !itemDescription) return;

    // Check for API Key using the global window object (Google AI Studio injected)
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
            await aiStudio.openSelectKey();
            // We assume successful selection if the dialog closes and we proceed.
            // A safer check would be to check hasKey again, but we'll try to proceed.
        }
    }

    setIsGeneratingVideo(true);
    setLoadingStage('GENERATING 360° MOTION...');
    try {
        const videoUri = await GeminiService.generateRotationVideo(generatedImage, itemDescription);
        setGeneratedVideo(videoUri);
    } catch (e) {
        console.error("Video Generation Error:", e);
        alert("Unable to generate 3D motion video. Please try again or check your API key.");
    } finally {
        setIsGeneratingVideo(false);
        setLoadingStage('READY');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatTyping(true);

    const apiHistory = chatHistory.map(m => ({ role: m.role, text: m.text }));
    const responseText = await GeminiService.getStylistAdvice(apiHistory, newUserMsg.text);

    const newBotMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, newBotMsg]);
    setIsChatTyping(false);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-fashion-bg/90 z-10"></div>
             {/* Abstract animated background elements could go here */}
             <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-fashion-accent/5 blur-[100px]"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/10 blur-[80px]"></div>
        </div>
        
        <div className="z-20 text-center max-w-3xl px-6">
            <p className="text-xs font-bold tracking-[0.4em] text-fashion-accent mb-6 uppercase animate-[fadeIn_1s_ease-out]">The Future of Fashion</p>
            <h1 className="font-serif text-6xl md:text-8xl italic text-fashion-text mb-8 leading-tight">
                FashionMind AI <br/> Atelier
            </h1>
            <p className="text-fashion-subtext text-sm md:text-base tracking-widest leading-loose mb-12 max-w-xl mx-auto">
                Experience the intersection of haute couture and artificial intelligence. 
                Curate your seasonal wardrobe, consult with expert algorithms, and visualize your style in 3D.
            </p>
            
            <div className="flex flex-col md:flex-row gap-6 justify-center">
                <button 
                    onClick={() => setActiveTab(AppTab.TRY_ON)}
                    className="bg-fashion-text text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-fashion-accent transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                >
                    Start 3D Fitting
                </button>
                <button 
                    onClick={() => setActiveTab(AppTab.OUTFIT)}
                    className="bg-white text-fashion-text border border-fashion-border px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:border-fashion-accent hover:text-fashion-accent transition-all shadow-sm hover:shadow-lg"
                >
                    Consult Stylist
                </button>
            </div>
        </div>
    </div>
  );

  const renderWardrobe = () => (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8 md:p-12">
        <div className="max-w-7xl mx-auto">
            <header className="mb-12 border-b border-fashion-border pb-6 flex justify-between items-end">
                <div>
                    <h2 className="font-serif text-4xl italic text-fashion-text mb-2">My Wardrobe</h2>
                    <p className="text-[10px] text-fashion-subtext uppercase tracking-widest">Saved Collections • {wardrobe.length} Items</p>
                </div>
            </header>
            
            {wardrobe.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-50">
                    <div className="w-24 h-24 border-2 border-dashed border-fashion-subtext/30 rounded-full flex items-center justify-center mb-6">
                        <span className="font-serif italic text-2xl text-fashion-subtext">0</span>
                    </div>
                    <p className="text-fashion-subtext tracking-widest uppercase text-xs">Your wardrobe is empty</p>
                    <button onClick={() => setActiveTab(AppTab.TRY_ON)} className="mt-6 text-fashion-accent underline text-xs tracking-wider">Create your first look</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {wardrobe.map((item) => (
                        <div key={item.id} className="group relative bg-white shadow-sm hover:shadow-xl transition-shadow duration-500">
                             <button 
                                onClick={(e) => handleDeleteWardrobeItem(item.id, e)}
                                className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/90 backdrop-blur-sm flex items-center justify-center text-fashion-subtext hover:text-red-500 hover:bg-white transition-all rounded-full opacity-0 group-hover:opacity-100 shadow-sm"
                                title="Delete Item"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <div className="aspect-[3/4] overflow-hidden">
                                <img src={item.image} alt="Wardrobe Item" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" />
                            </div>
                            <div className="p-4 bg-white border-t border-fashion-border">
                                <p className="text-[10px] text-fashion-accent uppercase tracking-widest font-bold mb-1">{item.season}</p>
                                <p className="font-serif italic text-sm text-fashion-text line-clamp-2 leading-relaxed">{item.description}</p>
                                <p className="text-[9px] text-fashion-subtext mt-3 text-right">{new Date(item.timestamp).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  const renderOutfitLab = () => (
    <div className="w-full h-full flex flex-col max-w-5xl mx-auto bg-white shadow-2xl shadow-neutral-100 my-0 md:my-8 border-x border-fashion-border">
        {/* Chat Header */}
        <div className="p-6 border-b border-fashion-border bg-fashion-bg/50 backdrop-blur-sm flex justify-between items-center">
            <div>
                <h2 className="font-serif text-2xl italic text-fashion-text">Outfit Lab</h2>
                <p className="text-[10px] text-fashion-accent uppercase tracking-widest mt-1">AI Fashion Director</p>
            </div>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar bg-white">
            {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-[10px] text-fashion-subtext uppercase tracking-widest font-bold">{msg.role === 'user' ? 'You' : 'Vortex'}</span>
                        <span className="text-[9px] text-neutral-300">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`max-w-[85%] md:max-w-[70%] p-6 text-sm font-medium leading-7 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-fashion-text text-white rounded-t-sm rounded-bl-sm' 
                        : 'bg-fashion-bg text-fashion-text border border-fashion-border rounded-t-sm rounded-br-sm'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isChatTyping && (
                <div className="flex flex-col items-start animate-pulse">
                     <span className="text-[10px] text-fashion-subtext uppercase tracking-widest mb-2 font-bold">Vortex</span>
                    <div className="p-4 bg-fashion-bg text-fashion-accent border border-fashion-border w-24 h-12 rounded-t-sm rounded-br-sm shadow-sm flex items-center justify-center italic font-serif">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef}></div>
        </div>

        {/* Input Area */}
        <div className="p-6 md:p-8 border-t border-fashion-border bg-white">
            <div className="relative">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about trends, combinations, or color theory..." 
                    className="w-full bg-fashion-bg border-b-2 border-fashion-border py-5 pl-6 pr-16 text-sm font-medium focus:border-fashion-accent outline-none placeholder-neutral-400 uppercase tracking-wider transition-colors"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatTyping}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-fashion-subtext hover:text-fashion-accent transition-colors p-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
  );

  const renderTryOn = () => (
    <div className="flex flex-col md:flex-row h-full">
        {/* Left Panel: Inputs */}
        <div className="w-full md:w-[400px] lg:w-[480px] border-r border-fashion-border bg-white flex flex-col h-full z-10 shadow-xl shadow-neutral-100/50 overflow-hidden">
             <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="p-8 md:p-10 space-y-12">
                    
                    {/* Step 1: Image */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-baseline">
                            <span className="font-serif italic text-xl text-fashion-text">01. The Subject</span>
                            
                            {/* Input Toggle */}
                            <div className="flex gap-1 text-[10px] uppercase tracking-widest font-medium">
                                <button 
                                    onClick={() => setInputMode('upload')}
                                    className={`px-2 py-1 transition-colors ${inputMode === 'upload' ? 'text-fashion-accent border-b border-fashion-accent' : 'text-fashion-subtext hover:text-fashion-text'}`}
                                >
                                    Upload
                                </button>
                                <span className="text-neutral-300">|</span>
                                <button 
                                    onClick={() => setInputMode('camera')}
                                    className={`px-2 py-1 transition-colors ${inputMode === 'camera' ? 'text-fashion-accent border-b border-fashion-accent' : 'text-fashion-subtext hover:text-fashion-text'}`}
                                >
                                    Camera
                                </button>
                            </div>

                            {userImage && (
                                <button 
                                    onClick={() => {
                                        setUserImage(null); 
                                        setGeneratedImage(null); 
                                        setGeneratedVideo(null);
                                        setStylistAdvice(null);
                                        setItemDescription(''); // ALSO CLEAR TEXT ON RESET
                                    }} 
                                    className="text-[10px] uppercase tracking-widest text-fashion-subtext hover:text-fashion-accent border-b border-neutral-300 hover:border-fashion-accent transition-all pb-0.5 ml-2"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        {userImage ? (
                            <div className="relative aspect-[3/4] w-full overflow-hidden shadow-lg">
                                <img src={userImage} alt="Subject" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out" />
                                <div className="absolute inset-0 ring-1 ring-black/5"></div>
                            </div>
                        ) : (
                            inputMode === 'camera' 
                                ? <CameraCapture onCapture={setUserImage} />
                                : <FileUpload onImageSelect={setUserImage} />
                        )}

                        {/* Demographics Subsection */}
                         <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-fashion-subtext">Gender</label>
                                <div className="flex bg-fashion-bg p-1 rounded-sm border border-fashion-border">
                                    {['Woman', 'Man'].map((g) => (
                                        <button 
                                            key={g}
                                            onClick={() => setGender(g)}
                                            className={`flex-1 text-[10px] uppercase tracking-wider py-2 transition-all ${gender === g ? 'bg-fashion-text text-white shadow-sm' : 'text-fashion-subtext hover:text-fashion-text'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-fashion-subtext">Ethnicity/Skin</label>
                                <select 
                                    value={skinTone}
                                    onChange={(e) => setSkinTone(e.target.value)}
                                    className="w-full bg-fashion-bg border-b-2 border-fashion-border text-sm font-medium text-fashion-text py-2 px-1 focus:border-fashion-accent outline-none appearance-none"
                                >
                                    <option value="East Asian">East Asian</option>
                                    <option value="Southeast Asian">Southeast Asian</option>
                                    <option value="South Asian">South Asian</option>
                                    <option value="Middle Eastern">Middle Eastern</option>
                                    <option value="African / African Diaspora">African / African Diaspora</option>
                                    <option value="Latin American">Latin American</option>
                                    <option value="European">European</option>
                                    <option value="Pacific Islander">Pacific Islander</option>
                                    <option value="Mixed / Multicultural">Mixed / Multicultural</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                             </div>
                         </div>
                    </div>

                        {/* Step 1.5: Context (Weather & Nationality) */}
                        <div className="space-y-6">
                            <span className="font-serif italic text-xl text-fashion-text block">02. Atmosphere</span>
                            
                            {/* Nationality Input */}
                            <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-fashion-subtext block">
                                Style Region
                            </label>
                            <input 
                                type="text" 
                                value={nationality}
                                onChange={(e) => setNationality(e.target.value)}
                                placeholder="E.g. Parisian, Tokyo Street..." 
                                className="w-full bg-fashion-bg border-b-2 border-fashion-border focus:border-fashion-accent py-3 px-3 text-sm font-medium text-fashion-text outline-none placeholder-neutral-400 transition-colors"
                            />
                        </div>

                        {/* Weather Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase tracking-widest text-fashion-subtext block">
                                    Weather Forecast
                                </label>
                                <button 
                                    onClick={handleDetectLocation}
                                    disabled={isFetchingWeather}
                                    className="text-[10px] uppercase tracking-widest text-fashion-accent hover:text-orange-700 flex items-center gap-1"
                                >
                                    {isFetchingWeather ? 'Scanning...' : '📍 Detect Local'}
                                </button>
                            </div>
                            
                            {weatherData ? (
                                <div className="bg-fashion-bg p-3 border-l-2 border-fashion-accent">
                                    <p className="text-sm text-fashion-text font-medium">{weatherData}</p>
                                    {weatherSource && (
                                        <a href={weatherSource.uri} target="_blank" rel="noreferrer" className="text-[10px] text-fashion-subtext underline mt-1 block hover:text-fashion-accent truncate">
                                            Source: {weatherSource.title}
                                        </a>
                                    )}
                                    <button onClick={() => setWeatherData('')} className="text-[10px] text-fashion-subtext mt-2 hover:text-red-500">Clear</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFetchWeather(location)}
                                        placeholder="Enter City for Weather..." 
                                        className="flex-1 bg-fashion-bg border-b-2 border-fashion-border focus:border-fashion-accent py-3 px-3 text-sm font-medium text-fashion-text outline-none placeholder-neutral-400 transition-colors"
                                    />
                                    <button 
                                        onClick={() => handleFetchWeather(location)}
                                        disabled={!location.trim() || isFetchingWeather}
                                        className="bg-fashion-text text-white px-3 text-xs uppercase tracking-wider hover:bg-fashion-accent transition-colors"
                                    >
                                        Check
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>


                    {/* Step 3: Details */}
                    <div className="space-y-6">
                        <span className="font-serif italic text-xl text-fashion-text block">03. The Garment</span>
                        
                        {/* Season Selector */}
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest text-fashion-subtext">Season</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Spring', 'Summer', 'Autumn', 'Winter'].map((s) => (
                                    <button 
                                        key={s}
                                        onClick={() => setSeason(s)}
                                        className={`py-3 px-4 text-xs uppercase tracking-widest text-left transition-all border shadow-sm ${
                                            season === s 
                                            ? 'bg-fashion-accent text-white border-fashion-accent' 
                                            : 'bg-white text-fashion-subtext border-fashion-border hover:border-fashion-accent hover:text-fashion-accent'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Categories Selector - Multi Select */}
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest text-fashion-subtext">Categories <span className="text-neutral-400 normal-case tracking-normal ml-2">(Select Multiple)</span></label>
                            <div className="grid grid-cols-2 gap-3">
                                {['tops', 'bottoms', 'outerwear', 'accessories'].map((cat) => {
                                    const isSelected = categories.includes(cat);
                                    return (
                                        <button 
                                            key={cat}
                                            onClick={() => toggleCategory(cat)}
                                            className={`py-3 px-4 text-xs uppercase tracking-widest text-left transition-all border shadow-sm flex justify-between items-center ${
                                                isSelected 
                                                ? 'bg-fashion-accent text-white border-fashion-accent' 
                                                : 'bg-white text-fashion-subtext border-fashion-border hover:border-fashion-accent hover:text-fashion-accent'
                                            }`}
                                        >
                                            {cat}
                                            {isSelected && <span className="text-xs">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] uppercase tracking-widest text-fashion-subtext">
                                    Vision <span className="text-neutral-400 normal-case tracking-normal ml-2">(Optional)</span>
                                </label>
                                {itemDescription && (
                                    <button 
                                        onClick={() => setItemDescription('')}
                                        className="text-[9px] text-fashion-subtext hover:text-red-500 uppercase tracking-wider transition-colors"
                                    >
                                        Clear Text
                                    </button>
                                )}
                            </div>
                            <textarea 
                                value={itemDescription}
                                onChange={(e) => setItemDescription(e.target.value)}
                                placeholder="Describe the texture, cut, and fit..."
                                className="w-full bg-fashion-bg border-b-2 border-fashion-border focus:border-fashion-accent p-3 text-sm font-medium text-fashion-text outline-none resize-none h-24 placeholder-neutral-400 leading-relaxed transition-colors"
                            />
                        </div>

                        <button 
                            onClick={handleTryOn}
                            disabled={!userImage || isGenerating || categories.length === 0}
                            className="w-full py-5 bg-fashion-text text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-fashion-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl shadow-neutral-900/10"
                        >
                            {isGenerating ? loadingStage : (itemDescription.trim() ? 'Generate 3D Look' : 'Auto-Style & Render')}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Panel: Display / Result */}
        <div className="flex-1 bg-fashion-bg relative flex items-center justify-center overflow-hidden p-8 md:p-16">
            
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

            {isGenerating || isGeneratingVideo ? (
                <LoadingSpinner message={loadingStage} />
            ) : generatedImage ? (
                <div className="w-full h-full max-w-6xl flex flex-col items-center justify-center animate-[fadeIn_1s_ease-out] z-10">
                    
                    <div className="relative w-full h-full flex flex-col md:flex-row gap-8 lg:gap-16 items-center justify-center">
                        {/* The Image/Video Frame */}
                        <div className="flex flex-col items-center gap-4">
                             <div 
                                ref={imageContainerRef}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                                style={generatedVideo ? {} : tiltStyle}
                                className="relative bg-white p-4 shadow-2xl shadow-neutral-200 max-h-[60vh] md:max-h-[80vh] flex-shrink border border-neutral-100 flex flex-col transition-all duration-100 ease-out"
                             >
                                {generatedVideo ? (
                                    <div className="relative h-[60vh] aspect-[9/16]">
                                        <video 
                                            src={generatedVideo} 
                                            autoPlay 
                                            loop 
                                            playsInline 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[8px] px-2 py-1 uppercase tracking-widest">360° View</div>
                                    </div>
                                ) : (
                                    <>
                                        <img 
                                            src={generatedImage} 
                                            alt="Editorial Result" 
                                            className="h-full w-auto object-contain max-h-[50vh] md:max-h-[70vh] cursor-move" 
                                        />
                                        {!generatedVideo && (
                                            <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 text-[8px] uppercase tracking-widest text-fashion-accent border border-fashion-accent/20 rounded-sm pointer-events-none">
                                                Interactive 3D Card
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="mt-4 flex justify-between items-end pt-4 border-t border-dashed border-neutral-100">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-fashion-accent font-bold">Collection</p>
                                        <p className="font-serif italic text-lg text-fashion-text capitalize">{season} Collection</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleSaveToWardrobe}
                                            className="text-[10px] uppercase tracking-widest text-fashion-text border border-fashion-text px-4 py-2 hover:bg-fashion-accent hover:border-fashion-accent hover:text-white transition-colors"
                                        >
                                            Save
                                        </button>
                                        <a 
                                            href={generatedImage}
                                            download="vogue-ai-look.jpg"
                                            className="text-[10px] uppercase tracking-widest bg-fashion-text text-white px-4 py-2 hover:bg-fashion-accent transition-colors flex items-center"
                                        >
                                            Download
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 360 Video Button */}
                            {!generatedVideo && (
                                <button
                                    onClick={handleGenerateVideo}
                                    className="group flex items-center gap-2 px-6 py-3 bg-white border border-fashion-accent/30 rounded-full shadow-lg hover:shadow-xl hover:border-fashion-accent transition-all hover:-translate-y-1"
                                >
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fashion-accent opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-fashion-accent"></span>
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-fashion-text group-hover:text-fashion-accent">
                                        Generate 360° Motion
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Stylist Note */}
                        {stylistAdvice && (
                            <div className="w-full md:w-80 lg:w-96 flex flex-col self-center animate-[slideUp_1s_ease-out]">
                                <div className="relative bg-white/95 backdrop-blur-sm p-8 shadow-xl shadow-neutral-900/5 rounded-sm border-l-4 border-fashion-accent">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-fashion-subtext block mb-6 font-bold">Director's Note</span>
                                    <p className="font-serif text-lg leading-8 text-fashion-text mb-6">
                                        {stylistAdvice}
                                    </p>
                                    <div className="w-12 h-1 bg-fashion-accent mb-2"></div>
                                    <p className="text-xs text-fashion-subtext font-sans tracking-wide">FashionMind AI Atelier</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                <div className="text-center opacity-40 z-10">
                    <h3 className="font-serif text-7xl italic mb-6 text-fashion-text">FashionMind AI</h3>
                    <p className="text-xs uppercase tracking-[0.5em] text-fashion-accent font-bold">3D Virtual Atelier Experience</p>
                    <p className="text-[10px] text-fashion-subtext mt-4 max-w-xs mx-auto">Upload your photo, set the context, and let our generative engine render your high-fashion look.</p>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-fashion-bg text-fashion-text overflow-hidden selection:bg-fashion-accent selection:text-white">
      
      {/* Top Navigation */}
      <header className="h-20 flex items-center justify-between px-8 md:px-12 border-b border-fashion-border bg-white/80 backdrop-blur-sm z-30 sticky top-0">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab(AppTab.HOME)}>
            <div className="w-8 h-8 bg-fashion-accent text-white flex items-center justify-center">
                <span className="font-serif italic text-lg">V</span>
            </div>
            <h1 className="font-serif text-2xl tracking-widest uppercase text-fashion-text">FashionMind<span className="font-sans font-light text-fashion-accent ml-2 text-sm tracking-normal">AI ATELIER</span></h1>
        </div>
        <nav className="hidden md:flex gap-10 text-xs tracking-[0.2em] font-medium">
            <button 
                onClick={() => setActiveTab(AppTab.HOME)}
                className={`uppercase hover:text-fashion-accent transition-all py-2 border-b-2 border-transparent ${activeTab === AppTab.HOME ? 'text-fashion-accent border-fashion-accent' : 'text-fashion-subtext'}`}
            >
                Home
            </button>
            <button 
                onClick={() => setActiveTab(AppTab.OUTFIT)}
                className={`uppercase hover:text-fashion-accent transition-all py-2 border-b-2 border-transparent ${activeTab === AppTab.OUTFIT ? 'text-fashion-accent border-fashion-accent' : 'text-fashion-subtext'}`}
            >
                Outfit Tab
            </button>
            <button 
                onClick={() => setActiveTab(AppTab.WARDROBE)}
                className={`uppercase hover:text-fashion-accent transition-all py-2 border-b-2 border-transparent ${activeTab === AppTab.WARDROBE ? 'text-fashion-accent border-fashion-accent' : 'text-fashion-subtext'}`}
            >
                Wardrobe
            </button>
            <button 
                onClick={() => setActiveTab(AppTab.TRY_ON)}
                className={`uppercase hover:text-fashion-accent transition-all py-2 border-b-2 border-transparent ${activeTab === AppTab.TRY_ON ? 'text-fashion-accent border-fashion-accent' : 'text-fashion-subtext'}`}
            >
                3D Virtual Try-On
            </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
          {activeTab === AppTab.HOME && renderHome()}
          {activeTab === AppTab.OUTFIT && renderOutfitLab()}
          {activeTab === AppTab.WARDROBE && renderWardrobe()}
          {activeTab === AppTab.TRY_ON && renderTryOn()}
      </main>
    </div>
  );
};

export default App;