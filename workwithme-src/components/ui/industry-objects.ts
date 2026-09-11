import type {
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
} from "three";

export type IndustryPaintName =
  | "body"
  | "edge"
  | "cream"
  | "dark"
  | "tape"
  | "accent"
  | "metal";
export type IndustryPaints = Record<IndustryPaintName, MeshStandardMaterial>;
export interface IndustryObject {
  name: string;
  industry: string;
  object: Group;
  spin?: boolean;
}
export interface IndustryObjectFactoryOptions {
  THREE: typeof import("three");
  geometry: <T extends BufferGeometry>(value: T) => T;
  /** Reserved for callers sharing a registry; this catalog reuses existing paints. */
  material?: <T extends Material>(value: T) => T;
  paints: IndustryPaints;
}
type VectorTuple = [number, number, number];

/** Geometry-only collectibles; shared resources remain owned by the caller. */
export function createIndustryObjects({
  THREE,
  geometry,
  paints,
}: IndustryObjectFactoryOptions): IndustryObject[] {
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geometry(new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
  const sphere = geometry(new THREE.SphereGeometry(0.5, 12, 8));
  const dome = geometry(
    new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  );
  const ring = geometry(new THREE.TorusGeometry(0.5, 0.075, 5, 16));
  const arch = geometry(new THREE.TorusGeometry(0.32, 0.052, 5, 12, Math.PI));

  const rectangle = new THREE.Shape();
  rectangle.moveTo(-0.5, -0.5);
  rectangle.lineTo(0.5, -0.5);
  rectangle.lineTo(0.5, 0.5);
  rectangle.lineTo(-0.5, 0.5);
  rectangle.closePath();
  const softBox = geometry(
    new THREE.ExtrudeGeometry(rectangle, {
      depth: 1,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      curveSegments: 1,
    }).translate(0, 0, -0.5),
  );

  const add = (
    parent: Group,
    source: BufferGeometry,
    color: IndustryPaintName | IndustryPaintName[],
    size: VectorTuple = [1, 1, 1],
    position: VectorTuple = [0, 0, 0],
    rotation: VectorTuple = [0, 0, 0],
  ): Mesh => {
    const mesh = new THREE.Mesh(
      source,
      Array.isArray(color) ? color.map((key) => paints[key]) : paints[color],
    );
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };
  const box = (
    parent: Group,
    color: IndustryPaintName,
    size: VectorTuple,
    position: VectorTuple = [0, 0, 0],
    soft = false,
  ) => add(parent, soft ? softBox : unitBox, color, size, position);
  const handle = (
    parent: Group,
    color: IndustryPaintName,
    width: number,
    y: number,
    z = 0,
  ) => {
    box(parent, color, [width, 0.095, 0.14], [0, y + 0.17, z], true);
    for (const side of [-1, 1])
      box(
        parent,
        color,
        [0.095, 0.21, 0.14],
        [(side * (width - 0.095)) / 2, y + 0.045, z],
      );
  };
  const normalize = (
    name: string,
    industry: string,
    model: Group,
    spin = false,
  ): IndustryObject => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    const object = new THREE.Group();
    object.name = `${industry}: ${name}`;
    object.add(model);
    return { name, industry, object, ...(spin ? { spin: true } : {}) };
  };
  const result: IndustryObject[] = [];

  // Construction: a brim, faceted protective dome, and raised crown ridge.
  const hardhat = new THREE.Group();
  add(hardhat, cylinder, "tape", [1.4, 0.09, 1.05], [0, -0.1, 0.04]);
  add(hardhat, dome, "body", [1.08, 1.03, 0.98], [0, -0.1, 0]);
  const crown = geometry(new THREE.TorusGeometry(0.505, 0.034, 4, 12, Math.PI));
  add(hardhat, crown, "tape", [1, 1, 1], [0, -0.08, 0], [0, Math.PI / 2, 0]);
  box(hardhat, "cream", [0.26, 0.14, 0.045], [0, 0.025, 0.475], true);
  result.push(normalize("Hard hat", "Construction", hardhat));

  // Logistics: oversized wheels stay visible below a boxy cargo body and cab.
  const truck = new THREE.Group();
  box(truck, "dark", [1.58, 0.13, 0.66], [0, -0.32, 0]);
  box(truck, "cream", [1.02, 0.77, 0.72], [-0.3, 0.115, 0], true);
  box(truck, "edge", [1.065, 0.14, 0.755], [-0.3, -0.075, 0]);
  box(truck, "body", [0.56, 0.6, 0.72], [0.5, 0.02, 0], true);
  box(truck, "accent", [0.37, 0.24, 0.025], [0.51, 0.155, 0.397]);
  box(truck, "accent", [0.37, 0.24, 0.025], [0.51, 0.155, -0.397]);
  box(truck, "dark", [0.026, 0.24, 0.5], [0.809, 0.155, 0]);
  box(truck, "metal", [0.095, 0.13, 0.62], [0.835, -0.17, 0]);
  for (const x of [-0.55, 0.51])
    for (const z of [-0.41, 0.41]) {
      add(
        truck,
        cylinder,
        "dark",
        [0.34, 0.115, 0.34],
        [x, -0.39, z],
        [Math.PI / 2, 0, 0],
      );
      add(
        truck,
        cylinder,
        "metal",
        [0.15, 0.13, 0.15],
        [x, -0.39, z],
        [Math.PI / 2, 0, 0],
      );
    }
  result.push(normalize("Delivery truck", "Logistics", truck));

  // Healthcare: a generic pale plus, never a red-cross emblem.
  const medkit = new THREE.Group();
  box(medkit, "edge", [1.1, 0.77, 0.46], [0, 0, 0], true);
  box(medkit, "accent", [1.05, 0.73, 0.035], [0, 0, 0.253], true);
  handle(medkit, "cream", 0.46, 0.38);
  box(medkit, "cream", [0.47, 0.13, 0.045], [0, 0, 0.3]);
  box(medkit, "cream", [0.13, 0.47, 0.045], [0, 0, 0.3]);
  for (const x of [-0.37, 0.37])
    box(medkit, "metal", [0.12, 0.17, 0.06], [x, 0.3, 0.27], true);
  result.push(normalize("Medical kit", "Healthcare", medkit));

  // Real estate: the roofline does most of the recognition work.
  const house = new THREE.Group();
  box(house, "cream", [0.96, 0.8, 0.76], [0, -0.16, 0]);
  box(house, "body", [1.14, 0.13, 0.94], [0, -0.6, 0], true);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.64, 0);
  roofShape.lineTo(0.64, 0);
  roofShape.lineTo(0, 0.53);
  roofShape.closePath();
  const roof = geometry(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: 0.92,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      steps: 1,
    }).translate(0, 0, -0.46),
  );
  add(house, roof, ["body", "edge"], [1, 1, 1], [0, 0.25, 0]);
  box(house, "edge", [0.17, 0.36, 0.22], [0.31, 0.61, -0.14]);
  box(house, "dark", [0.22, 0.43, 0.035], [0, -0.355, 0.407]);
  for (const x of [-0.31, 0.31]) {
    box(house, "edge", [0.22, 0.24, 0.035], [x, -0.09, 0.4]);
    box(house, "accent", [0.15, 0.17, 0.025], [x, -0.09, 0.425]);
  }
  result.push(normalize("House", "Real estate", house));

  // Hospitality: a large open handle, dark drink surface, and saucer.
  const coffee = new THREE.Group();
  const cup = geometry(new THREE.CylinderGeometry(0.43, 0.32, 0.78, 12));
  add(coffee, cup, "cream", [1, 1, 1]);
  add(coffee, cylinder, "dark", [0.73, 0.025, 0.73], [0, 0.389, 0]);
  add(
    coffee,
    ring,
    "metal",
    [0.75, 0.75, 0.75],
    [0, 0.399, 0],
    [Math.PI / 2, 0, 0],
  );
  add(coffee, ring, "cream", [0.48, 0.58, 0.5], [0.46, 0.025, 0]);
  add(coffee, cylinder, "body", [1.2, 0.065, 1.04], [0.05, -0.43, 0]);
  for (const x of [-0.13, 0.14]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.53, 0),
      new THREE.Vector3(x - 0.05, 0.67, 0),
      new THREE.Vector3(x + 0.04, 0.84, 0),
    ]);
    const steam = geometry(new THREE.TubeGeometry(curve, 8, 0.023, 4, false));
    add(coffee, steam, "tape");
  }
  result.push(normalize("Coffee cup", "Hospitality", coffee));

  // Retail: two open handles and folded sides distinguish the bag from a case.
  const shoppingBag = new THREE.Group();
  const bagShape = new THREE.Shape();
  bagShape.moveTo(-0.49, -0.5);
  bagShape.lineTo(0.49, -0.5);
  bagShape.lineTo(0.42, 0.46);
  bagShape.lineTo(-0.42, 0.46);
  bagShape.closePath();
  const bagGeometry = geometry(
    new THREE.ExtrudeGeometry(bagShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.035,
      bevelThickness: 0.03,
      steps: 1,
    }).translate(0, 0, -0.2),
  );
  add(shoppingBag, bagGeometry, ["body", "edge"]);
  for (const z of [-0.17, 0.17])
    add(shoppingBag, arch, "cream", [0.95, 0.95, 1], [0, 0.44, z]);
  box(shoppingBag, "cream", [0.43, 0.4, 0.035], [0, -0.02, 0.245], true);
  const diamond = box(
    shoppingBag,
    "tape",
    [0.19, 0.19, 0.04],
    [0, -0.02, 0.279],
  );
  diamond.rotation.z = Math.PI / 4;
  result.push(normalize("Shopping bag", "Retail", shoppingBag));

  // Finance: oversized screen and a restrained 3 × 3 keypad.
  const calculator = new THREE.Group();
  box(calculator, "edge", [0.94, 1.26, 0.27], [0, 0, 0], true);
  box(calculator, "cream", [0.88, 1.19, 0.035], [0, 0, 0.155], true);
  box(calculator, "dark", [0.72, 0.29, 0.035], [0, 0.36, 0.195], true);
  box(calculator, "tape", [0.26, 0.055, 0.017], [0.12, 0.38, 0.22]);
  box(calculator, "tape", [0.08, 0.055, 0.017], [-0.11, 0.38, 0.22]);
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 3; column++) {
      box(
        calculator,
        column === 2 ? "accent" : "body",
        [0.17, 0.16, 0.05],
        [(column - 1) * 0.255, 0.04 - row * 0.24, 0.2],
        true,
      );
    }
  result.push(normalize("Calculator", "Finance", calculator));

  // Education: thick pages, raised covers, a contrasting spine, and bookmark.
  const book = new THREE.Group();
  box(book, "cream", [0.94, 1.13, 0.28]);
  box(book, "body", [1.03, 1.25, 0.07], [0, 0, 0.18], true);
  box(book, "edge", [1.03, 1.25, 0.07], [0, 0, -0.18], true);
  box(book, "edge", [0.13, 1.26, 0.43], [-0.48, 0, 0], true);
  box(book, "tape", [0.12, 0.47, 0.025], [0.3, 0.43, 0.23]);
  box(book, "cream", [0.41, 0.075, 0.026], [0.025, 0.22, 0.238]);
  box(book, "cream", [0.3, 0.055, 0.026], [-0.03, 0.055, 0.238]);
  box(book, "metal", [0.03, 0.8, 0.025], [0.44, 0, 0.145]);
  result.push(normalize("Book", "Education", book));

  // Manufacturing: a real through-hole and chunky teeth preserve the cog silhouette.
  const cog = new THREE.Group();
  const cogShape = new THREE.Shape();
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const radius = i % 4 === 0 || i % 4 === 3 ? 0.54 : 0.71;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (i === 0) cogShape.moveTo(x, y);
    else cogShape.lineTo(x, y);
  }
  cogShape.closePath();
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, 0.245, 0, Math.PI * 2, true);
  cogShape.holes.push(centerHole);
  const cogGeometry = geometry(
    new THREE.ExtrudeGeometry(cogShape, {
      depth: 0.27,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.022,
      bevelThickness: 0.022,
      curveSegments: 12,
    }).translate(0, 0, -0.135),
  );
  add(cog, cogGeometry, ["tape", "edge"]);
  result.push(normalize("Cog", "Manufacturing", cog, true));

  // Agriculture: a visible pot, dark soil, and three broad leaves.
  const sprout = new THREE.Group();
  const pot = geometry(new THREE.CylinderGeometry(0.34, 0.255, 0.48, 10));
  add(sprout, pot, "body", [1, 1, 1], [0, -0.36, 0]);
  add(sprout, cylinder, "edge", [0.73, 0.11, 0.73], [0, -0.12, 0]);
  add(sprout, cylinder, "dark", [0.6, 0.03, 0.6], [0, -0.055, 0]);
  add(sprout, cylinder, "edge", [0.055, 0.82, 0.055], [0, 0.33, 0]);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.37, 0.12, 0.37, 0.54);
  leafShape.quadraticCurveTo(-0.075, 0.43, 0, 0);
  const leaf = geometry(
    new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.05,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.016,
      bevelThickness: 0.013,
      curveSegments: 5,
    }).translate(0, 0, -0.025),
  );
  add(
    sprout,
    leaf,
    ["tape", "edge"],
    [1, 1, 1],
    [0, 0.17, 0.015],
    [0, 0.18, 0.75],
  );
  add(
    sprout,
    leaf,
    ["body", "edge"],
    [1, 1, 1],
    [0, 0.3, 0.015],
    [0, -0.12, -0.67],
  );
  add(
    sprout,
    leaf,
    ["accent", "edge"],
    [0.72, 0.78, 1],
    [0, 0.56, -0.015],
    [0, 0.25, 0.22],
  );
  result.push(normalize("Potted sprout", "Agriculture", sprout));

  // Food service: three distinct oversized crown lobes over a narrow chef's band.
  const chefHat = new THREE.Group();
  add(chefHat, cylinder, "cream", [0.85, 0.52, 0.72], [0, -0.3, 0]);
  add(chefHat, cylinder, "metal", [0.9, 0.11, 0.77], [0, -0.51, 0]);
  add(chefHat, sphere, "cream", [0.69, 0.7, 0.73], [-0.34, 0.12, 0]);
  add(chefHat, sphere, "cream", [0.69, 0.7, 0.73], [0.34, 0.12, 0]);
  add(chefHat, sphere, "cream", [0.82, 0.91, 0.84], [0, 0.24, 0]);
  add(chefHat, sphere, "cream", [0.65, 0.68, 0.68], [0, 0.17, -0.29]);
  result.push(normalize("Chef hat", "Food service", chefHat));

  // Professional services: a broad briefcase with raised handle and twin clasps.
  const briefcase = new THREE.Group();
  box(briefcase, "edge", [1.24, 0.8, 0.43], [0, 0, 0], true);
  box(briefcase, "body", [1.17, 0.73, 0.04], [0, 0, 0.245], true);
  handle(briefcase, "metal", 0.48, 0.4);
  box(briefcase, "edge", [1.21, 0.065, 0.045], [0, 0.09, 0.275]);
  for (const x of [-0.36, 0.36]) {
    box(briefcase, "edge", [0.115, 0.77, 0.05], [x, 0, 0.267]);
    box(briefcase, "metal", [0.16, 0.18, 0.055], [x, 0.085, 0.31], true);
  }
  result.push(normalize("Briefcase", "Professional services", briefcase));

  return result;
}
