"use strict";

// Get any URL parameters, making them case-insensitive
const URLParameters = new URLSearchParams([...new URLSearchParams(window.location.search)].map(([key, value]) => [key.toLowerCase(), value]));

// Names
var nameOfPiece = "Expanse";
var shortNameOfPiece = "Expanse";
var author = "Mandy Brigwell";
var date = "2023";
var descriptionOfPiece = "The lone and level lands stretch far away.";
var templateVersion = "2.0"

// ********************************************************************
// Template variables
// ********************************************************************
const template = {};
template.testingEnabled = parseURLParameter({name: "testingenabled", defaultValue: false, type: "exists"});
template.exportTestRenders = parseURLParameter({name: "exporttestrenders", defaultValue: false, type: "exists"});
template.exportCanvas = parseURLParameter({name: "exportcanvas", defaultValue: false, type: "exists"}); // Save the canvas once it is complete
template.exportRender = parseURLParameter({name: "exportrender", defaultValue: false, type: "exists"}); ; // Save the full size render once it is complete
template.renderCount = 0; // The number of test renders produced so far
template.rendersRequired = parseURLParameter({name: "rendersrequired", defaultValue: 8, type: "ranged", min: 1, max: 512});
template.requiredFrames = parseURLParameter({name: "requiredframes", defaultValue: 360, type: "ranged", min: 30, max: 1440});
template.continueRender = false; // Continue after framecount is reached
template.firstRenderComplete = false;
template.showInfo = true;

// ********************************************************************
// fxhash Feature Variables
// ********************************************************************
let audioDescription = "";
let featureCount = 0;

// ********************************************************************
// Important variables and objects
// ********************************************************************
var instance = {}; // Contains the generative variables
var viewParameters = {}; // Contains angles and distances needed for rendering to the canvas
var randomSeedValue = Math.floor(fxrand() * 12345);
var noiseSeedValue = Math.floor(fxrand() * 56789);

// ********************************************************************
// Graphics buffers
// ********************************************************************
// These are the graphics layers. They are named, then given an index. Lower values
// render lower; higher values are nearer the viewer. Same values are listed
// alphabetically.
let graphicsLayers = [];
// Push graphics layers here, with an index value:
graphicsLayers.push(["background", 0]);
graphicsLayers.push(["distantSky", 5]); // Will be followed by a mask
graphicsLayers.push(["surface", 20]);
graphicsLayers.push(["sky", 30]);
graphicsLayers.push(["surfaceStructures", 40]); // Will be followed by a mask
// Sort layers
graphicsLayers = graphicsLayers.sort((a, b) => a[0].localeCompare(b[0]));
graphicsLayers = graphicsLayers.sort((a, b) => a[1] - b[1]);
// Add layers to the b objects in order from back to front, numbered 0 onwards
const b = {};
for (let i = 0; i < graphicsLayers.length; i += 1) {
	b[graphicsLayers[i][0]] = i;
}
// gB will contain the buffers; each buffer has a renderFlag, theCanvas is the main
// canvas, of size screenSize, and renderBuffer will be the full resolution render
var gB, renderFlags, theCanvas, renderBuffer, screenSizeX, screenSizeY;

// ********************************************************************
// Audio
// ********************************************************************
// An array of random numbers used to generate the sound. This is generated before the main
// loop starts using random numbers to generate the image, and therefore guarantees the
// generative audio will be the same, no matter when it is started or stopped
let audioRandomNumbersArray = [];
for (let i = 0; i < 8912; i += 1) {
	audioRandomNumbersArray.push(fxrand());
}
let audioBanks = [];
// Drones, or wind
if (fxrand() < 0.5) {
	audioBanks.push({
		description: "audioBackground",
		files: [], // This will be populated during preload
		name: ["Background Drone 0", "Background Drone 1", "Background Drone 2", "Background Drone 3", "Background Drone 4"],
		counter: [0, 0, 0, 0, 0], // Delay value, or -1 chooses a delay from possible durations, -2 a random delay.
		panRange: [0, 0, 0, 0, 0],
		minVolume: [0.1, 0.1, 0.1, 0.1, 0.1],
		maxVolume: [0.15, 0.15, 0.15, 0.15, 0.15],
		durations: [[1000], [1000], [1000], [1000], [1000]],
		maximumConcurrentPlays: 2
	});
	audioDescription = "Drones";
} else {
	audioBanks.push({
		description: "audioWind",
		files: [],
		name: ["Wind 0", "Wind 1", "Wind 2", "Wind 3"],
		counter: [0, 0, 0, 0],
		panRange: [0.2, 0.3, 0.4, 0.5],
		minVolume: [0.1, 0.1, 0.1, 0.1],
		maxVolume: [0.15, 0.15, 0.15, 0.15],
		durations: [[1000], [1000], [1000], [1000]],
		maximumConcurrentPlays: 1
	});
	audioDescription = "Wind";
}
// Notes or Melody
if (fxrand() < 0.5) {
	audioBanks.push({
		description: "audioNotes",
		files: [], // This will be populated during preload
		name: ["Note 0", "Note 1", "Note 2", "Note 3", "Note 4", "Note 5", "Note 6", "Note 7"],
		counter: [-1, -1, -1, -1, -1, -1, -1, -1],
		panRange: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		minVolume: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
		maxVolume: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		durations: [[30, 90, 120], [30, 90, 120], [30, 90, 120], [30, 90, 120], [30, 90, 120], [30, 90, 120], [30, 90, 120], [30, 90, 120]],
		maximumConcurrentPlays: 1
	});
	audioDescription += " / Notes";
} else {
	audioBanks.push({
		description: "audioMelody",
		files: [], // This will be populated during preload
		name: ["Melody 0", "Melody 1", "Melody 2", "Melody 3", "Melody 4", "Melody 5", "Melody 6", "Melody 7"],
		counter: [-2, -2, -2, -2, -2, -2, -2, -2],
		panRange: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		minVolume: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
		maxVolume: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		durations: [[30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000], [30, 9000, 12000]],
		maximumConcurrentPlays: 1
	});
	audioDescription += " / Mallets";
}
// Effects
audioBanks.push({
	description: "audioEffects",
	files: [], // This will be populated during preload
	name: ["Bass drum", "Quijada", "Thunder", "BassNote", "Piece 01", "Piece 02", "Hi-Hat 01", "Hi-Hat 02"],
	counter: [-2, -2, -2, -2, -2, -2, -2, -2],
	panRange: [0.75, 0.75, 0.75, 0.75, 0.5, 0.5, 1, 1],
	minVolume: [0.125, 0.125, 0.05, 0.125, 0.1, 0.1, 0.125, 0.125],
	maxVolume: [0.2, 0.2, 0.1, 0.2, 0.2, 0.2, 0.15, 0.15],
	durations: [[0, 5, 300, 400, 500], [0, 300, 700], [2000, 5000], [960, 1024], [10000], [10000], [0, 500, 500, 500, 1000, 2000], [0, 500, 500, 500, 1000, 2000]],
	maximumConcurrentPlays: 2
});
audioDescription += " / Percussion";
if (fxrand() < 0.05) {
	audioBanks.push({
		description: "audioSpeech",
		files: [], // This will be populated during preload
		name: ["Zero", "Beauty", "Believe", "Earth", "Machine", "One", "Tomorrow", "Wonder"],
		counter: [-2, -2, -2, -2, -2, -2, -2, -2],
		panRange: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		minVolume: [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
		maxVolume: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15],
		durations: [[1000, 7000, 8000, 9000], [2000, 7000, 8000, 9000], [2000, 7000, 8000, 9000], [3000, 7000, 8000, 9000], [5000, 7000, 8000, 9000], [1000, 7000, 8000, 9000], [1000, 7000, 8000, 9000], [1000, 7000, 8000, 9000]],
		maximumConcurrentPlays: 1
	});
	audioDescription += " / Speech";
}

// ********************************************************************
// Functions
// ********************************************************************
// Functions concerning the manipulation of chance
const fxRand = () => fxrand();
const fxRandBetween = (from, to) => from + (to - from) * fxrand();
const fxIntBetween = (from, to) => Math.floor(from + (to - from + 1) * fxrand());
const fxBoolean = (probability) => fxrand() < probability;
const fxSelectFromArray = (array) => array[fxIntBetween(0, array.length - 1)];
const granulate = (value, granulation) => floor(value * granulation) / granulation;
const randSign = (value) => [-value, value][Math.floor(2 * fxrand())]; 
const randPow = (startValue, power) => { for (var i = 0; i < power; i += 1) { startValue *= fxrand(); } return startValue; };
// Functions concerning the manipulation of number
const square = (value) => value * value;
// Functions concerning the description of generative values
const hueName = (hueValue) => ["red", "orange", "yellow", "yellow", "yellow", "green", "green", "green", "blue", "violet", "magenta", "red", "red"][Math.max(0, Math.min(360, Math.floor((hueValue % 360) / 30)))];
const weightedDescription = (strings, value, min, max) => strings[Math.floor((value / (max - min) < 0.5 ? 0.5 * Math.pow(Math.sin(Math.PI * value / (max - min)), 0.95) : 1 - 0.5 * Math.pow(Math.sin(Math.PI * value / (max - min)), 0.95)) * strings.length)];
// Functions concerning the manipulation of strings
const capitalise = (string) => string[0].toUpperCase() + string.substring(1);
// Functions concerning the logging of information
const messageLog = (string) => { message = string; messageAlpha = 360; };
const testModeLog = (string) => !template.testingEnabled || console.log(string);
const aspectStringToFloat = (string) => string.split(":")[1] / string.split(":")[0];

