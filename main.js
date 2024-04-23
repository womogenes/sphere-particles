import { rotateAround } from './utils.js';

let camera;
let surfaceMap;

// Global config
const cameraRad = 600;
const rotateSpeed = 0.4; // Radians per second
const noiseR = 10;
const noiseSpeed = rotateSpeed * 0.2; // Ticks per second

// Generate a lot of points
const N = 50000;
const maxPointSize = 3;
const points = [];
const phi = Math.PI * (Math.sqrt(5) - 1);
const R = 200;

// Canvas recording
let startTime;
let endFrame = Math.floor(((2 * Math.PI) / rotateSpeed + 0.05) * 60);
let recording = true;
let capturer;
let myFrameRate = 60;
let myPixelDensity = 1;

window.preload = () => {
  surfaceMap = loadImage('textures/equirectangular_earth_3.jpeg');
  // surfaceMap = loadImage('circles.png');
};

window.setup = () => {
  const canvas = createCanvas(600, 600, WEBGL);
  canvas.parent('#sketch-container');
  pixelDensity(myPixelDensity);

  camera = createCamera();

  surfaceMap.loadPixels();
  const getSurfaceMapPixel = (phi, theta) => {
    const row = Math.floor(map(phi, 0, PI, 0, surfaceMap.height - 1));
    const col = Math.floor(map(theta, 0, TWO_PI, 0, surfaceMap.width - 1));
    const idx = (row * surfaceMap.width + col) * 4;
    return [
      surfaceMap.pixels[idx],
      surfaceMap.pixels[idx + 1],
      surfaceMap.pixels[idx + 2],
      200,
    ];
  };

  // Generate points
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    const pos = new p5.Vector(x * R, y * R, z * R);
    const xzNorm = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const orthoVec = new p5.Vector(
      (-pos.x / xzNorm) * pos.y,
      xzNorm,
      (-pos.z / xzNorm) * pos.y
    ).normalize();

    // Fetch color and other attributes
    points.push([
      pos,
      orthoVec,
      getSurfaceMapPixel(Math.acos(y), theta % TWO_PI),
      Math.random(),
    ]);
  }
};

window.draw = () => {
  // Recording
  if (frameCount === 1) {
    if (recording) {
      capturer = CCapture({
        framerate: myFrameRate,
        format: 'webm',
      });
      capturer.start();
      window.capturer = capturer;
    }
    startTime = new Date();
  }
  if (frameCount === endFrame && recording) {
    console.log('stop');
    capturer.save();
  }
  console.log(frameCount, endFrame);

  background(20);

  camera.lookAt(0, 0, 0);
  camera.upY = -1;
  camera.camera(
    Math.cos((frameCount / 60) * rotateSpeed + 1) * cameraRad,
    300,
    Math.sin((frameCount / 60) * rotateSpeed + 1) * cameraRad
  );

  noFill();
  for (let [rawPos, orthoVec, color, noiseSeed] of points) {
    const pos = p5.Vector.add(
      rawPos,
      p5.Vector.mult(
        rotateAround(
          orthoVec,
          rawPos,
          (frameCount / 60) * noiseSpeed * Math.floor(5 + noiseSeed * 5) +
            noiseSeed * 1000
        ),
        noiseR * Math.sign(noiseSeed - 0.5) * (noiseSeed - 0.5)
      )
    );

    // Get distance to camera
    const distToCam = dist(
      camera.eyeX,
      camera.eyeY,
      camera.eyeZ,
      pos.x,
      pos.y,
      pos.z
    );

    const minDistToCam = cameraRad - R;
    const maxDistToCam = cameraRad + R * 0.8;
    if (distToCam > maxDistToCam && noiseSeed < 0.5) continue;
    strokeWeight(map(distToCam, minDistToCam, maxDistToCam, maxPointSize, 1));
    stroke(color);

    point(pos.x, pos.y, pos.z);
  }

  // Stats
  let secElapsed = (new Date() - startTime) / 1000;
  let secETA = ((endFrame - frameCount) * secElapsed) / frameCount;
  document.querySelector('#frame-counter').innerText = `Frame ${nf(
    frameCount,
    4
  )} | Elapsed: ${secElapsed.toFixed(2)} s | ${(
    secElapsed / frameCount
  ).toFixed(3)} s/it | ETA: ${Math.floor(secETA / 60)
    .toString()
    .padStart(2, '0')}:${(secETA % 60).toFixed(2).padStart(5, '0')}`;

  if (recording) capturer.capture(canvas);
};
