import { getPredictableColor } from "./colors";
import { goToClosestShootingPosition, goToClosestParkingPosition } from "./geometry";

export const ROBOT_ATTRIBUTES = [
  {name: "Width", defaultValue: 15},
  {name: "Length", defaultValue: 15},
  {name: "Mass", defaultValue: 15},
  {name: "Moment of Inertia", defaultValue: .9},
  {name: "Radius", defaultValue: .18},
  {name: "Wheel radius", defaultValue: .048},
  {name: "Efficiency", defaultValue: .7},
  {name: "Speed", defaultValue: 1000}, // This is in mm/s
  {name: "Acceleration", defaultValue: 1000}, // This is in mm/s^2
  {name: "Buffer", defaultValue: 2} // This is for the path generation.
];

export const INITIAL_ROBOT = {
  x: 0, 
  y: 0, 
  width: ROBOT_ATTRIBUTES[0].defaultValue * 25.4, 
  length: ROBOT_ATTRIBUTES[1].defaultValue * 25.4,
  heading: 0,
  speed: ROBOT_ATTRIBUTES[2].defaultValue,
  buffer: ROBOT_ATTRIBUTES[3].defaultValue * 25.4 
};

export const INITIAL_MODULES = [
      {
    name: "Pick Up Stack 1",
    path: {
      name: "Stack 1 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: -300, y: -600 },
        { x: -300, y: -750 },
        { x: -300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 2",
    path: {
      name: "Stack 2 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: 300, y: -600 },
        { x: 300, y: -750 },
        { x: 300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 3",
    path: {
      name: "Stack 3 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: 900, y: -600 },
        { x: 900, y: -750 },
          { x: 900, y: -1200 }
        ]
      }
    },
    //these ones rely on function excecution and cannot be saved or run as is. do later
    // {
    //   name: "Shoot 3 Balls",
    //   path: {
    //     name: "Stack 3 Approach",
    //     startHeading: 0,
    //     endHeading: 90,
    //     headingControlType: "tangential",
    //     getPathPoints: ({ paths }) => goToClosestShootingPosition(paths, robot, obstacles)
    //   }
    // },
    // {
    //   name: "Open Gate",
    //   path: {
    //     name: "Gate Approach",
    //     startHeading: 0,
    //     endHeading: 90,
    //     headingControlType: "linear",
    //     getPathPoints: () => [
    //       { x: 50, y: -1200 },
    //       { x: 50, y: -1400 }
    //     ]
    //   }
    // },
    // {
    //   name: "Park",
    //   path: {
    //     name: "Park Approach",
    //     startHeading: 0,
    //     endHeading: 90,
    //     headingControlType: "linear",
    //     getPathPoints: ({ paths }) => goToClosestParkingPosition(paths, robot, obstacles)
    //   }
    // }
];

export const INITIAL_OBSTACLES = [
        {
      name: "Red Goal",
      points: [
        {x: -1125, y: 1625}, // first point
        {x: -1770, y: 1125}, // second point
        {x: -1770, y: 1770},  // etc
        {x: 100, y: 1770},
        {x: 100, y: 1625}
      ]
    },
    {
      name: "Blue Goal",
      points: [
        {x: -1125, y: -1625}, 
        {x: -1770, y: -1125}, 
        {x: -1770, y: -1770},  
        {x: 100, y: -1770},
        {x: 100, y: -1625}
      ]
    }
];

export const INITIAL_PATHS = [
        {
      name: "Start",
      color: getPredictableColor(0),
      points: [ //these are the user defined waypoints
        {
            x: 0, //mm
            y: 0, //mm
            h: 0, //degrees
            constrainHeading: true,
            stop: true,
        },        {
            x: 600, //mm
            y: 0, //mm
            h: 0, //degrees
            constrainHeading: true,
            stop: true,
        }
      ],
      pathpoints: [ //these are the points that get drawn
        {x: 0, y: 0, h: 0, v: 0},  // in mm
        {x: 600, y: 0, h: 0, v: 0},  // in mm
      ]
    }
];