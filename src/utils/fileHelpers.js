// ---------- SAVE / LOAD HELPERS ---------- //

export function saveFTCAutoFile({ robot, paths, obstacles }) {
  try {
    const data = {
      version: 1,
      robot,
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
    a.download = "auto.ftcpath";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Saved FTC path file successfully.");
  } catch (err) {
    console.error("Failed to save FTC path file:", err);
  }
}

export function loadFTCAutoFile(file, { setRobot, setPaths, setObstacles }) {
  if (!file) return;
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target.result);

      // Validate and set only if data exists (prevents crashing on empty)
      if (json.robot) setRobot(json.robot);
      if (json.paths) setPaths(json.paths);
      if (json.obstacles) setObstacles(json.obstacles);

      console.log("✅ Loaded FTC path file successfully.", json);
    } catch (err) {
      console.error("Error loading FTC path file:", err);
      alert("Failed to load FTC path file. Check the file format.");
    }
  };

  reader.onerror = () => {
    console.error("File reading failed:", reader.error);
  };

  reader.readAsText(file);
}
