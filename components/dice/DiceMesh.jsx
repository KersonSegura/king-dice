'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges, Text } from '@react-three/drei';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
// D6 pip layouts - positions relative to face center
// Using standard dice pip arrangements
const D6_PIP_LAYOUTS = {
  1: [{ x: 0, y: 0 }],
  2: [
    { x: -0.35, y: 0.35 },
    { x: 0.35, y: -0.35 }
  ],
  3: [
    { x: -0.35, y: 0.35 },
    { x: 0, y: 0 },
    { x: 0.35, y: -0.35 }
  ],
  4: [
    { x: -0.35, y: 0.35 },
    { x: -0.35, y: -0.35 },
    { x: 0.35, y: 0.35 },
    { x: 0.35, y: -0.35 }
  ],
  5: [
    { x: -0.35, y: 0.35 },
    { x: -0.35, y: -0.35 },
    { x: 0, y: 0 },
    { x: 0.35, y: 0.35 },
    { x: 0.35, y: -0.35 }
  ],
  6: [
    { x: -0.35, y: 0.3 },
    { x: -0.35, y: 0 },
    { x: -0.35, y: -0.3 },
    { x: 0.35, y: 0.3 },
    { x: 0.35, y: 0 },
    { x: 0.35, y: -0.3 }
  ]
};


const SPIN_DURATION = 1.3;
const SETTLE_DURATION = 0.6;
const IDLE_ROTATION = 0.06;

// D4 outline rotation adjustment (in radians) - adjust to align outline with face
const D4_OUTLINE_ROTATION = Math.PI / 3; // Start with 60 degrees, adjust as needed

// Default text offset so labels hover slightly above each face (prevents z-fighting)
const DEFAULT_TEXT_OFFSET = 0.0003;

// D10 offsets to keep text fully outside the kite faces
const D10_TEXT_OFFSET_TOP = 0.006 + 0.0025; // surface offset + local text offset
const D10_TEXT_OFFSET_BOTTOM = 0.0025 + 0.0008;

// DEBUG MODE: Set to true to see outline on ALL faces (helps with alignment)
const DEBUG_OUTLINE = false; // Change to false when done adjusting
const DEBUG_OUTLINE_COLOR = '#00ff00'; // Bright green so it's easy to see
const LABEL_FONT_SIZES = {
  tetra: 0.5,
  cube: 0.55,
  octa: 0.45,
  pentagonal: 0.45,
  dodeca: 0.4,
  icosa: 0.35,
  default: 0.4
};

const worldUp = new THREE.Vector3(0, 1, 0);
const viewDirection = new THREE.Vector3(0, 0, 1); // Original: +Z pointing toward viewer
const targetHorizontal = new THREE.Vector3(1, 0, 0); // Original: +X (right)

// D10-specific landing basis (only used for D10)
const targetVertical = new THREE.Vector3(0, 1, 0); // global up
const targetNormal = new THREE.Vector3(0, 0, -1);  // straight toward viewer
const d10TargetHorizontal = new THREE.Vector3().crossVectors(targetVertical, targetNormal).normalize(); // (-1,0,0) for D10 only

function createPentagonalTrapezohedronGeometry() {
  const n = 5;
  const radius = 0.5;
  const halfHeight = 0.4;
  const angleStep = (Math.PI * 2) / n;
  const halfStep = angleStep / 2;

  const antiprismVertices = [];
  for (let i = 0; i < n; i += 1) {
    const angle = i * angleStep;
    antiprismVertices.push(
      new THREE.Vector3(
        radius * Math.cos(angle),
        halfHeight,
        radius * Math.sin(angle)
      )
    );
  }
  for (let i = 0; i < n; i += 1) {
    const angle = i * angleStep + halfStep;
    antiprismVertices.push(
      new THREE.Vector3(
        radius * Math.cos(angle),
        -halfHeight,
        radius * Math.sin(angle)
      )
    );
  }

  const faces = [];
  const topFace = [];
  const bottomFace = [];
  for (let i = 0; i < n; i += 1) {
    topFace.push(i);
    bottomFace.push(2 * n - 1 - i);
  }
  faces.push(topFace);
  faces.push(bottomFace);

  for (let i = 0; i < n; i += 1) {
    const next = (i + 1) % n;
    const topIdx = i;
    const nextTopIdx = next;
    const bottomIdx = n + i;
    const nextBottomIdx = n + next;
    faces.push([topIdx, bottomIdx, nextTopIdx]);
    faces.push([bottomIdx, nextBottomIdx, nextTopIdx]);
  }

  const dualPoints = faces.map((face) => {
    const normal = new THREE.Vector3();
    let centroid = new THREE.Vector3();
    for (let i = 0; i < face.length; i += 1) {
      const current = antiprismVertices[face[i]];
      const next = antiprismVertices[face[(i + 1) % face.length]];
      normal.x += (current.y - next.y) * (current.z + next.z);
      normal.y += (current.z - next.z) * (current.x + next.x);
      normal.z += (current.x - next.x) * (current.y + next.y);
      centroid = centroid.add(current);
    }
    centroid.divideScalar(face.length);
    normal.normalize();
    const distance = normal.dot(antiprismVertices[face[0]]);
    return normal.clone().divideScalar(distance);
  });

  const geometry = new ConvexGeometry(dualPoints);
  geometry.scale(0.4, 0.4, 0.4);
  geometry.computeVertexNormals();
  return geometry;
}

export function createShapeGeometry(shape) {
  switch (shape) {
    case 'tetra':
      return new THREE.TetrahedronGeometry(0.9, 0);
    case 'cube':
      return new THREE.BoxGeometry(1.2, 1.2, 1.2);
    case 'octa':
      return new THREE.OctahedronGeometry(1, 0);
    case 'pentagonal':
      return createPentagonalTrapezohedronGeometry();
    case 'dodeca':
      return new THREE.DodecahedronGeometry(0.95, 0);
    case 'icosa':
      return new THREE.IcosahedronGeometry(1, 0);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

// Create wireframe geometry for debug visualization - matches the actual dice shape
function createDebugWireframe(shape) {
  const geometry = createShapeGeometry(shape);
  return geometry;
}

const D6_FACE_INFO = [
  { normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), value: 1 },   // Right face: Y up
  { normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), value: 6 },  // Left face: Y up
  { normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(1, 0, 0), value: 2 },   // Top face: X right
  { normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(1, 0, 0), value: 5 },  // Bottom face: X right
  { normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), value: 3 },   // Front face: Y up
  { normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), value: 4 }   // Back face: Y up
];

