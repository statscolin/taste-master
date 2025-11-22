import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RetroSlider } from './components/RetroSlider';
import { DrinkVisualizer } from './components/DrinkVisualizer';
import { GameState, Recipe, TurnResult, ObjectiveParams, BotConfig } from './types';
import { generateObjectiveFunction, evaluateRecipe, BayesianOptimizer } from './services/mathService';
import { getBartenderReview } from './services/reviewService';
import { ResultVisualization } from './components/ResultVisualization';
import { PixelAvatar } from './components/PixelAvatar';
import { audioService } from './services/audioService';

const MAX_TURNS = 10;

// Default House Bot (The Rival)
const HOUSE_BOT_CONFIG: BotConfig = {
  name: 'HOUSE_AI',
  kappa: 3.0,
  lengthScale: 15,
  sigmaF: 50,
  noiseVariance: 25
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [objectiveParams, setObjectiveParams] = useState<ObjectiveParams | null>(null);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(true);

  // Player (Custom Bot) State
  const [customBotConfig, setCustomBotConfig] = useState<BotConfig>({
    name: 'CUSTOM_BOT',
    kappa: 2.5,
    lengthScale: 15,
    sigmaF: 50,
    noiseVariance: 25
  });
  const customBotOptimizer = useRef<BayesianOptimizer | null>(null);

  const [currentRecipe, setCurrentRecipe] = useState<Recipe>({ sweetness: 50, sourness: 50, bitterness: 50 });
  const [playerHistory, setPlayerHistory] = useState<TurnResult[]>([]);
  
  // House Bot State
  const [botHistory, setBotHistory] = useState<TurnResult[]>([]);
  const [botRecipeDisplay, setBotRecipeDisplay] = useState<Recipe>({ sweetness: 0, sourness: 0, bitterness: 0 });
  const houseBotOptimizer = useRef<BayesianOptimizer | null>(null);

  // UI State
  const [turn, setTurn] = useState(1);
  const [bartenderText, setBartenderText] = useState<string>("AWAITING ALGORITHM CONFIGURATION...");
  const [loadingReview, setLoadingReview] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<number>(123);

  const toggleAudio = () => {
    const playing = audioService.toggle();
    setIsMuted(!playing);
  };

  const startGame = () => {
    // Init Audio
    audioService.play();
    setIsMuted(false);

    const params = generateObjectiveFunction();
    setObjectiveParams(params);
    setGameState(GameState.PLAYING);
    setPlayerHistory([]);
    setBotHistory([]);
    setTurn(1);
    setLastScore(null);
    
    // Initialize Optimizers
    houseBotOptimizer.current = new BayesianOptimizer(HOUSE_BOT_CONFIG);
    customBotOptimizer.current = new BayesianOptimizer(customBotConfig);

    setBotRecipeDisplay({ sweetness: 0, sourness: 0, bitterness: 0 });
    setBartenderText("Algorithms Initialized. Simulation Starting...");
    setAvatarSeed(Math.random());
  };

  // AUTO PLAY LOGIC
  useEffect(() => {
    if (gameState === GameState.PLAYING && turn <= MAX_TURNS) {
      // Delay to create suspense
      const timer = setTimeout(() => {
        executeTurn();
      }, 2000); // 2 second delay between turns
      return () => clearTimeout(timer);
    } else if (turn > MAX_TURNS && gameState === GameState.PLAYING) {
      setGameState(GameState.GAME_OVER);
    }
  }, [gameState, turn]);

  const executeTurn = async () => {
    if (!objectiveParams || !customBotOptimizer.current || !houseBotOptimizer.current) return;

    setGameState(GameState.PROCESSING);
    setBartenderText("CALCULATING OPTIMAL VECTORS...");

    // 1. Custom Bot (Player Side) Decides
    customBotOptimizer.current.update(playerHistory);
    const customRecipe = customBotOptimizer.current.recommendNext();
    setCurrentRecipe(customRecipe); // Visual update

    const customScore = evaluateRecipe(customRecipe, objectiveParams);
    const customTurnResult: TurnResult = {
      recipe: customRecipe,
      score: customScore,
      turn: turn
    };
    const newPlayerHistory = [...playerHistory, customTurnResult];
    setPlayerHistory(newPlayerHistory);
    setLastScore(customScore);

    // 2. House Bot Decides
    houseBotOptimizer.current.update(botHistory);
    const houseRecipe = houseBotOptimizer.current.recommendNext();
    setBotRecipeDisplay(houseRecipe); // Visual update
    
    const houseScore = evaluateRecipe(houseRecipe, objectiveParams);
    const houseTurnResult: TurnResult = {
      recipe: houseRecipe,
      score: houseScore,
      turn: turn
    };
    const newBotHistory = [...botHistory, houseTurnResult];
    setBotHistory(newBotHistory);

    // 3. Get Flavor Text (based on custom bot's result)
    setLoadingReview(true);
    // Small artificial delay for the "API" feel
    setTimeout(async () => {
        const review = await getBartenderReview(customRecipe, customScore, turn);
        setBartenderText(review);
        setLoadingReview(false);
        setAvatarSeed(Math.random()); // New customer
        
        // Advance turn
        setTurn(prev => prev + 1);
        setGameState(GameState.PLAYING);
    }, 1000);
  };

  const renderConfigSlider = (
    label: string, 
    key: keyof BotConfig, 
    min: number, 
    max: number, 
    step: number, 
    description: string, 
    color: string
  ) => (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-1">
        <label className="text-xs font-pixel text-gray-300">{label}</label>
        <span className="font-bold font-mono" style={{color}}>{customBotConfig[key]}</span>
      </div>
      <input 
        type="range"
        min={min} max={max} step={step}
        value={customBotConfig[key] as number}
        onChange={(e) => setCustomBotConfig({...customBotConfig, [key]: Number(e.target.value)})}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600"
        style={{ accentColor: color }}
      />
      <p className="text-[10px] text-gray-500 font-mono mt-1">{description}</p>
    </div>
  );

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 text-center z-10 relative overflow-y-auto custom-scrollbar">
       <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1 bg-pink-500 h-full opacity-20 blur-md"></div>
          <div className="absolute top-0 right-1/4 w-1 bg-cyan-500 h-full opacity-20 blur-md"></div>
       </div>

      <h1 className="font-pixel text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-pink-400 via-purple-400 to-cyan-400 mb-2 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] z-20 mt-10">
        Taste Master
      </h1>
      <div className="text-lg md:text-xl text-cyan-300 font-mono mb-8 tracking-widest animate-pulse">DESIGN YOUR OPTIMIZER</div>
      
      <div className="glass-panel neon-border p-6 max-w-3xl w-full relative z-20 flex flex-col md:flex-row gap-8 text-left">
        
        {/* Left: Description */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-gray-300 font-mono mb-4 text-sm leading-relaxed">
            Greetings, most intelligent humans. Our bar serves travelers from across the cosmos—their palates defy your imagination. 
            <br/><br/>
            Thus, we have instituted the ultimate trial: to find a "Master of Taste." Your opponent is the most advanced Bayesian automaton in existence. 
            <br/><br/>
            This is not merely a contest, but a duel between logic and intuition. Do you dare accept the challenge?
          </p>
        </div>

        {/* Right: Config Panel */}
        <div className="flex-1 bg-black/20 p-4 rounded border border-gray-700">
           <h3 className="text-cyan-400 font-pixel text-xs mb-4 border-b border-gray-700 pb-2">BOT CONFIGURATION</h3>
           
           {renderConfigSlider(
             "EXPLORATION (Kappa)", "kappa", 0, 10, 0.1,
             "High = Curious. Tries unknown recipes. Low = Greedy. Sticks to high scores.",
             "#ec4899"
           )}
           
           {renderConfigSlider(
             "SENSITIVITY (Length Scale)", "lengthScale", 5, 50, 1,
             "Low = Sees tiny details (Jagged). High = Sees broad trends (Smooth).",
             "#facc15"
           )}

           {renderConfigSlider(
             "CONFIDENCE (Noise Variance)", "noiseVariance", 0, 50, 1,
             "Low = Trusts every score completely. High = Expects random errors.",
             "#2dd4bf"
           )}
           
           <button 
            onClick={startGame}
            className="mt-4 w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-pixel text-sm tracking-widest shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all hover:scale-105"
           >
            DEPLOY ALGORITHM
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlaying = () => (
    <div className="flex flex-col h-full w-full p-2 md:p-6 gap-4 z-10 relative max-w-[1600px] mx-auto">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center glass-panel p-4 rounded-lg border-b-2 border-cyan-500/50">
        <div className="flex items-center gap-4">
           <div className={`h-4 w-4 rounded-full ${gameState === GameState.PROCESSING ? 'bg-yellow-400 animate-ping' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
           <div className="flex flex-col">
              <span className="font-pixel text-xs md:text-sm text-cyan-400 drop-shadow-md">AUTO-SIMULATION RUNNING</span>
              <span className="font-mono text-[10px] text-gray-400">Observing Bot Decisions...</span>
           </div>
        </div>
        <div className="font-pixel text-2xl md:text-4xl text-white tracking-widest">
           ROUND <span className="text-pink-500">{turn}</span><span className="text-gray-600">/</span>{MAX_TURNS}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
        
        {/* LEFT: Custom Bot Station */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full">
          <div className="flex-grow glass-panel border border-pink-500/30 p-6 shadow-2xl rounded-xl relative flex flex-col md:flex-row gap-8 items-center justify-center">
             {/* Background Glow */}
             <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 to-black rounded-xl pointer-events-none"></div>
             
             {/* The Visualizer */}
             <div className="relative z-10 flex-shrink-0 transform scale-110">
               <DrinkVisualizer recipe={currentRecipe} label="YOUR BOT" animate={true} />
             </div>

             {/* The Controls (Read Only now) */}
             <div className="w-full max-w-md z-10 opacity-80 pointer-events-none">
               <div className="absolute top-4 right-4 text-[10px] font-pixel text-pink-400 border border-pink-500 px-2 py-1 rounded animate-pulse">
                 AI CONTROLLED
               </div>
               <h2 className="font-pixel text-gray-400 text-xs mb-6 text-center">DECISION PARAMETERS</h2>
               <RetroSlider 
                label="SWEETNESS" 
                value={currentRecipe.sweetness} 
                onChange={() => {}}
                color="#ec4899" 
                disabled={true}
              />
              <RetroSlider 
                label="SOURNESS" 
                value={currentRecipe.sourness} 
                onChange={() => {}}
                color="#facc15" 
                disabled={true}
              />
              <RetroSlider 
                label="BITTERNESS" 
                value={currentRecipe.bitterness} 
                onChange={() => {}}
                color="#2dd4bf" 
                disabled={true}
              />
             </div>
          </div>
        </div>

        {/* RIGHT: House Bot & Data */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full">
          
          {/* Bot Visualizer (Opponent Station) */}
          <div className="glass-panel border border-red-900/50 p-4 rounded-xl flex items-center justify-around relative overflow-hidden">
             <div className="absolute inset-0 bg-red-900/10 pointer-events-none"></div>
             <div className="z-10 text-left">
                <h3 className="font-pixel text-red-400 text-sm mb-1">HOUSE BOT</h3>
                <p className="font-mono text-xs text-gray-400">Standard Configuration</p>
                {botHistory.length > 0 && (
                  <div className="mt-2 font-pixel text-2xl text-white">
                    Score: <span className="text-red-400">{botHistory[botHistory.length - 1].score}</span>
                  </div>
                )}
             </div>
             <div className="z-10 transform scale-75 origin-center">
                <DrinkVisualizer recipe={botRecipeDisplay} label="RIVAL" animate={gameState === GameState.PROCESSING} />
             </div>
          </div>

          {/* Score Display */}
          <div className="bg-black/60 border border-gray-700 p-4 rounded-xl flex items-center justify-between neon-border">
             <span className="text-pink-400 font-pixel text-xs md:text-sm">YOUR BOT SCORE</span>
             <div className="font-pixel text-5xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                {lastScore !== null ? lastScore : <span className="text-gray-800">--</span>}
             </div>
          </div>

          {/* Customer Feedback */}
          <div className="glass-panel border-l-4 border-purple-500 p-4 min-h-[120px] flex flex-row items-center gap-4 relative shadow-lg rounded-r-xl">
             <div className="flex-shrink-0 border-2 border-purple-500/30 rounded-lg p-1 bg-black/40">
               <PixelAvatar seed={avatarSeed} className="w-12 h-12 md:w-16 md:h-16" />
             </div>
             <div className="flex-grow">
                <div className="text-[10px] text-purple-400 font-mono mb-1 uppercase">Guest Review</div>
                <p className={`font-vt323 text-2xl leading-none text-purple-100 ${loadingReview ? 'animate-pulse' : ''}`}>
                    {loadingReview ? "> *Evaluating...*" : `> "${bartenderText}"`}
                </p>
             </div>
          </div>

          {/* Mini Log */}
           <div className="flex-grow glass-panel p-2 rounded-xl overflow-hidden flex flex-col border border-gray-700">
             <div className="text-xs font-pixel text-center text-gray-500 mb-2 border-b border-gray-700 pb-1">DATA LOG</div>
             <div className="overflow-y-auto custom-scrollbar flex-grow px-2">
                {playerHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-xs font-mono mb-1 border-b border-gray-800 pb-1 last:border-0">
                     <span className="text-cyan-600">R{h.turn}</span>
                     <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 rounded-full bg-pink-500" style={{opacity: h.recipe.sweetness/100}}></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500" style={{opacity: h.recipe.sourness/100}}></div>
                        <div className="w-2 h-2 rounded-full bg-teal-500" style={{opacity: h.recipe.bitterness/100}}></div>
                     </div>
                     <span className={`${h.score > 80 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{h.score} PTS</span>
                  </div>
                ))}
             </div>
           </div>

        </div>
      </div>
    </div>
  );

  const renderGameOver = () => {
    const maxPlayer = Math.max(...playerHistory.map(p => p.score), 0);
    const maxBot = Math.max(...botHistory.map(b => b.score), 0);
    const playerWon = maxPlayer >= maxBot;

    return (
      <div className="flex flex-col items-center w-full h-full overflow-y-auto z-10 relative pt-10 pb-20 px-4">
        <div className="absolute inset-0 bg-black/80 z-0"></div>
        
        <h2 className="font-pixel text-5xl md:text-7xl mb-4 text-white z-10 drop-shadow-[0_0_15px_#ff00ff] animate-pulse">
          SIMULATION END
        </h2>
        
        <div className="flex flex-wrap justify-center gap-8 mb-10 w-full max-w-4xl z-10">
           {/* Player Card */}
           <div className={`flex-1 min-w-[240px] p-8 border-4 ${playerWon ? 'border-green-400 shadow-[0_0_30px_#22c55e]' : 'border-gray-700 grayscale'} bg-gray-900/90 text-center rounded-xl transform transition-all hover:scale-105`}>
              <div className="text-gray-400 text-sm font-pixel mb-4">YOUR BOT BEST</div>
              <div className="text-7xl font-pixel text-white mb-4">{maxPlayer}</div>
              {playerWon && <div className="text-green-400 text-lg font-pixel animate-bounce">SUCCESS!</div>}
           </div>

           {/* Bot Card */}
           <div className={`flex-1 min-w-[240px] p-8 border-4 ${!playerWon ? 'border-red-400 shadow-[0_0_30px_#ef4444]' : 'border-gray-700 grayscale'} bg-gray-900/90 text-center rounded-xl transform transition-all hover:scale-105`}>
              <div className="text-gray-400 text-sm font-pixel mb-4">HOUSE BOT BEST</div>
              <div className="text-7xl font-pixel text-white mb-4">{maxBot}</div>
              {!playerWon && <div className="text-red-400 text-lg font-pixel animate-bounce">SUPERIOR</div>}
           </div>
        </div>

        {/* Vis Section */}
        <div className="w-full max-w-6xl glass-panel p-6 rounded-lg shadow-2xl mb-8 z-10 border border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h3 className="text-2xl text-cyan-300 font-pixel">PERFORMANCE ANALYSIS</h3>
            <div className="flex gap-4 text-xs font-mono mt-2 md:mt-0">
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-400"></div>YOUR BOT</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>HOUSE BOT</div>
            </div>
          </div>
          
          {objectiveParams && (
            <ResultVisualization 
              humanHistory={playerHistory}
              botHistory={botHistory}
              objectiveParams={objectiveParams}
            />
          )}
        </div>

        <button 
          onClick={() => setGameState(GameState.INTRO)}
          className="px-12 py-6 bg-white text-black hover:bg-cyan-300 font-pixel text-xl rounded shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all z-10 hover:scale-110"
        >
          RE-CONFIGURE
        </button>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col text-gray-100 crt overflow-hidden">
      {/* Mute Button */}
      <div className="absolute top-4 right-4 z-50">
         <button 
           onClick={toggleAudio}
           className="text-cyan-400 hover:text-white transition-colors bg-black/50 p-2 rounded border border-gray-600 font-pixel text-xs"
         >
            {isMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}
         </button>
      </div>

      {gameState === GameState.INTRO && renderIntro()}
      {(gameState === GameState.PLAYING || gameState === GameState.PROCESSING) && renderPlaying()}
      {gameState === GameState.GAME_OVER && renderGameOver()}
    </div>
  );
};

export default App;