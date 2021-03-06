//
const SCALE = 69;
const CANVAS_W = 800;
const CANVAS_H = 600;
const WF_TRANSLATE = 250;
const DT = 0.0125;
const DIV_ID = 'p5-sketch';

// Math Domain

// A Fourier series describes a waveform by decomposing it
// into multiple sinusoidal waves and adding them together.

// A sinusoidal wave can be represented as this:
type Wave = {
  amplitude: number;
  angularVelocity: number;
  initialOffset: number;
};

// Each individual element of a serie is called an octave
// Octaves could be expressed in roman numerals or the first, second and so on.
// lets define a type and just represent it as a number starting at 0 for the first.
type Octave = number;

// So a waveform is a function that takes an octave and returns a wave
type WaveForm = (o: Octave) => Wave;

// Square Wave
const squareWave: WaveForm = (o: Octave): Wave => {
  let k: number = 2 * o + 1;
  return {
    amplitude: (SCALE * 4) / (k * PI),
    angularVelocity: k,
    initialOffset: 0,
  };
};

const sawWave = (o: Octave): Wave => {
  let k = o + 1;
  let sign = k % 2 === 0 ? 1 : -1;
  return {
    amplitude: (SCALE * 2) / (sign * k * PI),
    angularVelocity: 2 * k,
    initialOffset: 0,
  };
};

// e super powers
const lolWave = (o: Octave): Wave => {
  let k = 2 * (o + 1);
  return {
    amplitude: (SCALE * 4) / (k * PI),
    angularVelocity: k ^ (2.71 ^ k),
    initialOffset: 0,
  };
};

const waveForm = (name: string): WaveForm => {
  let wfs = new Map<string, WaveForm>();
  wfs.set('square', squareWave);
  wfs.set('sawtooth', sawWave);
  wfs.set('sin', lolWave);
  let wf = wfs.get(name);
  return wf ? wf : squareWave;
};

// Animation Domain

// we can represent the waveform as a set of epicycles one for each octave.
// An epicycle is a circle that move on the circumference of a parent circle,
// like the orbit of a moon around a planet that is also orbiting around its sun.

//
// The first octave will be the sun of our system and each subsequent octave
// will orbit around its predecessor.
//
// the animation itself is a function of time, wich will be represented
// as a number between 0 and 2*PI.
type Time = number;
const incrementTime = (t: Time, dt: number) => {
  return (t + dt) % TWO_PI;
};

// lets define an epicycle like so
type Epicycle = {
  pos: p5.Vector; // center point
  wave: Wave;
};

// for an epicycle we can find the position of the next one
// at any given time with the following function:
const nextEpicylePos = (t: Time, e: Epicycle): p5.Vector => {
  let theta = t * e.wave.angularVelocity + e.wave.initialOffset;
  return createVector(
    e.wave.amplitude * cos(-theta) + e.pos.x,
    e.wave.amplitude * sin(-theta) + e.pos.y
  );
};

// inject the initial position into a recursive call
// n is the number of octaves
const epicycles = (t: Time, n: number, wf: WaveForm): Epicycle[] => {
  return epicyclesRecurse(t, n, wf, createVector(0, 0), []);
};

// the underlying recursive builder
const epicyclesRecurse = (
  t: Time,
  n: number,
  wf: WaveForm,
  pos: p5.Vector,
  epis: Epicycle[]
): Epicycle[] => {
  if (epis.length === n) return epis;
  let o: Octave = epis.length;
  let epi = {
    pos: pos,
    wave: wf(o),
  };
  epis.push(epi);
  return epicyclesRecurse(t, n, wf, nextEpicylePos(t, epi), epis);
};

// Now that we have a list of epicycles, we can define the list of
// radius'es as such
type RadialLine = {
  p1: p5.Vector;
  p2: p5.Vector;
};

const radialLines = (t: Time, epis: Epicycle[]): RadialLine[] => {
  let radials: RadialLine[] = [];
  for (let i: number = 0; i < epis.length; i++) {
    radials.push({
      p1: epis[i].pos,
      p2: i === epis.length - 1 ? nextEpicylePos(t, epis[i]) : epis[i + 1].pos,
    });
  }
  return radials;
};

// now lets imagine that the last point p2 in the radials list is a pencil,
// if we store its position in a list of vectors growing at each frame,
// we have its trajectory
//
type Trajectory = p5.Vector[];
let trajectory: Trajectory = [];

// drawing functions
const drawEpicycle = (e: Epicycle): void => {
  noFill();
  stroke(192, 66);
  circle(e.pos.x, e.pos.y, e.wave.amplitude * 2);
};

const drawRadialLine = (l: RadialLine): void => {
  stroke(255);
  line(l.p1.x, l.p1.y, l.p2.x, l.p2.y);
};

const drawTrajectory = (t: Trajectory): void => {
  noFill();
  stroke(192, 192);
  beginShape();
  for (let v of t) {
    vertex(v.x, v.y);
  }
  endShape();
};

const drawProjectionLine = (last: p5.Vector): void => {
  stroke(192, 56, 87, 205);
  line(last.x, last.y, WF_TRANSLATE, last.y);
  fill(192, 56, 87, 205);
  circle(WF_TRANSLATE, last.y, 4);
};

const drawWaveForm = (t: Trajectory): void => {
  noFill();
  stroke(46, 166, 204, 240);
  beginShape();
  for (let i in t) {
    vertex(+i, t[i].y);
  }
  endShape();
};

// p5 things
let time: Time = 0;
let octavesSlider: p5.Element;
let wfSelect: p5.Element;
let wfPrevious: string;

const setup = () => {
  const c = createCanvas(CANVAS_W, CANVAS_H);
  c.parent(DIV_ID);

  octavesSlider = createSlider(2, 24, 5, 1);
  octavesSlider.parent(DIV_ID);

  wfSelect = createSelect();
  wfSelect.option('square');
  wfSelect.option('sawtooth');
  wfSelect.option('sin');
  wfSelect.selected('square');
  wfPrevious = 'square';
  wfSelect.parent(DIV_ID);
};

const draw = () => {
  let octaves = octavesSlider.value() as number;
  let wf = wfSelect.value() as string;
  if (wf !== wfPrevious) trajectory = [];
  wfPrevious = wf;

  background(51);
  translate(width / 4, height / 2);

  fill(235, 219, 178);
  stroke(235, 219, 178);
  textSize(16);
  text(`Octaves: ${octaves}`, -width / 4 + 20, height / 2 - 20);

  const epis = epicycles(time, octaves, waveForm(wf));
  const radials = radialLines(time, epis);

  epis.map(drawEpicycle);
  radials.map(drawRadialLine);

  // add last `pencil` position to trajectory
  let lastPos = radials[radials.length - 1].p2;
  trajectory.unshift(lastPos);
  if (trajectory.length > 512) trajectory.pop();

  drawTrajectory(trajectory);
  drawProjectionLine(lastPos);

  translate(WF_TRANSLATE, 0);
  drawWaveForm(trajectory);

  time = incrementTime(time, DT);
};
