import field from "./DecodeField.jpg";
import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { saveFTCAutoFile, loadFTCAutoFile } from "./fileHelpers";

function App() {
  
  const [paths, setPaths] = useState([
    {
      name: "Start",
      color: getPredictableColor(0),
      points: [
        {
            x: 0, //mm
            y: 0, //mm
            h: 0, //degrees
            constrainHeading: true,
            stop: true,
        },        {
            x: 600, //mm
            y: 0, //mm
            h: 0, //degrees
            constrainHeading: true,
            stop: true,
        }
      ],
      pathpoints: [
        {x: 0, y: 0, h: 0, v: 0},  // in mm
        {x: 600, y: 0, h: 0, v: 0},  // in mm
      ]
    }
  ]);
  
  const [pathsTotal, setPathsTotal] = useState(1);

  const [robot, setRobot] = useState({
    x: paths[0].points[0].x, 
    y: paths[0].points[0].y, 
    width: robotAttributes[0].defaultValue * 25.4, // Convert to mm
    length: robotAttributes[1].defaultValue * 25.4,// Convert to mm
    heading: 0,
    speed: robotAttributes[2].defaultValue,
    buffer: robotAttributes[3].defaultValue * 25.4 // Convert to mm
  });

  // Controls animation state
  const [animationState, setAnimationState] = useState({
    isPlaying: false,
    totalProgress: 0, // 0 to 1 across all paths
    pathProgress: 0, // 0 to 1 within current path
    currentPathIndex: 0,
    pathStartTimes: [], // stores when each path starts (in 0-1 progress)
  });

  // Tracks obstacles
  const [obstacles, setObstacles] = useState([
    {
      name: "Red Goal",
      points: [
        {x: -1125, y: 1625}, // first point
        {x: -1770, y: 1125}, // second point
        {x: -1770, y: 1770},  // etc
        {x: 100, y: 1770},
        {x: 100, y: 1625}
      ]
    },
    {
      name: "Blue Goal",
      points: [
        {x: -1125, y: -1625}, // first point
        {x: -1770, y: -1125}, // second point
        {x: -1770, y: -1770},  // etc
        {x: 100, y: -1770},
        {x: 100, y: -1625}
      ]
    }
  ]);

  //abort controllers
  const abortControllers = useRef({});
  // Modules (Paths to accomplish a task): 1. Pick up stack 1
  //          2. Pick up stack 2
  //          3. Pick up stack 3
  //          4. Shoot 3 balls
  //          5. Open Gate
  //          6. Go to park pos 1
  //          7. Go to park pos 2
  const [modules, setModules] = useState([
  {
    name: "Pick Up Stack 1",
    path: {
      name: "Stack 1 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      getPathPoints: () => [
        { x: -300, y: -600 },
        { x: -300, y: -750 },
        { x: -300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 2",
    path: {
      name: "Stack 2 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      getPathPoints: () => [
        { x: 300, y: -600 },
        { x: 300, y: -750 },
        { x: 300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 3",
    path: {
      name: "Stack 3 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      getPathPoints: () => [
        { x: 900, y: -600 },
        { x: 900, y: -750 },
          { x: 900, y: -1200 }
        ]
      }
    },
    {
      name: "Shoot 3 Balls",
      path: {
        name: "Stack 3 Approach",
        startHeading: 0,
        endHeading: 90,
        headingControlType: "tangential",
        getPathPoints: ({ paths }) => goToClosestShootingPosition(paths, robot, obstacles)
      }
    },
    {
      name: "Open Gate",
      path: {
        name: "Gate Approach",
        startHeading: 0,
        endHeading: 90,
        headingControlType: "linear",
        getPathPoints: () => [
          { x: 50, y: -1200 },
          { x: 50, y: -1400 }
        ]
      }
    },
    {
      name: "Park",
      path: {
        name: "Park Approach",
        startHeading: 0,
        endHeading: 90,
        headingControlType: "linear",
        getPathPoints: ({ paths }) => goToClosestParkingPosition(paths, robot, obstacles)
      }
    }
  ]);

  const [addedModules, setAddedModules] = useState([]);
  //toggles obstacles expanded state
  const [obstaclesExpanded, setObstaclesExpanded] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <FieldMap robot={robot} setRobot={setRobot} paths={paths} setPaths={setPaths} obstacles={obstacles} setObstacles={setObstacles} showObstacles={obstaclesExpanded}  abortControllers={abortControllers} />
        <SideBar robot={robot} setRobot={setRobot} paths={paths} setPaths={setPaths} animationState={animationState} setAnimationState={setAnimationState} obstacles={obstacles} setObstacles={setObstacles} obstaclesExpanded={obstaclesExpanded} setObstaclesExpanded={setObstaclesExpanded} modules={modules} setModules={setModules} modulesExpanded={modulesExpanded} setModulesExpanded={setModulesExpanded} addedModules={addedModules} setAddedModules={setAddedModules} abortControllers={abortControllers} pathsTotal={pathsTotal} setPathsTotal={setPathsTotal} />
      </header>
    </div>
  );
}

function FieldMap({ robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles, abortControllers }) {
  const canvasRef = useRef(null);
  const pointsCanvasRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [pathDraggingIndex, setPathIndex] = useState(null);
  const [obstacleDragging, setObstacleDragging] = useState({
    obstacleIndex: null,
    pointIndex: null
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const pointsCanvas = pointsCanvasRef.current;
    if (!canvas || !pointsCanvas) return;
    
    // Set both canvases to same size
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;

    canvas.width = pointsCanvas.width = displayWidth;    
    canvas.height = pointsCanvas.height = displayHeight;

    const ctx = canvas.getContext('2d');
    const pointsCtx = pointsCanvas.getContext('2d');
    
    drawRobot(ctx, canvas, robot);
    drawPoints(pointsCtx, pointsCanvas);
    drawObstacles(ctx, canvas);
  }, [robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles]); // Now this effect depends on the robot state


  const drawObstacles = (ctx, canvas) => {
    if (!showObstacles) return;  // Skip drawing if obstacles are hidden

    const scale = canvas.width / 3580;
    
    obstacles.forEach(obstacle => {
      if (obstacle.points.length < 2) return;
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Transparent red fill
      ctx.strokeStyle = '#FF0000'; // Solid red border
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      obstacle.points.forEach((point, index) => {
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

      obstacles.forEach((obstacle, obsIndex) => {
      if (obstacle.points.length < 2) return;
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      obstacle.points.forEach((point, pointIndex) => {
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2);
        
        if (pointIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw obstacle points
        ctx.fillStyle = '#FF0000'; //Red for points
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fill();
      ctx.stroke();
    });

  };

  const drawPoints = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 3580;
    
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const pathColor = path.color || '#00FF00';
        if (path.pathpoints && path.pathpoints.length > 1) {
            ctx.strokeStyle = pathColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            path.pathpoints.forEach((pt, idx) => {
                const x = (pt.x * scale) + (canvas.width / 2);
                const y = canvas.height - (pt.y * scale) - (canvas.height / 2);
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            }
        path.points.forEach((point, index) => {
        // Convert to canvas coords (same as robot). Move origin to center without translating
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2); // Flip Y axis
        
        // Draw point
        ctx.fillStyle = pathColor; // Default to green if no color
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const drawRobot = (ctx, canvas, robot) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scaling (3580mm field to canvas pixels)
    const scale = canvas.width / 3580;
    
    // Save context, translate/rotate, then draw
    ctx.save();
    // Move origin to center (now (0,0) is center of canvas)
    ctx.translate(canvas.width/2, canvas.height/2);
    
    // Flip Y axis so positive is up
    ctx.scale(1, -1);
    
    //get robot dimensions in scaled pixels
    const robotWidth = robot.width * scale; // Convert to pixels
    const robotLength = robot.length * scale; // Convert to pixels

    // Apply robot position (now in center-relative coords)
    ctx.translate(robot.x * scale, robot.y * scale);
    ctx.rotate(robot.heading * Math.PI / 180);
    
    // Draw robot body (centered)
    ctx.fillStyle = '#3a86ff'; // Nice blue color
    ctx.strokeStyle = '#1a4b9b'; // Darker blue for border
    ctx.lineWidth = 2;

    // Main robot body
    ctx.beginPath();
    ctx.roundRect(
      -robotWidth/2,
      -robotLength/2,
      robotWidth,
      robotLength,
      [robotWidth * 0.2] // Rounded corners
    );
    ctx.fill();
    ctx.stroke();
    
    // Draw wheels (4 wheels - one on each corner)
    const wheelWidth = robotWidth * 0.15;
    const wheelLength = robotLength * 0.25;
    const wheelOffset = 0.75; // How close to edge wheels are lengthwise
    const wheelWidthOffset = 0.85; // How close to edge wheels are widthwise
    
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#000000';
    
    // Front left wheel
    ctx.fillRect(
      -robotWidth/2 * wheelWidthOffset- wheelWidth/2,
      robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Front right wheel
    ctx.fillRect(
      robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Rear left wheel
    ctx.fillRect(
      -robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      -robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Rear right wheel
    ctx.fillRect(
      robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      -robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Draw front indicator
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, robotLength/2 * 0.8, robotWidth * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw center point (for orientation debugging)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = pointsCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;
    
    // Get mouse position in mm
    const mouseX = -((3580/2) - (e.clientX - rect.left) / scale);
    const mouseY = (3580/2) - ((e.clientY - rect.top) / scale); // Flip Y
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const clickedIndex = path.points.findIndex(point => {
        const dx = mouseX - point.x;
        const dy = mouseY - point.y;
        return Math.sqrt(dx * dx + dy * dy) < 70; 
      });
      if (clickedIndex >= 0) {
        setDraggingIndex(clickedIndex);
        setPathIndex(i);
        return;
      }
    }

    // handles obstacle dragging
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const clickedIndex = obstacle.points.findIndex(point => {
        const dx = mouseX - point.x;
        const dy = mouseY - point.y;
        return Math.sqrt(dx * dx + dy * dy) < 70;
      });
      if (clickedIndex >= 0) {
        setObstacleDragging({
          obstacleIndex: i,
          pointIndex: clickedIndex
        });
        return;
      }
    }

  };

  const handleMouseMove = (e) => {
    if (draggingIndex === null && obstacleDragging.obstacleIndex === null) return;

    const canvas = pointsCanvasRef.current;
    if (!canvas) return; 
    
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;
    
    if (obstacleDragging.obstacleIndex !== null) {
      const newX = -((3580/2) - (e.clientX - rect.left) / scale);
      const newY = (3580/2) - ((e.clientY - rect.top) / scale);
      
      setObstacles(prev => {
        const updated = [...prev];
        updated[obstacleDragging.obstacleIndex].points[obstacleDragging.pointIndex] = {x: newX, y: newY};
        return updated;
      });
      
      // Redraw
      const ctx = canvasRef.current.getContext('2d');
      drawRobot(ctx, canvasRef.current, robot);
      drawObstacles(ctx, canvasRef.current);
      return;
    }

    // Calculate new position in mm
    const newX = -((3580/2) - (e.clientX - rect.left) / scale);
    const newY = (3580/2) - ((e.clientY - rect.top) / scale); // Flip Y

    setPaths(prev => {
        const updated = [...prev];
        updated[pathDraggingIndex].points[draggingIndex] = {x: newX, y: newY};
        const newPathPoints = [];
        for (let i = 0; i < updated[pathDraggingIndex].points.length - 1; i++) {
            const p1 = updated[pathDraggingIndex].points[i];
            const p2 = updated[pathDraggingIndex].points[i+1];
            
            // Simple 2-point linear path for each segment
            newPathPoints.push({ x: p1.x, y: p1.y });
            newPathPoints.push({ x: p2.x, y: p2.y });
        }
        updated[pathDraggingIndex].pathpoints = newPathPoints;
        return updated;
    });

    // Update robot if first point
    if (draggingIndex === 0) {
      setRobot(prev => ({...prev, x: newX, y: newY}));
    }

    //if there's an abort controller for this path, abort optimization
    const abortController = abortControllers.current[pathDraggingIndex];
    if (abortController) {
      abortController.abort();
    }

    // Redraw
    const pointsCtx = pointsCanvasRef.current.getContext('2d');
    drawPoints(pointsCtx, pointsCanvasRef.current, robot);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    setPathIndex(null);
    setObstacleDragging({
      obstacleIndex: null,
      pointIndex: null
    });

  };

  useEffect(() => {
    if (draggingIndex !== null || obstacleDragging.obstacleIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIndex, pathDraggingIndex, obstacleDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="Field-map">
      <img src={field} alt="Field Map" className="Field-image" />
      <canvas className="Field-canvas" id="fieldCanvas" ref={canvasRef} />
      <canvas 
        className="Points-canvas" 
        ref={pointsCanvasRef}
        onMouseDown={handleMouseDown}
        //style={{ cursor: draggingIndex !== null ? 'grabbing' : 'pointer' }}
      />
    </div>
  );
}

function SideBar({ robot, setRobot, paths, setPaths, animationState, setAnimationState, obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded, modules, setModules, modulesExpanded, setModulesExpanded, addedModules, setAddedModules, abortControllers, pathsTotal, setPathsTotal }) {
  const fileInputRef = useRef();

  return (
    <div className="Side-bar">
      <button onClick={() => saveFTCAutoFile({ robot, paths, obstacles })}>
        Save Auto File
      </button>

      <input
        type="file"
        accept=".ftcpath,application/json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            loadFTCAutoFile(file, { setRobot, setPaths, setObstacles });
            e.target.value = ""; // Reset input so re-selecting same file works
          }
        }}
      />

      <button onClick={() => fileInputRef.current?.click()}>Load Auto File</button>
      {/* Existing buttons below */}
      <button className="button" onClick={() => /*generateCodeFromPath(paths)*/ runPython()}>
        Generate Code
      </button>

      <AttributesInputField robot={robot} setRobot={setRobot}/>
      <PathManager paths={paths} setPaths={setPaths} setRobot={setRobot} setAnimationState={setAnimationState} obstacles={obstacles} robot={robot} abortControllers={abortControllers} pathsTotal={pathsTotal} setPathsTotal={setPathsTotal}/>
      <ObstacleManager obstacles={obstacles} setObstacles={setObstacles} obstaclesExpanded={obstaclesExpanded} setObstaclesExpanded={setObstaclesExpanded} />
      <ModuleManager modules={modules} setModules={setModules} modulesExpanded={modulesExpanded} setModulesExpanded={setModulesExpanded} addedModules={addedModules} setAddedModules={setAddedModules} paths={paths} setPaths={setPaths} obstacles={obstacles} robot={robot} />
      <AnimationControls animationState={animationState} setAnimationState={setAnimationState} paths={paths} robot={robot} setRobot={setRobot} />
    </div>
  );
}

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

const robotAttributes = [
  {name: "Width", defaultValue: 15},
  {name: "Length", defaultValue: 15},
  {name: "Speed", defaultValue: 1000}, // This is in mm/s
  {name: "Buffer", defaultValue: 2} // This is for the path generation.
];

function AttributesInputField({ robot, setRobot }) {
  const listItems = robotAttributes.map((attribute) => (
    <div key={attribute.name} className="Attribute-input-item">
      <label>{attribute.name}:</label>
      <input 
        className="Attribute-input-number" 
        type="number" 
        defaultValue={attribute.defaultValue}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value);
          if (!isNaN(newValue)) {
            setRobot(prev => {
              const updated = {...prev};
              if (attribute.name === "Speed") {
                updated.speed = newValue; // Store directly in mm/s
              } else {
                updated[attribute.name.toLowerCase()] = newValue * 25.4; // Convert to mm
              }
              return updated;
            });
          }
          console.log("Robot attributes updated:", robot);
        }} 
      />
    </div>
  ));
  
  return (
    <div className="Input-field">
      <h5>Robot Attributes</h5>
      <div className="Attribute-input-items-container">
        {listItems}
      </div>
    </div>
  );
}

function PathPointInputField({ point, setPaths, pathIndex, pointIndex, setRobot, paths }) {
  return (
    <div className="Path-point-input">
      <span style={{fontWeight: 'bold'}}>P{pointIndex + 1}</span>
      <input 
        type="number" 
        className="Path-point-input-number"
        placeholder="X (mm)" 
        value={point.x || 0} 
        onChange={(e) => {
          const newX = parseFloat(e.target.value);
          if (!isNaN(newX)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points[pointIndex].x = newX;
                const newPathPoints = [];
                for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                    const p1 = updated[pathIndex].points[i];
                    const p2 = updated[pathIndex].points[i+1];

                    // Simple 2-point linear path for each segment
                    newPathPoints.push({ x: p1.x, y: p1.y });
                    newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
              return updated;
            });
            // Update robot position if this is the first point
            if (pointIndex === 0) {
              setRobot(prev => ({...prev, x: newX}));
            }
          }
        }} 
      />
      <input 
        type="number" 
        className="Path-point-input-number"
        placeholder="Y (mm)" 
        value={point.y || 0} 
        onChange={(e) => {
          const newY = parseFloat(e.target.value);
          if (!isNaN(newY)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points[pointIndex].y = newY;
              const newPathPoints = [];
                for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                    const p1 = updated[pathIndex].points[i];
                    const p2 = updated[pathIndex].points[i+1];

                    // Simple 2-point linear path for each segment
                    newPathPoints.push({ x: p1.x, y: p1.y });
                    newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
              return updated;
            });
            // Update robot position if this is the first point
            if (pointIndex === 0) {
              setRobot(prev => ({...prev, y: newY}));
            }

          }
        }} 
      />
      <input 
        type="number" 
        className="Path-point-input-number"
        placeholder="H (degrees)" 
        value={point.h || 0} 
        onChange={(e) => {
          const newH = parseFloat(e.target.value);
          if (!isNaN(newH)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points[pointIndex].h = newH;
              return updated;
            });
            // Update robot position if this is the first point
            if (pointIndex === 0) {
              setRobot(prev => ({...prev, heading: newH}));
            }
          }
        }} 
      />
      <label className="toggle-label">
        <input type="checkbox" checked={point.stop} 
            onChange={(e) =>             
                setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].stop = e.target.checked;
                return updated;
                })
            } 
        /> Stop
      </label>
      
      <label className="toggle-label">
        <input type="checkbox" checked={point.constrainHeading} 
            onChange={(e) =>             
                setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].constrainHeading = e.target.checked;
                return updated;
                })
            } 
        /> Lock H
      </label>
      <button
        onClick={() => {
          setPaths(prev => {
            const updated = [...prev];
            updated[pathIndex].points.splice(pointIndex, 1);
            const newPathPoints = [];
            for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i+1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
            }
            updated[pathIndex].pathpoints = newPathPoints;

            return updated;
          });
        }}
        disabled={paths[pathIndex].points.length <= 2}
      >
        Delete
      </button>
      <button
        onClick={() => {
          setPaths(prev => {
            const updated = [...prev];
            const newPoint = {x: point.x + (Math.random() * 600 - 300), y: point.y + (Math.random() * 600 - 300)}; // Add random -600-600mm offset
            updated[pathIndex].points.splice(pointIndex + 1, 0, newPoint);
            const newPathPoints = [];
            for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i+1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
            }
            updated[pathIndex].pathpoints = newPathPoints;

            return updated;
          });
        }}
      >
        Add
      </button>
    </div>
  );
}

