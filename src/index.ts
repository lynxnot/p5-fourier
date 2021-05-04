//
const SCALE: number = 75;
const DT: number = 0.025;
let time: number = 0;

const trajectory: p5.Vector[] = [];
let octaves: p5.Element;
let waveForm: p5.Element;

/**
 *
 */
class Epicycle {
  pos: p5.Vector; // position
  r: number; // radius
  k: number; // frequency coefficient
  phi: number; // phase angle in radians

  constructor(
    position?: p5.Vector,
    radius?: number,
    k?: number,
    phase?: number
  ) {
    this.pos = position ? position : createVector();
    this.r = radius ? radius * SCALE : SCALE;
    this.phi = phase ? phase : 0;
    this.k = k ? k : 1;
  }

  show(): void {
    const radialPosition = this.getRadialPhasePoint();
    noFill();
    stroke('#689d6aaa');
    ellipse(this.pos.x, this.pos.y, this.r * 2);
    stroke('#d79921ff');
    line(this.pos.x, this.pos.y, radialPosition.x, radialPosition.y);
  }

  getRadialPhasePoint(): p5.Vector {
    const theta = this.k * time + this.phi;
    return createVector(
      cos(-theta) * this.r + this.pos.x,
      sin(-theta) * this.r + this.pos.y
    );
  }
}

const squareWaveKByIndex = (i: number): number => {
  return 2 * i + 1;
};

const triangleWaveKByIndex = (i: number): number => {
  return 2 * (i + 1);
};

const buildEpicycles = (
  octaves: number,
  fn: (i: number) => number
): Epicycle[] => {
  const epicycles: Epicycle[] = [];

  let actual_pos: p5.Vector = createVector();
  for (let n = 0; n < octaves; n++) {
    let k = fn(n);
    let radius = 4 / (k * PI);
    let epi = new Epicycle(actual_pos, radius, k);
    actual_pos = epi.getRadialPhasePoint();
    if (n === octaves - 1) {
      trajectory.unshift(actual_pos);
      if (trajectory.length > 256) trajectory.pop();
    }
    epicycles.push(epi);
  }

  return epicycles;
};

/**********************************************************************
 * p5 hooks
 *
 */
function setup() {
  console.log('p5 is alive!');
  createCanvas(800, 600);

  octaves = createSlider(2, 24, 5);
  waveForm = createRadio();
  waveForm.option('square');
  waveForm.option('triangle');
  waveForm.selected('square');
  waveForm.style('width', '60px');
}

function draw() {
  //console.log('octaves', octaves);
  //
  translate(width / 4, height / 2);
  background('#282828');

  // Text stuff
  textSize(22);
  fill('#ebdbb2');
  text(`octaves: ${octaves.value()}`, -180, 278);

  // Epicycles
  let fn =
    waveForm.value() === 'square' ? squareWaveKByIndex : triangleWaveKByIndex;
  for (const e of buildEpicycles(+octaves.value(), fn)) {
    e.show();
  }

  // trajectory
  noFill();
  stroke('#d5c4a1aa');
  beginShape();
  for (let v of trajectory) {
    vertex(v.x, v.y);
  }
  endShape();

  // y-projection line
  stroke('#d65d0e');
  const actual = trajectory[0];
  line(actual.x, actual.y, 250, actual.y);

  // wave
  translate(250, 0);
  noFill();
  stroke('#98971a');
  beginShape();
  for (let i in trajectory) {
    vertex(+i, trajectory[i].y);
  }
  endShape();

  time += DT;
  if (time > TWO_PI) time -= TWO_PI;
}
