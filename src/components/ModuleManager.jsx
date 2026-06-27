import { useState, useRef, useCallback, useEffect } from 'react';
import { generateOptimalPath } from '../utils/pathfinding/ThetaStar';
import { getPredictableColor } from '../utils/colors';
import { Plus, Minus, Trash2, Box, Zap, HelpCircle } from 'lucide-react';

function ModuleManager({ modules, setModules, modulesExpanded, setModulesExpanded, addedModules, setAddedModules, paths, setPaths, pathsTotal, setPathsTotal, obstacles, robot, addNotification }) {
  const [saveStatus, setSaveStatus] = useState('saved');

  //saves and loads modules
  useEffect(() => {
    async function loadStoredData() {
      if (window.electronAPI) {
        const savedData = await window.electronAPI.getData('modules');
        console.log(savedData);
        if (savedData) setModules(savedData);
      }
    }
    loadStoredData();
  }, []);
  useEffect(() => {
    setSaveStatus('Saving...');

    const delayTimer = setTimeout(() => {
      saveModuleData();
    }, 500);

    return () => clearTimeout(delayTimer);

  }, [modules]);

  const saveModuleData = () => {
    //save modules data
    if (window.electronAPI) {
      window.electronAPI.saveData('modules', modules);
      async function loadStoredData() {
        const savedData = await window.electronAPI.getData('modules');
        console.log(savedData);
      }
      loadStoredData();
    }
  };

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
                  pathsTotal={pathsTotal}
                  setPathsTotal={setPathsTotal}
                  obstacles={obstacles}
                  addNotification={addNotification}
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
                  modules={modules}
                  setModules={setModules}
                  index={index}
                  addedModules={addedModules}
                  setAddedModules={setAddedModules}
                  added={false}
                  paths={paths}
                  setPaths={setPaths}
                  pathsTotal={pathsTotal}
                  setPathsTotal={setPathsTotal}
                  obstacles={obstacles}
                  robot={robot}
                  addNotification={addNotification}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Module({ module, modules, setModules, index, addedModules, setAddedModules, added, paths, setPaths, pathsTotal, setPathsTotal, obstacles, robot, addNotification }) {
  const handleAddModule = (newModule) => {
    var moduleID = Math.random().toString(36).substr(2, 9);

    // static points can be saved in module
    // path generation on modules requires getPathPoints but can't be saved
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
        name: `${newModule.name} connection`,
        points: [firstPoint, moduleFirstPoint],
        startHeading: 0,
        endHeading: 0,
        headingControlType: "tangential"
      },
      obstacles,
      robot,
      addNotification
    );

    pathPoints.points = pathPoints.points.concat(modulePathPoints.slice(1));

    setPathsTotal(prev => prev + 1);

    const newPath = {
      name: `Module: ${newModule.name}`,
      color: getPredictableColor(pathsTotal),
      points: pathPoints.points,
      pathpoints: pathPoints.points,
      moduleID: moduleID
    };

    addNotification('success', 'Module added to path', `${newModule.name} was added as a path.`);

    setPaths(prev => [...prev, newPath]);
  }

  const handleRemoveModule = (index) => {
    setAddedModules(prev => prev.filter((module, i) => i !== index));
    setPaths(prev => prev.filter(path => path.moduleID !== module.moduleID));
      addNotification('success', 'Module path removed', `The module path was successfully removed.`);

  };

  const handleDeleteModule = (module) => {
    const userConfirmed = confirm("Are you sure you want to delete this module permanently? There is no coming back");

    if (userConfirmed) {
      setModules(prev => prev.filter(item => item !== module));
      if (window.electronAPI) {
        window.electronAPI.saveData('modules', modules);
        addNotification('success', 'Module successfully deleted', `The module was permanetly deleted. No going back...`);
      }

    }
  };

  return (
    <div>
      <div className="module-item">
        <h7>{module.name}</h7>
      </div>
      {added && (
        <div className="module-controls">
          <button onClick={() => handleRemoveModule(index)} title="Remove From Paths">
            <Minus size={14} />
          </button>
        </div>
      )}
      {!added && (
        <div className="module-controls">
          <button onClick={() => handleAddModule(module)} title="Add Module">
            <Plus size={14} />
          </button>
          <button onClick={() => handleDeleteModule(module)} title="Delete Module (permanently)">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ModuleManager;