import React, { useState, useEffect, useCallback } from 'react';
import {Zap, Box, Cog, Wheat, Flame } from 'lucide-react';
const BUILDINGS = {
  generator: { name: 'Generator', cost: 150, produces: { power: 5 }, color: 'bg-yellow-500', icon: Zap},
  fabricator: { name: 'Fabricator', cost: 500, produces: { material: 10 }, color: 'bg-gray-600', icon: Box },
  workshop: { name: 'Workshop', cost: 200, produces: { gear: 2 }, color: 'bg-blue-500', icon: Cog },
  farm: { name: 'Farm', cost: 75, produces: { food: 5 }, color: 'bg-green-600', icon: Wheat },
  refiner: { name: 'Refiner', cost: 75, produces: { fuel: 2 }, color: 'bg-red-600', icon: Flame },
};

const GRID_SIZE = 12;

export default function App() {
  const [resources, setResources] = useState({ material: 1000, food: 0, fuel: 0, gear: 0, power: 0 });
  const [tiles, setTiles] = useState(Array(GRID_SIZE * GRID_SIZE).fill(null));

  // Game Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTiles(prevTiles => {
        let producedResources = { material: 0, food: 0, fuel: 0, gear: 0, power: 0 };
        
        prevTiles.forEach(tile => {
          if (tile?.status === 'post-building') {
            const prod = BUILDINGS[tile.type].produces;
            Object.keys(prod).forEach(key => {
              producedResources[key] += prod[key];
            });
          }
        });

        if (Object.values(producedResources).some(v => v > 0)) {
          setResources(r => ({
            ...r,
            material: r.material + producedResources.material,
            food: r.food + producedResources.food,
            fuel: r.fuel + producedResources.fuel,
            gear: r.gear + producedResources.gear,
            power: r.power + producedResources.power,
          }));
        }
        return prevTiles;
      });

      // Construction logic
      setResources(currentResources => {
        let availableMaterial = currentResources.material;
        let nextTiles = [...tiles];
        let modified = false;
        
        // ADDED: Filter and Sort queue by time
        const pendingQueue = nextTiles
          .map((tile, index) => ({ ...tile, index }))
          .filter(t => t && t.status !== 'post-building' && BUILDINGS[t.type]) // SAFETY CHECK
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // QUEUE LOGIC

        pendingQueue.forEach(target => {
          const buildingData = BUILDINGS[target.type];
          if (!buildingData) return; // SAFETY CHECK
          
          const stepCost = buildingData.cost / 5;

          if (target.status === 'pre-building') {
            if (availableMaterial >= buildingData.cost) {
              availableMaterial -= stepCost;
              nextTiles[target.index] = { ...target, status: 'peri-building', progress: 20 };
              modified = true;
            }
          } else if (target.status === 'peri-building') {
            availableMaterial -= stepCost;
            const newProgress = target.progress + 20;
            
            nextTiles[target.index] = newProgress >= 100 
              ? { ...target, status: 'post-building', progress: 100 }
              : { ...target, status: 'peri-building', progress: newProgress };
              modified = true;
          }
        });

        setTiles(nextTiles);
        return { ...currentResources, material: availableMaterial };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tiles]);

  const handleDrop = (e, index) => {
    const type = e.dataTransfer.getData('type');
    setTiles(prev => {
      const next = [...prev];
      next[index] = { type, status: 'pre-building', progress: 0, createdAt: Date.now() };
      return next;
    });
  };

  const getStatusColor = (tile) => {
    if (!tile) return 'bg-slate-800';
    if (tile.status === 'pre-building') return 'bg-gray-400 opacity-50';
    if (tile.status === 'peri-building') return 'bg-yellow-700';
    return BUILDINGS[tile.type].color;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans">
      <header className="flex gap-4 mb-6 bg-slate-800 p-4 rounded-lg shadow-xl">
        {Object.entries(resources).map(([k, v]) => (
          <div key={k} className="capitalize">{k}: {Math.floor(v)}</div>
        ))}
      </header>

      <div className="flex gap-8">
        <aside className="w-64 space-y-4">
          <h2 className="text-xl font-bold">Build Menu</h2>
          {Object.entries(BUILDINGS).map(([id, b]) => {
            const BuildingIcon = b.icon;
            return (
            <div
              key={id} draggable onDragStart={(e) => e.dataTransfer.setData('type', id)}
              className={`${b.color} p-4 rounded cursor-move hover:scale-105 transition-transform flex items-center gap-3`}
            >
              <BuildingIcon size={24} />
              <div>
                <div className="font-bold">{b.name}</div>
                <div className="text-xs text-slate-200">Cost: {b.cost} Mat</div>
              </div>
            </div>
            );
          })}
        </aside>

        <main className="grid grid-cols-12 gap-1 bg-slate-800 p-2 rounded">
          {tiles.map((tile, i) => (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, i)}
              className={`w-12 h-12 ${getStatusColor(tile)} border border-slate-700 flex items-center justify-center text-[10px]`}
            >
              {tile ? `${tile.progress}%` : ''}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}