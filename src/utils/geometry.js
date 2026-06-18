export function isPointInPolygon(polygon, point) {
    let isInside = false;
    const x = point[0];
    const y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
}

export function perpendicularDistance(point, lineStart, lineEnd) {
  const area = Math.abs(
    (lineEnd.x - lineStart.x) * (lineStart.y - point.y) - 
    (lineStart.x - point.x) * (lineEnd.y - lineStart.y)
  );
  const lineLength = Math.sqrt(
    Math.pow(lineEnd.x - lineStart.x, 2) + 
    Math.pow(lineEnd.y - lineStart.y, 2)
  );
  return area / lineLength;
}

export function goToClosestShootingPosition(paths, robot, obstacles) {
  //define shooting zones as polygons
  const shootingZones = [
    {
      name: "Zone 1",
      points: [{x: -1770, y: -600}, {x: -1770, y: 600}, {x: -1000, y: 1000}, {x:0, y: 0}, {x: -1000, y: -1000}]
    },
    {
      name: "Zone 2", 
      points: [{x: 1770, y: 600}, {x: 1200, y: 0}, {x: 1770, y: -600}]
    }
  ];

  //get the last point of the last path
  const point = paths[paths.length - 1].points[paths[paths.length - 1].points.length - 1];

  //check if point is already in a shooting zone AND not in obstacle
  for (let zone of shootingZones) {
    if (isPointInPolygon(zone.points.map(p => [p.x, p.y]), [point.x, point.y])) {
      // Verify the point is not inside any obstacle
      let pointInObstacle = false;
      for (let obstacle of obstacles) {
        if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [point.x, point.y])) {
          pointInObstacle = true;
          break;
        }
      }
      if (!pointInObstacle) {
        return [{ x: point.x, y: point.y }];
      }
    }
  }

  // Generate candidate points along zone boundaries
  let candidatePoints = [];
  
  for (let zone of shootingZones) {
    // Sample multiple points along each edge for better coverage
    for (let i = 0; i < zone.points.length; i++) {
      const V1 = zone.points[i];
      const V2 = zone.points[(i + 1) % zone.points.length];
      
      // Sample multiple points along this edge
      for (let t = 0.1; t < 1.0; t += 0.2) {
        const candidate = {
          x: V1.x + t * (V2.x - V1.x),
          y: V1.y + t * (V2.y - V1.y)
        };
        
        // Check if candidate is inside any obstacle
        let inObstacle = false;
        for (let obstacle of obstacles) {
          if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [candidate.x, candidate.y])) {
            inObstacle = true;
            break;
          }
        }
        
        if (!inObstacle) {
          candidatePoints.push(candidate);
        }
      }
    }
  }

  // If no valid candidates found, use the original closest point logic but filter obstacles
  if (candidatePoints.length === 0) {
    for (let zone of shootingZones) {
      for (let i = 0; i < zone.points.length; i++) {
        const V1 = zone.points[i];
        const V2 = zone.points[(i + 1) % zone.points.length];
        const candidate = closestPointOnSegment(V1, V2, point);
        
        let inObstacle = false;
        for (let obstacle of obstacles) {
          if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [candidate.x, candidate.y])) {
            inObstacle = true;
            break;
          }
        }
        
        if (!inObstacle) {
          candidatePoints.push(candidate);
        }
      }
    }
  }

  // Find the best candidate based on actual path distance and safety
  let bestCandidate = null;
  let bestScore = Infinity;

  for (let candidate of candidatePoints) {
    const path = generateOptimalPath({
      name: "temp",
      points: [point, candidate],
      startHeading: 0,
      endHeading: 0,
      headingControlType: "tangential"
    }, obstacles, robot);

    // Calculate path length
    let pathLength = 0;
    for (let i = 0; i < path.points.length - 1; i++) {
      pathLength += Math.sqrt(distSq(path.points[i], path.points[i + 1]));
    }

    // Calculate safety score (avoid paths that go near obstacles)
    let safetyScore = 0;
    for (let i = 0; i < path.points.length; i += 5) { // Sample every 5th point
      for (let obstacle of obstacles) {
        if (isPointInPolygon(obstacle.points.map(p => [p.x, p.y]), [path.points[i].x, path.points[i].y])) {
          safetyScore += 1000; // Heavy penalty for being inside obstacle
        }
      }
    }

    const totalScore = pathLength + safetyScore;
    
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestCandidate = candidate;
    }
  }

  // Fallback: if no valid candidate found, just return the original point
  if (!bestCandidate) {
    console.warn("No valid shooting position found, using current position");
    return [{ x: point.x, y: point.y }];
  }

  return [{ x: bestCandidate.x, y: bestCandidate.y }];
}

