# Uses force/torque based model. Pretty good assumtions. check https://stumejournals.com/journals/tm/2025/2/51.full.pdf for info on modeling assumptions
# TODO: approximate torque from voltage, then restrict voltage instead
# TODO: better initial guesses. Probably use quitic hermite splines and maybe even invert the dynamics to guess times and controls.
import casadi as ca
import numpy as np
import sys
import json
import matplotlib.pyplot as plt

class Drivetrain:
    def __init__(self, name, mass, moi, wheel, length, width, mu, motor):
        self.name = name
        self.mass = mass
        self.moi = moi
        self.wheel = wheel
        self.length = length
        self.width = width
        self.radius = np.sqrt((width/2) ** 2 + (length/2) ** 2)
        self.mu = mu
        self.motor = motor

class Motor:
    def __init__(self, Vmax, torqueConstant, radPerVolt, resistance):
        self.Vmax = Vmax
        self.torqueConstant = torqueConstant
        self.radPerVolt = radPerVolt
        self.resistance = resistance

def findTrajectory (waypoints, obstacles, robot):
    opti = ca.Opti()

    nPerSegment = 30
    numSegments = len(waypoints) - 1

    r = robot.wheel
    lx, ly = (robot.width/2), (robot.length/2)
    mass = robot.mass
    moi = robot.moi
    robotRadius = robot.radius
    mu = robot.mu

    # Vmax = robot.motor.Vmax
    # Kt = robot.motor.torqueConstant
    # Kv = robot.motor.radPerVolt
    # R = robot.motor.resistance

    maxTorque = 5 #Nm

    Tsegments = [] 
    Xsegments = [] #State [x, vx, y, vy, θ, w]. x and y pos in global frame. vx vy are in body frame
    Usegments = [] 

    for i in range (numSegments):
        Tsegments.append(opti.variable())
        Xsegments.append(opti.variable(6, nPerSegment + 1))
        Usegments.append(opti.variable(4, nPerSegment))
    
        opti.subject_to(Tsegments[i] >= 0.005)
        opti.set_initial(Tsegments[i], 1) # Guess .1 second per leg

    # uses same dynamic model as shown in https://stumejournals.com/journals/tm/2025/2/51.full.pdf
    # does have some assumptions, but are reasonable

    #move to robot class later
    Bx = .2
    By = .15
    Bz = .25

    def getDynamicModel(x, u):
        theta = x[4]
        vxBody = x[1]
        vyBody = x[3]
        omega = x[5]

        torque1, torque2, torque3, torque4 = u[0], u[1], u[2], u[3]

        forceX = (torque1 + torque2 + torque3 + torque4)*(1/(np.sqrt(2)* r))
        forceY = (-torque1 + torque2 + torque3 - torque4)*(1/(np.sqrt(2)*r))
        forceW = (-torque1 + torque2 - torque3 + torque4)*(1/(np.sqrt(2) * r))*(lx+ly)

        velX = (vxBody * ca.cos(theta)) - (vyBody * ca.sin(theta))
        accelX = (1/mass)*(forceX - (Bx * vxBody) + (mass * vyBody * omega)) 
        velY = (vxBody * ca.sin(theta)) + (vyBody * ca.cos(theta))
        accelY = (1/mass)*(forceY - (By * vyBody) - (mass * vxBody * omega)) 
        angVel = omega
        angAccel = (1/moi)*(forceW - (Bz * omega))
        
        return ca.vertcat(velX, accelX, velY, accelY, angVel, angAccel)
    
    opti.minimize(ca.sum1(ca.vertcat(*Tsegments)))

    for i in range(numSegments):
        dt = Tsegments[i] / nPerSegment
        X = Xsegments[i]
        U = Usegments[i]

        wp_start = waypoints[i]
        wp_end = waypoints[i+1]
        for idx, k in enumerate(range(nPerSegment + 1)):
            fraction = k / nPerSegment
            guess_x = wp_start['x'] + fraction * (wp_end['x'] - wp_start['x'])
            guess_y = wp_start['y'] + fraction * (wp_end['y'] - wp_start['y'])
            guess_theta = wp_start['theta'] + fraction * (wp_end['theta'] - wp_start['theta'])
            opti.set_initial(X[:, k], [guess_x, 0, guess_y, 0, guess_theta, 0])

        for k in range(nPerSegment):
            #RK4
            k1 = getDynamicModel(X[:, k],         U[:, k])
            k2 = getDynamicModel(X[:, k] + dt/2*k1, U[:, k])
            k3 = getDynamicModel(X[:, k] + dt/2*k2, U[:, k])
            k4 = getDynamicModel(X[:, k] + dt*k3,   U[:, k])
            opti.subject_to(X[:, k+1] == X[:, k] + dt/6*(k1 + 2*k2 + 2*k3 + k4))
            # Obstacles
            robot_x = X[0, k]
            robot_y = X[2, k]
            for obs in obstacles:
                dist_sq = (robot_x - obs['x'])**2 + (robot_y - obs['y'])**2
                min_dist = robotRadius + obs['radius']
                opti.subject_to(dist_sq >= min_dist**2)
            #max friction of tires
            # for w in range(4):
            #     forceOfWheelSquared = (Usegments[i][w, k] / r)**2
            #     maxWheelForce = (mu * (mass * 9.81 / 4)) **2
            #     opti.subject_to(forceOfWheelSquared <= maxWheelForce)

            maxWheelForce = mu * (mass * 9.81 / 4)
            wheel_forces = U / r
            opti.subject_to(opti.bounded(-maxWheelForce, wheel_forces, maxWheelForce))
            
        opti.subject_to(opti.bounded(-maxTorque, U, maxTorque))

    for i in range(numSegments + 1):        
        wp = waypoints[i]

        if i < numSegments:
            currState = Xsegments[i][:, 0]
        else:
            currState = Xsegments[numSegments-1][:, -1]
        opti.subject_to(currState[0] == wp['x'])
        opti.subject_to(currState[2] == wp['y'])
        if wp.get('constrain_theta', True): 
                opti.subject_to(currState[4] == wp['theta'])        
       
        # Stop at this waypoint?
        if wp.get('stop', False):
            opti.subject_to(currState[1] == 0)
            opti.subject_to(currState[3] == 0)
            opti.subject_to(currState[5] == 0)

        # Connect segments (Continuity)
        if 0 < i < numSegments:
            opti.subject_to(Xsegments[i-1][:, -1] == Xsegments[i][:, 0])
    
    opts = {"ipopt.print_level": 0, "print_time": 0, "ipopt.sb": "yes"}
    opti.solver("ipopt", opts)
    # Use when testing for print info
    # opti.solver('ipopt', {"print_time": True}, {"print_level": 5})

    try:
        sol = opti.solve()
    except Exception as e:
        print("Fail. Check conditions")
        sys.exit(1)

    full_path_json = []
    total_time_elapsed = 0

    for i in range(numSegments):
        T_val = sol.value(Tsegments[i])
        X_val = sol.value(Xsegments[i])
        dt = T_val / nPerSegment
        
        # add all points
        limit = nPerSegment if i < numSegments - 1 else nPerSegment + 1
        for k in range(limit):
            full_path_json.append({
                "t": total_time_elapsed + k * dt,
                "x": float(X_val[0, k]),
                "y": float(X_val[2, k]),
                "theta": float(X_val[4, k]),
                "vx": float(X_val[1, k]),
                "vy": float(X_val[3, k]),
                "omega": float(X_val[5, k])
            })
        total_time_elapsed += T_val

    return full_path_json, total_time_elapsed

