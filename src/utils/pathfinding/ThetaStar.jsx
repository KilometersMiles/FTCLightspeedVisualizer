import { isPointInPolygon, perpendicularDistance } from '../geometry.js';

function generateOptimalPath(path, obstacles, robot, addNotification) {
    //make sure the path only has a start and end point
    if (path.points.length !== 2) {
        console.error("Path must have exactly two points for optimal path generation.");
        addNotification('error', 'Generation failed', `${path.name} must have exactly two points for obstacle avoidaning generation.`);
        return path;
    }

    const worldToGrid = (x, y) => ({
        x: Math.floor((x + 1790) / gridSize),
        y: Math.floor((y + 1790) / gridSize)
    });

    //track time per step
    const startTime = performance.now();
    //console.log("Starting optimal path generation...");
    const gridSize = 10; // Size of each grid cell in mm
    const gridWidth = Math.ceil(3580 / gridSize);
    const gridHeight = Math.ceil(3580 / gridSize);
    const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

    //Mark non-walkable nodes based on obstacles and robot size.
    //Mark any node within an obstacle as non-walkable
    // Mark obstacles
    obstacles.forEach(obstacle => {
        if (obstacle.points.length < 3) return;

        const minX = Math.min(...obstacle.points.map(p => p.x));
        const maxX = Math.max(...obstacle.points.map(p => p.x));
        const minY = Math.min(...obstacle.points.map(p => p.y));
        const maxY = Math.max(...obstacle.points.map(p => p.y));

        const gridMin = worldToGrid(minX, minY);
        const gridMax = worldToGrid(maxX, maxY);

        for (let x = gridMin.x; x <= gridMax.x; x++) {
            for (let y = gridMin.y; y <= gridMax.y; y++) {
                const worldPos = {
                    x: x * gridSize - 1790,
                    y: y * gridSize - 1790
                };
                if (isPointInPolygon(
                    obstacle.points.map(p => [p.x, p.y]),
                    [worldPos.x, worldPos.y]
                )) {
                    grid[y][x] = -1;
                }
            }
        }
    });
    //Time update
    const obstacleTime = performance.now();
    //console.log(`Obstacle marking took ${obstacleTime - startTime} ms`);
    const bufferCells = Math.ceil((Math.sqrt((robot.width / 2) ** 2 + (robot.length / 2) ** 2) + robot.buffer) / gridSize);
    const distanceField = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(Infinity));

    const queue = [];
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x] === -1) {
                distanceField[y][x] = 0;
                queue.push({ x, y });
            }
        }
    }

    const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ];

    while (queue.length > 0) {
        const current = queue.shift();

        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                const newDist = distanceField[current.y][current.x] + 1;
                if (newDist < distanceField[ny][nx]) {
                    distanceField[ny][nx] = newDist;
                    if (newDist <= bufferCells) {
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }
    }

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (distanceField[y][x] <= bufferCells && grid[y][x] !== -1) {
                grid[y][x] = -1;
            }
        }
    }
    const bufferTime = performance.now();
    // console.log(`Buffer marking took ${bufferTime - obstacleTime} ms`);
    const startNode = {
        x: Math.floor((path.points[0].x + 1790) / gridSize),
        y: Math.floor((path.points[0].y + 1790) / gridSize)
    };
    const endNode = {
        x: Math.floor((path.points[1].x + 1790) / gridSize),
        y: Math.floor((path.points[1].y + 1790) / gridSize)
    };

    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    const heuristic = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

    gScore[`${startNode.x},${startNode.y}`] = 0;
    fScore[`${startNode.x},${startNode.y}`] = heuristic(startNode, endNode);
    openSet.enqueue(startNode, fScore[`${startNode.x},${startNode.y}`]);

    while (!openSet.isEmpty()) {
        const currentNode = openSet.dequeue();

        if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
            let newPath = [];
            let node = currentNode;
            while (node) {
                newPath.push({
                    x: node.x * gridSize - 1790,
                    y: node.y * gridSize - 1790
                });
                node = cameFrom[`${node.x},${node.y}`];
            }
            newPath.reverse();

            // Time update
            const pathTime = performance.now();
            //console.log(`Path found in ${pathTime - bufferTime} ms`);

            // Simplify the path
            newPath = simplifyPath(newPath);

            // Time update
            const simplifyTime = performance.now();
            //console.log(`Path simplification took ${simplifyTime - pathTime} ms`);

            // Ensure exact endpoint match
            newPath[newPath.length - 1] = {
                x: path.points[1].x,
                y: path.points[1].y
            };

            // Time update: total time
            const totalTime = performance.now();
            //console.log(`Total time taken: ${totalTime - startTime} ms`);

            addNotification('success', 'Generation suceeded', `${path.name} now avoids obstacles.`);

            return {
                name: path.name,
                startHeading: path.startHeading,
                endHeading: path.endHeading,
                headingControlType: path.headingControlType,
                points: newPath,
            };
        }

        closedSet.add(`${currentNode.x},${currentNode.y}`);

        const neighbors = [
            { x: currentNode.x + 1, y: currentNode.y },
            { x: currentNode.x - 1, y: currentNode.y },
            { x: currentNode.x, y: currentNode.y + 1 },
            { x: currentNode.x, y: currentNode.y - 1 },
            { x: currentNode.x + 1, y: currentNode.y + 1 },
            { x: currentNode.x - 1, y: currentNode.y + 1 },
            { x: currentNode.x + 1, y: currentNode.y - 1 },
            { x: currentNode.x - 1, y: currentNode.y - 1 }
        ];

        for (const neighbor of neighbors) {
            // Skip invalid neighbors
            if (neighbor.x < 0 || neighbor.x >= gridWidth ||
                neighbor.y < 0 || neighbor.y >= gridHeight) continue;
            if (grid[neighbor.y][neighbor.x] === -1 ||
                closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

            let newGScore;
            if (cameFrom[`${currentNode.x},${currentNode.y}`]) {
                const grandparent = cameFrom[`${currentNode.x},${currentNode.y}`];
                if (hasLineOfSight(grid, grandparent, neighbor)) {
                    newGScore = gScore[`${grandparent.x},${grandparent.y}`] +
                        heuristic(grandparent, neighbor);

                    if (!gScore[`${neighbor.x},${neighbor.y}`] ||
                        newGScore < gScore[`${neighbor.x},${neighbor.y}`]) {
                        cameFrom[`${neighbor.x},${neighbor.y}`] = grandparent;
                        gScore[`${neighbor.x},${neighbor.y}`] = newGScore;
                        fScore[`${neighbor.x},${neighbor.y}`] = newGScore + heuristic(neighbor, endNode);

                        if (!openSet.contains(neighbor)) {
                            openSet.enqueue(neighbor, fScore[`${neighbor.x},${neighbor.y}`]);
                        }
                        continue;
                    }
                }
            }

            const tentativeGScore = gScore[`${currentNode.x},${currentNode.y}`] +
                heuristic(currentNode, neighbor);

            if (!gScore[`${neighbor.x},${neighbor.y}`] ||
                tentativeGScore < gScore[`${neighbor.x},${neighbor.y}`]) {
                cameFrom[`${neighbor.x},${neighbor.y}`] = currentNode;
                gScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore;
                fScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore + heuristic(neighbor, endNode);

                if (!openSet.contains(neighbor)) {
                    openSet.enqueue(neighbor, fScore[`${neighbor.x},${neighbor.y}`]);
                }
            }
        }
    }
    addNotification('error', 'Generation failed', `There was no valid path found for ${path.name}. Check your obstacles and buffer size.`);

    // No path found
    return path;
}

