import { useState, useRef, useCallback } from 'react';
import { Plus, Minus, Trash2, Box, Zap, HelpCircle } from 'lucide-react';
import { getPredictableColor } from '../utils/colors';
import { ROBOT_ATTRIBUTES } from '../utils/initialData';
import LightningButton from './LightningButton';

function PathManager({ paths, setPaths, setRobot, setAnimationState, robot, obstacles, abortControllers, pathsTotal, setPathsTotal, modules, setModules }) {
  // Fixed: Single path add/remove
  const handleAddPath = () => {
    setPathsTotal(prev => prev + 1);
    //first point is by defaut the same as the last point of the previous path
    const lastPath = paths[paths.length - 1];
    const firstPoint = lastPath ? lastPath.points[lastPath.points.length - 1] : { x: 0, y: 0, h: 0, stop: true, constrainHeading: true };
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
        name: `Path ${prev.length + 1}`,
        points: [{ x: firstPoint.x, y: firstPoint.y }, newPoint],
        pathpoints: [{ x: firstPoint.x, y: firstPoint.y }, newPoint],
        color: getPredictableColor(pathsTotal)
      }]);

    } else {
      // If no paths exist, start with a default point at (0, 0)
      setPaths(prev => [...prev, {
        name: `Path ${prev.length + 1}`,
        points: [{ x: 0, y: 0 }, newPoint],
        pathpoints: [{ x: 0, y: 0 }, newPoint],
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
      width: ROBOT_ATTRIBUTES[0].defaultValue * 25.4, // Convert to
      length: ROBOT_ATTRIBUTES[1].defaultValue * 25.4, // Convert to mm
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
            setModules={setModules}
            modules={modules}
          />
        </div>
      ))}

      <div className="path-controls">
        <button onClick={handleAddPath} title='Add Path'>
          <Plus size={14} />&nbsp;&nbsp;Add Path
        </button>
        <button
          onClick={handleRemovePath}
          disabled={paths.length <= 1}
          title='Remove Path'
        >
          <Trash2 size={14} />&nbsp;&nbsp;Remove Path
        </button>
      </div>
    </div>
  );
}

function PathInput({ path, paths, setPaths, index, setRobot, obstacles, robot, abortControllers, pathsTotal, setPathsTotal, modules, setModules }) {
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
        const p2 = updated[index].points[i + 1];

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
          const p2 = updated[index].points[i + 1];

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
      console.log(path);

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

  const handleCreateModule = (e) => {
    //get points in module 
    const modulePoints = [];
    for (let i = 0; i < path.points.length; i++) {
      var point = path.points[i];
      modulePoints.push(point);
    }
    //get name
    const moduleName = path.name;
    setModules(prev => [...prev, {
      name: moduleName,
      path: {
        name: moduleName,
        startHeading: 180,
        endHeading: 180,
        headingControlType: "constant",
        points: modulePoints
      }
    }]);
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
        {/* <button onClick={handleAddPoint} title='Add Point to End'>
          <Plus size={14} />
        </button>
        <button
          onClick={handleRemovePoint}
          disabled={path.points.length <= 1}
          title='Remove Point from end'
        >
          <Minus size={14} />
        </button> */}
        <button
          onClick={() => {
            setPathsTotal(prev => prev + 1);
            setPaths(prev => {
              const updated = [...prev];
              const newPath = {
                name: `Path ${updated.length + 1}`,
                points: [{ x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y }, { x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300) }],
                pathpoints: [{ x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y }, { x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300) }],
                color: getPredictableColor(pathsTotal)
              };
              updated.splice(index + 1, 0, newPath);
              return updated;
            });
          }}
          title='Add Path'
        >
          <Plus size={14} />&nbsp;&nbsp;Add Path
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
          title="Delete Path"
        >
          <Trash2 size={14} />&nbsp;&nbsp;Delete Path
        </button>

        <button
          onClick={() => handleCreateModule()}
          title='Create Module'
        >
          <Box size={14} />
        </button>
        <LightningButton
          className={`generate-btn ${isLoading ? 'loading' : ''}`}
          onClick={() => handleGeneratePath(index)}
          disabled={path.points.length < 2 || isLoading}
          isLoading={isLoading}
        >
          {!isLoading ? (
            <Zap size={14} />
          ) : (
            <div style={{display: 'none'}}/>
          )}
        </LightningButton>
      </div>
    </div>
  );
}

function PathPointInputField({ point, setPaths, pathIndex, pointIndex, setRobot, paths }) {
  return (
    <div className="Path-point-input">
      <span style={{ fontWeight: 'bold' }}>P{pointIndex + 1}</span>
      <div className='coordinates-row'>
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
                  const p2 = updated[pathIndex].points[i + 1];

                  // Simple 2-point linear path for each segment
                  newPathPoints.push({ x: p1.x, y: p1.y });
                  newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
                return updated;
              });
              // Update robot position if this is the first point
              if (pointIndex === 0) {
                setRobot(prev => ({ ...prev, x: newX }));
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
                  const p2 = updated[pathIndex].points[i + 1];

                  // Simple 2-point linear path for each segment
                  newPathPoints.push({ x: p1.x, y: p1.y });
                  newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
                return updated;
              });
              // Update robot position if this is the first point
              if (pointIndex === 0) {
                setRobot(prev => ({ ...prev, y: newY }));
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
                setRobot(prev => ({ ...prev, heading: newH }));
              }
            }
          }}
        />
      </div>
      <div className='controls-row'>
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
              const newPoint = { x: point.x + (Math.random() * 600 - 300), y: point.y + (Math.random() * 600 - 300) }; // Add random -600-600mm offset
              updated[pathIndex].points.splice(pointIndex + 1, 0, newPoint);
              const newPathPoints = [];
              for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i + 1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
              }
              updated[pathIndex].pathpoints = newPathPoints;

              return updated;
            });
          }}
          title='Add Point'
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points.splice(pointIndex, 1);
              const newPathPoints = [];
              for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i + 1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
              }
              updated[pathIndex].pathpoints = newPathPoints;

              return updated;
            });
          }}
          disabled={paths[pathIndex].points.length <= 2}
          title='Delete Point'
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default PathManager;