def visualize_and_save(path_data, total_time):
    if not path_data: return
    
    # Save JSON
    with open('trajectory.json', 'w') as f:
        json.dump(path_data, f, indent=4)
    print(f"Success! Exported {len(path_data)} points to trajectory.json")

    # 1. Extract and Calculate Frame Transformations
    t = np.array([p['t'] for p in path_data])
    x = np.array([p['x'] for p in path_data])
    y = np.array([p['y'] for p in path_data])
    theta = np.array([p['theta'] for p in path_data])
    v_bx = np.array([p['vx'] for p in path_data])
    v_by = np.array([p['vy'] for p in path_data])
    omega = np.array([p['omega'] for p in path_data])

    # Transform to Global Frame (World X, World Y)
    v_gx = v_bx * np.cos(theta) - v_by * np.sin(theta)
    v_gy = v_bx * np.sin(theta) + v_by * np.cos(theta)

    # Calculate Path Frame (Tangent/Normal)
    # The tangent angle is the direction of the global velocity vector
    path_angle = np.arctan2(v_gy, v_gx + 1e-9)
    v_mag = np.sqrt(v_gx**2 + v_gy**2)
    
    # In the path frame, 'tangent' is just the magnitude of total velocity
    # 'normal' (lateral slip relative to path) is usually near 0 for optimized paths
    v_tangent = v_mag
    v_normal = -v_gx * np.sin(path_angle) + v_gy * np.cos(path_angle)

    # 2. Plotting
    plt.figure(figsize=(16, 15))
    
    # Row 1: Spatial Path and Heading
    plt.subplot(3, 2, 1)
    plt.plot(x, y, 'b-', linewidth=2)
    plt.title(f"Optimized Path (Total Time: {total_time:.2f}s)")
    plt.xlabel("X (m)"); plt.ylabel("Y (m)"); plt.axis('equal'); plt.grid(True)
    # Draw obstacles
    for obs in obstacles:
        circle = plt.Circle((obs['x'], obs['y']), obs['radius'], color='r', alpha=0.3, label="Obstacle")
        plt.gca().add_patch(circle)
    plt.subplot(3, 2, 2)
    plt.plot(t, np.degrees(theta), 'g-')
    plt.title("Heading (Global Degrees)")
    plt.xlabel("Time (s)"); plt.ylabel("Degrees"); plt.grid(True)

    # Row 2: Body Frame vs Global Frame
    plt.subplot(3, 2, 3)
    plt.plot(t, v_bx, label="Forward (v_bx)")
    plt.plot(t, v_by, label="Strafe (v_by)")
    plt.title("Body Frame Velocities")
    plt.xlabel("Time (s)"); plt.ylabel("m/s"); plt.legend(); plt.grid(True)

    plt.subplot(3, 2, 4)
    plt.plot(t, v_gx, label="Global Vx")
    plt.plot(t, v_gy, label="Global Vy")
    plt.title("Global Frame Velocities")
    plt.xlabel("Time (s)"); plt.ylabel("m/s"); plt.legend(); plt.grid(True)

    # Row 3: Path Frame and Rotation
    plt.subplot(3, 2, 5)
    plt.plot(t, v_tangent, 'k-', label="Tangent (Speed)")
    plt.plot(t, v_normal, 'm--', label="Normal (Path Slip)")
    plt.title("Path Frame Velocities (Tangent/Normal)")
    plt.xlabel("Time (s)"); plt.ylabel("m/s"); plt.legend(); plt.grid(True)

    plt.subplot(3, 2, 6)
    plt.plot(t, omega, 'r-')
    plt.title("Angular Velocity (Omega)")
    plt.xlabel("Time (s)"); plt.ylabel("rad/s"); plt.grid(True)

    plt.tight_layout()
    plt.savefig('trajectory_plots.png')
    plt.show()

