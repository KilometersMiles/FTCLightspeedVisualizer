import casadi as ca
import numpy as np
import sys
import json
import matplotlib.pyplot as plt

def solve_gobilda_trajectory(waypoints, obstacles):
    opti = ca.Opti()

    # --- 1. Robot Parameters (goBILDA 435 RPM Specs) ---
    N_per_segment = 30  # Increased nodes for smoother path
    num_segments = len(waypoints) - 1
    
    r = 0.048         # 96mm wheel radius (m)
    lx, ly = 0.15, 0.15
    mass = 15.0       # kg
    moi = 0.9         # Moment of Inertia
    robot_radius = 0.18  # For obstacle avoidance (m)
    
    # Motor Constants (Characterized for 435 RPM 5203)
    V_max = 12.0      
    Kt_spec = 0.1413       # Nm/A
    Kt_efficiency = (2.0/3.2)  # actual acceleration / theoretical
    Kt = Kt_spec * Kt_efficiency  # Nm/A
    Kv = 3.795        # (rad/s)/V
    R = 1.504         # Ohms
    
    # Friction (Traction Limit)
    mu = 0.5          

    mecanum_efficiency = 0.70
    max_wheel_force = (mass * 9.81 / 4) * mu * mecanum_efficiency
    # --- 2. Variables ---
    T_segments = []  # Time duration of each segment
    X_segments = []  # State: [x, y, theta, vx, vy, omega]
    U_segments = []  # Control: [V1, V2, V3, V4]
    
    for i in range(num_segments):
        T_segments.append(opti.variable())
        X_segments.append(opti.variable(6, N_per_segment + 1))
        U_segments.append(opti.variable(4, N_per_segment))
        
        # Constraints on Time
        opti.subject_to(T_segments[i] >= 0.01)
        opti.set_initial(T_segments[i], 1.0) # Guess 1 second per leg

    # --- 3. Dynamics Function ---
    def get_dynamics(x, u):
        # Unpack state: Velocities are now in BODY FRAME
        theta = x[2]
        v_bx  = x[3] # Body-frame X velocity
        v_by  = x[4] # Body-frame Y velocity
        omega = x[5]
        
        k = lx + ly
        
        # 1. Kinematics (Body Frame) - This is now correct
        # Standard Mecanum Matrix
        w = ca.vertcat(
            (v_bx - v_by - k * omega) / r,
            (v_bx + v_by + k * omega) / r,
            (v_bx + v_by - k * omega) / r,
            (v_bx - v_by + k * omega) / r
        )
        
        # 2. Motor & Force Limits (Same as before)
        torque = (Kt / R) * (u - (w / Kv))
        wheel_force = torque / r
        opti.subject_to(opti.bounded(-max_wheel_force, wheel_force, max_wheel_force))
        
        # 3. Forces in Body Frame
        fx_body = (ca.sum1(torque)) / r
        fy_body = (-torque[0] + torque[1] + torque[2] - torque[3]) / r
        tau_theta = ((-lx - ly)*torque[0] + (lx + ly)*torque[1] + (-lx - ly)*torque[2] + (lx + ly)*torque[3]) / r

        # 4. Derivatives
        
        # A. Global Position Derivatives (Rotate Body Velocity to World Frame)
        dx = v_bx * ca.cos(theta) - v_by * ca.sin(theta)
        dy = v_bx * ca.sin(theta) + v_by * ca.cos(theta)
        dtheta = omega
        # Calculate the 'strafe ratio' (0 = forward, 1 = pure sideways)
        # v_bx is forward, v_by is sideways
        vel_angle = ca.atan2(ca.fabs(v_by), ca.fabs(v_bx) + 1e-6)
        strafe_factor = ca.sin(vel_angle) 

        # Resistance increases the more sideways we go
        # 0.15 (15%) is a good starting estimate for roller axial friction
        rolling_resistance_coeff = 0.15 
        drag_force_y = v_by * rolling_resistance_coeff * mass

        # Apply this to your dv_by (sideways acceleration)
        dv_by = ((fy_body - drag_force_y) / mass) - (v_bx * omega)
        # B. Body Velocity Derivatives (Newton-Euler with Coriolis terms)
        # dv_bx = Fx/m + vy * omega
        dv_bx = (fx_body / mass) + (v_by * omega)
        
        # # dv_by = Fy/m - vx * omega
        # dv_by = (fy_body / mass) - (v_bx * omega)
        
        domega = tau_theta / moi

        return ca.vertcat(dx, dy, dtheta, dv_bx, dv_by, domega)
    # --- 4. Constraints & Integration ---
    opti.minimize(ca.sum1(ca.vertcat(*T_segments)))
    
    for i in range(num_segments):
        dt = T_segments[i] / N_per_segment
        X = X_segments[i]
        U = U_segments[i]
        
        for k in range(N_per_segment):
            # RK4 Integration
            k1 = get_dynamics(X[:, k],         U[:, k])
            k2 = get_dynamics(X[:, k] + dt/2*k1, U[:, k])
            k3 = get_dynamics(X[:, k] + dt/2*k2, U[:, k])
            k4 = get_dynamics(X[:, k] + dt*k3,   U[:, k])
            opti.subject_to(X[:, k+1] == X[:, k] + dt/6*(k1 + 2*k2 + 2*k3 + k4))
            # --- OBSTACLE AVOIDANCE CONSTRAINT ---
            # Check every obstacle at every time step
            robot_x = X[0, k]
            robot_y = X[1, k]
            for obs in obstacles:
                dist_sq = (robot_x - obs['x'])**2 + (robot_y - obs['y'])**2
                min_dist = robot_radius + obs['radius']
                opti.subject_to(dist_sq >= min_dist**2)

        opti.subject_to(opti.bounded(-V_max, U, V_max))

    # --- 5. Waypoint & Continuity Constraints ---
    for i in range(num_segments + 1):
        wp = waypoints[i]
        
        # Select the state vector corresponding to this waypoint
        if i < num_segments:
            curr_state = X_segments[i][:, 0]
        else:
            curr_state = X_segments[num_segments-1][:, -1]
        
        # Pose constraints
        opti.subject_to(curr_state[0] == wp['x'])
        opti.subject_to(curr_state[1] == wp['y'])
        if wp.get('constrain_theta', True): 
                opti.subject_to(curr_state[2] == wp['theta'])        
        # Stop at this waypoint?
        if wp.get('stop', False):
            opti.subject_to(curr_state[3:6] == 0)

        # Connect segments (Continuity)
        if 0 < i < num_segments:
            opti.subject_to(X_segments[i-1][:, -1] == X_segments[i][:, 0])

    # --- 6. Solve ---
    opts = {"ipopt.print_level": 0, "print_time": 0, "ipopt.sb": "yes"}
    opti.solver("ipopt", opts)

    try:
        sol = opti.solve()
    except Exception as e:
        print("Optimization failed! Check constraints or starting positions.")
        sys.exit(1)

    # --- 7. Data Extraction & Assembly ---
    full_path_json = []
    total_time_elapsed = 0
    
    for i in range(num_segments):
        T_val = sol.value(T_segments[i])
        X_val = sol.value(X_segments[i])
        dt = T_val / N_per_segment
        
        # Add points (skipping last point of segment to avoid duplicates, except on final segment)
        limit = N_per_segment if i < num_segments - 1 else N_per_segment + 1
        for k in range(limit):
            full_path_json.append({
                "t": total_time_elapsed + k * dt,
                "x": float(X_val[0, k]),
                "y": float(X_val[1, k]),
                "theta": float(X_val[2, k]),
                "vx": float(X_val[3, k]),
                "vy": float(X_val[4, k]),
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
    # --- Execution ---
if __name__ == "__main__":
    try:
        # Read input from Electron
        input_data = json.load(sys.stdin) # Reads from stdin instead of sys.argv
        raw_waypoints = input_data['waypoints']
        
        # 1. Convert Units: mm -> m, deg -> rad (matching optimizer.py expectations)
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
        waypoints = [
            {'x': 0, 'y': 0, 'theta': 0, 'stop': True, 'constrain_theta': True},
            {'x': 1, 'y': 1, 'theta': np.pi/4, 'stop': False, 'constrain_theta': True},
            {'x': 2, 'y': 0, 'theta': np.pi/2, 'stop': True, 'constrain_theta': True}
        ]

        # 2. Run your CasADi solver
        # result_path is an array of [t, x, y, theta, vx, vy, omega]
        result_path, total_t = solve_gobilda_trajectory(formatted_waypoints, obstacles)

        # 3. Convert Results back to Millimeters/Degrees for React
        output_points = []
        for point in result_path:
            output_points.append({
                'x': point['x'] * 1000.0,
                'y': point['y'] * 1000.0,
                'h': float(np.degrees(point['theta'])),
                'v': float(np.sqrt(point['vx']**2 + point['vy']**2))
            })
        print(json.dumps(output_points))
        sys.stdout.flush()

    except Exception as e:
        print("Exception occurred")
        print(f"Python Error: {str(e)}", file=sys.stderr)
        sys.exit(2)