// Shuffle an array
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(fxrand() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Parsing function for URL parameters

function parseURLParameter(parameters) {
  let parameterValue = URLParameters.get(parameters.name);
  if (parameterValue === null) {
    return parameters.defaultValue;
  }
  switch (parameters.type) {
    case "boolean":
      if (typeof parameters.defaultValue !== "boolean") {
        throw new Error(
          "Incorrect default for boolean variable in parseURL function."
        );
      }
      if (parameterValue === "true" || parameterValue === "1") {
        return true;
      } else if (parameterValue === "false" || parameterValue === "0") {
        return false;
      }
      break;
    case "exists": // True if a parameter is present, but also assumes that if it's followed by =0 or =false, it was intended to be disabled
      if (parameterValue != "false" && parameterValue != "0") {
        return true;
  		}
      break;
    case "string":
      return parameterValue;
      break;
    case "integer": // Returns an integer from any numeric value. If it's not a number, falls through to returning the default
  		if (!isNaN(parameterValue)) {
          return Math.floor(parameterValue);
        } else if (isNaN(parameters.defaultValue)) {
        throw new Error(
          "Non-numeric default provided for integer in parseURL function."
        );
        }
      break;
    case "ranged":
      if ( !parameters.hasOwnProperty("min") || !parameters.hasOwnProperty("max") ) {
        throw new Error("Incorrect range in parseURL function.");
      }
      if (!isNaN(parameterValue)) {
        return Math.min(parameters.max,Math.max(parameters.min, Math.floor(parameterValue)));
      } else if (isNaN(parameters.defaultValue)) {
        throw new Error("Non-numeric default provided for ranged value in parseURL function.");
      }
      break;
  }
  // If all else fails, return the default value
  return parameters.defaultValue;
}

// ********************************************************************
// Initiate Piece: Set generative parameters and log information
// ********************************************************************
function initiate() {
	instance.landscapeResolution = fxSelectFromArray([0, 20, 30, 40, 40, 40, 50, 50, 50, 60, 60, 70, 90, 100, 120, 4096]);
	instance.skyBanding = fxSelectFromArray([128, 256, 512, 1024]);
	instance.curvature = fxBoolean(0.25) ? fxIntBetween(-4, -12) : fxIntBetween(4, 12);
	instance.backgroundParameters = {
		granularity: fxSelectFromArray([16, 32, 64]), 
		style: fxSelectFromArray(["ellipse", "quad"]),
		crossesVisible: fxBoolean(0.05),
		crossCount: fxIntBetween(6, 16),
		crossRotation: 0.25 * fxRand()
	};
	instance.horizonRipple = 0.05 + fxrand();
	instance.fullReflection = fxBoolean(0.05);
	instance.mapLevels = fxSelectFromArray([[360, 0, 360], [0, 360, 0], [0, 360, 0, 360]]);
	// Push additional map levels
	for (let i = 0; i < fxIntBetween(0, 12) * fxrand(); i += 1) {
		instance.mapLevels.push(fxBoolean(0.5) ? fxSelectFromArray([0, 360]) : fxSelectFromArray([90, 180, 270, 360]));
	}
	instance.renderPlanetInColour = fxBoolean(0.03);
	instance.renderDotsInColour = !instance.renderPlanetInColour && fxBoolean(0.03);
	if (instance.renderPlanetInColour) {
		// Note that the initial colourMode parameters will be altered later if renderPlanetInColour is active
		for (let eachLevel in instance.mapLevels) {
			instance.mapLevels[eachLevel] = Math.floor(instance.mapLevels[eachLevel] * fxSelectFromArray([1, 0.5, 0.25]));
		}
	}
	// Features
	function generateFeatures() {
		// Distant sky features
		let distantSkyProbability = [0.8, 0.6, 0.4, 0.25, 0.25, 0.25];
		shuffle(distantSkyProbability);
		// Planet array
		instance.planetArray = {
			visible: fxBoolean(distantSkyProbability[0]),
			partial: fxBoolean(0.1),
			count: fxIntBetween(3, 12) * 2, 
			intensity: fxRandBetween(1024, 2048), 
			size: fxRandBetween(0.25, 1.75), 
			crescented: fxBoolean(0.35), 
			crescentStrength: fxRandBetween(-2, 2), 
			rotation: fxBoolean(0.75) ? 0 : fxRandBetween(-0.5, 0.5)
		};
		// Tech Overlay
		instance.techOverlay = {
			visible: fxBoolean(distantSkyProbability[1] * 0.3), // Decreased probability, as it can dominate
			variableSizes: fxBoolean(0.25),
			number: fxIntBetween(2, 16),
			offset: fxRandBetween(8, 32),
			decimalPlaces: fxSelectFromArray([2, 2, 2, 1, 1, 0])
		};
		// Flock
		instance.flock = {
			visible: fxBoolean(distantSkyProbability[2]),
			count: fxIntBetween(0, 64 * fxrand()),
			wheeling: fxBoolean(0.5),
			tightness: 1 - randPow(1, 2),
			drawAsBirds: fxBoolean(0.9)
		};
		// Spheres
		instance.sphere = {
			visible: fxBoolean(distantSkyProbability[3]),
			count: 1 + Math.floor(randPow(32, 2)), 
			mirror: fxBoolean(0.1),
			crescentSize: fxRandBetween(0.25, 1),
			intensity: fxRandBetween(512, 2048),
			clustering: 1 - randPow(0.5, 3),
			sizeMultiplier: fxSelectFromArray([1, 1, 1, 2, 3, 4])
		};
		// Background Planet
		instance.backgroundPlanet = {
			visible: fxBoolean(distantSkyProbability[4]),
			distance: fxRandBetween(-0.1, -0.75) * fxrand(), 
			thetaOffset: fxRandBetween(0.1, 0.9), 
			radius: fxRandBetween(0.3, 1), 
			variance: fxRandBetween(0.05, 0.2), 
			intensity: fxRandBetween(512, 4096) * fxrand(), 
			direction: randSign(1), 
			gradient: fxBoolean(0.5)
		};
		// Radiative Rays
		instance.radiativeRays = {
			visible: fxBoolean(distantSkyProbability[5]),
			rayCount: 1 + 2 * fxIntBetween(2, 32), // Odd numbers look better
			rayWidth: fxRandBetween(0.05, 0.2),
			strength: fxRandBetween(0.5, 1),
			distance: fxRandBetween(0, -0.75) * fxrand(), 
			thetaOffset: fxRandBetween(0.1, 0.75),
			radius: randPow(0.25, 2),
			stellated: fxBoolean(0.5)
		};

		// Surface Structures
		let surfaceStructuresProbability = [0.6, 0.5, 0.3, 0.15, 0.15];
		shuffle(surfaceStructuresProbability);
		// Aerials
		instance.aerial = {
			visible: fxBoolean(surfaceStructuresProbability[0]), 
			count: fxBoolean(0.4) ? fxIntBetween(1, 3) : 1 + Math.floor(randPow(fxRandBetween(0, 32), 3)), 
			crossbarCount: fxIntBetween(8, 12),
			links: fxBoolean(0.5),
			glowingLinks: fxBoolean(0.5),
			fuzzyPhased: fxBoolean(0.75),
			wavePhase1: fxIntBetween(1, 4),
			wavePhase2: fxIntBetween(1, 24),
			positionSeedValue: fxIntBetween(0, 1024)
		};
		// Dark Columns
		instance.darkColumn = {
			visible: fxBoolean(surfaceStructuresProbability[1]),
			count: fxIntBetween(0, 32), 
			outlined: fxBoolean(0.25), 
			clockHands: fxBoolean(0.5),
			phase: fxSelectFromArray([0.001, 0.01, 0.05, -0.005])
		};
		// Light Columns
		instance.lightColumn = {
			visible: fxBoolean(surfaceStructuresProbability[2]),
			count: fxIntBetween(0, 32), 
			blockSize: fxRandBetween(0.02, 0.05), 
			streaks: fxBoolean(0.25),
			clustering: 1 - randPow(0.5, 3),
			thetaVariance: fxRandBetween(0.0005, 0.002)
		};
		// Horizon Light Points
		instance.horizonLightPoints = {
			visible: fxBoolean(surfaceStructuresProbability[3]), 
			count: fxBoolean(0.1) ? fxIntBetween(1, 128) : 1 + Math.floor(randPow(fxRandBetween(0, 64), 3))
		};
		// Towers
		instance.tower = {
			visible: fxBoolean(surfaceStructuresProbability[4]),
			count: fxIntBetween(0, 32),
			blockVariant: fxSelectFromArray([[1, 2],[1, 1], [1, 1], [2, 1]]),
			blockSize: fxSelectFromArray([0.005, 0.01, 0.01]),
			spacing: fxSelectFromArray([1.25, 1.5]),
			clustering: 1 - randPow(0.5, 3)
		};
		// Background shading
		instance.backgroundShading = {
			visible: fxBoolean(0.9)
		};

		// Surface Features
		// Mountains
		instance.mountain = {
			visible: fxBoolean(0.25), 
			height: -fxRandBetween(0.5, 1), 
			intensity: fxRandBetween(64, 512),
			renderMode: fxSelectFromArray(["points", "points", "points", "lines", "lines", "circles"])
		};
		// Planet surface
		instance.surface = {
			visible: true, 
			reverse: fxBoolean(0.4), 
			mirror: fxBoolean(0.3),
			renderMode: fxSelectFromArray(["points", "points", "circles", "squares"])
		};
		
		// Sky features
		// Sky trails
		instance.skyTrail = {
			visible: fxBoolean(0.25), 
			dualTrail: fxBoolean(0.25), 
			startHeight: fxRandBetween(-0.1, -0.3) * fxrand(), 
			variance: fxRandBetween(-0.1, -0.5), 
			intensity: fxRandBetween(0, 1024), 
			moveRight: fxBoolean(0.5), 
			dualTrailMoveRight: fxBoolean(0.5), 
			angleOffset: 0.05 * fxrand() * fxrand()
		};
		// Horizon Haze
		instance.horizonHaze = {
			visible: true
		}

		// Balancing
		// Introduce the possibility of extreme curvature at low landscape resolutions	
		if (instance.landscapeResolution < 30 && fxBoolean(0.25)) {
			instance.curvature = fxBoolean(0.5) ? -1 : 2;
		}
		// If the planet is being reversed but not mirrored, increase the probability of the mountain layer
		if (instance.surface.reverse && !instance.surface.mirror) {
			instance.mountain.visible = fxBoolean(0.95);
			instance.mountain.intensity = fxRandBetween(256, 512);
			instance.mountain.height = -0.9;
		}
		// If there are two trails, decrease the intensity by a quarter
		if (instance.skyTrail.dualTrail) {
			instance.skyTrail.intensity *= 0.75;
		}
	}
	function countFeatures() {
		featureCount = instance.flock.visible ? 1 : 0;
		featureCount += instance.aerial.visible ? 1 : 0;
		featureCount += instance.horizonLightPoints.visible ? 0.5 : 0; // Decreased weighting
		featureCount += instance.backgroundPlanet.mirror ? 0.25 : 0; // Decreased weighting
		featureCount += instance.backgroundPlanet.visible ? 0.75 : 0; // Decreased weighting
		featureCount += instance.backgroundShading.visible ? 0 : 0; // No weight
		featureCount += instance.darkColumn.visible ? 1.25 : 0; // Increased weighting
		featureCount += instance.lightColumn.visible ? 1.25 : 0; // Increased weighting
		featureCount += instance.mountain.visible ? 0.5 : 0; // Decreased weighting
		featureCount += instance.planetArray.visible ? 1 : 0;
		featureCount += instance.radiativeRays.visible ? 0.75 : 0; // Decreased weighting
		featureCount += instance.skyTrail.visible ? 1 : 0;
		featureCount += instance.sphere.visible ? 0.5 : 0; // Decreased weighting
		featureCount += instance.techOverlay.visible ? 1 : 0;
		featureCount += instance.tower.visible ? 1 : 0;
	}
	// Generate features, count features, and increase if very low
	generateFeatures();
	countFeatures();
	testModeLog("Initial feature count is " + featureCount);
	let attempts = 0;
	// Make four attempts at getting a complexity above 5, then a further four attempts at above 4
	// If eight attempts produces a low complexity, then a rare, low-complexity piece has been created
	while (featureCount < (attempts < 8 ? 5 : 4) && attempts < 16) {
		generateFeatures();
		countFeatures();
		attempts += 1;
		testModeLog("Attempt " + attempts + " at more features. New count is " + featureCount);
	}
	// Colours, graphics and ranges
	instance.darkMode = fxBoolean(0.5);
	instance.noSmooth = parseURLParameter({name: "nosmooth", defaultValue: false, type: "exists"});
	instance.colourMode = {state: 0, hue: 360 * fxRand(), saturation: 360, brightness: 360};
	if (instance.renderPlanetInColour) {
		instance.colourMode.hue = 30 * fxIntBetween(0, 11);
		instance.colourMode.skyHue = (instance.colourMode.hue + 30 * fxIntBetween(1, 3)) % 360;
	}
	// Aspect ratio, sizes and centre
	instance.rotation = 0 * Math.PI * 0.5;
	instance.scale = 1;
	instance.desiredScale = 1;
	instance.aspectRatioString = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "9:21"][parseURLParameter({name: "aspect", defaultValue: 7, type: "ranged", min: 0, max: 8})];
	instance.aspectRatio = aspectStringToFloat(instance.aspectRatioString);
	instance.resolution = parseURLParameter({name: "resolution", defaultValue: 4096, type: "ranged", min: 64, max:16384});
	instance.renderSizeX = Math.floor(instance.aspectRatio >= 1 ? instance.resolution / instance.aspectRatio : instance.resolution);
	instance.renderSizeY = Math.floor(instance.aspectRatio >= 1 ? instance.resolution : instance.resolution * instance.aspectRatio);
	instance.maxRenderSize = Math.max(instance.renderSizeX, instance.renderSizeY); // This will be the same as instance.resolution
	instance.minRenderSize = Math.min(instance.renderSizeX, instance.renderSizeY);
	instance.aspectModifierXmin = instance.aspectRatio > 1 ? 1 : instance.aspectRatio;
	instance.aspectModifierYmin = instance.aspectRatio > 1 ? 1 / instance.aspectRatio : 1;
	instance.aspectModifierXmax = instance.aspectRatio > 1 ? instance.aspectRatio : 1;
	instance.aspectModifierYmax = instance.aspectRatio > 1 ? 1 : 1 / instance.aspectRatio;
	instance.gifResolution = 640;
	instance.gifSizeX = Math.floor(instance.aspectRatio >= 1 ? instance.gifResolution / instance.aspectRatio : instance.gifResolution);
	instance.gifSizeY = Math.floor(instance.aspectRatio >= 1 ? instance.gifResolution : instance.gifResolution * instance.aspectRatio);
	// Push infoText for display when 'i' is pressed, and log to console
  infoText = nameOfPiece;
  infoText += "\n" + "A generative artwork by " + author;
  infoText += "\n" + descriptionOfPiece;
  infoText += template.testingEnabled ? "\n" + "Template version " + templateVersion + "\n" : "\n";
	testModeLog(infoText);
	testModeLog("\n");
	testModeLog("Instance parameters:");
	for (let eachEntry in Object.entries(instance)) {
		let currentKey = Object.keys(instance)[eachEntry];
		let currentValue = Object.values(instance)[eachEntry];
		switch(typeof(currentValue)) {
			case 'boolean':
				currentValue = currentValue ? "Yes" : "No";
			break;
			case 'number':
				if (Math.floor(currentValue) !== currentValue) {
					currentValue = currentValue.toFixed(3);
				} else {
					currentValue = currentValue.toString();
				}
			break;
			case 'object':
// 				currentValue = Object.keys(Object.entries(instance));
				if (currentValue.hasOwnProperty('visible')) {
					currentValue = Object.values(currentValue)[0] ? "Visible" : "Not visible";
				} else {
					currentValue = "";
				}
// 				currentValue = (Object.values(currentValue)[0]);
			break;
			case 'undefined':
				currentValue = "WARNING: undeclared variable used";
			break;
			default:
			break;
		}
		if (currentValue != "") {
			infoText += "\n" + currentKey + ": " + currentValue;
			testModeLog(" " + currentKey + ": " + currentValue);
		}
	}
	
	// The canvas forms a viewing window, into which we'll render an arc. We don't want to render more than necessary,
	// so we'll calculate the angles between which the points fall
	viewParameters.halfRectangleWidth = instance.renderSizeX / 2;
	viewParameters.halfRectangleHeight = instance.renderSizeY / 2;
	viewParameters.distanceFromRectangleCentre = instance.renderSizeX * instance.curvature;
	viewParameters.distanceFromRectangleBottom = viewParameters.distanceFromRectangleCentre - viewParameters.halfRectangleHeight;
	viewParameters.distanceFromRectangleTop = viewParameters.distanceFromRectangleCentre + viewParameters.halfRectangleHeight;
	viewParameters.bottomTheta = Math.atan(viewParameters.halfRectangleWidth / viewParameters.distanceFromRectangleBottom);
	viewParameters.topTheta = Math.atan(viewParameters.halfRectangleWidth / viewParameters.distanceFromRectangleTop);
	// Note:
	// minimumArcDistance is sqrt(square(viewParameters.distanceFromRectangleBottom) + square(viewParameters.halfRectangleWidth));
	// maximumArcDistance is sqrt(square(viewParameters.distanceFromRectangleCentre) + square(viewParameters.halfRectangleWidth));
}