// Calculate face outline vertices mathematically based on shape type
// Uses the same horizontal/vertical coordinate system as the number placement
function calculateFaceOutlineVertices(shape, horizontal, vertical) {
  const vertices = [];
  
  // ============================================
  // MANUAL ADJUSTMENT PARAMETERS
  // ============================================
  // Adjust these values to fine-tune the outline position/size:
  const TETRA_SCALE = 1.0;        // Make D4 outline bigger (>1) or smaller (<1)
  const TETRA_ANGLE_OFFSET = Math.PI / 4;    // Rotate D4 outline (in radians: 0, PI/6=30°, PI/4=45°, PI/3=60°)
  const OCTA_SCALE = 1.0;         // Make D8 outline bigger or smaller
  const OCTA_ANGLE_OFFSET = 0;     // Rotate D8 outline
  const DODECA_SCALE = 1.0;        // Make D12 outline bigger or smaller
  const DODECA_ANGLE_OFFSET = 0;   // Rotate D12 outline
  const ICOSA_SCALE = 1.0;         // Make D20 outline bigger or smaller
  const ICOSA_ANGLE_OFFSET = 0;    // Rotate D20 outline
  const PENTAGONAL_SCALE = 1.0;    // Make D10 outline bigger or smaller
  const PENTAGONAL_ANGLE_OFFSET = 0; // Rotate D10 outline
  // ============================================
  
  switch (shape) {
    case 'tetra': {
      // Tetrahedron: equilateral triangle, radius 0.9
      // For a regular tetrahedron with circumradius R, edge length = R * sqrt(8/3)
      // Distance from face centroid to vertex = edge / sqrt(3) = R * sqrt(8/9) = R * (2*sqrt(2)/3)
      const radius = 0.9;
      const edgeLength = radius * Math.sqrt(8/3);
      let faceRadius = edgeLength / Math.sqrt(3); // Distance from face centroid to vertex
      faceRadius *= TETRA_SCALE; // Apply manual scale adjustment
      
      // Three vertices of equilateral triangle, 120° apart
      for (let i = 0; i < 3; i++) {
        let angle = (i * 2 * Math.PI) / 3 + TETRA_ANGLE_OFFSET; // Apply manual rotation
        const x = faceRadius * Math.cos(angle);
        const y = faceRadius * Math.sin(angle);
        const vertex = horizontal.clone().multiplyScalar(x).add(vertical.clone().multiplyScalar(y));
        vertices.push(vertex);
      }
      break;
    }
    case 'cube': {
      // Cube: square, size 1.2, so half-size is 0.6
      const halfSize = 0.6;
      vertices.push(
        horizontal.clone().multiplyScalar(-halfSize).add(vertical.clone().multiplyScalar(-halfSize)),
        horizontal.clone().multiplyScalar(halfSize).add(vertical.clone().multiplyScalar(-halfSize)),
        horizontal.clone().multiplyScalar(halfSize).add(vertical.clone().multiplyScalar(halfSize)),
        horizontal.clone().multiplyScalar(-halfSize).add(vertical.clone().multiplyScalar(halfSize))
      );
      break;
    }
    case 'octa': {
      // Octahedron: equilateral triangle, radius 1
      const radius = 1;
      let faceRadius = radius * Math.sqrt(2); // Distance from center to vertex
      faceRadius *= OCTA_SCALE; // Apply manual scale adjustment
      
      for (let i = 0; i < 3; i++) {
        let angle = (i * 2 * Math.PI) / 3 + OCTA_ANGLE_OFFSET; // Apply manual rotation
        const x = faceRadius * Math.cos(angle);
        const y = faceRadius * Math.sin(angle);
        const vertex = horizontal.clone().multiplyScalar(x).add(vertical.clone().multiplyScalar(y));
        vertices.push(vertex);
      }
      break;
    }
    case 'dodeca': {
      // Dodecahedron: pentagon, radius 0.95
      const radius = 0.95;
      let faceRadius = radius * 0.85; // Approximate distance from center to vertex
      faceRadius *= DODECA_SCALE; // Apply manual scale adjustment
      
      for (let i = 0; i < 5; i++) {
        let angle = (i * 2 * Math.PI) / 5 - Math.PI / 2 + DODECA_ANGLE_OFFSET; // Start at top, apply rotation
        const x = faceRadius * Math.cos(angle);
        const y = faceRadius * Math.sin(angle);
        const vertex = horizontal.clone().multiplyScalar(x).add(vertical.clone().multiplyScalar(y));
        vertices.push(vertex);
      }
      break;
    }
    case 'icosa': {
      // Icosahedron: equilateral triangle, radius 1
      const radius = 1;
      let faceRadius = radius * 0.9; // Approximate distance from center to vertex
      faceRadius *= ICOSA_SCALE; // Apply manual scale adjustment
      
      for (let i = 0; i < 3; i++) {
        let angle = (i * 2 * Math.PI) / 3 + ICOSA_ANGLE_OFFSET; // Apply manual rotation
        const x = faceRadius * Math.cos(angle);
        const y = faceRadius * Math.sin(angle);
        const vertex = horizontal.clone().multiplyScalar(x).add(vertical.clone().multiplyScalar(y));
        vertices.push(vertex);
      }
      break;
    }
    case 'pentagonal': {
      // Pentagonal trapezohedron (D10): kite shape, 5 vertices
      const radius = 0.5 * 0.4; // Scaled by 0.4 in geometry
      let faceRadius = radius * 1.2; // Approximate
      faceRadius *= PENTAGONAL_SCALE; // Apply manual scale adjustment
      
      for (let i = 0; i < 5; i++) {
        let angle = (i * 2 * Math.PI) / 5 - Math.PI / 2 + PENTAGONAL_ANGLE_OFFSET; // Apply manual rotation
        const x = faceRadius * Math.cos(angle);
        const y = faceRadius * Math.sin(angle);
        const vertex = horizontal.clone().multiplyScalar(x).add(vertical.clone().multiplyScalar(y));
        vertices.push(vertex);
      }
      break;
    }
  }
  
  return vertices;
}

