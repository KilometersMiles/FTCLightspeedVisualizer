import { useState, useRef, useEffect } from 'react';
import FieldMap from './components/FieldMap';
import SideBar from './components/SideBar';
import { INITIAL_PATHS, INITIAL_OBSTACLES, INITIAL_MODULES, ROBOT_ATTRIBUTES } from './utils/initialData';
import './App.css';

function App() {
  const [paths, setPaths] = useState(INITIAL_PATHS);
  const [pathsTotal, setPathsTotal] = useState(1);
  const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
  const [modules, setModules] = useState(INITIAL_MODULES);
  const [addedModules, setAddedModules] = useState([]);
  
  const [obstaclesExpanded, setObstaclesExpanded] = useState(false);
  const [modulesExpanded, setModulesExpanded] = useState(false);

  const [robot, setRobot] = useState({
    x: paths[0].points[0].x, 
    y: paths[0].points[0].y, 
    width: ROBOT_ATTRIBUTES[0].defaultValue * 25.4, 
    length: ROBOT_ATTRIBUTES[1].defaultValue * 25.4,
    heading: 0,
    speed: ROBOT_ATTRIBUTES[2].defaultValue,
    buffer: ROBOT_ATTRIBUTES[3].defaultValue * 25.4 
  });

  const [animationState, setAnimationState] = useState({
    isPlaying: false,
    totalProgress: 0,
    pathProgress: 0,
    currentPathIndex: 0,
    pathStartTimes: [],
  });

  const abortControllers = useRef({});

  return (
    <div className="App">
      <header className="App-header">
        <FieldMap 
          robot={robot} 
          setRobot={setRobot} 
          paths={paths} 
          setPaths={setPaths} 
          obstacles={obstacles} 
          setObstacles={setObstacles} 
          showObstacles={obstaclesExpanded}  
          abortControllers={abortControllers} 
        />
        <SideBar 
          robot={robot} 
          setRobot={setRobot} 
          paths={paths} 
          setPaths={setPaths} 
          animationState={animationState} 
          setAnimationState={setAnimationState} 
          obstacles={obstacles} 
          setObstacles={setObstacles} 
          obstaclesExpanded={obstaclesExpanded} 
          setObstaclesExpanded={setObstaclesExpanded} 
          modules={modules} 
          setModules={setModules} 
          modulesExpanded={modulesExpanded} 
          setModulesExpanded={setModulesExpanded} 
          addedModules={addedModules} 
          setAddedModules={setAddedModules} 
          abortControllers={abortControllers} 
          pathsTotal={pathsTotal} 
          setPathsTotal={setPathsTotal} 
        />
      </header>
    </div>
  );
}

export default App;