let instructionText, infoText;
let infoTargetAlpha = template.testingEnabled ? 360 : 0;
let infoAlpha = template.testingEnabled ? 360 : 0;
let message = "";
let messageAlpha = 0;
let infoColor = 0;
let startFrame, endFrame, elapsedFrame, renderProgress, renderProgressRemaining;

// Define hash-value-dependent parameters
initiate();
window.$fxhashFeatures = {
	"Soundtrack": audioDescription,
	"Feature Complexity": weightedDescription(["Low", "Normal", "High"], featureCount, 4, 11),
	"Mode": instance.darkMode ? "Dark" : "Light",
	"Curvature": (instance.curvature === 1 || instance.curvature === 2) ? "Extreme" : instance.curvature > 0 ? "Positive" : "Negative"
};
testModeLog("\n");
testModeLog("fxhash:");
testModeLog(" " + fxhash);
testModeLog("fxhash Features:");
for (let [key, value] of Object.entries(window.$fxhashFeatures)) {
	testModeLog(" " + key + ": " + value);
}
testModeLog("\n");

// ********************************************************************
// p5js Functions
// ********************************************************************

function preload() {
	function loadSounds(audioBank) {
		for (let count = 0; count < audioBank.name.length; count += 1) {
			audioBank.files[count] = loadSound('audio/' + audioBank.description + nf(count, 2) + '.mp3');
		}
	}
	for (let eachBank in audioBanks) {
		loadSounds(audioBanks[eachBank]);
	}
}

function setup() {
  randomSeed(randomSeedValue);
  noiseSeed(noiseSeedValue);
  
  pixelDensity(1);
	updateScreenSize();
  theCanvas = createCanvas(screenSizeX, screenSizeY);
	if (instance.noSmooth) {
		noSmooth();
	}

  colorMode(HSB, 360);
  rectMode(CENTER);
  imageMode(CENTER);

	// Ensure no audio is running until the user activates it
	getAudioContext().suspend();

  // Initiate the rendering process
	createBuffers();
	createInstructionText(); // This requires that the graphics buffers exist
	updateScreenSize();
  startRender();
	messageLog(nameOfPiece + ": " + descriptionOfPiece + "\nPress [i] for information or [a] to activate audio.");	// Generative variables: initial values before balancing
}

function createInstructionText() {
  instructionText = "";
  instructionText += "\n" + "Show/hide information: [i]";
  instructionText += "\n" + "Toggle info text colour: [I]";
  instructionText += "\n" + "Toggle dark mode: [d]";
  instructionText += "\n" + "\n";
  instructionText += "\n" + "Export " + instance.renderSizeX + " x " + instance.renderSizeY + " png: [s]";
  instructionText += "\n" + "Export " + instance.gifSizeX + " x " + instance.gifSizeY + " gif: [g]";
  instructionText += "\n" + "Export canvas: [c]";
  instructionText += "\n";
  instructionText += "\n" + "Restart render with new parameters: [p]";
  instructionText += "\n";
  instructionText += "\n" + "Rotation: [z]";
  instructionText += "\n" + "Scale: [n] [m]";
  instructionText += "\n" + "Reset scale: [b]";
  instructionText += "\n";
  instructionText += "\n" + "Hue: [q] [w] / Fine-tune: [Q] [W]";
  instructionText += "\n" + "Saturation: [e] [r] / Fine-tune: [E] [R]";
  instructionText += "\n" + "Brightness: [t] [y] / Fine-tune: [T] [Y]]";
  instructionText += "\n" + "Cycle blend mode: [u]";
  instructionText += "\n" + "Randomise values: [U]";
  instructionText += "\n" + "Reset: [D]";
  instructionText += "\n";
  instructionText += "\n" + "Toggle generative audio: [a]";
  instructionText += "\n";
  instructionText += "\n" + "Toggle render layers:";
  for (var i = 0; i < Object.keys(b).length; i++) {
    var keyName = Object.keys(b)[i];
    keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
    instructionText += "\n" + keyName + ": [" + (i + 1) + "]";
  }
  instructionText += "\n";
  instructionText += "\nURL Parameters:";
  instructionText += "\nresolution=64 to 16384";
  instructionText += "\naspect=0 to 7";
  instructionText += "\nnoSmooth";
  instructionText += "\nrequiredFrames=30 to 1440";
  instructionText += "\n";
  instructionText += "\nParameters may be added to the URL with '/?' and chained with '&'";
  instructionText += "\nLarger resolutions are increasingly resource intensive.";
  instructionText += "\nDefault aspect ratio is option 7, and graphics are smoothed.";
  instructionText += "\nDefault required frames is 360; lower or higher values are interesting but unbalanced.";
}

function createBuffers() {
	// Create buffers
	renderBuffer = createGraphics(instance.renderSizeX, instance.renderSizeY);
	renderBuffer.colorMode(HSB, 360);
	renderBuffer.rectMode(CENTER);
	renderBuffer.imageMode(CENTER);
	if (instance.noSmooth) {
		renderBuffer.noSmooth();
	}
	gB = [];
	renderFlags = [];
	for (var i = 0; i < Object.keys(b).length; i++) {
		gB[i] = createGraphics(instance.renderSizeX, instance.renderSizeY);
		gB[i].colorMode(HSB, 360);
		gB[i].rectMode(CENTER);
		if (instance.noSmooth) {
			gB[i].noSmooth();
		}
		renderFlags[i] = true;
	}
}

function startRender() {
	resizeCanvas(screenSizeX, screenSizeY);
	createBuffers();
  // Clear main canvas and graphics buffers
  theCanvas.clear();
  for (var eachBuffer of gB) {
    eachBuffer.clear();
  }
  // Set current frame and required frames, then generate instruction texts
  startFrame = frameCount;
  endFrame = startFrame + template.requiredFrames;
	infoColor = instance.darkMode ? 360 : 0;
}

function prepareBuffer(buffer, xPos, yPos, rotation) {
	buffer.resetMatrix();
	buffer.translate(buffer.width * 0.5, buffer.height * 0.5);
	buffer.rotate(rotation);
	buffer.translate(buffer.width * -0.5, buffer.height * -0.5);
	buffer.translate(xPos * buffer.width, yPos * buffer.height);
	buffer.noFill();
	buffer.noStroke();
	buffer.strokeWeight(1);
}