// Extract actual edges from geometry for a specific face (matching the wireframe approach)
// Transforms edges to face's local coordinate system (horizontal/vertical) to align with number
function extractFaceEdges(geometry, targetNormal, faceCentroid, horizontal, vertical, threshold = 0.01) {
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const edgeCounts = new Map(); // Count how many times each edge appears
  const edgeVertices = new Map(); // Store vertices for each edge
  
  // Find all triangles that belong to this face
  for (let i = 0; i < positions.length; i += 9) {
    const faceNormal = new THREE.Vector3(
      (normals[i] + normals[i + 3] + normals[i + 6]) / 3,
      (normals[i + 1] + normals[i + 4] + normals[i + 7]) / 3,
      (normals[i + 2] + normals[i + 5] + normals[i + 8]) / 3
    ).normalize();
    
    // Check if this triangle belongs to the target face
    if (faceNormal.angleTo(targetNormal) < threshold) {
      // Get the three vertices of this triangle
      const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
      
      // Make relative to centroid
      let relV1 = v1.clone().sub(faceCentroid);
      let relV2 = v2.clone().sub(faceCentroid);
      let relV3 = v3.clone().sub(faceCentroid);
      
      // Project onto face plane and transform to face's local coordinate system (horizontal/vertical)
      // This ensures the outline aligns with the number which uses the same coordinate system
      const projectToFacePlane = (v) => {
        // Remove component along normal (project onto face plane)
        const dist = v.dot(targetNormal);
        v.sub(targetNormal.clone().multiplyScalar(dist));
        // Transform to face's 2D coordinate system
        const x = v.dot(horizontal);
        const y = v.dot(vertical);
        return new THREE.Vector3(x, y, 0);
      };
      
      relV1 = projectToFacePlane(relV1);
      relV2 = projectToFacePlane(relV2);
      relV3 = projectToFacePlane(relV3);
      
      // Count edges (both directions count as the same edge)
      const addEdge = (a, b) => {
        // Create normalized key (smaller vertex first to handle both directions)
        const key1 = `${a.x.toFixed(4)},${a.y.toFixed(4)},${a.z.toFixed(4)}_${b.x.toFixed(4)},${b.y.toFixed(4)},${b.z.toFixed(4)}`;
        const key2 = `${b.x.toFixed(4)},${b.y.toFixed(4)},${b.z.toFixed(4)}_${a.x.toFixed(4)},${a.y.toFixed(4)},${a.z.toFixed(4)}`;
        const key = key1 < key2 ? key1 : key2; // Use lexicographically smaller key
        
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        if (!edgeVertices.has(key)) {
          edgeVertices.set(key, [a, b]);
        }
      };
      
      addEdge(relV1, relV2);
      addEdge(relV2, relV3);
      addEdge(relV3, relV1);
    }
  }
  
  // Only keep edges that appear exactly once (boundary/perimeter edges)
  // Edges that appear twice are internal edges shared between triangles
  const edges = [];
  for (const [key, count] of edgeCounts.entries()) {
    if (count === 1) {
      const [a, b] = edgeVertices.get(key);
      edges.push(a, b);
    }
  }
  
  if (edges.length === 0) return null;
  
  // Create geometry from edges
  const edgeGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(edges.length * 3);
  for (let i = 0; i < edges.length; i++) {
    vertices[i * 3] = edges[i].x;
    vertices[i * 3 + 1] = edges[i].y;
    vertices[i * 3 + 2] = edges[i].z;
  }
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return edgeGeometry;
}