export function goToClosestParkingPosition(paths, robot, obstacles) {
  //define parking zones as polygons
  const parkingZones = [
    {
      name: "Zone 1",
      points: [{x: 900, y: 0}, {x: 400, y: 0}, {x: -900, y: -1400}, {x:1500, y: -1400}, {x: 1500, y: -800}]
    },
    {
      name: "Zone 2",
      points: [{x: -1500, y: -900}, {x: -1500, y: 0}, {x: -500, y: 0}]
    }
  ];

  //TODO the paths do not update, so this point is out of date
  //get the last point of the last path
  console.log("paths:", paths);
  const point = paths[paths.length - 1].points[paths[paths.length - 1].points.length - 1];

  //check if point is already in a parking zone
  for (let zone of parkingZones) {
    if (isPointInPolygon(zone.points.map(p => [p.x, p.y]), [point.x, point.y])) {
      const pointsObject = [
        { x: point.x, y: point.y }
      ];
      return pointsObject; //already in a parking zone
    }
  }

  // 2. If outside, the closest point must be on the boundary.
  //Go through each zone and find the closest point on the boundary
  //Choose the closest one
  let closestPoints = [];
  for (let zone of parkingZones) {
    let minDistanceSq = Infinity;
    let closestPoint = null;

    // Iterate over every edge of the polygon
    for (let i = 0; i < zone.points.length; i++) {
      const V1 = zone.points[i];
      const V2 = zone.points[(i + 1) % zone.points.length]; // Wraps the last vertex back to the first

      // Find the closest point on the current line segment (V1, V2)
      const currentClosest = closestPointOnSegment(V1, V2, point);
      const distanceSq = distSq(currentClosest, point);

      // Update the overall closest point if this one is closer
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestPoint = currentClosest;
      }
    }
    closestPoints.push(closestPoint);
  }

  //find the overall closest point
  let minDistanceSq = Infinity;
  let closestPoint = null;
  for (let p of closestPoints) {
    const distanceSq = distSq(p, point);
    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      closestPoint = p;
    }
  }
  const pointsObject = [
    { x: closestPoint.x, y: closestPoint.y }
  ];
  return pointsObject;
}

export const closestPointOnSegment = (V1, V2, P_ext) => {
  const L2 = distSq(V1, V2);

  // V1 and V2 are the same point (degenerate segment)
  if (L2 === 0) {
    return V1;
  }

  // Calculate 't', the projection parameter
  // t = (P_ext - V1) . (V2 - V1) / |V2 - V1|^2
  const dot = (P_ext.x - V1.x) * (V2.x - V1.x) + (P_ext.y - V1.y) * (V2.y - V1.y);
  let t = dot / L2;

  // Clamp t to the range [0, 1] to ensure the point lies on the segment (not the infinite line)
  t = Math.max(0, Math.min(1, t));

  // The closest point is V1 + t * (V2 - V1)
  return {
    x: V1.x + t * (V2.x - V1.x),
    y: V1.y + t * (V2.y - V1.y),
  };
};

export const distSq = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
};
