export function saveFTCAutoFile({ robot, paths, obstacles, attributes }) {
  try {
    const data = {
      version: 1,
      robot,
      attributes,
      paths,
      obstacles,
      savedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auto.lightspeed";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Saved auto file successfully.");
  } catch (err) {
    console.error("Failed to save auto file:", err);
  }
}

export function loadFTCAutoFile(file, { setRobot, setPaths, setObstacles, setAttributes }) {
  if (!file) return;
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target.result);

      // Validate and set only if data exists (prevents crashing on empty)
      if (json.robot) setRobot(json.robot);
      if (json.paths) setPaths(json.paths);
      if (json.obstacles) setObstacles(json.obstacles);
      if (json.attributes) setAttributes(json.attributes);

      console.log("Loaded auto file successfully.", json);
    } catch (err) {
      console.error("Error loading auto file:", err);
      alert("Failed to load auto file. Check the file format.");
    }
  };

  reader.onerror = () => {
    console.error("File reading failed:", reader.error);
  };

  reader.readAsText(file);
}

export function exportPathData(paths) {
  try {
    for (const path of paths) {
      //make sure path is optimized
      if ((path.points.length * 2) >= path.pathpoints.length) {
        continue;
      }
      var data = [];
      for (const point of path.pathpoints) {
        const t = point.t;
        const x = point.x / 1000;// to meters
        const y = point.y / 1000;
        const theta = point.theta;
        const vx = point.v_bx;
        const vy = point.v_by;
        const omega = point.omega;

        const dataPoint = {
          "t": t,
          "x": x,
          "y": y,
          "theta": theta,
          "vx": vx,
          "vy": vy,
          "omega": omega
        }
        data.push(dataPoint);
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${path.name || 'auto'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Exported " + path.name + "successfully");

    };
  } catch (err) {
    console.error("Failed to export path data file:", err)
  }
}