function draw() {
  // Reset canvas and graphics buffers
  resetMatrix();
  clear();

  // Manage framecount and rendering process variables
  elapsedFrame = frameCount - startFrame;
  // Set normalized renderProgress variables
  renderProgress = min(1, elapsedFrame / template.requiredFrames);
  renderProgressRemaining = max(0, 1 - renderProgress);

  // First frame events
  if (elapsedFrame === 1) {
    firstFrameOnly();
  }

  // Within requiredFrames events
  if (elapsedFrame <= template.requiredFrames || template.continueRender) {
    withinRequiredFramesLoop();
  }

  // Create final image composition and display
  if (renderProgressRemaining > 0) {
  	createFinalImage();
  }
  if (instance.scale === 1) {
		imageMode(CENTER);
  	image(renderBuffer, screenSizeX * 0.5, screenSizeY * 0.5, screenSizeX, screenSizeY);
  } else if (instance.scale > 1) {
		let mousePosX = focused ? constrain(mouseX, 0, screenSizeX) : 0.5 * screenSizeX;
		let mousePosY = focused ? constrain(mouseY, 0, screenSizeY) : 0.5 * screenSizeY;
		let newXPos = instance.rotation % TAU === 0 ? map(mousePosX, 0, screenSizeX, 0, instance.renderSizeX - instance.renderSizeX / instance.scale) : map(mouseX, screenSizeX, 0, 0, instance.renderSizeX - instance.renderSizeX / instance.scale);
		let newYPos = instance.rotation % TAU === 0 ? map(mousePosY, 0, screenSizeY, 0, instance.renderSizeY - instance.renderSizeY / instance.scale) : map(mouseY, screenSizeY, 0, 0, instance.renderSizeY - instance.renderSizeY / instance.scale);
		imageMode(CORNERS);
		image(renderBuffer, 0, 0, screenSizeX, screenSizeY, newXPos, newYPos, instance.renderSizeX / instance.scale, instance.renderSizeY / instance.scale);
	} else if (instance.scale < 1){
		imageMode(CENTER);
  	image(renderBuffer, screenSizeX * 0.5, screenSizeY * 0.5, screenSizeX * instance.scale, screenSizeY * instance.scale);
	}


  // Check if the render is complete and trigger fxhash preview, or wait until a certain number of frames have elapsed
  checkIfRenderIsComplete();
	if (getAudioContext().state === "running") {
		playAudio();
	}

	// Smooth scaling
	instance.desiredScale = round(instance.desiredScale * 1000) / 1000; // Remove decimal places > 4
	if (instance.desiredScale > instance.scale) {
  	instance.scale = (instance.scale + instance.desiredScale) * 0.5;
	}
	if (instance.desiredScale < instance.scale) {
  	instance.scale = (instance.scale + instance.desiredScale) * 0.5;
	}
	
	// Information text overlay
  if (infoAlpha != infoTargetAlpha) {
  	infoAlpha = infoAlpha < infoTargetAlpha ? infoAlpha + 15 : infoAlpha - 15;
  	infoAlpha = min(max(0, infoAlpha), 360);
  }
  if (template.showInfo && infoAlpha > 0) {
  translate(screenSizeX * 0.5, screenSizeY * 0.5);
    textFont("sans-serif");
    textSize(min(screenSizeX, screenSizeY) * 0.015);
    fill(infoColor, infoAlpha);
    stroke(360 - infoColor, infoAlpha);
    strokeWeight(min(screenSizeX, screenSizeY) * 0.005);
    strokeJoin(ROUND);
    textAlign(RIGHT, TOP);
    text(instructionText, screenSizeX * 0.475, screenSizeY * -0.475);
    textAlign(LEFT, TOP);
    text(infoText + "\n\n" + (renderProgress < 1 ? "Rendering progress: " + floor(renderProgress * 100) + "%" : "Render complete") + "\n", screenSizeX * -0.475, screenSizeY * -0.475);
  }

	// Message Display
  messageAlpha = max(0, messageAlpha - 4);
  if (messageAlpha > 0 && screenSizeX != instance.gifSizeX) {
  	resetMatrix();
    textFont("sans-serif");
    textSize(min(screenSizeX, screenSizeY) * 0.02);
    fill(infoColor, min(360, constrain(messageAlpha, 90, 360)));
    stroke(360 - infoColor, constrain(messageAlpha, 90, 360));
    strokeWeight(min(screenSizeX, screenSizeY) * 0.005);
    strokeJoin(ROUND);
    textAlign(LEFT, BOTTOM);
    text(message, screenSizeX * 0.02, screenSizeY * 0.98 + map(min(90, messageAlpha), 90, 0, 0, 0.1 * screenSizeY));
  }
}

// ********************************************************************
// Rendering
// ********************************************************************

function getMode(value, result) {
  let blendModes = [BLEND, MULTIPLY, ADD, DARKEST, LIGHTEST, DIFFERENCE, EXCLUSION, SCREEN, OVERLAY, DODGE, BURN];
  let blendModesString = ["blend", "multiply", "add", "darkest", "lightest", "difference", "exclusion", "screen", "overlay", "dodge", "burn"];
	if (result === "mode") {
		return blendModes[instance.colourMode.state % blendModes.length];
	} else if (result === "string"){
		return blendModesString[instance.colourMode.state % blendModes.length];
	} else if (result === "count") {
		return blendModesString.length;
	}
}

function createFinalImage() {
  renderBuffer.resetMatrix();
  renderBuffer.translate(instance.renderSizeX * 0.5, instance.renderSizeY * 0.5);
  renderBuffer.rotate(instance.rotation);
  renderBuffer.translate(instance.renderSizeX * -0.5, instance.renderSizeY * -0.5);
	renderBuffer.background(instance.darkMode ? 0 : 360);
  for (var i = 0; i < gB.length; i++) {
    if (renderFlags[i]) {
			renderBuffer.imageMode(CENTER);
			renderBuffer.image(gB[i], instance.renderSizeX * 0.5, instance.renderSizeY * 0.5, instance.renderSizeX, instance.renderSizeY);
    }
    if (renderProgressRemaining > 0) {
			// Hardcoded masking layers
			if (graphicsLayers[i][0] === "distantSky") {
				// Apply background mask
				renderBuffer.background(instance.darkMode ? 0 : 360, renderProgressRemaining * 360);
			}
			if (graphicsLayers[i][0] === "surfaceStructures") {
				// Apply background mask
				renderBuffer.background(instance.darkMode ? 0 : 360, min(360, (renderProgressRemaining - 0.5) * 360));
			}
    }
  }
  
  // Apply blending, if activated
	if (getMode(instance.colourMode.state, "mode") != BLEND) {
		renderBuffer.blendMode(getMode(instance.colourMode.state, "mode"));
		renderBuffer.noStroke();
		renderBuffer.fill(instance.colourMode.hue, instance.colourMode.saturation, instance.colourMode.brightness);
				renderBuffer.imageMode(CENTER);
		renderBuffer.rect(instance.renderSizeX * 0.5, instance.renderSizeY * 0.5, instance.renderSizeX, instance.renderSizeY);
		renderBuffer.blendMode(BLEND);
	}
}

function checkIfRenderIsComplete() {
// If the elapsed frame equals the required frames, we've reached the end of the render
  if (elapsedFrame === template.requiredFrames) {
		// If this is the first render, we call fxpreview, and set the currently rendering
		// flag to false.
    if (!template.firstRenderComplete) {
      fxpreview();
      template.firstRenderComplete = true;
    }
    // If we're in test mode, check if we're below the required number of renders.
    if (template.exportTestRenders && template.renderCount < template.rendersRequired) {
      template.renderCount += 1;
      if (template.renderCount === template.rendersRequired) {
        template.exportTestRenders = false;
      }
      if (template.exportCanvas) {
        exportImage("canvas");
      }
      if (template.exportRender) {
        exportImage("render");
      }
      initiate();
      updateScreenSize();
			startRender();
    }
  }
}

function exportImage(option) {
	switch (option) {
		case "canvas":
  		saveCanvas(shortNameOfPiece + "Canvas" + nf(hour(), 2, 0) + nf(minute(), 2, 0) + nf(second(), 2), "png");
		break;
		case "render":
		default:
			save(renderBuffer, shortNameOfPiece + "FullRes" + nf(hour(), 2, 0) + nf(minute(), 2, 0) + nf(second(), 2), "png");
		break;
	}
}

// ********************************************************************
// Various interaction functions - key presses, clicking, window-sizing
// ********************************************************************

