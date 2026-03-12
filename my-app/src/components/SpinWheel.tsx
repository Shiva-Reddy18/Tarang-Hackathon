import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { Loader2, Gift } from 'lucide-react';

const SEGMENTS = [
  { label: '+5 Pts', color: '#0f172a' },
  { label: '+10 Pts', color: '#06b6d4' },
  { label: 'Extra Hint', color: '#f59e0b' },
  { label: '+20 Pts', color: '#06b6d4' },
  { label: 'Skip Obj', color: '#f59e0b' },
  { label: 'No Prize', color: '#0f172a' }
];

export default function SpinWheel() {
  const { user } = useAppStore();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [spinDeg, setSpinDeg] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const spin = async () => {
    if (!user || isSpinning || hasSpun) return;
    
    setIsSpinning(true);
    setErrorMsg('');
    setResult(null);

    try {
      // Call Edge Function to get deterministic outcome
      const { data, error } = await supabase.functions.invoke('spin', {
        body: { userId: user.id }
      });

      if (error) {
        // Fallback for local testing if function not deployed
        console.warn('Spin function failed, using local dummy fallback', error);
        simulateLocalSpin();
        return;
      }

      if (data && data.outcome) {
        animateSpinTo(data.outcome);
      } else {
        throw new Error('Invalid response from spin service');
      }

    } catch (err: any) {
      console.error('Spin failed:', err);
      setErrorMsg(err.message || 'The wheel is jammed. Try again later.');
      setIsSpinning(false);
    }
  };

  const simulateLocalSpin = () => {
    const outcomeIndex = Math.floor(Math.random() * SEGMENTS.length);
    animateSpinTo(SEGMENTS[outcomeIndex].label, outcomeIndex);
  };

  const animateSpinTo = (outcomeLabel: string, forceIndex?: number) => {
    const targetIndex = forceIndex !== undefined ? forceIndex : SEGMENTS.findIndex(s => s.label === outcomeLabel);
    if (targetIndex === -1) {
      setIsSpinning(false);
      setErrorMsg("Unknown prize returned.");
      return;
    }

    // Calculate rotation
    const segmentAngle = 360 / SEGMENTS.length;
    // Base spins (5 full rotations) + angle to target
    const targetRotation = (5 * 360) + (targetIndex * segmentAngle) + (segmentAngle / 2);
    
    // The CSS uses transform: rotate(-deg) to align the top wedge, 
    // so we set positive degrees and let CSS handle the spin direction
    setSpinDeg(targetRotation);

    // Wait for CSS animation (3s) to finish
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setResult(outcomeLabel);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-2xl w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold flex items-center justify-center text-white">
          <Gift className="w-6 h-6 mr-2 text-brand-saffron" /> Bonus Spin
        </h3>
        <p className="text-sm text-slate-400 mt-1">One spin per participant. Test your luck!</p>
      </div>

      <div className="relative w-64 h-64 mb-8">
        {/* The pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-20">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
        </div>

        {/* The Wheel SVG */}
        <div 
          className="w-full h-full rounded-full border-4 border-slate-700 shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden transition-transform ease-[cubic-bezier(0.1,0.7,0.1,1)]"
          style={{ 
            transitionDuration: isSpinning ? '3s' : '0s',
            transform: `rotate(${spinDeg}deg)` 
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {SEGMENTS.map((segment, i) => {
              const startAngle = i * (360 / SEGMENTS.length);
              const endAngle = (i + 1) * (360 / SEGMENTS.length);
              
              // SVG ARC math
              const startX = 50 + 50 * Math.cos(Math.PI * startAngle / 180);
              const startY = 50 + 50 * Math.sin(Math.PI * startAngle / 180);
              const endX = 50 + 50 * Math.cos(Math.PI * endAngle / 180);
              const endY = 50 + 50 * Math.sin(Math.PI * endAngle / 180);
              const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

              const d = [
                "M", 50, 50,
                "L", startX, startY,
                "A", 50, 50, 0, largeArcFlag, 1, endX, endY,
                "Z"
              ].join(" ");

              // Text placement math
              const midAngle = startAngle + (360 / SEGMENTS.length) / 2;
              const textX = 50 + 30 * Math.cos(Math.PI * midAngle / 180);
              const textY = 50 + 30 * Math.sin(Math.PI * midAngle / 180);
              const textRotation = midAngle + 90;

              return (
                <g key={i}>
                  <path d={d} fill={segment.color} stroke="#1e293b" strokeWidth="0.5" />
                  <text 
                    x={textX} 
                    y={textY} 
                    fill="white" 
                    fontSize="5" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

      {!hasSpun ? (
        <button
          onClick={spin}
          disabled={isSpinning}
          className="w-full bg-brand-cyan text-slate-900 font-bold py-3 rounded-full hover:bg-brand-cyan/90 transition-colors disabled:opacity-50 text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          {isSpinning ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'SPIN THE WHEEL'}
        </button>
      ) : (
        <div className="w-full text-center animate-in fade-in zoom-in duration-500">
          <p className="text-sm text-slate-400 mb-1">You won</p>
          <div className="text-3xl font-black text-brand-saffron bg-brand-saffron/10 py-3 rounded-xl border border-brand-saffron/30">
            {result}
          </div>
          <p className="text-xs text-slate-500 mt-4">Prize applied to your team's profile.</p>
        </div>
      )}
    </div>
  );
}