function simplifyPath(points, epsilon = 50) {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance
    let maxDist = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const dist = perpendicularDistance(points[i], points[0], points[end]);
        if (dist > maxDist) {
            maxDist = dist;
            index = i;
        }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
        const left = simplifyPath(points.slice(0, index + 1), epsilon);
        const right = simplifyPath(points.slice(index), epsilon);
        return left.slice(0, -1).concat(right);
    }

    // Otherwise, return just the endpoints
    return [points[0], points[end]];
}

function hasLineOfSight(grid, a, b) {
    // Bresenham's line algorithm
    let x0 = a.x, y0 = a.y;
    let x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        if (grid[y0][x0] === -1) return false;
        if (x0 === x1 && y0 === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
    return true;
}

// Priority Queue implementation for Theta*
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.bubbleUp(this.elements.length - 1);
    }

    dequeue() {
        const min = this.elements[0];
        const end = this.elements.pop();
        if (this.elements.length > 0) {
            this.elements[0] = end;
            this.sinkDown(0);
        }
        return min.element;
    }

    bubbleUp(index) {
        const element = this.elements[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.elements[parentIndex];
            if (element.priority >= parent.priority) break;
            this.elements[parentIndex] = element;
            this.elements[index] = parent;
            index = parentIndex;
        }
    }

    sinkDown(index) {
        const length = this.elements.length;
        const element = this.elements[index];
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < length) {
                leftChild = this.elements[leftChildIndex];
                if (leftChild.priority < element.priority) {
                    swap = leftChildIndex;
                }
            }
            if (rightChildIndex < length) {
                rightChild = this.elements[rightChildIndex];
                if (
                    (swap === null && rightChild.priority < element.priority) ||
                    (swap !== null && rightChild.priority < leftChild.priority)
                ) {
                    swap = rightChildIndex;
                }
            }
            if (swap === null) break;
            this.elements[index] = this.elements[swap];
            this.elements[swap] = element;
            index = swap;
        }
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    contains(node) {
        return this.elements.some(item =>
            item.element.x === node.x && item.element.y === node.y
        );
    }
}

export { generateOptimalPath };