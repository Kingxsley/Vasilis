import React, { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Lazy loading image component with progressive loading.
 * Features:
 * - Intersection Observer based lazy loading
 * - Placeholder blur/skeleton while loading
 * - Error fallback
 * - Responsive sizing hints
 */
export function OptimizedImage({ 
  src, 
  alt = '', 
  className = '', 
  width, 
  height,
  placeholder = 'skeleton', // 'skeleton' | 'blur' | 'none'
  fallback = null,
  loading = 'lazy',
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading !== 'lazy');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (loading !== 'lazy') return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before entering viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => setHasError(true);

  if (hasError && fallback) {
    return fallback;
  }

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && placeholder === 'skeleton' && (
        <div className="absolute inset-0 bg-[#21262D] animate-pulse rounded" />
      )}
      
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-[#21262D] backdrop-blur-xl rounded" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          {...props}
        />
      )}
      
      {/* Error state */}
      {hasError && !fallback && (
        <div className="absolute inset-0 bg-[#21262D] flex items-center justify-center rounded">
          <span className="text-gray-500 text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;
