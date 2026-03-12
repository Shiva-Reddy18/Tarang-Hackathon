import { Link } from 'react-router-dom';


export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <svg
          className="w-full h-full wave-animation text-brand-cyan/20 opacity-30"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" fillOpacity="1" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,170.7C672,171,768,117,864,112C960,107,1056,149,1152,149.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
      
      <div className="z-10 text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 animate-pulse-slow">
          Tarang<span className="text-brand-saffron">2k26</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300">
          The Ultimate Hackathon Arena
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            to="/auth"
            className="px-8 py-4 rounded-full bg-brand-cyan text-slate-900 font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-center no-underline"
          >
            Start Now / Participant Login
          </Link>
          <Link
            to="/auth?admin=true"
            className="px-8 py-4 rounded-full bg-slate-800 text-white font-bold text-lg transition-transform hover:scale-105 active:scale-95 border border-slate-700 hover:border-brand-cyan text-center no-underline"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