function PathInput({ path, paths, setPaths, index, setRobot, obstacles, robot, abortControllers, pathsTotal, setPathsTotal }) {
  const selectOption = useRef(null); // Initialize with null
  const [isLoading, setIsLoading] = useState(false);
  const handleAddPoint = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent default behavior
    //new point should be randomly generated within 600mm of previous point
    const lastPoint = path.points[path.points.length - 1];
    const newPoint = {
      x: lastPoint.x + (Math.random() * 600 - 300), //
      y: lastPoint.y + (Math.random() * 600 - 300), // Randomly within 600mm of last point
      h: lastPoint.h || 0,
      stop: false,
      constrainHeading: true
    };

    setPaths(prev => {
      const updated = [...prev];
      updated[index].points = [...updated[index].points, newPoint];
      const newPathPoints = [];
      for (let i = 0; i < updated[index].points.length - 1; i++) {
        const p1 = updated[index].points[i];
        const p2 = updated[index].points[i+1];

        // Simple 2-point linear path for each segment
        newPathPoints.push({ x: p1.x, y: p1.y });
        newPathPoints.push({ x: p2.x, y: p2.y });
      }
      updated[index].pathpoints = newPathPoints;
      return updated;
    });
  };

  const handleRemovePoint = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPaths(prev => {
      const updated = [...prev];
      if (updated[index].points.length > 0) {
        updated[index].points = updated[index].points.slice(0, -1);
        const newPathPoints = [];
        for (let i = 0; i < updated[index].points.length - 1; i++) {
            const p1 = updated[index].points[i];
            const p2 = updated[index].points[i+1];

            // Simple 2-point linear path for each segment
            newPathPoints.push({ x: p1.x, y: p1.y });
            newPathPoints.push({ x: p2.x, y: p2.y });
        }
        updated[index].pathpoints = newPathPoints;

      }
      return updated;
    });
  };
  // Inside PathInput component
    const handleGeneratePath = async () => {
      if (isLoading) {
        return; // Prevent multiple clicks
      }
      setIsLoading(true);
      const controller = new AbortController();
      abortControllers.current[index] = controller;
      try {
          console.log("Starting optimization for:", path.name);
          
          // Call the Electron bridge
          const optimizedPoints = await window.electronAPI.runOptimizer({
          waypoints: path.points,
          obstacles: obstacles
          }, controller.signal);

          // Update the state with the high-resolution path
          setPaths(prev => {
          const updated = [...prev];
          updated[index] = {
              ...updated[index],
              pathpoints: optimizedPoints // This replaces the straight lines with the curve
          };
          return updated;
          });
          console.log("Optimization completed for:", path.name);

      } catch (error) {
        if (error.name === 'AbortError') {
              console.log(`Path ${index} generation canceled.`);
            } else {
              console.error("Optimization failed:", error);
            }
      } finally {
        setIsLoading(false);
        delete abortControllers.current[index];
      }
    };
  return (
    <div className="Path-input">
      <input 
        type="text" 
        value={path.name} 
        onChange={(e) => {
          setPaths(prev => {
            const updated = [...prev];
            updated[index].name = e.target.value;
            return updated;
          });
        }}
      />
      
      {path.points.map((point, pointIndex) => (
        <PathPointInputField 
          key={pointIndex} 
          point={point} 
          setPaths={setPaths} 
          pathIndex={index} 
          pointIndex={pointIndex} 
          setRobot={setRobot}
          paths={paths}
        />
      ))}
      
      <div className="point-controls">
        <button onClick={handleAddPoint}>
          Add Point
        </button>
        <button 
          onClick={handleRemovePoint} 
          disabled={path.points.length <= 1}
        >
          Remove Point
        </button>
        <button 
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              updated.splice(index, 1);
              return updated;
            });
          }}
          disabled={paths.length <= 1}
        >
          Delete Path
        </button>
        <button
          onClick={() => {
            setPathsTotal(prev => prev + 1);
            setPaths(prev => {
              const updated = [...prev];
              const newPath = {
                name: `Path ${updated.length + 1}`,
                points: [{x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y}, {x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300)}],
                pathpoints: [{x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y}, {x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300)}],
                color: getPredictableColor(pathsTotal)
              };
              updated.splice(index + 1, 0, newPath);
              return updated;
            });
          }}
        >
          Add Path Below
        </button>
        <button
          className={`generate-btn ${isLoading ? 'loading' : ''}`}
          onClick={() => handleGeneratePath(index)}
          disabled={path.points.length < 2 || isLoading}
        >
          {isLoading ? (
            <span className="spinner"></span>
          ) : (
            "Generate Path"
          )}
        </button>
      </div>
    </div>
  );
}

