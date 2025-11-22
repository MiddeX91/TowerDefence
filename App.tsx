import React, { useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Coins, Heart, Zap, X } from 'lucide-react';
import { useGameLoop } from './hooks/useGameLoop';
import { CELL_SIZE, GRID_W, GRID_H, TOWER_STATS, UPGRADES } from './constants';
import { TowerType, Tower } from './types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [showCitadel, setShowCitadel] = useState(false);

  const {
    money, lives, wave, gameOver, citadelLevel, season, waveActive,
    isPaused, setIsPaused, speedMulti, setSpeedMulti,
    startWave, buildTower, sellTower, upgradeTower, upgradeCitadel, useGoodie, getTowerAt, goodieCooldowns,
    resetGame
  } = useGameLoop(canvasRef);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gx = Math.floor(x / CELL_SIZE);
    const gy = Math.floor(y / CELL_SIZE);

    // Check Castle Click
    if(Math.abs(gx - 9) <= 1 && Math.abs(gy - (GRID_H - 2)) <= 1) {
      setShowCitadel(true);
      setSelectedTower(null);
      return;
    }

    // Check Tower Click
    const existingTower = getTowerAt(x, y);
    if (existingTower) {
      setSelectedTower(existingTower);
      setSelectedTowerType(null);
      setShowCitadel(false);
      return;
    }

    // Build
    if (selectedTowerType) {
      buildTower(gx, gy, selectedTowerType);
    }
    
    if (!selectedTowerType && !existingTower) {
      setSelectedTower(null);
      setShowCitadel(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans selection:bg-cyan-500 selection:text-black fixed inset-0">
      
      {/* TOP BAR: Stats & Controls */}
      <div className="h-14 bg-slate-900/95 backdrop-blur border-b border-slate-700 flex items-center justify-between px-3 z-20 shadow-xl shrink-0">
         <div className="flex gap-3 text-sm font-bold font-mono items-center">
            <div className="text-red-500 flex items-center gap-1"><Heart size={16} fill="currentColor"/> {lives}</div>
            <div className="text-yellow-400 flex items-center gap-1"><Coins size={16} /> {money}</div>
            <div className="text-blue-400 flex items-center gap-1"><Zap size={16} /> {wave}</div>
         </div>
         
         <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-slate-400 uppercase mr-2 hidden sm:block">{season}</div>
            <button onClick={() => setIsPaused(!isPaused)} className="bg-slate-700 p-2 rounded text-xs font-bold w-8 h-8 flex items-center justify-center border border-slate-600">
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button onClick={() => setSpeedMulti(s => s === 1 ? 2 : s === 2 ? 5 : 1)} className="bg-slate-700 p-2 rounded text-xs font-bold w-10 h-8 border border-slate-600">
              {speedMulti}x
            </button>
         </div>
      </div>

      {/* CENTER: Game Canvas */}
      <div className="flex-1 relative overflow-hidden bg-black flex justify-center items-center">
        <div className="relative shadow-2xl">
           <canvas 
             ref={canvasRef}
             width={GRID_W * CELL_SIZE}
             height={GRID_H * CELL_SIZE}
             onClick={handleCanvasClick}
             className="touch-none"
             style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
           />

           {/* START WAVE BUTTON OVERLAY */}
           {!waveActive && !gameOver && (
             <button 
               onClick={startWave} 
               className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-900/50 animate-pulse border-2 border-green-400 z-40 active:scale-95 flex items-center gap-2"
             >
               <Zap size={20} fill="currentColor" /> WELLE STARTEN
             </button>
           )}
           
           {/* MENUS OVERLAY */}
           {/* Tower Upgrade Menu */}
           {selectedTower && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur border border-slate-500 rounded-xl p-3 w-64 shadow-2xl z-50">
               <div className="flex justify-between items-center mb-2 border-b border-slate-600 pb-1">
                 <h3 className="font-bold text-white text-sm">{TOWER_STATS[selectedTower.type].name} {selectedTower.level}</h3>
                 <button onClick={() => setSelectedTower(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
               </div>
               <div className="space-y-1">
                  {selectedTower.level === 0 && (
                    <button onClick={() => upgradeTower(selectedTower, 'VETERAN')} className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded border border-slate-600 text-left group">
                      <div className="font-bold text-xs text-white">★ Veteran</div>
                      <div className="text-[10px] text-yellow-400 font-mono">50g</div>
                    </button>
                  )}
                  {selectedTower.level === 1 && UPGRADES[selectedTower.type] && (
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => upgradeTower(selectedTower, 'A')} className="bg-slate-800 hover:bg-blue-900/50 p-1 rounded border border-slate-600 text-left">
                        <div className="font-bold text-[10px]">🔹 A</div>
                        <div className="text-[10px] leading-tight">{UPGRADES[selectedTower.type].A}</div>
                        <div className="text-[10px] text-yellow-400 font-mono">100g</div>
                      </button>
                      <button onClick={() => upgradeTower(selectedTower, 'B')} className="bg-slate-800 hover:bg-red-900/50 p-1 rounded border border-slate-600 text-left">
                        <div className="font-bold text-[10px]">🔸 B</div>
                        <div className="text-[10px] leading-tight">{UPGRADES[selectedTower.type].B}</div>
                        <div className="text-[10px] text-yellow-400 font-mono">100g</div>
                      </button>
                    </div>
                  )}
                  {selectedTower.level === 2 && (
                     <button onClick={() => upgradeTower(selectedTower, 'MASTER')} className="w-full bg-amber-900/50 hover:bg-amber-800 p-2 rounded border border-amber-600 text-left">
                      <div className="font-bold text-xs text-amber-200">👑 Meister</div>
                      <div className="text-[10px] text-yellow-400 font-mono">500g</div>
                    </button>
                  )}
                  {selectedTower.level === 3 && <div className="text-center text-yellow-500 font-bold text-xs py-1">MAX LEVEL</div>}
                  <button onClick={() => sellTower(selectedTower)} className="w-full mt-1 bg-red-900/30 hover:bg-red-900/50 p-1 rounded text-red-200 text-xs font-bold border border-red-900/50">
                    Verkaufen ({Math.floor(TOWER_STATS[selectedTower.type].cost * 0.7)}g)
                  </button>
               </div>
             </div>
           )}

           {/* Citadel Menu */}
           {showCitadel && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur border-2 border-yellow-500 rounded-xl p-4 w-72 shadow-2xl z-50 flex flex-col items-center gap-3">
                <h3 className="text-lg font-bold text-yellow-400">🏰 ZITADELLE</h3>
                <div className="bg-slate-800 p-2 rounded w-full text-center">
                  <div className="text-xs text-slate-400">Level</div>
                  <div className="text-xl font-bold text-white">{citadelLevel}</div>
                  <div className="text-xs text-green-400 font-mono">(+{citadelLevel*10}% DMG)</div>
                </div>
                <button onClick={upgradeCitadel} disabled={money < 2500} className="w-full bg-yellow-700 p-3 rounded font-bold text-white text-sm disabled:opacity-50">
                  Ausbauen (2500g)
                </button>
                <button onClick={() => setShowCitadel(false)} className="text-xs text-slate-500 p-2 border border-slate-700 rounded hover:bg-slate-800">Schließen</button>
             </div>
           )}

           {/* Game Over */}
           {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
               <h1 className="text-4xl font-bold text-red-600 mb-2">GAME OVER</h1>
               <p className="text-lg text-white mb-4">Welle {wave}</p>
               <button onClick={() => resetGame()} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                 <RotateCcw size={16}/> Neustart
               </button>
            </div>
           )}
        </div>
      </div>

      {/* BOTTOM BAR: Towers & Goodies */}
      <div className="h-20 bg-slate-900/95 backdrop-blur border-t border-slate-700 z-20 shrink-0 flex items-center w-full">
        <div className="flex gap-2 overflow-x-auto px-3 py-2 w-full items-center custom-scrollbar">
            
            {/* Goodies */}
            <div className="flex gap-1 border-r border-slate-700 pr-2 shrink-0">
               <button onClick={() => useGoodie('arrow')} disabled={goodieCooldowns.arrow > 0} className="w-12 h-12 bg-orange-900 rounded border border-orange-700 relative overflow-hidden shrink-0 active:scale-95">
                  <div className="text-lg text-center">🏹</div>
                  <div className="absolute bottom-0 left-0 w-full bg-black/60 transition-all" style={{height: `${(goodieCooldowns.arrow/1800)*100}%`}}></div>
               </button>
               <button onClick={() => useGoodie('ice')} disabled={goodieCooldowns.ice > 0} className="w-12 h-12 bg-cyan-900 rounded border border-cyan-700 relative overflow-hidden shrink-0 active:scale-95">
                  <div className="text-lg text-center">❄️</div>
                  <div className="absolute bottom-0 left-0 w-full bg-black/60 transition-all" style={{height: `${(goodieCooldowns.ice/3600)*100}%`}}></div>
               </button>
               <button onClick={() => useGoodie('tax')} disabled={goodieCooldowns.tax > 0} className="w-12 h-12 bg-yellow-900 rounded border border-yellow-700 relative overflow-hidden shrink-0 active:scale-95">
                  <div className="text-lg text-center">📜</div>
                  <div className="absolute bottom-0 left-0 w-full bg-black/60 transition-all" style={{height: `${(goodieCooldowns.tax/2700)*100}%`}}></div>
               </button>
            </div>

            {/* Tower List */}
            {Object.values(TowerType).map((type) => {
               const stats = TOWER_STATS[type];
               const isSelected = selectedTowerType === type;
               return (
                 <button
                   key={type}
                   onClick={() => { setSelectedTowerType(isSelected ? null : type as TowerType); setSelectedTower(null); setShowCitadel(false); }}
                   className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden group shrink-0 border-2 transition-transform active:scale-95
                     ${isSelected ? 'border-green-500 bg-green-900/30' : 'border-slate-700 bg-slate-800'}
                     ${money < stats.cost ? 'opacity-50 grayscale' : ''}
                   `}
                 >
                   <div className="text-xl drop-shadow-md relative z-10">{stats.icon}</div>
                   <div className="text-[9px] font-bold text-slate-400 relative z-10">{stats.cost}g</div>
                 </button>
               );
            })}
            <div className="w-4 shrink-0"></div>
        </div>
      </div>

    </div>
  );
}

export default App;