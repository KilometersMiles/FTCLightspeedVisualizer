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

export default ModuleManager;