// Create thick line geometry from edges (matching D6's 0.03 thickness)
function createThickLineGeometry(edgeGeometry, thickness = 0.03) {
  if (!edgeGeometry) return null;
  
  const positions = edgeGeometry.attributes.position.array;
  const vertices = [];
  const normals = [];
  const indices = [];
  
  // For each edge (pair of vertices), create a rectangular plane
  for (let i = 0; i < positions.length; i += 6) {
    const x1 = positions[i];
    const y1 = positions[i + 1];
    const z1 = positions[i + 2];
    const x2 = positions[i + 3];
    const y2 = positions[i + 4];
    const z2 = positions[i + 5];
    
    // Calculate edge direction
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.001) continue; // Skip zero-length edges
    
    // Perpendicular direction for thickness (in the XY plane since z=0)
    const perpX = -dy / length;
    const perpY = dx / length;
    const halfThick = thickness / 2;
    
    // Create rectangle vertices
    const v0 = [x1 + perpX * halfThick, y1 + perpY * halfThick, z1];
    const v1 = [x1 - perpX * halfThick, y1 - perpY * halfThick, z1];
    const v2 = [x2 - perpX * halfThick, y2 - perpY * halfThick, z2];
    const v3 = [x2 + perpX * halfThick, y2 + perpY * halfThick, z2];
    
    const baseIndex = vertices.length / 3;
    vertices.push(...v0, ...v1, ...v2, ...v3);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );
  }
  
  if (vertices.length === 0) return null;
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function computeFaceData(geometry, shape) {
  if (!geometry) return [];
  const working = geometry.clone();
  const geom = working.index ? working.toNonIndexed() : working;
  geom.computeVertexNormals();

  const positions = geom.attributes.position.array;
  const normals = geom.attributes.normal.array;
  const faceMap = new Map();

  for (let i = 0; i < positions.length; i += 9) {
    const centroid = new THREE.Vector3(
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3
    );

    const normal = new THREE.Vector3(
      (normals[i] + normals[i + 3] + normals[i + 6]) / 3,
      (normals[i + 1] + normals[i + 4] + normals[i + 7]) / 3,
      (normals[i + 2] + normals[i + 5] + normals[i + 8]) / 3
    ).normalize();

    const key = `${Math.round(normal.x * 100)}_${Math.round(normal.y * 100)}_${Math.round(normal.z * 100)}`;
    let entry = faceMap.get(key);
    if (!entry) {
      entry = { 
        centroid: new THREE.Vector3(), 
        normal: new THREE.Vector3(), 
        edge: new THREE.Vector3(), 
        count: 0,
        vertices: [] // Store vertices for this face
      };
      faceMap.set(key, entry);
    }
    entry.centroid.add(centroid);
    entry.normal.add(normal);
    const edgeVector = new THREE.Vector3(
      positions[i + 3] - positions[i],
      positions[i + 4] - positions[i + 1],
      positions[i + 5] - positions[i + 2]
    ).normalize();
    entry.edge.add(edgeVector);
    entry.count += 1;
    
    // Store vertices from the FIRST triangle only (for tetrahedron, each face is exactly one triangle)
    // This gives us the exact 3 vertices that form the face boundary
    if (entry.vertices.length === 0) {
      entry.vertices.push(
        new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]),
        new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]),
        new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8])
      );
    }
  }

  const faces = Array.from(faceMap.values()).map((entry) => {
    const centroid = entry.centroid.divideScalar(entry.count);
    const normal = entry.normal.normalize();
    const labelOffset = 0.0003;
    const labelPosition = centroid.clone().add(normal.clone().multiplyScalar(labelOffset));

    let horizontal;
    let vertical;
    let textQuaternion;
    let faceRotation;

    if (shape === 'cube') {
      // For cubes, align face normal to camera while keeping cube edges square
      // The cube starts axis-aligned, so we compute rotation directly
      
      // Step 1: Align face normal to camera (viewDirection = 0,0,1)
      const alignNormal = new THREE.Quaternion().setFromUnitVectors(normal, viewDirection);
      
      // Step 2: Determine which cube axis should be "up" for this face
      // For side faces (X or Z normals), Y should be vertical
      // For top/bottom faces (Y normals), use X axis as reference
      let cubeUp = new THREE.Vector3(0, 1, 0); // Default: Y axis up
      if (Math.abs(normal.y) > 0.9) {
        // Top or bottom face - use X axis as reference
        cubeUp = new THREE.Vector3(1, 0, 0);
      }
      
      // Step 3: After aligning normal, see where cubeUp points
      const rotatedCubeUp = cubeUp.clone().applyQuaternion(alignNormal).normalize();
      
      // Step 4: Project cubeUp onto the plane perpendicular to view direction
      const twistAxis = viewDirection.clone();
      const projectedCubeUp = rotatedCubeUp.clone().sub(twistAxis.clone().multiplyScalar(rotatedCubeUp.dot(twistAxis)));
      const projectedWorldUp = worldUp.clone().sub(twistAxis.clone().multiplyScalar(worldUp.dot(twistAxis)));
      
      // Step 5: Calculate twist angle to align cubeUp with worldUp
      let twistAngle = 0;
      if (projectedCubeUp.length() > 0.01 && projectedWorldUp.length() > 0.01) {
        projectedCubeUp.normalize();
        projectedWorldUp.normalize();
        twistAngle = Math.acos(THREE.MathUtils.clamp(projectedCubeUp.dot(projectedWorldUp), -1, 1));
        const cross = new THREE.Vector3().crossVectors(projectedCubeUp, projectedWorldUp);
        if (cross.dot(twistAxis) < 0) {
          twistAngle = -twistAngle;
        }
      }
      
      // Step 6: Apply twist to get final rotation
      const twist = new THREE.Quaternion().setFromAxisAngle(twistAxis, twistAngle);
      faceRotation = twist.clone().multiply(alignNormal);
      
      // Build coordinate system for dots
      // Face 3 (front, normal 0,0,1) works with: Y vertical, X horizontal
      // For other faces, derive from cube geometry - think about rotating the front face
      let localVertical, localHorizontal;
      
      if (Math.abs(normal.z - 1) < 0.1) {
        // Front face (+Z): Y vertical, X horizontal - KEEP THIS, IT WORKS
        localVertical = new THREE.Vector3(0, 1, 0);
        localHorizontal = new THREE.Vector3(1, 0, 0);
      } else if (Math.abs(normal.z + 1) < 0.1) {
        // Back face (-Z): Rotate front 180° around Y → Y stays vertical, X flips
        localVertical = new THREE.Vector3(0, 1, 0);
        localHorizontal = new THREE.Vector3(-1, 0, 0);
      } else if (Math.abs(normal.x - 1) < 0.1) {
        // Right face (+X): Rotate front 90° around Y clockwise → Y stays vertical, Z becomes horizontal (pointing back)
        localVertical = new THREE.Vector3(0, 1, 0);
        localHorizontal = new THREE.Vector3(0, 0, -1);
      } else if (Math.abs(normal.x + 1) < 0.1) {
        // Left face (-X): Rotate front 90° around Y counter-clockwise → Y stays vertical, Z becomes horizontal (pointing forward)
        localVertical = new THREE.Vector3(0, 1, 0);
        localHorizontal = new THREE.Vector3(0, 0, 1);
      } else if (Math.abs(normal.y - 1) < 0.1) {
        // Top face (+Y): Rotate front 90° around X counter-clockwise → Z becomes vertical (pointing back), X stays horizontal
        localVertical = new THREE.Vector3(0, 0, -1);
        localHorizontal = new THREE.Vector3(1, 0, 0);
      } else {
        // Bottom face (-Y): Rotate front 90° around X clockwise → Z becomes vertical (pointing forward), X stays horizontal
        localVertical = new THREE.Vector3(0, 0, 1);
        localHorizontal = new THREE.Vector3(1, 0, 0);
      }
      
      // Use local vectors directly - they're already in the face plane
      // These define the coordinate system on the face BEFORE rotation
      vertical = localVertical.clone();
      horizontal = localHorizontal.clone();
      
      // Verify they're perpendicular to normal (they should be by construction)
      // Build the basis directly - this defines the 2D coordinate system on the face
      // horizontal = X axis, vertical = Y axis, normal = Z axis
      const rotationMatrix = new THREE.Matrix4().makeBasis(horizontal, vertical, normal);
      textQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
    } else {
      // For D10 (pentagonal trapezohedron), calculate vertical based on kite symmetry axis
      if (shape === 'pentagonal') {
        // Collect all unique vertices from ALL triangles on this face
        const faceVertices = [];
        const positions = geom.attributes.position.array;
        const normals = geom.attributes.normal.array;
        const vertexSet = new Set();
        
        for (let i = 0; i < positions.length; i += 9) {
          const faceNormal = new THREE.Vector3(
            (normals[i] + normals[i + 3] + normals[i + 6]) / 3,
            (normals[i + 1] + normals[i + 4] + normals[i + 7]) / 3,
            (normals[i + 2] + normals[i + 5] + normals[i + 8]) / 3
          ).normalize();
          
          if (faceNormal.angleTo(normal) < 0.01) {
            const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
            const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
            
            // Project vertices onto face plane and add unique ones
            [v1, v2, v3].forEach(v => {
              const rel = v.clone().sub(centroid);
              const dist = rel.dot(normal);
              rel.sub(normal.clone().multiplyScalar(dist));
              const key = `${rel.x.toFixed(4)},${rel.y.toFixed(4)},${rel.z.toFixed(4)}`;
              if (!vertexSet.has(key)) {
                vertexSet.add(key);
                faceVertices.push(rel);
              }
            });
          }
        }
        
        if (faceVertices.length >= 3) {
          // Order vertices consistently around the face normal so edge detection is reliable
          let axisX = faceVertices[0].clone();
          axisX.sub(normal.clone().multiplyScalar(axisX.dot(normal)));
          if (axisX.lengthSq() < 1e-6) {
            axisX = entry.edge.clone().sub(normal.clone().multiplyScalar(entry.edge.dot(normal)));
          }
          if (axisX.lengthSq() < 1e-6) {
            axisX = worldUp.clone().cross(normal);
          }
          axisX.normalize();
          const axisY = new THREE.Vector3().crossVectors(normal, axisX).normalize();
          faceVertices.sort((a, b) => {
            const angleA = Math.atan2(a.dot(axisY), a.dot(axisX));
            const angleB = Math.atan2(b.dot(axisY), b.dot(axisX));
            return angleA - angleB;
          });
        }

        if (faceVertices.length >= 4) {
          // For a kite, identify bottom (short edges) and top (long edges)
          // Calculate all edge lengths
          const edges = [];
          for (let i = 0; i < faceVertices.length; i++) {
            const v1 = faceVertices[i];
            const v2 = faceVertices[(i + 1) % faceVertices.length];
            const edgeLength = v1.distanceTo(v2);
            edges.push({
              v1Index: i,
              v2Index: (i + 1) % faceVertices.length,
              v1: v1,
              v2: v2,
              length: edgeLength
            });
          }
          
          // Sort edges by length to identify short (bottom) vs long (top) edges
          edges.sort((a, b) => a.length - b.length);
          const shortEdges = edges.slice(0, 2); // Two shortest edges
          
          // Find the vertex where the two shortest edges meet (bottom/narrow point)
          let bottomVertexIndex = -1;
          for (let i = 0; i < faceVertices.length; i++) {
            let edgeCount = 0;
            shortEdges.forEach(e => {
              if (e.v1Index === i || e.v2Index === i) {
                edgeCount++;
              }
            });
            if (edgeCount >= 2) {
              bottomVertexIndex = i;
              break;
            }
          }
          
          // Calculate vertical: from bottom vertex (narrow point) towards opposite side (wide base/top)
          if (bottomVertexIndex >= 0) {
            const bottomVertex = faceVertices[bottomVertexIndex];
            // Find the vertex opposite to bottom (should be on the wide base)
            // This is typically the vertex farthest from bottom
            let maxDist = 0;
            let topVertex = null;
            let topVertexIndex = -1;
            for (let i = 0; i < faceVertices.length; i++) {
              const v = faceVertices[i];
              if (i === bottomVertexIndex) continue; // Skip bottom vertex
              const dist = bottomVertex.distanceTo(v);
              if (dist > maxDist) {
                maxDist = dist;
                topVertex = v;
                topVertexIndex = i;
              }
            }
            
            if (topVertex) {
              // Vertical points from bottom to top
              vertical = topVertex.clone().sub(bottomVertex).normalize();
              
              // Ensure vertical is in the face plane (perpendicular to normal)
              const verticalComponent = vertical.clone().multiplyScalar(vertical.dot(normal));
              vertical.sub(verticalComponent).normalize();
            } else {
              // Fallback: point from bottom towards centroid
              const toCentroid = centroid.clone().sub(bottomVertex);
              vertical = toCentroid.sub(normal.clone().multiplyScalar(toCentroid.dot(normal))).normalize();
            }
          } else {
            // Fallback: use farthest vertex from centroid
            let maxDist = 0;
            let farthestVertex = null;
            for (const v of faceVertices) {
              const dist = v.length();
              if (dist > maxDist) {
                maxDist = dist;
                farthestVertex = v;
              }
            }
            if (farthestVertex) {
              vertical = farthestVertex.clone();
              // Project onto face plane
              const verticalComponent = vertical.clone().multiplyScalar(vertical.dot(normal));
              vertical.sub(verticalComponent).normalize();
            } else {
              vertical = faceVertices[0].clone();
              const verticalComponent = vertical.clone().multiplyScalar(vertical.dot(normal));
              vertical.sub(verticalComponent).normalize();
            }
          }
          
          // Horizontal is perpendicular to vertical in the face plane
          horizontal = new THREE.Vector3().crossVectors(normal, vertical).normalize();
          
          // Ensure vertical points "up" relative to world for upper half
          // Lower half (faces 6-10) will be flipped after sorting
          const worldUpOnFace = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal))).normalize();
          if (vertical.dot(worldUpOnFace) < 0) {
            vertical.multiplyScalar(-1);
            horizontal.multiplyScalar(-1); // Flip horizontal too to maintain right-handed coordinate system
          }
        } else {
          // Fallback: not enough vertices for D10
          horizontal = entry.edge.clone().normalize();
          if (horizontal.lengthSq() < 1e-6) {
            horizontal = worldUp.clone().cross(normal).normalize();
          }
          horizontal.sub(normal.clone().multiplyScalar(horizontal.dot(normal))).normalize();
          vertical = new THREE.Vector3().crossVectors(normal, horizontal).normalize();
        }
      } else {
        // For non-D10 shapes, use default calculation
        horizontal = entry.edge.clone().normalize();
        if (horizontal.lengthSq() < 1e-6) {
          horizontal = worldUp.clone().cross(normal).normalize();
        }
        horizontal.sub(normal.clone().multiplyScalar(horizontal.dot(normal))).normalize();
        vertical = new THREE.Vector3().crossVectors(normal, horizontal).normalize();
        if (vertical.dot(worldUp) < 0) {
          vertical.multiplyScalar(-1);
          horizontal.multiplyScalar(-1);
        }
      }
      // For D10: text should face outward (-normal) and align with kite's vertical
      // For other shapes: use normal (text faces inward, which is corrected by depthOffset)
      const textNormal = shape === 'pentagonal' ? normal.clone().multiplyScalar(-1) : normal;
      const rotationMatrix = new THREE.Matrix4().makeBasis(horizontal, vertical, textNormal);
      textQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);

      const sourceMatrix = new THREE.Matrix3().set(
        horizontal.x, vertical.x, normal.x,
        horizontal.y, vertical.y, normal.y,
        horizontal.z, vertical.z, normal.z
      );
      const sourceMatrixT = sourceMatrix.clone().transpose();
      const targetMatrix = new THREE.Matrix3().set(
        targetHorizontal.x, worldUp.x, viewDirection.x,
        targetHorizontal.y, worldUp.y, viewDirection.y,
        targetHorizontal.z, worldUp.z, viewDirection.z
      );
      const rotationToViewer = new THREE.Matrix3().multiplyMatrices(targetMatrix, sourceMatrixT);
      const rotationMatrix4 = new THREE.Matrix4().set(
        rotationToViewer.elements[0], rotationToViewer.elements[3], rotationToViewer.elements[6], 0,
        rotationToViewer.elements[1], rotationToViewer.elements[4], rotationToViewer.elements[7], 0,
        rotationToViewer.elements[2], rotationToViewer.elements[5], rotationToViewer.elements[8], 0,
        0, 0, 0, 1
      );
      faceRotation = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix4);
    }
    // Extract actual edges from geometry for this face (same as wireframe approach)
    // Transform to face's local coordinate system to align with number
    let outlineGeometry = null;
    if (shape !== 'cube') {
      // Extract the actual edges from the geometry that match this face
      // Use the same horizontal/vertical coordinate system as the number
      const edgeGeometry = extractFaceEdges(geom, normal, centroid, horizontal, vertical);
      // Convert to thick geometry matching D6's 0.03 thickness
      outlineGeometry = createThickLineGeometry(edgeGeometry, 0.03);
    }
    
    const face = {
      centroid,
      normal,
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z],
      quaternion: textQuaternion,
      upQuaternion: faceRotation,
      landingQuaternion: faceRotation,
      outlineGeometry,
      horizontal: horizontal ? [horizontal.x, horizontal.y, horizontal.z] : null,
      vertical: vertical ? [vertical.x, vertical.y, vertical.z] : null,
      textOffset: DEFAULT_TEXT_OFFSET
    };
    if (shape === 'cube') {
      const match = D6_FACE_INFO.find((info) => info.normal.angleTo(normal) < 1e-3);
      if (match) {
        face.value = match.value;
        face.customUp = match.up;
      }
    }
    return face;
  });

  faces.sort((a, b) => {
    if (shape === 'cube') {
      return (a.value || 0) - (b.value || 0);
    }
    if (b.labelPosition[1] !== a.labelPosition[1]) return b.labelPosition[1] - a.labelPosition[1];
    if (a.labelPosition[0] !== b.labelPosition[0]) return a.labelPosition[0] - b.labelPosition[0];
    return a.labelPosition[2] - b.labelPosition[2];
  });

  return faces.map((face, index) => {
    const value = face.value || index + 1;
    
    // For D10: ensure numbers are centered on each kite face and align with top/bottom halves
    if (shape === 'pentagonal' && face.horizontal && face.vertical) {
      const normalVec = new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z).normalize();
      const horizontalVec = new THREE.Vector3(face.horizontal[0], face.horizontal[1], face.horizontal[2]).normalize();
      const verticalVec = new THREE.Vector3(face.vertical[0], face.vertical[1], face.vertical[2]).normalize();
      
      const outwardNormal = normalVec.clone().multiplyScalar(-1);
      const buildQuaternion = (hAxis, vAxis) => {
        const rotationMatrix = new THREE.Matrix4().makeBasis(hAxis, vAxis, outwardNormal);
        return new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
      };
      const buildLandingQuaternion = (hAxis, vAxis, nAxis) => {
        const sourceMatrix = new THREE.Matrix3().set(
          hAxis.x, vAxis.x, nAxis.x,
          hAxis.y, vAxis.y, nAxis.y,
          hAxis.z, vAxis.z, nAxis.z
        );
        const sourceMatrixT = sourceMatrix.clone().transpose();
        const targetMatrix = new THREE.Matrix3().set(
          d10TargetHorizontal.x, targetVertical.x, targetNormal.x,
          d10TargetHorizontal.y, targetVertical.y, targetNormal.y,
          d10TargetHorizontal.z, targetVertical.z, targetNormal.z
        );
        const rotationToViewer = new THREE.Matrix3().multiplyMatrices(targetMatrix, sourceMatrixT);
        const rotationMatrix4 = new THREE.Matrix4().set(
          rotationToViewer.elements[0], rotationToViewer.elements[3], rotationToViewer.elements[6], 0,
          rotationToViewer.elements[1], rotationToViewer.elements[4], rotationToViewer.elements[7], 0,
          rotationToViewer.elements[2], rotationToViewer.elements[5], rotationToViewer.elements[8], 0,
          0, 0, 0, 1
        );
        return new THREE.Quaternion().setFromRotationMatrix(rotationMatrix4);
      };
      
      if (value >= 1 && value <= 5) {
        const landingHorizontalVec = horizontalVec.clone();
        const landingVerticalVec = verticalVec.clone();
        let alignedQuaternion = buildQuaternion(landingHorizontalVec, landingVerticalVec);
        // Rotate 180° around face vertical (local Y) to correct mirrored orientation
        const verticalFlip = new THREE.Quaternion().setFromAxisAngle(verticalVec, Math.PI);
        alignedQuaternion = verticalFlip.clone().multiply(alignedQuaternion);
        const landingQuaternion = buildLandingQuaternion(landingHorizontalVec, landingVerticalVec, outwardNormal);
        return {
          ...face,
          value,
          textOffset: D10_TEXT_OFFSET_TOP,
          quaternion: alignedQuaternion,
          landingQuaternion,
          landingHorizontal: [landingHorizontalVec.x, landingHorizontalVec.y, landingHorizontalVec.z],
          landingVertical: [landingVerticalVec.x, landingVerticalVec.y, landingVerticalVec.z],
          landingNormal: [outwardNormal.x, outwardNormal.y, outwardNormal.z]
        };
      }
      
      if (value >= 6 && value <= 10) {
        const invertedHorizontal = horizontalVec.clone().multiplyScalar(-1);
        const invertedVertical = verticalVec.clone().multiplyScalar(-1);
        let invertedQuaternion = buildQuaternion(invertedHorizontal, invertedVertical);
        // Flip around face vertical so numbers face outward (not mirrored)
        const verticalFlip = new THREE.Quaternion().setFromAxisAngle(verticalVec, Math.PI);
        invertedQuaternion = verticalFlip.clone().multiply(invertedQuaternion);
        const landingHorizontalVec = invertedHorizontal.clone();
        const landingVerticalVec = invertedVertical.clone();
        const landingQuaternion = buildLandingQuaternion(landingHorizontalVec, landingVerticalVec, outwardNormal);
        return {
          ...face,
          value,
          textOffset: D10_TEXT_OFFSET_BOTTOM,
          quaternion: invertedQuaternion,
          landingQuaternion,
          landingHorizontal: [landingHorizontalVec.x, landingHorizontalVec.y, landingHorizontalVec.z],
          landingVertical: [landingVerticalVec.x, landingVerticalVec.y, landingVerticalVec.z],
          landingNormal: [outwardNormal.x, outwardNormal.y, outwardNormal.z]
        };
      }
      
      return {
        ...face,
        value
      };
    }
    
    return {
      ...face,
      value
    };
  });
}