function PathManager({ paths, setPaths, setRobot, setAnimationState, robot, obstacles, abortControllers, pathsTotal, setPathsTotal }) {
  // Fixed: Single path add/remove
  const handleAddPath = () => {
    setPathsTotal(prev => prev + 1);
    //first point is by defaut the same as the last point of the previous path
    const lastPath = paths[paths.length - 1];
    const firstPoint = lastPath ? lastPath.points[lastPath.points.length - 1] : {x: 0, y: 0, h: 0, stop: true, constrainHeading: true};
    // Add new path with first point at the last point of the previous path and a new point after it
    const newPoint = {
        x: firstPoint.x + (Math.random() * 600 - 300), //
        y: firstPoint.y + (Math.random() * 600 - 300), // Randomly within 600mm of last point
        h: firstPoint.h || 0,
        stop: true,
        constrainHeading: true
    };

    // or at (0, 0) if no paths exist
    if (paths.length > 0 && firstPoint) {
      setPaths(prev => [...prev, {
        name: `Path ${prev.length+1}`,
        points: [{x: firstPoint.x, y: firstPoint.y}, newPoint],
        pathpoints: [{x: firstPoint.x, y: firstPoint.y}, newPoint],
        color: getPredictableColor(pathsTotal)
      }]);
        
    } else {
      // If no paths exist, start with a default point at (0, 0)
      setPaths(prev => [...prev, {
        name: `Path ${prev.length+1}`,
        points: [{x: 0, y: 0}, newPoint],
        pathpoints: [{x: 0, y: 0}, newPoint],
        color: getPredictableColor(pathsTotal)
      }]);
    }
    // Reset animation state when adding new path
    setAnimationState(prev => ({
      ...prev,
      isPlaying: false,
      totalProgress: 0,
      currentPathIndex: 0
    }));

    // Also set the robot to the first point of the new path
    setRobot(prev => ({
      ...prev,  // Keep existing robot state
      x: firstPoint.x,
      y: firstPoint.y,
      width: robotAttributes[0].defaultValue * 25.4, // Convert to
      length: robotAttributes[1].defaultValue * 25.4, // Convert to mm
      heading: 90 // Default heading
    }));
  };

  const handleRemovePath = () => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="path-manager">   
      <h5>Paths</h5>
      
      {paths.map((path, index) => (
        <div key={index} className="path-container">
          <PathInput 
            path={path} 
            paths={paths}
            setPaths={setPaths} 
            index={index} 
            setRobot={setRobot}
            obstacles={obstacles}
            robot={robot}
            abortControllers={abortControllers}
            pathsTotal={pathsTotal}
            setPathsTotal={setPathsTotal}
          />
        </div>
      ))}
      
      <div className="path-controls">
        <button onClick={handleAddPath}>
          Add Path
        </button>
        <button 
          onClick={handleRemovePath} 
          disabled={paths.length <= 1}
        >
          Remove Path
        </button>
      </div>
    </div>
  );
}