function keyPressed() {
  // Save piece at canvas resolution, with overlays if visible
  
  switch (key) {
		case "q":
			instance.colourMode.hue = (instance.colourMode.hue + 30) % 360;
 			messageLog("Colour hue changed to " + hueName(instance.colourMode.hue));
  	break;
		case "Q":
			instance.colourMode.hue = (instance.colourMode.hue + 5) % 360;
			createFinalImage();
 			messageLog("Colour hue changed to " + hueName(instance.colourMode.hue));
  	break;
		case "w":
			instance.colourMode.hue = (360 + instance.colourMode.hue + 330) % 360;
			createFinalImage();
 			messageLog("Colour hue changed to " + hueName(instance.colourMode.hue));
  	break;
		case "W":
			instance.colourMode.hue = (360 + instance.colourMode.hue + 355) % 360;
			createFinalImage();
 			messageLog("Colour hue changed to " + hueName(instance.colourMode.hue));
  	break;
  	case "e":
			instance.colourMode.saturation = (instance.colourMode.saturation + 30) % 360;
			createFinalImage();
 			messageLog("Colour saturation changed to " + instance.colourMode.saturation);
  	break;
  	case "E":
			instance.colourMode.saturation = (instance.colourMode.saturation + 5) % 360;
			createFinalImage();
 			messageLog("Colour saturation changed to " + instance.colourMode.saturation);
  	break;
  	case "r":
			instance.colourMode.saturation = (360 + instance.colourMode.saturation + 330) % 360;
			createFinalImage();
 			messageLog("Colour saturation changed to " + instance.colourMode.saturation);
  	break;
  	case "R":
			instance.colourMode.saturation = (360 + instance.colourMode.saturation + 355) % 360;
			createFinalImage();
 			messageLog("Colour saturation changed to " + instance.colourMode.saturation);
  	break;
  	case "t":
			instance.colourMode.brightness = (instance.colourMode.brightness + 30) % 360;
			createFinalImage();
 			messageLog("Colour brightness changed to " + instance.colourMode.brightness);
  	break;
  	case "T":
			instance.colourMode.brightness = (instance.colourMode.brightness + 5) % 360;
			createFinalImage();
 			messageLog("Colour brightness changed to " + instance.colourMode.brightness);
  	break;
  	case "y":
			instance.colourMode.brightness = (360 + instance.colourMode.brightness + 330) % 360;
			createFinalImage();
 			messageLog("Colour brightness changed to " + instance.colourMode.brightness);
  	break;
  	case "Y":
			instance.colourMode.brightness = (360 + instance.colourMode.brightness + 355) % 360;
			createFinalImage();
 			messageLog("Colour brightness changed to " + instance.colourMode.brightness);
  	break;
		case "u":
			instance.colourMode.state += 1;
			createFinalImage();
 			messageLog("Colour mode changed to " + getMode(instance.colourMode.state, "string"));
		break;
		case "U":
			instance.colourMode.state = floor(random(getMode(0, "count")));
			instance.colourMode.hue = floor(random(360));
			instance.colourMode.saturation = floor(random(360));
			instance.colourMode.brightness = floor(random(300, 360));
			createFinalImage();
 			messageLog("Colour mode changed to " + getMode(instance.colourMode.state, "string") + " with " + hueName(instance.colourMode.hue) + ". Saturation is " + instance.colourMode.saturation + " and brightness is " + instance.colourMode.brightness + ".");
		break;
  	case "i":
  		infoTargetAlpha = infoTargetAlpha === 0 ? 360 : 0
  	break;
  	case "I":
			infoColor = 360 - infoColor;
  	break;
  	case "p":
			testModeLog("\n");
			initiate();
			updateScreenSize();
			startRender();
		break;
  	case "a":
			if (getAudioContext().state != "running") {
				messageLog("Starting audio.");
				userStartAudio();
			} else {
				messageLog("Suspending audio.");
				getAudioContext().suspend();
			}
  	break;
  	case "s":
			messageLog(instance.renderSizeX + " x " + instance.renderSizeY + " png saved.");
			exportImage("render");
  	break;
  	case "S":
			if (template.testingEnabled) {
				template.exportRender = !template.exportRender;
				testModeLog(template.exportRender ? "Full resolution render will be exported when test mode is activated." : "Full resolution render will not be exported when test mode is activated")
			}
  	break;
  	case "d":
			instance.darkMode = !instance.darkMode;
			instance.colourMode.state = 0;
			messageLog(instance.darkMode ? "Dark mode active." : "Light mode active.")
			updateScreenSize();
			startRender();
  	break;
  	case "D":
			instance.colourMode.state = 0;
			createFinalImage();
			messageLog("Blend mode reset.")
  	break;
  	case "g":
			messageLog("Exporting " + instance.gifSizeX + " x " + instance.gifSizeY + " gif. You will need to resize the canvas when export is finished.");
			resizeCanvas(instance.gifSizeX, instance.gifSizeY);
			screenSizeX = instance.gifSizeX;
			screenSizeY = instance.gifSizeY;
			saveGif("export", template.requiredFrames, { delay: 0, units: "frames" });
			startRender();
  	break;
  	case "z":
    	instance.rotation = (instance.rotation + PI) % TAU; // Rotation limited to multiples of PI due to aspect ratio
  	break;
  	case "X":
			if (template.testingEnabled) {
				template.exportTestRenders = !template.exportTestRenders;
				if (template.exportTestRenders) {
					if (template.exportCanvas || template.exportRender) {
						testModeLog( template.rendersRequired + " test renders will be generated and saved as " +  (template.exportCanvas ? "canvas" : "") +  (template.exportCanvas && template.exportRender ? " and " : "") + (template.exportRender ? "renderBuffer" : "") );
					} else {
						testModeLog(template.rendersRequired + " test renders will be generated, but export of canvas and final render are both inactive.");
					}
				} else {
					testModeLog("Test renders will not be exported.");
				}
				template.renderCount = 0;
				updateScreenSize();
				startRender();
			}
  	break;
		case "c":
			messageLog("Canvas saved.");
			exportImage("canvas");
		break;
		case "C":
			if (template.testingEnabled) {
				template.exportCanvas = !template.exportCanvas;
				testModeLog(template.exportCanvas ? "Canvas will be saved when test mode is activated." : "Canvas will not be saved when test mode is activated.")
			}
		break;
		case "b":
		case "B":
			instance.desiredScale = 1;
		break;
		case "n":
			instance.desiredScale = max(1, instance.desiredScale - 0.2);
		break;
		case "N":
			instance.desiredScale = max(0.25, instance.desiredScale - 0.2);
		break;
		case "m":
			instance.desiredScale = min(8, instance.desiredScale + 0.2);
		break;
		case "M":
			instance.desiredScale = min(16, instance.desiredScale + 0.2);
		break;
		case "0":
			messageLog("All render layers active.");
			for (let i = 0; i < gB.length; i += 1) {
				renderFlags[i] = true;
			}
		break;
	}
	
  if (!isNaN(key)) {
    var keyNumber = int(key);
    if (keyNumber > 0 && keyNumber <= gB.length) {
      renderFlags[keyNumber - 1] = !renderFlags[keyNumber - 1];
			messageLog("Render layer " + keyNumber + " toggled.");
    }
  }
} // End of keyPressed()

function mouseClicked() {
}

function doubleClicked() {
  fullscreen(!fullscreen());
}

function mouseWheel(event) {
	if (focused) {
		if (keyIsDown(SHIFT)) {
			instance.desiredScale = constrain(instance.desiredScale + 0.0125 * event.delta, 0.25, 64);
		} else {
			instance.desiredScale = constrain(instance.desiredScale + 0.0125 * event.delta, 1, 8);
		}
	}
	return false;
}

function windowResized() {
	updateScreenSize();	
	resizeCanvas(screenSizeX, screenSizeY);
}

function updateScreenSize() {
	if (windowHeight / windowWidth > instance.aspectRatio) {
		screenSizeX = windowWidth;
		screenSizeY = Math.floor(windowWidth * instance.aspectRatio);
	} else {
		screenSizeX = Math.floor(windowHeight / instance.aspectRatio);
		screenSizeY = windowHeight;
	}
}

// ********************************************************************
// Animation Functions
// ********************************************************************

function firstFrameOnly() {
	
	// Initialise with a plain background according to mode, and set the document to match
	gB[b.background].background(instance.darkMode ? 0 : 360);
	document.body.style.background = instance.darkMode ? "black" : "white";

	// Background
	turnToAngle(gB[b.background], 0, false);
	let size = instance.maxRenderSize / instance.backgroundParameters.granularity * 2;
	for (let i = 0; i < 1; i += 1 / instance.backgroundParameters.granularity) {
		for (let j = 0; j < 1; j += 1 / instance.backgroundParameters.granularity / instance.aspectRatio) {
			gB[b.background].push();
			let xPos = map(i, 0, 1, -0.5 * instance.renderSizeX, 0.5 * instance.renderSizeX);
			let yPos = map(j, 0, 1, -0.5 * instance.renderSizeY, 0.5 * instance.renderSizeY);
			gB[b.background].noStroke();
			if (j < 0.1) {
				gB[b.background].fill(map(j, 0, 0.1, instance.darkMode ? 30 : 360, instance.darkMode ? 90 : 300), 30);
			} else {
				gB[b.background].fill(map(j, 1, 0.1, instance.darkMode ? 30 : 360, instance.darkMode ? 90 : 300), 30);
			}
			gB[b.background].translate(xPos, yPos);
			if (instance.backgroundParameters.style === "ellipse") {
				gB[b.background].ellipse(randPow(size, 2), randPow(size, 2), randPow(size, 1));
			} else {
				gB[b.background].quad(-size * random(), -size * random(), -size * random(), size * random(), size * random(), size * random(), size * random(), -size * random());
			}		
			gB[b.background].pop();
		}
	}
	gB[b.background].noStroke();
	
		// Cross Overlay
		if (instance.backgroundParameters.crossesVisible) {
		}
	prepareBuffer(gB[b.background], 0.5, 0.5, instance.backgroundParameters.crossRotation);
	gB[b.background].scale(sqrt(2));
	gB[b.background].strokeWeight(instance.maxRenderSize * 0.00025);
	gB[b.background].stroke(180, 3);
  for (var i = 0; i <= 1; i += 1 / instance.backgroundParameters.crossCount) {
		for (var j = 0; j <= 1; j += 1 / instance.backgroundParameters.crossCount) {
			let crossRadius = instance.maxRenderSize * 0.15 / instance.backgroundParameters.crossCount;
			let xPos = map(i, 0, 1, -0.5 * instance.maxRenderSize, 0.5 * instance.maxRenderSize);
			let yPos = map(j, 0, 1, -0.5 * instance.maxRenderSize, 0.5 * instance.maxRenderSize);
			gB[b.background].push();
			gB[b.background].translate(xPos, yPos);
			for (var k = 0; k < crossRadius * 2; k += 1) {
			gB[b.background].line(0, -crossRadius, 0, crossRadius);
			gB[b.background].line(crossRadius, 0, -crossRadius, 0);
			}
			gB[b.background].pop();
		}
  }


	// Phased Planet Array
	if (instance.planetArray.visible) {
		for (let i = 0; i < 1; i += 1/instance.planetArray.count) {
			if (!instance.planetArray.partial || (instance.planetArray.partial && noise(i * 16384) < 0.5) ) {
				let theta = map(i, 0, 1, -viewParameters.topTheta * 1.1, viewParameters.topTheta * 1.1);
				turnToAngle(gB[b.distantSky], theta, false);
				gB[b.distantSky].rotate(instance.planetArray.rotation);
				gB[b.distantSky].translate(0, -0.25 * instance.renderSizeY);
				for (let j = 0; j < abs(map(i, 0, 1, -instance.planetArray.intensity, instance.planetArray.intensity)); j += 1) {
					let distance = 0.5 + random() * random() * random();
					let pointTheta = TAU * random();
					gB[b.distantSky].stroke(instance.darkMode ? 360 : 0);
					gB[b.distantSky].strokeWeight(map(distance, 0, 1, 0, 0.002 * instance.renderSizeY));
					let xPos = instance.planetArray.size * (i - 0.5) * instance.renderSizeY * distance * cos(pointTheta);
					let yPos = instance.planetArray.size * (i - 0.5) * instance.renderSizeY * distance * sin(pointTheta);
					if (instance.planetArray.crescented) {
						if (theta > 0) {
							if (xPos < 0) {
								xPos = xPos * map(i, 1, 0, 0, instance.planetArray.crescentStrength);
								gB[b.distantSky].strokeWeight(map(distance, 0, 1, 0, 0.002 * instance.renderSizeY));
							}
						} else {
							if (xPos > 0) {
								xPos = xPos * map(i, 0, 1, 0, instance.planetArray.crescentStrength);
								gB[b.distantSky].strokeWeight(map(distance, 0, 1, 0, 0.002 * instance.renderSizeY));
							}
						}
					}
					gB[b.distantSky].point(xPos, yPos);
					// Reflection
					if (instance.surface.mirror || true) {
						gB[b.distantSky].stroke(instance.darkMode ? 360 : 0, 120);
						gB[b.distantSky].point(xPos, 0.5 * instance.renderSizeY + yPos);
					}
				}
			}
		}
	}

	if (instance.techOverlay.visible) {
		let yPos = fxRandBetween(-0.125, -0.375);
		let counter = 0;
		for (let i = -1; i < 1; i += 1 / instance.techOverlay.number) {
			let theta = map(i, -1, 1, -viewParameters.bottomTheta, viewParameters.bottomTheta);
			turnToAngle(gB[b.distantSky], theta, false);
			gB[b.distantSky].strokeWeight(instance.renderSizeY * 0.0025);
			gB[b.distantSky].fill(instance.darkMode ? 0 : 360);
			gB[b.distantSky].stroke(instance.darkMode ? 360 : 0, 180);
			gB[b.distantSky].textAlign(CENTER, CENTER);
			gB[b.distantSky].textSize(instance.renderSizeY * 0.25 * 1 / instance.techOverlay.number);
			if (instance.techOverlay.variableSizes && counter % 2 === 0) {
				gB[b.distantSky].textSize(instance.renderSizeY * 0.15 * 1 / instance.techOverlay.number);
			}
			gB[b.distantSky].text(nf(instance.techOverlay.offset + i, 2, instance.techOverlay.decimalPlaces), 0, instance.renderSizeY * yPos);
			counter += 1;
		}
	}
	
	// Birds
	if (instance.flock.visible) {
		for (let j = 0; j < instance.flock.count; j += 1) {
			gB[b.distantSky].push();
			turnToAngle(gB[b.distantSky], random(-viewParameters.topTheta * instance.flock.tightness, viewParameters.topTheta * instance.flock.tightness), false);
			let clusterCentre = 0.3 - randSign(0.3) * randPow(1, 3);
			gB[b.distantSky].translate(0, instance.renderSizeY * random(-0.5));
			let objectCount = fxIntBetween(8, 32);
			for (let i = 0; i < objectCount; i += 1) {
				gB[b.distantSky].push();
				let objectDistance = 0.02 + randPow(1, 3);
				let objectTheta = TAU * random();
				gB[b.distantSky].translate(instance.maxRenderSize * 0.25 * objectDistance * cos(objectTheta), instance.maxRenderSize * 0.25 * objectDistance * sin(objectTheta));
				gB[b.distantSky].rotate(PI * 3 / 4);
				if (instance.flock.wheeling) {
					gB[b.distantSky].rotate(random(-0.75, 0.75));
				}
				gB[b.distantSky].scale(1 + randPow(0.5, 1.5));
				let birdSize = randPow(1, 2);
				let wingspan = birdSize * instance.maxRenderSize * 0.0125;
				let wingTheta = 0.5 * random(PI / 4, PI);
				gB[b.distantSky].stroke(instance.darkMode ? 360 : 0);
				gB[b.distantSky].strokeWeight(instance.maxRenderSize * map(birdSize, 0, 1, 0.0005, 0.00005));
				gB[b.distantSky].curveTightness(2);
				if (instance.flock.drawAsBirds) {
					gB[b.distantSky].beginShape();
					gB[b.distantSky].curveVertex(-wingspan, 0);
					gB[b.distantSky].curveVertex(-wingspan, 0);
					gB[b.distantSky].curveVertex(0, 0);
					gB[b.distantSky].curveVertex(wingspan * cos(-wingTheta), -wingspan * sin(-wingTheta));
					gB[b.distantSky].curveVertex(wingspan * cos(wingTheta), -wingspan * sin(wingTheta));
					gB[b.distantSky].endShape();
				} else {
					gB[b.distantSky].noStroke();
					gB[b.distantSky].fill(instance.darkMode ? 0 : 360);
					gB[b.distantSky].ellipse(0, 0, wingspan * 0.5);
					gB[b.distantSky].stroke(instance.darkMode ? 360 : 0);
					for (let pointAngle = 0; pointAngle < TAU; pointAngle += TAU * 20/square(wingspan)) {
						if (noise(i * 100, j * 100, pointAngle * 1000) < 0.5) {
							gB[b.distantSky].strokeWeight(instance.renderSizeY * 0.0015 * random());
							gB[b.distantSky].point(wingspan * 0.25 * cos(pointAngle), wingspan * 0.25 * sin(pointAngle));
						}
					}
				}
				gB[b.distantSky].pop();
			}
			gB[b.distantSky].pop();
		}
	}

	// Sphere
	if (instance.sphere.visible) {
		for (var thisSphere = 0; thisSphere < instance.sphere.count; thisSphere += 1) {
			let theta =  instance.sphere.clustering * map(noise(thisSphere * 65535), 0, 1, -viewParameters.topTheta, viewParameters.topTheta);
			turnToAngle(gB[b.distantSky], theta, instance.sphere.mirror);
			let sphereRadius = map(noise(32768 + thisSphere * 1), 0, 1, 0, 0.25);
			for (var i = 0; i < map(sphereRadius, -0.5, -0.2, 4, 2); i += 1) {
				let sphereSize = sphereRadius * instance.renderSizeY * instance.sphere.sizeMultiplier;
				gB[b.distantSky].translate(0, -0.55 * sphereSize);
				gB[b.distantSky].strokeWeight(instance.renderSizeY * 0.002);
				for (var j = 0; j < instance.sphere.intensity; j += 1) {
					let dotDistance = 1 - randPow(1, 2);
					let dotTheta = TAU * random();
					gB[b.distantSky].stroke(instance.darkMode ? 360 : 0);
					gB[b.distantSky].strokeWeight(map(dotDistance, 0, 1, 0, instance.renderSizeY * 0.002))
					gB[b.distantSky].point(dotDistance * sphereSize * 0.49 * cos(dotTheta), dotDistance * sphereSize * 0.49 * sin(dotTheta));
				}
				gB[b.distantSky].noStroke();
				gB[b.distantSky].rotate(PI * 3 / 4);
				gB[b.distantSky].fill(instance.darkMode ? 0 : 360);
				gB[b.distantSky].arc(0, 0, sphereSize, sphereSize, 0, PI);
				gB[b.distantSky].arc(0, 0, sphereSize, instance.sphere.crescentSize * sphereSize, PI, 0);
			}
		}
	}
	
	
} // end of first frame only loop

