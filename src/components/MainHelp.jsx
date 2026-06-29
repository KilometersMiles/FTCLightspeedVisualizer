import { Save, FolderOpen, Download, Minus, Box, Zap, Route, Settings, Plus, Trash2 } from 'lucide-react';
import LightningButton from './LightningButton';

function MainHelp() {
    return (
        <div style={{ overflowY: 'auto', height: '100%', textAlign: 'left' }}>
            <h2 style={{ textAlign: 'center', color: '#7dd3fc' }}> {/* blue probably */}
                How to use FTC Lightspeed
            </h2>
            <p>
                There are many tools and options available to help you optimize your FTC autonomous pathing.
            </p>
            <h3>
                ROBOT CONFIGURATION <Settings size={16} />
            </h3>
            <p>
                Change your robot's specific attributes to make optimization as realistic as possible.
                <ul>
                    <li><span style={{ color: '#7dd3fc' }}>Length and Width: </span>measured in inches, so the size for optimization, turning, and obstacle avoidance is accurate.</li>
                    <li><span style={{ color: '#7dd3fc' }}>Mass: </span>the weight of your robot in kilograms. Used for optimization.</li>
                    <li><span style={{ color: '#7dd3fc' }}>Moment of Inertia: </span>measured in kgm^2. A measure of resistance to angular acceleration, used for optimization. This can be difficult to directly measure, but for most robots, it wil be 1/12 m (length^2 + width^2)</li>
                    <li><span style={{ color: '#7dd3fc' }}>Wheel Radius: </span>measured in meters. For goBilda Grip Force mecanums, it is .052 (52 mm)</li>
                    <li><span style={{ color: '#7dd3fc' }}>Max forward, strafe, and angular velocity: </span>should be recorded on your actual robot. This is to determine how much drag your robot has.</li>
                    <li><span style={{ color: '#7dd3fc' }}>Coefficient of Friction: </span>an abstract number representing how well the wheels exert traction on the ground.</li>
                    <li><span style={{ color: '#7dd3fc' }}>Buffer: </span>the number of inches of space the obstacle avoidance should give between obstacles</li>
                </ul>
            </p>
            <h3>
                PATH EDITING
            </h3>
            <p>
                You can edit the x or y of each path's waypoints by dragging on the field or using the coordinate boxes. You can also edit the heading with the third box.
            </p>
            <p>
                The stop checkbox constrains the optimizer to make the robot's velocity 0 at that point. The Lock H constrains it to hit the heading at that point, but it will (probably) change throughout the path even if it's checked.
            </p>
            <p>
                Add or delete points with the <Plus size={16} /> or <Trash2 size={16} /> buttons.
            </p>
            <h3>
                OBSTACLES
            </h3>
            <p>
                You can use the <Route size={16} /> button to find the waypoints with the shortest distance around obstacles.
            </p>
            <p>
                Obstacles DO NOT apply to the <Zap size={16} /> optimal generation. You must use the <Route size={16} /> to pre-determine waypoints to avoid the obstacles. Always double check that your robot will not hit an obstacle.
            </p>
            <p>
                Edit points by dragging on the field or by using the coordinate boxes.
            </p>
            <p>
                Add or delete points with the <Plus size={16} /> or <Trash2 size={16} /> buttons.
            </p>
            <p>
                Add or delete obstacles with the <Plus size={16} /> Add Obstacle or <Trash2 size={16} /> Delete Obstacle buttons.
            </p>
            <h3>
                MODULES
            </h3>
            <p>
                Modules let you quickly reuse frequently used paths so you can make autos more quickly.
            </p>
            <p>
                On any path, click the <Box size={16} /> to create a module with those points. It is now saved for any auto you make.
            </p>
            <p>
                Click the <Plus size={16} /> button to add any available module to your paths. It will add an extra point at the beginning starting at the last point of the last path, to create a continous path.
            </p>
            <p>
                The <Trash2 size={16} /> button will PERMANETLY delete your module.
            </p>
            <p>
                Click the <Minus size={16} /> button to remove any added module from your paths.
            </p>
            <h3>
                OPTIMIZING
            </h3>
            <p>The <LightningButton className={`generate-btn`}><Zap size={14} /></LightningButton> button will optimize your path. This creates a mathematically optimal path for your robot to follow based on the points and constraints in your path.</p>
            <p>
                You can visualize the speed by toggling Show Path Velocity in the config menu.
            </p>
            <h3>
                SAVING AND EXPORTING
            </h3>
            <p>
                The <Save size={16} /> button allows you to save your progress as a .lightspeed file. You can load any .lightspeed file with the <FolderOpen size={16} /> button.
            </p>
            <p>
                To export your paths for use, click the <Download size={16} /> button. This will download each optimized path as a .json with velocities and positions that can be read by a path follower. Currently, there is no available follower for this, but one is in the works.
            </p>
        </div>
    );
}

export default MainHelp;