function ObstacleManager({ obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded }) {

  const handleAddObstacle = () => {
    const newObstacle = {
      name: `Obstacle ${obstacles.length + 1}`,
      points: [
        {x: Math.random() * 600, y: Math.random() * 600},
        {x: Math.random() * 600, y: Math.random() * 600},
        {x: Math.random() * 600, y: Math.random() * 600} // Start with 3 points
      ]
    };
    setObstacles(prev => [...prev, newObstacle]);
  };

  const handleRemoveObstacle = () => {
    if (obstacles.length > 0) {
      setObstacles(prev => prev.slice(0, -1));
    }
  }

  return (
    <div className="obstacle-manager">
      <div className="obstacle-header" onClick={() => setObstaclesExpanded(!obstaclesExpanded)}>
        <h5>Obstacles</h5>
        <span>{obstaclesExpanded ? '▼' : '▶'}</span>
      </div>

      {obstaclesExpanded && (
        <>
          {obstacles.map((obstacle, index) => (
            <ObstacleInput 
              key={index} 
              obstacle={obstacle} 
              setObstacles={setObstacles} 
              index={index} 
              obstaclesExpanded={obstaclesExpanded} 
              setObstaclesExpanded={setObstaclesExpanded} 
            />
          ))}
        </>
      )}

      {obstaclesExpanded && (<div className="obstacle-controls">
        <button onClick={handleAddObstacle}>
          Add Obstacle
        </button>
        <button 
          onClick={handleRemoveObstacle} 
          disabled={obstacles.length <= 0}
        >
          Remove Obstacle
        </button>
      </div>
      )}
    </div>
  );
}