function lastFrameOnly() {
}

function turnToAngle(buffer, theta, reflect) {
	prepareBuffer(buffer, 0.5, 0.5, 0);
	buffer.translate(0, viewParameters.distanceFromRectangleCentre);
	buffer.rotate(theta);
	buffer.translate(0, -viewParameters.distanceFromRectangleCentre);
	if ( (reflect || instance.fullReflection) && frameCount % 4 === 0) {
  	buffer.scale(-1);
	}
}

function withinRequiredFramesLoop() {
	// Planet Surface
	if (instance.surface.visible) {
		for (var j = 0; j < 2048; j += 1) {
			gB[b.surface].push();
			let arcTheta = instance.curvature > 0 ? random(-viewParameters.bottomTheta, viewParameters.bottomTheta) : random(-viewParameters.topTheta, viewParameters.topTheta);
			turnToAngle(gB[b.surface], arcTheta, instance.surface.mirror);
			let pointDistance = random() * random();
			let noiseValue = noise(pow(pointDistance, 1/4) * 20, (TAU + arcTheta) * instance.landscapeResolution);
			let mapLevel = instance.mapLevels[floor(map(noiseValue, 0, 1, 0, instance.mapLevels.length))];
			if (instance.renderPlanetInColour) {
				gB[b.surface].stroke(instance.colourMode.hue, instance.colourMode.saturation, 180 + 0.5 * mapLevel);
			} else {
				gB[b.surface].stroke(mapLevel);
			}
			let pointSize = map(noiseValue, 0, 1, 0, 0.005 * instance.renderSizeY) * random() * map(pointDistance, 0, 1, 0.5, 1);
			let horizonPoint = instance.renderSizeY * pointDistance;
			horizonPoint += instance.maxRenderSize * map(noise(PI + arcTheta * 256), 0, 1, -0.0075, 0) * instance.horizonRipple;
			horizonPoint *= instance.surface.reverse ? -1 : 1;
			switch(instance.surface.renderMode) {
				case "points":
					gB[b.surface].strokeWeight(pointSize);
					gB[b.surface].point(0, horizonPoint);
				break;
				case "circles":
					gB[b.surface].fill(instance.darkMode ? 0 : 360);
					gB[b.surface].strokeWeight(0.00035 * instance.renderSizeY);
					gB[b.surface].ellipse(0, horizonPoint, pointSize * map(renderProgress * mapLevel, 0, 360, 1, 4));
				break;
				case "squares":
					gB[b.surface].fill(instance.darkMode ? 0 : 360);
					gB[b.surface].strokeWeight(0.00025 * instance.renderSizeY);
					gB[b.surface].translate(0, horizonPoint);
					gB[b.surface].rotate(PI * 0.25);
					gB[b.surface].rect(0, 0, pointSize * map(renderProgressRemaining * mapLevel, 0, 360, 4, 2), pointSize * map(renderProgressRemaining * mapLevel, 0, 360, 4, 2));
				break;
			}
			gB[b.surface].pop();
		}
	}
	
	// Mountains
	if (instance.mountain.visible) {
		for (var j = 0; j < instance.mountain.intensity; j += 1) {
			let arcTheta = instance.curvature > 0 ? random(-viewParameters.bottomTheta, viewParameters.bottomTheta) : random(-viewParameters.topTheta, viewParameters.topTheta);
			turnToAngle(gB[b.surface], arcTheta, instance.surface.mirror);
			let pointDistance = random() * random();
			let noiseValue = noise(pow(pointDistance, 1/4) * 20, (TAU + arcTheta) * instance.landscapeResolution);
			gB[b.surface].stroke(instance.darkMode ? 360 : 0);
			let mountainHeight = (instance.surface.reverse ? -1 : 1) * instance.mountain.height * instance.renderSizeY * pointDistance * noiseValue;
			switch(instance.mountain.renderMode) {
				case "points":
					gB[b.surface].strokeWeight(map(pointDistance, 1, 0, 0.0015 * instance.renderSizeY, 0));
					gB[b.surface].point(0, mountainHeight);
				break;
				case "circles":
					gB[b.surface].strokeWeight(map(pointDistance, 0, 1, 0.00025 * instance.renderSizeY, 0));
					gB[b.surface].ellipse(0, mountainHeight, map(pointDistance, 0, 1, 0, instance.renderSizeY * 0.0075));
				break;
				case "lines":
					let strandLength = instance.renderSizeY * 0.0125 * randPow(1, 3);
					gB[b.surface].strokeWeight(map(pointDistance, 0, 1, 0.00075 * instance.renderSizeY, 0));
					gB[b.surface].line(randSign(1) * strandLength, mountainHeight - strandLength, randSign(1) * strandLength, mountainHeight);
				break;
				}
		}
	}
	
	// Horizon haze
	if (instance.horizonHaze.visible) {
		for (var j = 0; j < 128; j += 1) {
			gB[b.sky].push();
			let arcTheta = instance.curvature > 0 ? random(-viewParameters.bottomTheta, viewParameters.bottomTheta) : random(-viewParameters.topTheta, viewParameters.topTheta);
			turnToAngle(gB[b.sky], arcTheta, false);
			let horizonDistance = randPow(1, 5);
			let horizonNoiseValue = noise(arcTheta);
			gB[b.sky].stroke(instance.darkMode ? 360 : 0);
			gB[b.sky].strokeWeight(map((horizonDistance), 0, 1, 0.0015 * instance.renderSizeY, 0) * random());
			gB[b.sky].point(0, instance.renderSizeY * -0.0075 - instance.renderSizeY * horizonDistance);
			gB[b.sky].pop();
		}
	}

	// Upper sky gradient
	if (true) {
		for (var j = 0; j < 1024; j += 1) {
			gB[b.sky].push();
			let arcTheta = instance.curvature > 0 ? random(-viewParameters.bottomTheta, viewParameters.bottomTheta) : random(-viewParameters.topTheta, viewParameters.topTheta);
			turnToAngle(gB[b.sky], arcTheta, false);
			if (instance.renderPlanetInColour) {
				gB[b.sky].stroke(instance.colourMode.skyHue, instance.colourMode.saturation, 360);
			} else {
				gB[b.sky].stroke(random() < 0.5 ? instance.darkMode ? 360 : 0 : instance.darkMode ? 0 : 360);
			}
			let distance = 1.25 - randPow(1.15, 2);
			gB[b.sky].strokeWeight(renderProgressRemaining * instance.maxRenderSize * 0.0003 * map(noise(arcTheta * instance.skyBanding), 0, 1, 0, 0.95));
			gB[b.sky].point(0, lerp(0, -0.5 * instance.renderSizeY, distance));
			gB[b.sky].pop();
		}
	}

	// Streak
	if (instance.skyTrail.visible) {
		let arcTheta = instance.curvature > 0 ? map(renderProgress, 0, 1, -viewParameters.bottomTheta, viewParameters.bottomTheta) : map(renderProgress, 0, 1, -viewParameters.topTheta, viewParameters.topTheta);
		arcTheta += instance.curvature > 0 ? instance.skyTrail.angleOffset : -instance.skyTrail.angleOffset;
		turnToAngle(gB[b.sky], instance.skyTrail.moveRight ? arcTheta : -arcTheta, instance.surface.mirror);
		gB[b.sky].translate(0, instance.skyTrail.startHeight * instance.renderSizeY + instance.skyTrail.variance * instance.renderSizeY * renderProgress);
		for (let i = 0; i < instance.skyTrail.intensity * renderProgress; i += 1) {
			let pointDistance = randPow(1, 3);
			let pointTheta = TAU * random();
			gB[b.sky].stroke(instance.darkMode ? 360 : 0);
			gB[b.sky].strokeWeight(0.001 * instance.maxRenderSize * noise(renderProgress * 128) * renderProgressRemaining);
			let xPos = instance.minRenderSize * renderProgressRemaining * pointDistance * cos(pointTheta);
			let yPos = instance.minRenderSize * renderProgressRemaining * pointDistance * sin(pointTheta);
			gB[b.sky].point(xPos, yPos);
		}
		if (instance.skyTrail.dualTrail) {
			arcTheta += instance.curvature > 0 ? instance.skyTrail.angleOffset : -instance.skyTrail.angleOffset;
			turnToAngle(gB[b.sky], instance.skyTrail.dualTrailMoveRight ? arcTheta : -arcTheta, instance.surface.mirror);
			gB[b.sky].translate(0, instance.skyTrail.startHeight * instance.renderSizeY + instance.skyTrail.variance * instance.renderSizeY * renderProgress * renderProgress);
			for (let i = 0; i < instance.skyTrail.intensity * renderProgress; i += 1) {
				let pointDistance = randPow(1, 3);
				let pointTheta = TAU * random();
				gB[b.sky].stroke(instance.darkMode ? 360 : 0);
				gB[b.sky].strokeWeight(0.001 * instance.maxRenderSize * noise(renderProgress * 128) * renderProgressRemaining);
				let xPos = instance.minRenderSize * renderProgressRemaining * pointDistance * cos(pointTheta);
				let yPos = instance.minRenderSize * renderProgressRemaining * pointDistance * sin(pointTheta);
				gB[b.sky].point(xPos, yPos);
			}
		}
	}

	// Background Planet
	if (instance.backgroundPlanet.visible) {
		turnToAngle(gB[b.distantSky], map(instance.backgroundPlanet.thetaOffset, 0, 1, -viewParameters.topTheta, viewParameters.topTheta), false);
		gB[b.distantSky].translate(0, instance.backgroundPlanet.distance * instance.minRenderSize);
		for (let i = 0; i < instance.backgroundPlanet.intensity; i += 1) {
			let pointDistance = randSign(1) * randPow(instance.backgroundPlanet.variance, 3)
			pointDistance += instance.backgroundPlanet.radius + instance.backgroundPlanet.direction * randPow(1, 2);
			let pointTheta = TAU * random();
			let xPos = pointDistance * cos(pointTheta);
			let yPos = pointDistance * sin(pointTheta);
			let distanceFromEdge = instance.backgroundPlanet.radius - sqrt(square(instance.backgroundPlanet.radius) + square(yPos - instance.backgroundPlanet.distance * instance.minRenderSize));
			let distanceFromCircle = distanceFromEdge + yPos;
			gB[b.distantSky].strokeWeight(map(min(2, abs(distanceFromCircle)), 0, 2, 0, instance.renderSizeY * 0.002) * random());
			gB[b.distantSky].stroke(map(yPos + instance.backgroundPlanet.distance, -0.5, 0.5, 0, 360));
			gB[b.distantSky].point(xPos * instance.minRenderSize, yPos * instance.minRenderSize );
		}
	}
		
	// Radiative Rays
	if (instance.radiativeRays.visible) {
		turnToAngle(gB[b.distantSky], map(instance.radiativeRays.thetaOffset, 0, 1, -viewParameters.topTheta, viewParameters.topTheta), false);
		gB[b.distantSky].translate(0, instance.radiativeRays.distance * instance.minRenderSize);
		for (let thisRay = 0; thisRay < instance.radiativeRays.rayCount; thisRay += 1) {
			let pointDistance = (instance.radiativeRays.stellated ? randSign(instance.radiativeRays.radius) : instance.radiativeRays.radius) + randPow(1, 3);
			let pointTheta = randSign(randPow(instance.radiativeRays.rayWidth, 2)) + map(thisRay, 0, instance.radiativeRays.rayCount, 0, TAU);
			gB[b.distantSky].strokeWeight(map(pointDistance, instance.radiativeRays.radius, 1 + instance.radiativeRays.radius, instance.minRenderSize * 0.0005, 0));
			gB[b.distantSky].stroke(instance.darkMode ? 360 : 0);
			gB[b.distantSky].point(pointDistance * cos(pointTheta) * instance.radiativeRays.strength * instance.maxRenderSize, pointDistance * sin(pointTheta) * instance.radiativeRays.strength * instance.maxRenderSize );
		}
	}

	// Clean up the bottom of the image if planets or radiative rays are visible
	if ( (instance.backgroundPlanet.visible || instance.radiativeRays.visible) && instance.curvature > 0 && !instance.fullReflection) {
		turnToAngle(gB[b.distantSky], 0, false);
		gB[b.distantSky].fill(360);
		gB[b.distantSky].noStroke();
		gB[b.distantSky].erase();
		gB[b.distantSky].translate(0, viewParameters.distanceFromRectangleCentre);
		gB[b.distantSky].ellipse(0, 0, viewParameters.distanceFromRectangleCentre * 2.0008);
		gB[b.distantSky].noErase();
	}

	// Tower
	if (instance.tower.visible) {
		for (let j = 0; j < instance.tower.count; j += 1) {
			let blockPosition = floor( map(noise(j), 0, 1, 3, 24) * renderProgress);
			let renderBlockSize = instance.tower.blockSize * instance.renderSizeY * map(noise(blockPosition), 0, 1, 0.5, 1);
			turnToAngle(gB[b.surfaceStructures], instance.tower.clustering * map(noise(j * 10), 0, 1, -viewParameters.topTheta, viewParameters.topTheta), false);
			
			// Shift to the y-position of the tower and an offset x
			let xModifier = map(renderProgress, 0, 1, instance.tower.blockVariant[0], instance.tower.blockVariant[1]);
			gB[b.surfaceStructures].translate(renderBlockSize * random() * xModifier, map(noise(j * 100), 0, 1, 0, instance.renderSizeY * 0.125));
			
			// Main point
			gB[b.surfaceStructures].push();
			gB[b.surfaceStructures].translate(0, renderBlockSize * instance.tower.spacing * -blockPosition);
			let yPos = renderBlockSize * random();
			gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 180);
			gB[b.surfaceStructures].strokeWeight(instance.renderSizeY * 0.004 * random());
			gB[b.surfaceStructures].point(0, yPos);
			gB[b.surfaceStructures].pop();
			
			// Reflection
			gB[b.surfaceStructures].push();
			gB[b.surfaceStructures].translate(0, renderBlockSize * -2 * instance.tower.spacing * -blockPosition);
			gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 30);
			gB[b.surfaceStructures].strokeWeight(instance.renderSizeY * 0.004 * random());
			gB[b.surfaceStructures].point(0, yPos);
			gB[b.surfaceStructures].pop();
			}
	}

	// Light columns
	if (instance.lightColumn.visible) {
		for (let j = 0; j < instance.lightColumn.count; j += 1) {
			let blockPosition = map(noise(j), 0, 1, 3, 24) * renderProgress;
			let renderBlockSize = instance.lightColumn.blockSize * instance.renderSizeY * map(noise(blockPosition), 0, 1, 0.5, 1);
			let blockAngle = map(noise(j * 16384), 0, 1, -0.1, 0.1);
			let theta = instance.lightColumn.clustering * map(noise(j * 128), 0, 1, -viewParameters.topTheta, viewParameters.topTheta);
			theta += sin( ( TAU * noise(j, 8912) + blockPosition ) * 0.25) * instance.lightColumn.thetaVariance;
			turnToAngle(gB[b.surfaceStructures], theta, false);
			gB[b.surfaceStructures].translate(0, map(noise(j * 256), 0, 1, 0, instance.renderSizeY * 0.14));
			gB[b.surfaceStructures].translate(0, renderBlockSize * -blockPosition);
			gB[b.surfaceStructures].rotate(blockAngle);
			for (let k = 0; k < map(j, 0, instance.lightColumn.count, 64 * renderProgressRemaining, 0); k += 1) {
				let smokeDistance = randPow(1, 4) * map(renderProgress, 0, 1, 2, 32);
				let smokeTheta = TAU * random();
				gB[b.surfaceStructures].strokeWeight(smokeDistance * instance.maxRenderSize * 0.00025);
				gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 180);
				gB[b.surfaceStructures].point(smokeDistance * cos(smokeTheta), smokeDistance * sin(smokeTheta));
				// Reflection
				gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 5);
				gB[b.surfaceStructures].point(smokeDistance * cos(smokeTheta), renderBlockSize * blockPosition * 2 + 0.5 * smokeDistance * sin(smokeTheta));
				// Streaks
				if (instance.lightColumn.streaks) {
					gB[b.surfaceStructures].strokeWeight(smokeDistance * instance.maxRenderSize * 0.000125);
					gB[b.surfaceStructures].point(0, renderBlockSize * blockPosition / max(0.00001, smokeDistance * sin(smokeTheta)));
				}
			}
		}
	}

	// Aerial
	if (instance.aerial.visible) {
		// Fuzzy line drawing function
		function pointOnLine(startX, startY, endX, endY, location) {
			let xPos = lerp(startX, endX, location);
			let yPos = lerp(startY, endY, location);
			gB[b.surfaceStructures].push();
			gB[b.surfaceStructures].translate(xPos, yPos);
			let distance = randPow(1, 3);
			let theta = TAU * random();
			gB[b.surfaceStructures].strokeWeight(map(distance, 1, 0, 0, instance.renderSizeY * 0.0005));
			gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0);
			gB[b.surfaceStructures].point(distance * instance.renderSizeY * 0.01 * cos(theta), distance * instance.renderSizeY * 0.01 * sin(theta));
			gB[b.surfaceStructures].pop();
		}
		function aerialPosition(aerialNumber) {
			return {
				theta: map(noise(instance.aerial.positionSeedValue + aerialNumber * 64), 0, 1, -viewParameters.topTheta, viewParameters.topTheta),
				height: map(noise(512 + aerialNumber * 256), 0, 1, -0.495, -0.2),
				width: map(noise(1024 + aerialNumber * 32), 0, 1, -0.02, -0.015)
			};
		}
		for (var thisAerial = 0; thisAerial < instance.aerial.count; thisAerial += 1) {
			let currentAerial = aerialPosition(thisAerial);
			turnToAngle(gB[b.surfaceStructures], currentAerial.theta, false);
			for (var i = 0; i < map(currentAerial.height, -0.5, -0.2, 4, 2); i += 1) {
				pointOnLine(currentAerial.width * instance.renderSizeY * currentAerial.height, 0, 0, currentAerial.height * instance.renderSizeY, random());
				pointOnLine(-currentAerial.width * instance.renderSizeY * currentAerial.height, 0, 0, currentAerial.height * instance.renderSizeY, random());
			}
			// Crossbars
			let leftPoint = floor(instance.aerial.crossbarCount * random() + 1) / instance.aerial.crossbarCount;
			let rightPoint = leftPoint - 1 / instance.aerial.crossbarCount;
			let leftX = currentAerial.width * instance.renderSizeY * currentAerial.height * leftPoint;
			let rightX = -currentAerial.width * instance.renderSizeY * currentAerial.height * rightPoint;
			let leftY = currentAerial.height * instance.renderSizeY * (1 - leftPoint);
			let rightY = currentAerial.height * instance.renderSizeY * (1 - rightPoint);
			pointOnLine(leftX, leftY, rightX, leftY, random());
			pointOnLine(leftX, leftY, rightX, rightY, random());
			pointOnLine(leftX, rightY, rightX, leftY, random());
			// Reflection
			pointOnLine(currentAerial.width * instance.renderSizeY * currentAerial.height, 0, 0, -currentAerial.height * instance.renderSizeY, random());
			pointOnLine(-currentAerial.width * instance.renderSizeY * currentAerial.height, 0, 0, -currentAerial.height * instance.renderSizeY, random());
			// Lights
			if (noise(leftPoint * 32 + rightPoint * 256, thisAerial * 512) < 0.325) {
				for (var j = 0; j < 8; j += 1) {
					gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 330, 30);
					let distance = 0.025 + randPow(1, 2);
					gB[b.surfaceStructures].strokeWeight(map(sqrt(distance), 0, 1, instance.renderSizeY * 0.01, 0));
					distance *= instance.renderSizeY * 0.1;
					let theta = TAU * random();
					gB[b.surfaceStructures].point(leftX + distance * cos(theta), leftY + distance * sin(theta));
					gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 330, 5);
					gB[b.surfaceStructures].point(-leftX + distance * cos(theta), -leftY + distance * sin(theta));
				}
			}
			// Links between aerials
			if (instance.aerial.links && instance.aerial.count > 2) {
				function drawPhasedPoints(firstAerial, secondAerial) {
					let randomPosition = random() < 0.5 ? randPow(1, 2) : 1 - randPow(1, 2);
					let phase1 = instance.renderSizeY * 0.0125 * sin(randomPosition * instance.aerial.wavePhase1 * TAU);
					let phase2 = instance.renderSizeY * 0.005 * sin(randomPosition * instance.aerial.wavePhase2 * TAU) * (instance.aerial.fuzzyPhased ? random() : 1);
					turnToAngle(gB[b.surfaceStructures], lerp(firstAerial.theta, secondAerial.theta, randomPosition), false);
					gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 180);
					gB[b.surfaceStructures].strokeWeight(map(0.5 - abs(randomPosition - 0.5), 0, 0.5, 0, instance.renderSizeY * 0.002));
					gB[b.surfaceStructures].point(0, phase1 + phase2 + instance.renderSizeY * lerp(firstAerial.height, secondAerial.height, randomPosition));
					if (instance.aerial.glowingLinks) {
						gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0, 3);
						gB[b.surfaceStructures].strokeWeight(map(0.5 - abs(randomPosition - 0.5), 0, 0.5, 0, instance.renderSizeY * 0.02));
						gB[b.surfaceStructures].point(0, phase1 + phase2 + instance.renderSizeY * lerp(firstAerial.height, secondAerial.height, randomPosition));
					}
				}
				drawPhasedPoints(currentAerial, aerialPosition((thisAerial + 1) % instance.aerial.count)); // Next aerial
				drawPhasedPoints(currentAerial, aerialPosition((thisAerial - 1) % instance.aerial.count)); // Previous aerial
			}
		}
	}

	// Horizon Light Points
	if (instance.horizonLightPoints.visible) {
		for (var thisLight = 0; thisLight < instance.horizonLightPoints.count; thisLight += 1) {
			turnToAngle(gB[b.surfaceStructures], map(noise(256 + thisLight), 0, 1, -viewParameters.topTheta, viewParameters.topTheta), false);
			let distance = randPow(0.5, 3);
			let lightTheta = TAU * random();
			gB[b.surfaceStructures].strokeWeight(map(sqrt(distance), 0, 1, instance.renderSizeY * 0.0075, 0));
			gB[b.surfaceStructures].stroke(360, 15);
			gB[b.surfaceStructures].point(distance * instance.renderSizeY * cos(lightTheta), distance * instance.renderSizeY * sin(lightTheta));
		}
	}

	// darkColumns
	if (instance.darkColumn.visible) {
		for (let thisColumn = 0; thisColumn < instance.darkColumn.count; thisColumn += 1) {
			let pointHeight = random() * noise(thisColumn) * 0.95;
			let blockAngle = map(noise(thisColumn * 16384), 0, 1, -0.1, 0.1) ;
			turnToAngle(gB[b.surfaceStructures], map(noise(32 + thisColumn * 512), 0, 1, -viewParameters.topTheta, viewParameters.topTheta) * noise(64 + thisColumn * 1024) + sin(pointHeight * TAU + noise(thisColumn * 1000)) * instance.darkColumn.phase, false);
			gB[b.surfaceStructures].translate(0, map(noise(thisColumn * 256), 0, 1, 0, instance.renderSizeY * 0.4));
			gB[b.surfaceStructures].translate(0, -pointHeight * instance.renderSizeY);
			gB[b.surfaceStructures].rotate(blockAngle);
			for (let k = 0; k < map(thisColumn, 0, instance.darkColumn.count, 1, 8); k += 1) {
				let smokeDistance = randPow(1, 3) * map(square(pointHeight), 0, 1, 0, 1);
				let smokeTheta = TAU * random();
				gB[b.surfaceStructures].stroke(instance.darkMode ? 0 : 360);
				gB[b.surfaceStructures].strokeWeight(map(smokeDistance, 0, 1, 0, instance.maxRenderSize * 0.05));
				let xPos = smokeDistance * instance.renderSizeY * 0.5 * cos(smokeTheta);
				let yPos = smokeDistance * instance.renderSizeY * 0.5 * sin(smokeTheta);
				gB[b.surfaceStructures].point(xPos, yPos);
				if (instance.darkColumn.outlined) {
					gB[b.surfaceStructures].strokeWeight(instance.maxRenderSize * 0.000125);
					if (instance.renderDotsInColour) {
						gB[b.surfaceStructures].stroke(instance.colourMode.hue, 360, 360);
					} else {
						gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0);
					}
					gB[b.surfaceStructures].ellipse(xPos, yPos, map(smokeDistance, 0, 1, 0, instance.maxRenderSize * 0.05));
				} else if (instance.darkColumn.clockHands || true) {
					gB[b.surfaceStructures].strokeWeight(instance.maxRenderSize * 0.00025);
					gB[b.surfaceStructures].stroke(instance.darkMode ? 360 : 0);
					var size = map(sqrt(smokeDistance), 0, 1, 0, instance.maxRenderSize * 0.005);
					gB[b.surfaceStructures].push();
					gB[b.surfaceStructures].translate(xPos, yPos);
					gB[b.surfaceStructures].rotate(TAU * random());
					gB[b.surfaceStructures].line(0, 0, size, size);
					gB[b.surfaceStructures].rotate(TAU * random());
					gB[b.surfaceStructures].line(0, 0, size * 0.9, size * 0.9);
					gB[b.surfaceStructures].rotate(TAU * random());
					gB[b.surfaceStructures].line(0, 0, size * 0.5, size * 0.5);
					gB[b.surfaceStructures].pop();
				}
			}
		}
	}
	
	// Background shading
	if (instance.backgroundShading.visible) {
		prepareBuffer(gB[b.surfaceStructures], 0.5, 0.5, 0);
		for (var i = 0; i < 8912; i += 1) {
		gB[b.surfaceStructures].stroke(instance.darkMode ? 0 : 360);
		gB[b.surfaceStructures].strokeWeight(instance.maxRenderSize * 0.0005);
		let distance = randPow(0.4 * instance.maxRenderSize, 3);
		let theta = TAU * random();
		gB[b.surfaceStructures].point((0.6 * instance.maxRenderSize - distance) * cos(theta), (0.6 * instance.maxRenderSize - distance) * sin(theta));
		// At some aspect ratios, set using URL parameters, the cirle will be inside the viewport. This mirrors the points...
		gB[b.surfaceStructures].point((0.6 * instance.maxRenderSize + distance) * cos(theta), (0.6 * instance.maxRenderSize + distance) * sin(theta));
		}
		// ...and this progressively blurs the edges.
		gB[b.surfaceStructures].stroke(instance.darkMode ? 0 : 360, 8);
		gB[b.surfaceStructures].strokeWeight(0.2 * renderProgress * instance.maxRenderSize);
		gB[b.surfaceStructures].ellipse(0, 0, 1.4 * instance.maxRenderSize);
	}
	
} // End of withinRequiredFrames loop

