![Lightspeed Banner](images/LightspeedBannerGlow.png)
# FTC Lightspeed Visualizer
This is a path visualizer and planner for FTC mecanum robots built with electron and CASADI. It allows for time optimization between waypoints based on constraints and has an A* varient for planning paths around obstacles. This allows it to not be restricted to certain types of splines or motion profiles, but the mathematical best for a mecanum robot.

This was made in conjunction with a (not yet ready for release) path following algorithm with the intent of making FTC autonomouses the best possible.

## How to use
Go to the releases tab and download the latest version. Unfortunately, the app is only built for Windows for now. 

### Featues & Buttons
#### Paths
There are many options to create your paths. 
- Control position and heading with the input fields or by dragging on the field.
- Use the Stop checkbox to tell the optimizer to stop at that point.
- Use the Lock H checkbox to tell the optimizer to keep a specified heading at that point.
- Add or delete any number of waypoints on each path using the ![Plus](images/plus.png) or ![Trash](images/trash-2.png) buttons.
- Add or delete any number of paths using the ![Plus](images/plus.png) or ![Trash](images/trash-2.png) buttons.

#### Optimal Generation
Clicking the ![Zap](images/zap.png) button will allow you to create the mathematically optimal path that goes through your waypoints given your constraints.

Configure settings for your robot by clicking on the settings button in the top right. You can also visualize the velocity of the robot along the path by toggling the Show Velocity toggle.

#### Obstacles
You can create any number of polygonal obstacles in the obstacle section. They are hidden from view unless the obstacles section is expanded. THESE OBSTACLES ONLY APPLY TO A*. The optimal path generation will go through them if given the opportunity, but the A* is intended for finding good waypoints to avoid them. Use this obstacle avoidance by clicking the ![Route](images/route.png) button.

#### Modules
You can save frequently used paths as modules by clicking the ![Box](images/box.png) button. Then, you can add or remove any saved module from your path. 

#### Animation
To visualize what the running the path on a robot, press the play button at the bottom. For optimized paths, it will use the realistic velocity values on the path. For unoptimized paths, it will only run a heuristic motion profile.

#### Files & Saving
Click the ![Save](images/save.png) button to save your paths as an auto. You can load those paths later by clicking the ![Folder](images/folder-open.png) button. Alternativley, the ![Download](images/download.png) button will export each optimized path seperately as a .json file. This is can be imported into a robot's specific pathing software and followed.

