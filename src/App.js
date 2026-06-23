import { useState, useRef, useEffect } from 'react';
import FieldMap from './components/FieldMap';
import SideBar from './components/SideBar';
import AnimationControls from './components/AnimationControls';
import { INITIAL_PATHS, INITIAL_OBSTACLES, INITIAL_MODULES, ROBOT_ATTRIBUTES, INITIAL_ROBOT } from './utils/initialData';
import './App.css';
import TopBar from './components/TopBar';

function App() {
    const [paths, setPaths] = useState(INITIAL_PATHS);
    const [pathsTotal, setPathsTotal] = useState(1);
    const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
    const [modules, setModules] = useState(INITIAL_MODULES);
    const [addedModules, setAddedModules] = useState([]);
    const [attributes, setAttributes] = useState(ROBOT_ATTRIBUTES)
    const [obstaclesExpanded, setObstaclesExpanded] = useState(false);
    const [modulesExpanded, setModulesExpanded] = useState(false);

    const [robot, setRobot] = useState(INITIAL_ROBOT);

    const [animationState, setAnimationState] = useState({
        isPlaying: false,
        totalProgress: 0,
        pathProgress: 0,
        currentPathIndex: 0,
        pathStartTimes: [],
    });

    const abortControllers = useRef({});
    const fileInputRef = useRef();

    return (
        <div className="App Workspace-Layout">
            <TopBar
                attributes={attributes}
                setAttributes={setAttributes}
                robot={robot}
                setRobot={setRobot}
                paths={paths}
                setPaths={setPaths}
                obstacles={obstacles}
                setObstacles={setObstacles}
                fileInputRef={fileInputRef}
            />
            <div className="Main-Content">
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
                    attributes={attributes}
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
            </div>
            <div className="Bottom-playback-bar">
                <AnimationControls
                    animationState={animationState}
                    setAnimationState={setAnimationState}
                    paths={paths}
                    robot={robot}
                    setRobot={setRobot}
                />
            </div>
        </div>
    );
}

export default App;