function playAudio() {
	for (let eachBank in audioBanks) {
		processAudioBank(audioBanks[eachBank]);
	}
}

function processAudioBank(audioBank) {
	// Count the number of files playing, and also quickly set up an array in a more-or-less random order
	let currentlyPlaying = 0;
	let shuffleArray = [];
	for (let eachFile in audioBank.files) {
		currentlyPlaying += audioBank.files[eachFile].isPlaying() ? 1 : 0;
		if (audioRandom() < 0.5) {
			shuffleArray.push(eachFile);
		} else {
			shuffleArray.unshift(eachFile);
		}
	}
	for (let eachFile in audioBank.files) {
		let currentFile = shuffleArray[eachFile];
		// If an audio file begins with a counter of -1, give it a new counter from its array of possible delays
		if (audioBank.counter[currentFile] === -1) {
			let delay = audioBank.durations[currentFile][floor(audioRandom() * audioBank.durations[currentFile].length)];
			audioBank.counter[currentFile] = delay;
		}
		if (audioBank.counter[currentFile] === -2) {
			let delay = floor(max(audioBank.durations[currentFile]) * audioRandom());
			audioBank.counter[currentFile] = delay;
		} 
		// If an audio file is not playing, and its counter has reached zero, and fewer than the specified number of
		// concurrently playing tracks are active, play it, not forgetting to increase the currentlyPlaying counter.
		// Otherwise, decrease the track's duration counter
		if (!audioBank.files[currentFile].isPlaying() && audioBank.counter[currentFile] <= 0 && currentlyPlaying < audioBank.maximumConcurrentPlays) {
			audioBank.counter[currentFile] = audioBank.durations[currentFile][floor(audioRandom() * audioBank.durations[currentFile].length)];
			audioBank.files[currentFile].setVolume( map(audioRandom(), 0, 1, audioBank.minVolume[currentFile], audioBank.maxVolume[currentFile]) );
			audioBank.files[currentFile].pan( map(audioRandom(), 0, 1, -audioBank.panRange[currentFile], audioBank.panRange[currentFile]));
			audioBank.files[currentFile].play();
			currentlyPlaying += 1;
		} else {
			audioBank.counter[currentFile] = max(0, audioBank.counter[currentFile] - 1);
		}
	}
}

function audioRandom() {
	if (audioRandomNumbersArray.length > 1) {
		audioRandomNumbersArray.push(audioRandomNumbersArray.shift());
	}
	return audioRandomNumbersArray[audioRandomNumbersArray.length - 1];
}