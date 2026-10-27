import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { solveKepler } from '../../../utils/celestialMechanics';

// =============================================================================
// TRANS-NEPTUNIAN / ANTI-PLUTO RESONANT ORBIT
// Quỹ đạo ĐỐI DIỆN 180° với hành tinh xa nhất của Hệ Mặt Trời (Pluto)
// - Bán trục lớn: a = 16.2 AU (nằm êm ái ngoài rìa Hệ Mặt Trời)
// - Độ lệch tâm: e = 0.12 (quỹ đạo gần tròn, tốc độ lướt êm dịu, không giật cục)
// - Góc nghiêng: i = 10.5° (góc nhìn từ trên cao trông xuống toàn cảnh đĩa hành tinh)
// - Chu kỳ: T = 180.0s (3 phút/vòng - tốc độ điện ảnh, chậm rãi, tĩnh lặng)
// =============================================================================
export const HORIZON_ORBIT = {
  a: 16.2,
  e: 0.12,
  i: (10.5 * Math.PI) / 180,
  omega: ((113.7 + 180.0) * Math.PI) / 180, // 293.7° (đối diện 180° với Pluto)
  node: ((110.3 + 180.0) * Math.PI) / 180,  // 290.3° (đối xứng tâm Mặt Trời)
  period: 180.0,
};

/**
 * 0-GC Keplerian Orbital Position Calculator for SS Horizon
 */
export function computeHorizonOrbitalPosition(t: number, outPos: THREE.Vector3): number {
  const M = ((t % HORIZON_ORBIT.period) / HORIZON_ORBIT.period) * Math.PI * 2;
  const E = solveKepler(M, HORIZON_ORBIT.e);
  const nu = 2.0 * Math.atan2(
    Math.sqrt(1.0 + HORIZON_ORBIT.e) * Math.sin(E * 0.5),
    Math.sqrt(1.0 - HORIZON_ORBIT.e) * Math.cos(E * 0.5)
  );
  const r = (HORIZON_ORBIT.a * (1.0 - HORIZON_ORBIT.e * HORIZON_ORBIT.e)) / (1.0 + HORIZON_ORBIT.e * Math.cos(nu));

  const xOrb = r * Math.cos(nu);
  const zOrb = r * Math.sin(nu);

  // Rotate by argument of perihelion (omega)
  const x1 = xOrb * Math.cos(HORIZON_ORBIT.omega) - zOrb * Math.sin(HORIZON_ORBIT.omega);
  const z1 = xOrb * Math.sin(HORIZON_ORBIT.omega) + zOrb * Math.cos(HORIZON_ORBIT.omega);

  // Rotate by inclination (i)
  const y2 = z1 * Math.sin(HORIZON_ORBIT.i);
  const z2 = z1 * Math.cos(HORIZON_ORBIT.i);

  // Rotate by longitude of ascending node (node)
  outPos.x = x1 * Math.cos(HORIZON_ORBIT.node) - z2 * Math.sin(HORIZON_ORBIT.node);
  outPos.y = y2;
  outPos.z = x1 * Math.sin(HORIZON_ORBIT.node) + z2 * Math.cos(HORIZON_ORBIT.node);

  return r;
}

// Global 0-GC state vectors shared with CameraRig & Observation Deck in VisualizerCanvas
export const horizonGlobalPosition = new THREE.Vector3();
export const horizonGlobalForward = new THREE.Vector3(0, 0, 1);
export const horizonGlobalRight = new THREE.Vector3(1, 0, 0);
export const horizonGlobalUp = new THREE.Vector3(0, 1, 0);

// Static math objects (0 GC in useFrame)
const _shipPos = new THREE.Vector3();
const _shipNextPos = new THREE.Vector3();
const _shipVel = new THREE.Vector3();
const _shipForward = new THREE.Vector3();
const _shipWorldUp = new THREE.Vector3(0, 1, 0);
const _shipRight = new THREE.Vector3();
const _dynamicUp = new THREE.Vector3();
const _rotMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

// Preload the Draco model
useGLTF.preload('/models/erizon_draco.glb', '/draco/gltf/');

export const HorizonSpacecraft: React.FC = () => {
  const { scene } = useGLTF('/models/erizon_draco.glb', '/draco/gltf/');
  const shipGroupRef = useRef<THREE.Group>(null);

  // Pre-process and scale model for astronomical visualizer scale
  // targetSize = 0.32: Tinh tế, vừa vặn với kích thước thiên văn của Hệ Mặt Trời,
  // không quá to áp đảo các hành tinh, giữ trọn vẻ đẹp điện ảnh và tỷ lệ chuẩn xác.
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const targetSize = 0.32;
    const scale = targetSize / maxDim;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);

  useFrame(state => {
    if (!shipGroupRef.current) return;
    const time = state.clock.elapsedTime;

    // 1. Compute exact Keplerian orbital position
    computeHorizonOrbitalPosition(time, _shipPos);
    computeHorizonOrbitalPosition(time + 0.15, _shipNextPos);

    // 2. Physical flight velocity & prograde orientation (Hướng tiến theo quán tính)
    _shipVel.subVectors(_shipNextPos, _shipPos).normalize();
    _shipForward.copy(_shipVel);

    // 3. Orthonormal Right-Handed Coordinate Frame (Det = +1, Không lật ảnh, Không rung lắc)
    // - Forward: Trục Z hướng thẳng theo hướng vector vận tốc quỹ đạo v
    // - Right: Trục X vuông góc với Forward và World Up (0,1,0): R = Up x Forward
    _shipRight.crossVectors(_shipWorldUp, _shipForward).normalize();
    // - Up: Trục Y vuông góc với Forward và Right: U = Forward x Right
    _dynamicUp.crossVectors(_shipForward, _shipRight).normalize();

    // Construct pure right-handed rotation matrix: Model bow points along +Z
    _rotMatrix.makeBasis(_shipRight, _dynamicUp, _shipForward);
    _targetQuat.setFromRotationMatrix(_rotMatrix);

    // 4. Update ship transform (Chuyển động mượt mà, quán tính ổn định)
    shipGroupRef.current.position.copy(_shipPos);
    shipGroupRef.current.quaternion.slerp(_targetQuat, 0.10);

    // 5. Publish global vectors for cinematic CameraRig tracking
    horizonGlobalPosition.copy(_shipPos);
    horizonGlobalForward.copy(_shipForward);
    horizonGlobalRight.copy(_shipRight);
    horizonGlobalUp.copy(_dynamicUp);
  });

  return (
    <group>
      {/* 
        KHÔNG vẽ đường quỹ đạo ngoài của tàu để TUYỆT ĐỐI không làm rối mắt
        hoặc gây hiểu lầm là đã thay đổi quỹ đạo các hành tinh nguyên bản.
        Hệ Mặt Trời giữ trọn vẹn 100% hình thái DE440 nguyên thủy.
      */}

      {/* SS Horizon Vessel in Deep Space Orbit */}
      <group ref={shipGroupRef}>
        <primitive object={clonedScene} />

        {/* Localized Cinematic Starlight Accent */}
        <pointLight position={[0.1, 0.2, 0.2]} intensity={0.5} color="#e2e8f0" distance={1.2} />
      </group>
    </group>
  );
};
