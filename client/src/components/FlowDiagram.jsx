export default function HeroIllustration() {
  const sizes = {
    central: "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64",
    
    darkgreen: "w-12 h-12 sm:w-16 sm:h-16",        
    lightgreen: "w-14 h-14 sm:w-18 sm:h-18",       
    darkergreenstar: "w-14 h-14 sm:w-18 sm:h-18",  
    darkgreen_star: "w-12 h-12 sm:w-14 sm:h-14",   
    darkgreenlock: "w-16 h-16 sm:w-20 sm:h-20",    
  };

  return (
    <div className="relative mx-auto flex h-[500px] w-full max-w-2xl items-center justify-center">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <ellipse
          cx="200" cy="200" rx="175" ry="70"
          fill="none" stroke="#3A4A45" strokeWidth="1"
          transform="rotate(-18 200 200)"
        />
        <ellipse
          cx="200" cy="200" rx="175" ry="70"
          fill="none" stroke="#3A4A45" strokeWidth="1"
          transform="rotate(0 200 200)"
        />
        <ellipse
          cx="200" cy="200" rx="175" ry="70"
          fill="none" stroke="#3A4A45" strokeWidth="1"
          transform="rotate(18 200 200)"
        />
      </svg>

      <img
        src="/leaf_and_lock.png"
        alt="A padlock merged with a leaf, representing secure and effortless protection"
        className={`relative z-10 ${sizes.central} object-contain drop-shadow-[0_0_40px_rgba(182,255,60,0.15)]`}
      />

      <img src="/darkgreen.png" alt="" aria-hidden="true" className={`absolute left-4 top-12 opacity-90 sm:left-8 ${sizes.darkgreen} object-contain`} />
      <img src="/lightgreen.png" alt="" aria-hidden="true" className={`absolute right-8 top-4 opacity-90 sm:right-12 ${sizes.lightgreen} object-contain`} />
      <img src="/darkergreenstar.png" alt="" aria-hidden="true" className={`absolute bottom-10 left-6 sm:left-10 ${sizes.darkergreenstar} object-contain`} />
      <img src="/darkgreen_star.png" alt="" aria-hidden="true" className={`absolute bottom-20 right-4 sm:right-8 ${sizes.darkgreen_star} object-contain`} />
      <img src="/darkgreen.png" alt="" aria-hidden="true" className={`absolute bottom-28 right-16 sm:bottom-32 sm:right-20 ${sizes.darkgreenlock} object-contain`} />
    </div>
  );
}