if __name__ == "__main__":
    try:
        input_data = json.load(sys.stdin) # Reads from stdin instead of sys.argv
        raw_waypoints = input_data['waypoints']
        
        formatted_waypoints = []
        for p in raw_waypoints:
            formatted_waypoints.append({
                'x': p['x'] / 1000.0,
                'y': p['y'] / 1000.0,
                'theta': np.radians(p.get('h', 0)),
                'stop': p.get('stop', True),
                'constrain_theta': p.get('constrainHeading', True)
            })

        obstacles = [
            # {'x': 1, 'y': 1, 'radius': 0.0}
        ]

        gobilda435 = Motor(12, .1413, 3.795, 1.504)
        robot = Drivetrain("Kevin", 15, .9, .048, .5, .5, .5, gobilda435)

        result_path, total_t = findTrajectory(formatted_waypoints, obstacles, robot)

        output_points = []
        for point in result_path:
            output_points.append({
                't': point['t'],
                'x': point['x'] * 1000.0,
                'y': point['y'] * 1000.0,
                'h': float(np.degrees(point['theta'])),
                'theta': point['theta'],
                'omega': point['omega'],
                'v_bx': point['vx'],
                'v_by': point['vy'],
                'v': float(np.sqrt(point['vx']**2 + point['vy']**2))
            })
        print(json.dumps(output_points))
        sys.stdout.flush()

    except Exception as e:
        print("Exception occurred")
        print(f"Python Error: {str(e)}", file=sys.stderr)
        sys.exit(2)

    # waypoints = [
    #     {'x': -0.45, 'y': 0.45, 'theta': -np.pi/2, 'stop': True,  'constrain_theta': True},
    #     {'x': 0.9, 'y': 0.5, 'theta': -np.pi/2, 'stop': False,  'constrain_theta': True},
    #     {'x': 0.9, 'y': 0.9, 'theta': -np.pi/2, 'stop': False,  'constrain_theta': True},
    #     {'x': 0.9, 'y': 1.6, 'theta': -np.pi/2, 'stop': True,  'constrain_theta': True},
    #     # {'x': -.45, 'y': .45, 'theta': -np.pi/2, 'stop': True,  'constrain_theta': True},
    # ]
    
    
    # gobilda435 = Motor(12, .1413, 3.795, 1.504)
    
    # robot = Drivetrain("Kevin", 15, .9, .048, .5, .5, .5, gobilda435)
    
    # path, total_t = findTrajectory(waypoints=waypoints, obstacles=obstacles, robot=robot)
    # visualize_and_save(path, total_t)
    