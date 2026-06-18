import { useState, useRef, useCallback, useEffect } from 'react';
import { ROBOT_ATTRIBUTES } from '../utils/initialData';

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
    const timeline = [];
    let cumulativeTime = 0;

    if (!paths || paths.length === 0) {
      return {
        timeline: [],
        totalTime: 0
      };
    }

    // First calculate all path lengths
    paths.forEach(path => {
      const pointArray = path.points;
      const pathPointArray = path.pathpoints;
      if ((pointArray.length * 2) >= pathPointArray.length) {
        // has not been optimized, so use acceleration to calculate time
        let pathTime = 0;
        const points = path.points;
        let pathDistance = 0;
        for (let i = 1; i < points.length; i++) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          pathDistance += Math.sqrt(dx * dx + dy * dy);
        }
        const accelTime = robot.speed / ROBOT_ATTRIBUTES[2].defaultValue;
        const accelDistance = 0.5 * ROBOT_ATTRIBUTES[2].defaultValue * accelTime * accelTime;
        if (pathDistance < 2 * accelDistance) {
          // Triangle profile
          pathTime = 2 * Math.sqrt(pathDistance / ROBOT_ATTRIBUTES[2].defaultValue);
        } else {
          // Trapezoidal profile
          const cruiseDistance = pathDistance - 2 * accelDistance;
          const cruiseTime = cruiseDistance / robot.speed;
          pathTime = 2 * accelTime + cruiseTime;
        }
        // add points to timeline with timestamps
        const sampleSteps = Math.max(10, points.length * 4);
        for (let j = 0; j <= sampleSteps; j++) {
          const ratio = j / sampleSteps;
          const segmentIndex = Math.min(Math.floor(ratio * (points.length - 1)), points.length - 2);
          const segmentRatio = (ratio * (points.length - 1)) - segmentIndex;

          const p1 = points[segmentIndex];
          const p2 = points[segmentIndex + 1] || p1;

          timeline.push({
            globalTime: cumulativeTime + (ratio * pathTime),
            x: p1.x + segmentRatio * (p2.x - p1.x),
            y: p1.y + segmentRatio * (p2.y - p1.y),
            h: p1.h + segmentRatio * (shortestAngle(p1.h, p2.h)),
            v: robot.speed
          });
        }
        cumulativeTime += pathTime;

      } else {
        // has been optimized, so use velocities to calculate time
        let pathTime = 0;
        const points = path.pathpoints || [];

        if (points.length === 0) {
          return;
        }
        timeline.push({
          globalTime: cumulativeTime,
          x: points[0].x,
          y: points[0].y,
          h: points[0].h || points[0].theta || 0,
          v: points[0].v || robot.speed
        });
        for (let i = 1; i < points.length; i++) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          const segmentLength = Math.sqrt(dx * dx + dy * dy);
          const velocity = Math.max(points[i].v * 1000 /*convert to mm/s from m/s*/|| 0, 10.0); // min speed to prevent infinite time on beginnings of paths
          pathTime += segmentLength / velocity;

          timeline.push({ globalTime: cumulativeTime + pathTime, x: points[i].x, y: points[i].y, h: points[i].h || 0, v: velocity });
        }
        cumulativeTime += pathTime;
      }
    });

    return {
      timeline: timeline,
      totalTime: cumulativeTime
    };
  }, []);

  // Helper function to find shortest angle between two headings
  const shortestAngle = (from, to) => {
    const difference = to - from;
    return ((difference + 180) % 360) - 180;
  };

  // get state at timestamp
  const getStateAtTime = useCallback((timeline, time) => {
    if (timeline.length === 0) return null;
    if (time <= 0) return timeline[0];
    if (time >= timeline[timeline.length - 1].globalTime) return timeline[timeline.length - 1];
    // binary search for the correct segment
    let left = 0;
    while (left < timeline.length - 1 && timeline[left + 1].globalTime < time) {
      left++;
    }

    const prev = timeline[left];
    const next = timeline[left + 1];
    if (!prev || !next) return prev || next || null;

    const segmentTime = next.globalTime - prev.globalTime;
    const ratio = segmentTime > 0 ? (time - prev.globalTime) / segmentTime : 0;
    const timeIntoSegment = time - prev.globalTime;
    const x = prev.x + ratio * (next.x - prev.x);
    const y = prev.y + ratio * (next.y - prev.y);
    const h = prev.h + ratio * shortestAngle(prev.h, next.h);
    const v = prev.v + ratio * (next.v - prev.v);
    return { x, y, h, v };
  }, []);

  //main loop
  useEffect(() => {
    if (!animationState.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const { timeline, totalTime } = calculatePathDurations(paths);

    let lastTickTime = performance.now();

    const loop = (timestamp) => {
      const now = performance.now();
      const deltaTime = (now - lastTickTime) / 1000; // Time elapsed in seconds
      lastTickTime = now;
      setAnimationState((prev) => {
        let nextProgress = prev.totalProgress + (deltaTime / totalTime);

        // If progress exceeds full playback loop, pause animation runtime and lock tracking elements
        if (nextProgress >= 1) {
          cancelAnimationFrame(animationRef.current);

          // Render final state frame explicitly
          const lastFrame = timeline[timeline.length - 1];
          if (lastFrame) {
            setRobot(r => ({ ...r, x: lastFrame.x, y: lastFrame.y, heading: lastFrame.h }));
          }

          return { ...prev, isPlaying: false, totalProgress: 1 };
        }

        const currentTimeInstance = nextProgress * totalTime;
        const sampledFrame = getStateAtTime(timeline, currentTimeInstance);

        if (sampledFrame) {
          setRobot((prevRobot) => ({
            ...prevRobot,
            x: sampledFrame.x,
            y: sampledFrame.y,
            heading: sampledFrame.h,
            currentVelocity: sampledFrame.v // Helpful state hook extension if you display dashboard analytics
          }));
        }

        return { ...prev, totalProgress: nextProgress };
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animationState.isPlaying, paths, calculatePathDurations, getStateAtTime, setAnimationState, setRobot]);

  // Play/pause button handler
  const togglePlayPause = () => {
    console.log(paths);
    setAnimationState((prev) => {
      const isNowPlaying = !prev.isPlaying;
      if (isNowPlaying) {
        prevTimeRef.current = null; // Clear context timeline cache on initial mount interaction
      }
      return {
        ...prev,
        isPlaying: isNowPlaying,
        totalProgress: prev.totalProgress >= 1 ? 0 : prev.totalProgress
      };
    });
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
        style={{ flexGrow: 1, curosor: 'pointer' }}
        value={animationState.totalProgress}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          const { timeline, totalTime } = calculatePathDurations(paths);
          const sampledFrame = getStateAtTime(timeline, val * totalTime);

          setAnimationState(prev => ({
            ...prev,
            totalProgress: val,
            isPlaying: false
          }));

          if (sampledFrame) {
            setRobot(prevRobot => ({
              ...prevRobot,
              x: sampledFrame.x,
              y: sampledFrame.y,
              heading: sampledFrame.h
            }));
          }
        }} />
      <span>
        {Math.round(animationState.totalProgress * 100)}%
      </span>

    </div>
  );
}

export default AnimationControls;