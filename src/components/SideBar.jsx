import { useRef } from 'react';
import AttributesInputField from './AttributesInputField';
import PathManager from './PathManager';
import ObstacleManager from './ObstacleManager';
import ModuleManager from './ModuleManager';
import AnimationControls from './AnimationControls';
import { saveFTCAutoFile, loadFTCAutoFile } from '../utils/fileHelpers';

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

export default SideBar;