export function DiceGeometry({ shape, geometryOverride }) {
  const geometry = useMemo(() => geometryOverride || createShapeGeometry(shape), [geometryOverride, shape]);
  return <primitive object={geometry} attach="geometry" />;
}

export default function DiceMesh({ dice, rollSignal, rollResult, onComplete }) {
  const meshRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const spinStartRef = useRef(0);
  const settleStartRef = useRef(0);
  const targetRef = useRef(new THREE.Euler());
  const currentFaceIndexRef = useRef(-1);
  const glowOuterRef = useRef(null);
  const glowInnerRef = useRef(null);

  const geometry = useMemo(() => (dice ? createShapeGeometry(dice.shape) : null), [dice]);
  const faceData = useMemo(() => {
    if (!geometry || !dice?.shape) return [];
    const faces = computeFaceData(geometry, dice.shape);
    
    // Validate face count matches expected number of faces for this dice type
    const expectedFaces = dice.faces || (dice.shape === 'tetra' ? 4 : dice.shape === 'cube' ? 6 : dice.shape === 'octa' ? 8 : dice.shape === 'pentagonal' ? 10 : dice.shape === 'dodeca' ? 12 : dice.shape === 'icosa' ? 20 : 6);
    if (faces.length !== expectedFaces) {
      console.error(`Face count mismatch for ${dice.shape}: Expected ${expectedFaces}, got ${faces.length}`);
    }
    
    // Validate all faces have values in expected range
    const invalidFaces = faces.filter((f, idx) => {
      const expectedValue = idx + 1;
      return f.value !== expectedValue && f.value !== undefined;
    });
    if (invalidFaces.length > 0 && process.env.NODE_ENV !== 'production') {
      console.warn(`Some faces have unexpected values:`, invalidFaces.map(f => ({ index: faces.indexOf(f), value: f.value })));
    }
    
    return faces;
  }, [geometry, dice?.shape, dice?.faces]);

  const computeLandingQuaternion = useCallback((face) => {
    const horizontal = face.landingHorizontal
      ? new THREE.Vector3(face.landingHorizontal[0], face.landingHorizontal[1], face.landingHorizontal[2]).normalize()
      : face.horizontal
        ? new THREE.Vector3(face.horizontal[0], face.horizontal[1], face.horizontal[2]).normalize()
      : new THREE.Vector3(1, 0, 0);
    const vertical = face.landingVertical
      ? new THREE.Vector3(face.landingVertical[0], face.landingVertical[1], face.landingVertical[2]).normalize()
      : face.vertical
        ? new THREE.Vector3(face.vertical[0], face.vertical[1], face.vertical[2]).normalize()
      : new THREE.Vector3(0, 1, 0);
    const normal = face.landingNormal
      ? new THREE.Vector3(face.landingNormal[0], face.landingNormal[1], face.landingNormal[2]).normalize()
      : new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z).normalize();

    const sourceMatrix = new THREE.Matrix3().set(
      horizontal.x, vertical.x, normal.x,
      horizontal.y, vertical.y, normal.y,
      horizontal.z, vertical.z, normal.z
    );
    const sourceMatrixT = sourceMatrix.clone().transpose();
    const targetMatrix = new THREE.Matrix3().set(
      d10TargetHorizontal.x, targetVertical.x, targetNormal.x,
      d10TargetHorizontal.y, targetVertical.y, targetNormal.y,
      d10TargetHorizontal.z, targetVertical.z, targetNormal.z
    );
    const rotationToViewer = new THREE.Matrix3().multiplyMatrices(targetMatrix, sourceMatrixT);
    const rotationMatrix4 = new THREE.Matrix4().set(
      rotationToViewer.elements[0], rotationToViewer.elements[3], rotationToViewer.elements[6], 0,
      rotationToViewer.elements[1], rotationToViewer.elements[4], rotationToViewer.elements[7], 0,
      rotationToViewer.elements[2], rotationToViewer.elements[5], rotationToViewer.elements[8], 0,
      0, 0, 0, 1
    );
    return new THREE.Quaternion().setFromRotationMatrix(rotationMatrix4);
  }, []);

  useEffect(() => {
    if (!dice || !rollSignal || rollResult == null || faceData.length === 0) return;
    const rollValue = Number(rollResult);
    if (Number.isNaN(rollValue)) return;
    
    // Find face by exact value match (most reliable)
    let faceIndex = faceData.findIndex((f) => f.value === rollValue);
    
    // Fallback: if no exact match, use index-based lookup (assumes sequential values 1-N)
    if (faceIndex < 0) {
      // Ensure rollValue is within valid range
      const clampedValue = Math.max(1, Math.min(rollValue, faceData.length));
      faceIndex = clampedValue - 1;
      
      // Validate the fallback worked
      if (process.env.NODE_ENV !== 'production' && faceData[faceIndex]?.value !== clampedValue) {
        console.warn(`Dice face mapping issue: Rolled ${rollValue}, using face at index ${faceIndex} with value ${faceData[faceIndex]?.value}`);
      }
    }
    
    // Final safety check
    if (faceIndex < 0 || faceIndex >= faceData.length) {
      console.error(`Invalid face index ${faceIndex} for roll value ${rollValue}. Using first face as fallback.`);
      faceIndex = 0;
    }
    
    currentFaceIndexRef.current = faceIndex;
    const face = faceData[faceIndex];
    
    // For D10: use the custom landing quaternion computed from number orientation
    // For all other dice: use the original upQuaternion (which was working correctly)
    let landingQuat;
    if (dice.shape === 'pentagonal') {
      landingQuat = computeLandingQuaternion(face);
      if (process.env.NODE_ENV !== 'production') {
        console.log('D10 Landing debug', {
          value: face.value,
          landingQuaternion: {
            x: landingQuat.x.toFixed(4),
            y: landingQuat.y.toFixed(4),
            z: landingQuat.z.toFixed(4),
            w: landingQuat.w.toFixed(4)
          }
        });
      }
    } else {
      // For all other dice: use the original upQuaternion that was working correctly
      // Don't use landingQuaternion - that was only for D10
      landingQuat = face.upQuaternion;
    }
    
    const euler = new THREE.Euler().setFromQuaternion(landingQuat, 'XYZ');
    targetRef.current = euler;
    spinStartRef.current = performance.now();
    setPhase('spinning');
    
    // Reset glow when starting new roll
    if (glowOuterRef.current) {
      // For shader material (other dice) - reset intensity
      if (glowOuterRef.current.uniforms?.glowIntensity) {
        glowOuterRef.current.uniforms.glowIntensity.value = 0;
      }
      // For line material (D6) - reset opacity
      else if (glowOuterRef.current.opacity !== undefined) {
        glowOuterRef.current.opacity = 0;
      }
    }
  }, [rollSignal, rollResult, dice, faceData, computeLandingQuaternion]);

useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (phase === 'spinning') {
      mesh.rotation.x += delta * 10;
      mesh.rotation.y += delta * 9;
      mesh.rotation.z += delta * 6;
      const elapsed = (performance.now() - spinStartRef.current) / 1000;
      if (elapsed >= SPIN_DURATION) {
        settleStartRef.current = performance.now();
        setPhase('settling');
      }
    } else if (phase === 'settling') {
      const settleElapsed = Math.min((performance.now() - settleStartRef.current) / 1000, SETTLE_DURATION);
      const progress = settleElapsed / SETTLE_DURATION;
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetRef.current.x, progress);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRef.current.y, progress);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetRef.current.z, progress);
      if (progress >= 0.999) {
        mesh.rotation.copy(targetRef.current);
        setPhase('rest');
        onComplete?.();
      }
    } else if (phase === 'idle') {
      mesh.rotation.x += delta * IDLE_ROTATION;
      mesh.rotation.y += delta * (IDLE_ROTATION * 0.5);
    }
    
    // Animate glow effect when face is landed - subtle pulse
    if (phase === 'rest') {
      const time = performance.now() / 1000;
      const pulse = (Math.sin(time * 2) + 1) * 0.5; // 0 to 1
      const pulseAmount = 0.8 + pulse * 0.2; // Pulse between 0.8 and 1.0
      
      if (glowOuterRef.current) {
        // For shader material (other dice) - animate intensity
        if (glowOuterRef.current.uniforms?.glowIntensity) {
          glowOuterRef.current.uniforms.glowIntensity.value = pulseAmount;
        }
        // For line material (D6) - animate opacity
        else if (glowOuterRef.current.opacity !== undefined) {
          glowOuterRef.current.opacity = 0.7 + pulse * 0.3; // Pulse between 0.7 and 1.0
        }
      }
    }
  });

  const materialColor = useMemo(() => dice?.color || '#f97316', [dice]);
  const fontSize = LABEL_FONT_SIZES[dice?.shape] || LABEL_FONT_SIZES.default;

  if (!dice) return null;

  return (
    <group position={[0, 0.3, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <DiceGeometry shape={dice.shape} geometryOverride={geometry} />
        {dice.shape === 'cube' ? (
          <meshStandardMaterial
            color="#f5f5f5"
            roughness={0.25}
            metalness={0.1}
            envMapIntensity={1}
          />
        ) : (
          <meshStandardMaterial
            color={materialColor}
            roughness={0.3}
            metalness={0.45}
            envMapIntensity={1}
          />
        )}
        <Edges color="white" opacity={0.3} />
        {faceData.map((face, faceIdx) => {
          const isLandedFace = phase === 'rest' && faceIdx === currentFaceIndexRef.current;
          return (
            <group
              key={`${face.value}-${face.labelPosition.join(',')}`}
          position={[face.centroid.x, face.centroid.y, face.centroid.z]}
              quaternion={face.quaternion}
            >
              {dice.shape === 'cube' ? (
                <group>
                  {/* Square stroke outline for D6 face when landed */}
                  {isLandedFace && (
                    <group>
                      {/* Top edge */}
                      <mesh position={[0, 0.6, 0.0002]}>
                        <planeGeometry args={[1.2, 0.03]} />
                        <meshBasicMaterial 
                          ref={glowOuterRef}
                          color="#FFD700" 
                          transparent
                          opacity={0.9}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      {/* Bottom edge */}
                      <mesh position={[0, -0.6, 0.0002]}>
                        <planeGeometry args={[1.2, 0.03]} />
                        <meshBasicMaterial 
                          color="#FFD700" 
                          transparent
                          opacity={0.9}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      {/* Left edge */}
                      <mesh position={[-0.6, 0, 0.0002]}>
                        <planeGeometry args={[0.03, 1.2]} />
                        <meshBasicMaterial 
                          color="#FFD700" 
                          transparent
                          opacity={0.9}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      {/* Right edge */}
                      <mesh position={[0.6, 0, 0.0002]}>
                        <planeGeometry args={[0.03, 1.2]} />
                        <meshBasicMaterial 
                          color="#FFD700" 
                          transparent
                          opacity={0.9}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                    </group>
                  )}
                  {/* Dots */}
                  {(D6_PIP_LAYOUTS[face.value] || []).map((pip, idx) => (
                    <mesh 
                      key={idx} 
                      position={[pip.x, pip.y, 0.0001]}
                    >
                      <circleGeometry args={[0.12, 32]} />
                      <meshBasicMaterial color="#0f172a" />
                    </mesh>
                  ))}
                </group>
              ) : (
              <>
                {/* Face outline stroke matching the exact face shape when landed - YELLOW ONLY */}
                {/* Edges are transformed to face's local coordinate system - NOT rotated with numbers */}
                {/* Uses thick geometry matching D6's 0.03 thickness */}
                {isLandedFace && face.outlineGeometry && (
                  <mesh
                    position={[0, 0, (face.textOffset ?? DEFAULT_TEXT_OFFSET) - 0.0001]}
                    rotation={
                      dice.shape === 'pentagonal' && face.value >= 6 && face.value <= 10
                        ? [Math.PI, 0, 0]
                        : [0, 0, 0]
                    }
                  >
                    <primitive object={face.outlineGeometry} attach="geometry" />
                    <meshBasicMaterial 
                      ref={glowOuterRef}
                      color="#FFD700" 
                      transparent
                      opacity={0.9}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
                {/* Text - positioned on face surface, aligned vertically on kite */}
                <Text
                  position={[0, 0, face.textOffset ?? 0]}
                  fontSize={fontSize}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                  depthOffset={-0.0005}
                  outlineWidth={0.02}
                  outlineColor="black"
                  toneMapped={false}
                >
                  {face.value}
                </Text>
                {(face.value === 6 || face.value === 9) && (
                  <mesh position={[0, -fontSize * 0.55, 0.0005]}>
                    <planeGeometry args={[fontSize * 0.6, fontSize * 0.07]} />
                    <meshBasicMaterial color="white" transparent opacity={0.9} side={THREE.DoubleSide} />
                  </mesh>
                )}
              </>
            )}
            </group>
          );
        })}
      </mesh>
    </group>
  );
}

