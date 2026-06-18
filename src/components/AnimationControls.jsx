import { useState, useRef, useCallback } from 'react';

function AnimationControls({ 
  animationState, 
  setAnimationState,
  paths,
  robot,
  setRobot
}) {
  const animationRef = useRef(null);
  const prevTimeRef = useRef(0);

  // Calculate path durations based on length
  const calculatePathDurations = useCallback((paths) => {
    const durations = [];
    let totalLength = 0;
    
    if (!paths || paths.length === 0) {
      return {
        pathLengths: [],
        totalLength: 0,
        startTimes: []
      };
    }

    // First calculate all path lengths
    const pathLengths = paths.map(path => {
      const points = {x: [], y: []};
      for (let i = 0; i < path.points.length; i++) {
        points.x.push(path.points[i].x);
        points.y.push(path.points[i].y);
      }
      let length = 0;
      for (let i = 1; i < points.x.length; i++) {
        const dx = points.x[i] - points.x[i-1];
        const dy = points.y[i] - points.y[i-1];
        length += Math.sqrt(dx*dx + dy*dy);
      }
      return length;
    });

    totalLength = pathLengths.reduce((sum, len) => sum + len, 0);
    
    // Calculate start times (0-1) for each path
    let accumulatedLength = 0;
    const startTimes = pathLengths.map(length => {
      const startTime = accumulatedLength / totalLength;
      accumulatedLength += length;
      return startTime;
    });

    return {
      pathLengths,
      totalLength,
      startTimes
    };
  }, []);

  // Helper function to find shortest angle between two headings
  const shortestAngle = (from, to) => {
    const difference = to - from;
    return ((difference + 180) % 360) - 180;
  };

  // Play/pause button handler
  const togglePlayPause = () => {
    setAnimationState(prev => {
      const isNowPlaying = !prev.isPlaying;
      
      // Reset the timestamp when pausing or playing
      if (isNowPlaying) {
        prevTimeRef.current = null;
      }
      var progress = prev.totalProgress;
      if (isNaN(progress) || progress < 0 || progress > 1 || progress === 1) {
        // Reset progress if it's invalid or at the end
        progress = 0;
      }

      return {
        ...prev,
        isPlaying: isNowPlaying,
        totalProgress: progress
      };
    });
    console.log("animation state", animationState);
  };

  return (
    <div className="animation-controls">
      <button onClick={togglePlayPause}>
        {animationState.isPlaying ? 'Pause' : 'Play'}
      </button>
      
      <input                       
        type="range"
        min="0"
        max="1"
        step="0.0001"
        value={animationState.totalProgress}
        onChange={(e) => {
          setAnimationState(prev => ({
            ...prev,
            totalProgress: parseFloat(e.target.value),
            isPlaying: false
          }));
        }}
      />
      <span>
        {Math.round(animationState.totalProgress * 100)}%
      </span>

    </div>
  );
}

export default AnimationControls;