function ObstacleInput({ obstacle, setObstacles, index, obstaclesExpanded, setObstaclesExpanded }) {
  //handle adding a new point to the obstacle
  const handleAddPoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      updated[index].points.push({
        x: Math.random() * 600, // Randomly generate new point
        y: Math.random() * 600
      });
      return updated;
    });
  };
  //handle removing the last point from the obstacle
  const handleRemovePoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      if (updated[index].points.length > 3) { // Keep at least 3
        updated[index].points.pop();
      }
      return updated;
    });
  };
  return (
    <div key={index} className="obstacle-container">
      <input
        type="text"
        value={obstacle.name}
        onChange={(e) => {
          setObstacles(prev => {
            const updated = [...prev]; 
            updated[index].name = e.target.value;
            return updated;
          });
        }}
        placeholder="Obstacle Name"
      />

      {obstacle.points.map((point, pointIndex) => (
        <div key={pointIndex} className="obstacle-point">
          <span>Point {pointIndex + 1}: </span>
          <input
            type="number"
            placeholder="X (mm)"
            value={point.x || 0}
            onChange={(e) => {
              const newX = parseFloat(e.target.value);
              if (!isNaN(newX)) {
                setObstacles(prev => {
                  const updated = [...prev];
                  updated[index].points[pointIndex].x = newX;
                  return updated;
                });
              }
            }}
          />
          <input
            type="number"
            placeholder="Y (mm)"
            value={point.y || 0}
            onChange={(e) => {
              const newY = parseFloat(e.target.value);
              if (!isNaN(newY)) {
                setObstacles(prev => {
                  const updated = [...prev];
                  updated[index].points[pointIndex].y = newY;
                  return updated;
                });
              }
            }}
          />
        </div>
      ))}
      <div className="obstacle-point-controls">
        <button onClick={handleAddPoint}>
          Add Point
        </button>
        <button 
          onClick={handleRemovePoint} 
          disabled={obstacle.points.length <= 3}
        >
          Remove Point
        </button>
      </div>
    </div> 
  );
}

