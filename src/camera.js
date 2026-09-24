import * as THREE from 'three';
import {terrainHeight} from './terrain.js';
const offset=new THREE.Vector3(),target=new THREE.Vector3(),radial=new THREE.Vector3();
const tangent=new THREE.Vector3(),surfaceOffset=new THREE.Vector3(),surfaceTarget=new THREE.Vector3(),up=new THREE.Vector3();
export function updateChaseCamera(camera,rig,center,radius,altitude,orbit=null){
  const scale=.12+.88*THREE.MathUtils.smoothstep(altitude,1,22);
  const groundBlend=1-THREE.MathUtils.smoothstep(altitude,2,16);
  rig.updateMatrixWorld(true);
  offset.set(0,3*scale,19*scale).applyMatrix4(rig.matrixWorld);
  target.set(0,-.5*scale,-8*scale).applyMatrix4(rig.matrixWorld);
  radial.copy(rig.position).sub(center).normalize();
  tangent.set(0,0,-1).applyQuaternion(rig.quaternion).projectOnPlane(radial);
  if(tangent.lengthSq()<.0001)tangent.set(1,0,0).projectOnPlane(radial);
  tangent.normalize();
  // Near terrain, show the horizon and ground ahead even while the ship is pitched down.
  surfaceOffset.copy(rig.position).addScaledVector(tangent,-19*scale).addScaledVector(radial,6*scale);
  surfaceTarget.copy(rig.position).addScaledVector(tangent,10*scale).addScaledVector(radial,-2*scale);
  offset.lerp(surfaceOffset,groundBlend);target.lerp(surfaceTarget,groundBlend);
  if(orbit?.active){
    target.set(0,-2*scale,0).applyMatrix4(rig.matrixWorld);
    const distance=19*scale*orbit.zoom;
    const localOffset=new THREE.Vector3(Math.sin(orbit.yaw)*Math.cos(orbit.pitch),Math.sin(orbit.pitch),Math.cos(orbit.yaw)*Math.cos(orbit.pitch));
    localOffset.applyQuaternion(rig.quaternion).multiplyScalar(distance);
    offset.copy(target).add(localOffset);
  }
  const cameraRadial=offset.clone().sub(center).normalize();
  const floor=radius+terrainHeight(cameraRadial)+.3;
  if(offset.distanceTo(center)<floor)offset.copy(center).addScaledVector(cameraRadial,floor);
  up.set(0,1,0).applyQuaternion(rig.quaternion).lerp(radial,groundBlend).normalize();
  camera.position.copy(offset);camera.up.copy(up);camera.lookAt(target);camera.updateMatrixWorld(true);
}