function ModuleManager({ modules, setModules, modulesExpanded, setModulesExpanded, addedModules, setAddedModules, paths, setPaths, obstacles, robot }) {
  return (
    <div className="module-manager">
      <div className="module-header" onClick={() => setModulesExpanded(!modulesExpanded)}>
        <h5>Modules</h5>
        <span>{modulesExpanded ? '▼' : '▶'}</span>
      </div>

      {modulesExpanded && (
        //two lists: added module list and available modules
        //Each module on the availablie modules list has an "Add" button next to it
        //Each module on the added module list has a "Remove" button next to it
        //should be in the format of a grid of cards
        <div>
          <div className="module-added-container">
            <h6>Added Modules</h6>
            {addedModules.map((module, index) => (
              <div className="module-container" key={index}>
                <Module
                  module={module} 
                  setModules={setModules} 
                  index={index} 
                  addedModules={addedModules} 
                  setAddedModules={setAddedModules} 
                  added={true}
                  paths={paths}
                  setPaths={setPaths}
                  obstacles={obstacles}
                />
              </div>
            ))}
          </div>
          <div className="module-list-container">
            <h6>Available Modules</h6>
            {modules.map((module, index) => (
              <div className="module-container" key={index}>
                <Module
                  module={module} 
                  setModules={setModules} 
                  index={index} 
                  addedModules={addedModules} 
                  setAddedModules={setAddedModules} 
                  added={false}
                  paths={paths}
                  setPaths={setPaths}
                  obstacles={obstacles}
                  robot={robot}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Module({ module, setModules, index, addedModules, setAddedModules, added, paths, setPaths, obstacles, robot }) {
  const handleAddModule = (newModule) => {
    var moduleID = Math.random().toString(36).substr(2, 9);

    // Use getPathPoints if present, otherwise fallback to static points
    let modulePathPoints = [];
    if (typeof newModule.path.getPathPoints === "function") {
      modulePathPoints = newModule.path.getPathPoints({ paths, robot, obstacles });
    } else {
      modulePathPoints = newModule.path.points;
    }

    const moduleToAdd = { ...newModule, moduleID: moduleID };
    setAddedModules(prev => [...prev, moduleToAdd]);

    const lastPath = paths[paths.length - 1];
    const firstPoint = lastPath ? lastPath.points[lastPath.points.length - 1] : { x: 0, y: 0 };
    const moduleFirstPoint = modulePathPoints[0];

    const pathPoints = generateOptimalPath(
      { 
        name: "Connection Path",
        points: [firstPoint, moduleFirstPoint],
        startHeading: 0,
        endHeading: 0,
        headingControlType: "tangential"
      }, 
      obstacles, 
      robot
    );

    pathPoints.points = pathPoints.points.concat(modulePathPoints.slice(1));

    const newPath = {
      name: `Module: ${newModule.name}`,
      points: pathPoints.points,
      headingControlType: newModule.path.headingControlType || "tangential",
      startHeading: newModule.path.startHeading || 0,
      endHeading: newModule.path.endHeading || 0,
      moduleID: moduleID
    };

    setPaths(prev => [...prev, newPath]);
  }

  const handleRemoveModule = (index) => {
    setAddedModules(prev => prev.filter((module, i) => i !== index));
    //remove the path associated with the module
    console.log("Removing module with ID:", module.moduleID);
    setPaths(prev => prev.filter(path => path.moduleID !== module.moduleID));
  };

  return (
    <div>
      <div className="module-item">
        <h7>{module.name}</h7>
      </div>
      {added && (
        <div className="module-controls">
          <button onClick={() => handleRemoveModule(index)}>Remove</button>
        </div>
      )}
      {!added && (
        <div className="module-controls">
          <button onClick={() => handleAddModule(module)}>Add</button>
        </div>
      )}
    </div>
  );
}

function isPointInPolygon(polygon, point) {
    let isInside = false;
    const x = point[0];
    const y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const area = Math.abs(
    (lineEnd.x - lineStart.x) * (lineStart.y - point.y) - 
    (lineStart.x - point.x) * (lineEnd.y - lineStart.y)
  );
  const lineLength = Math.sqrt(
    Math.pow(lineEnd.x - lineStart.x, 2) + 
    Math.pow(lineEnd.y - lineStart.y, 2)
  );
  return area / lineLength;
}

function goToClosestShootingPosition(paths, robot, obstacles) {
  //define shooting zones as polygons
  const shootingZones = [
    {
      name: "Zone 1",
      points: [{x: -1770, y: -600}, {x: -1770, y: 600}, {x: -1000, y: 1000}, {x:0, y: 0}, {x: -1000, y: -1000}]
    },
    {
      name: "Zone 2", 
      points: [{x: 1770, y: 600}, {x: 1200, y: 0}, {x: 1770, y: -600}]
    }
  ];

  //get the last point of the last path
  const point = paths[paths.length - 1].points[paths[paths.length - 1].points.length - 1];

  //check if point is already in a shooting zone AND not in obstacle
  for (let zone of shootingZones) {
    if (isPointInPolygon(zone.points.map(p => [p.x, p.y]), [point.x, point.y])) {
      // Verify the point is not inside any obstacle
      let pointInObstacle = false;
      for (let obstacle of obstacles) {
        if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [point.x, point.y])) {
          pointInObstacle = true;
          break;
        }
      }
      if (!pointInObstacle) {
        return [{ x: point.x, y: point.y }];
      }
    }
  }

  // Generate candidate points along zone boundaries
  let candidatePoints = [];
  
  for (let zone of shootingZones) {
    // Sample multiple points along each edge for better coverage
    for (let i = 0; i < zone.points.length; i++) {
      const V1 = zone.points[i];
      const V2 = zone.points[(i + 1) % zone.points.length];
      
      // Sample multiple points along this edge
      for (let t = 0.1; t < 1.0; t += 0.2) {
        const candidate = {
          x: V1.x + t * (V2.x - V1.x),
          y: V1.y + t * (V2.y - V1.y)
        };
        
        // Check if candidate is inside any obstacle
        let inObstacle = false;
        for (let obstacle of obstacles) {
          if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [candidate.x, candidate.y])) {
            inObstacle = true;
            break;
          }
        }
        
        if (!inObstacle) {
          candidatePoints.push(candidate);
        }
      }
    }
  }

  // If no valid candidates found, use the original closest point logic but filter obstacles
  if (candidatePoints.length === 0) {
    for (let zone of shootingZones) {
      for (let i = 0; i < zone.points.length; i++) {
        const V1 = zone.points[i];
        const V2 = zone.points[(i + 1) % zone.points.length];
        const candidate = closestPointOnSegment(V1, V2, point);
        
        let inObstacle = false;
        for (let obstacle of obstacles) {
          if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [candidate.x, candidate.y])) {
            inObstacle = true;
            break;
          }
        }
        
        if (!inObstacle) {
          candidatePoints.push(candidate);
        }
      }
    }
  }

  // Find the best candidate based on actual path distance and safety
  let bestCandidate = null;
  let bestScore = Infinity;

  for (let candidate of candidatePoints) {
    const path = generateOptimalPath({
      name: "temp",
      points: [point, candidate],
      startHeading: 0,
      endHeading: 0,
      headingControlType: "tangential"
    }, obstacles, robot);

    // Calculate path length
    let pathLength = 0;
    for (let i = 0; i < path.points.length - 1; i++) {
      pathLength += Math.sqrt(distSq(path.points[i], path.points[i + 1]));
    }

    // Calculate safety score (avoid paths that go near obstacles)
    let safetyScore = 0;
    for (let i = 0; i < path.points.length; i += 5) { // Sample every 5th point
      for (let obstacle of obstacles) {
        if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [path.points[i].x, path.points[i].y])) {
          safetyScore += 1000; // Heavy penalty for being inside obstacle
        }
      }
    }

    const totalScore = pathLength + safetyScore;
    
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestCandidate = candidate;
    }
  }

  // Fallback: if no valid candidate found, just return the original point
  if (!bestCandidate) {
    console.warn("No valid shooting position found, using current position");
    return [{ x: point.x, y: point.y }];
  }

  return [{ x: bestCandidate.x, y: bestCandidate.y }];
}
function goToClosestParkingPosition(paths, robot, obstacles) {
  //define parking zones as polygons
  const parkingZones = [
    {
      name: "Zone 1",
      points: [{x: 900, y: 0}, {x: 400, y: 0}, {x: -900, y: -1400}, {x:1500, y: -1400}, {x: 1500, y: -800}]
    },
    {
      name: "Zone 2",
      points: [{x: -1500, y: -900}, {x: -1500, y: 0}, {x: -500, y: 0}]
    }
  ];

  //TODO the paths do not update, so this point is out of date
  //get the last point of the last path
  console.log("paths:", paths);
  const point = paths[paths.length - 1].points[paths[paths.length - 1].points.length - 1];

  //check if point is already in a parking zone
  for (let zone of parkingZones) {
    if (isPointInPolygon(zone.points.map(p => [p.x, p.y]), [point.x, point.y])) {
      const pointsObject = [
        { x: point.x, y: point.y }
      ];
      return pointsObject; //already in a parking zone
    }
  }

  // 2. If outside, the closest point must be on the boundary.
  //Go through each zone and find the closest point on the boundary
  //Choose the closest one
  let closestPoints = [];
  for (let zone of parkingZones) {
    let minDistanceSq = Infinity;
    let closestPoint = null;

    // Iterate over every edge of the polygon
    for (let i = 0; i < zone.points.length; i++) {
      const V1 = zone.points[i];
      const V2 = zone.points[(i + 1) % zone.points.length]; // Wraps the last vertex back to the first

      // Find the closest point on the current line segment (V1, V2)
      const currentClosest = closestPointOnSegment(V1, V2, point);
      const distanceSq = distSq(currentClosest, point);

      // Update the overall closest point if this one is closer
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestPoint = currentClosest;
      }
    }
    closestPoints.push(closestPoint);
  }

  //find the overall closest point
  let minDistanceSq = Infinity;
  let closestPoint = null;
  for (let p of closestPoints) {
    const distanceSq = distSq(p, point);
    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      closestPoint = p;
    }
  }
  const pointsObject = [
    { x: closestPoint.x, y: closestPoint.y }
  ];
  return pointsObject;
}

const closestPointOnSegment = (V1, V2, P_ext) => {
  const L2 = distSq(V1, V2);

  // V1 and V2 are the same point (degenerate segment)
  if (L2 === 0) {
    return V1;
  }

  // Calculate 't', the projection parameter
  // t = (P_ext - V1) . (V2 - V1) / |V2 - V1|^2
  const dot = (P_ext.x - V1.x) * (V2.x - V1.x) + (P_ext.y - V1.y) * (V2.y - V1.y);
  let t = dot / L2;

  // Clamp t to the range [0, 1] to ensure the point lies on the segment (not the infinite line)
  t = Math.max(0, Math.min(1, t));

  // The closest point is V1 + t * (V2 - V1)
  return {
    x: V1.x + t * (V2.x - V1.x),
    y: V1.y + t * (V2.y - V1.y),
  };
};

const distSq = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
};

function getPredictableColor(index, saturation = 70, lightness = 50) {
  const goldenRatioConjugate = 0.618033988749895;
  
  // Multiply index by the golden ratio and take the fractional part
  let hue = (index * goldenRatioConjugate) % 1;
  
  // Convert 0-1 range to 0-360 degrees for HSL
  hue = Math.floor(hue * 360);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default App;
