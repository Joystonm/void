import * as THREE from 'three';
import {terrainHeight} from './terrain.js';
export {terrainHeight} from './terrain.js';
export const METRES_PER_UNIT=100;
export class FlightJourney{
 constructor(center,radius){this.center=center.clone();this.radius=radius;this.reset();}
 reset(){this.position=new THREE.Vector3();this.normal=this.position.clone().sub(this.center).normalize();this.forward=new THREE.Vector3(0,0,-1);this.up=new THREE.Vector3(0,1,0);this.pitch=0;this.boost=0;this.speed=0;this.distance=0;this.contact=false;this.assisted=false;this.terrainFollowing=false;this.followHeight=1.5;this.inside=false;this.entryProgress=0;this.turnRate=0;this.liftSpeed=0;this.velocity=new THREE.Vector3();}
 clearance(p){const n=p.clone().sub(this.center).normalize();return p.distanceTo(this.center)-this.radius-terrainHeight(n);}
 groundNormal(p){const e=.025,result=new THREE.Vector3();for(const axis of ['x','y','z']){const a=p.clone(),b=p.clone();a[axis]+=e;b[axis]-=e;result[axis]=this.clearance(a)-this.clearance(b);}return result.normalize();}
 step(dt,boosting=false,turn=0,climb=0,thrust=0,vertical=0){
  this.normal.copy(this.position).sub(this.center).normalize();
  if(this.shellAltitude<0)this.inside=true;
  if(this.shellAltitude>18){this.inside=false;this.entryProgress=0;}
  if(this.inside)this.entryProgress=Math.max(this.entryProgress,1-THREE.MathUtils.smoothstep(this.shellAltitude,-2,0));
  if(this.inside&&this.altitude<5&&!this.terrainFollowing){this.terrainFollowing=true;this.followHeight=Math.max(1.2,this.altitude);}
  const desiredUp=new THREE.Vector3(0,1,0).lerp(this.normal,1-THREE.MathUtils.smoothstep(this.shellAltitude,-1,20)).normalize();
  this.up.lerp(desiredUp,1-Math.exp(-3*dt)).normalize();
  this.turnRate=THREE.MathUtils.damp(this.turnRate,turn*(this.terrainFollowing?.5:.85),6,dt);
  this.boost=THREE.MathUtils.damp(this.boost,boosting&&thrust>0?1:0,3,dt);
  this.forward.applyAxisAngle(this.terrainFollowing?this.normal:this.up,-this.turnRate*dt).normalize();
  const cruise=this.terrainFollowing?1.35:THREE.MathUtils.lerp(2.2,18,THREE.MathUtils.smoothstep(this.shellAltitude,-3,30));
  const targetSpeed=cruise*(1+this.boost*3)*THREE.MathUtils.clamp(thrust,0,1);
  this.speed=THREE.MathUtils.damp(this.speed,targetSpeed,thrust>0?4:10,dt);if(this.speed<.001)this.speed=0;
  this.liftSpeed=THREE.MathUtils.damp(this.liftSpeed,vertical*(this.terrainFollowing?1.2:6),8,dt);if(Math.abs(this.liftSpeed)<.001)this.liftSpeed=0;
  const old=this.position.clone(),travel=this.speed*dt;this.contact=false;
  if(this.terrainFollowing){
   // Surface inputs adjust clearance, not a persistent nose-up pitch.
   const tangent=this.forward.clone().projectOnPlane(this.normal).normalize();
   if(tangent.lengthSq()<.01)tangent.set(1,0,0).projectOnPlane(this.normal).normalize();
   this.followHeight=Math.max(1.2,this.followHeight+((thrust>0?climb*.9:0)+this.liftSpeed)*dt);
   const groundUp=this.groundNormal(this.position);
   const slope=-groundUp.dot(tangent)/Math.max(.08,groundUp.dot(this.normal));
   const candidate=this.position.clone().addScaledVector(tangent,travel/Math.sqrt(1+slope*slope));
   const nextNormal=candidate.clone().sub(this.center).normalize();
   if(travel>0||this.liftSpeed!==0)this.position.copy(this.center).addScaledVector(nextNormal,this.radius+terrainHeight(nextNormal)+this.followHeight);
   this.forward.copy(tangent).projectOnPlane(nextNormal).normalize();
   this.up.copy(nextNormal);this.contact=true;
   // A deliberate sustained climb can still leave the atmosphere.
   if(this.shellAltitude>16&&(climb>0||this.liftSpeed>0)){this.terrainFollowing=false;if(climb>0)this.forward.addScaledVector(nextNormal,.7).normalize();}
  }else{
   const right=new THREE.Vector3().crossVectors(this.forward,this.up).normalize();
   const pitched=this.forward.clone().applyAxisAngle(right,climb*dt*.7);
   if(Math.abs(pitched.dot(this.up))<.985)this.forward.copy(pitched);
   this.position.addScaledVector(this.forward,travel).addScaledVector(this.up,this.liftSpeed*dt);
   if(this.altitude<1.2){const n=this.position.clone().sub(this.center).normalize();this.position.copy(this.center).addScaledVector(n,this.radius+terrainHeight(n)+1.2);this.terrainFollowing=true;this.followHeight=1.2;this.contact=true;}
  }
  this.velocity.copy(this.position).sub(old).divideScalar(Math.max(dt,.00001));
  this.distance+=this.position.distanceTo(old);this.normal.copy(this.position).sub(this.center).normalize();this.pitch=Math.asin(THREE.MathUtils.clamp(this.forward.dot(this.normal),-1,1));
 }
 get shellAltitude(){return this.position.distanceTo(this.center)-this.radius;}
 get altitude(){return this.clearance(this.position);}
 get surface(){return this.inside;}
 get terrainBlend(){return this.inside?this.entryProgress*(1-THREE.MathUtils.smoothstep(this.shellAltitude,12,18)):1-THREE.MathUtils.smoothstep(this.shellAltitude,-2,0);}
 get remainingSeconds(){return 0;}
 get phase(){return this.terrainFollowing?'ALTITUDE HOLD':this.inside?'ATMOSPHERIC FLIGHT':this.shellAltitude<14?'ATMOSPHERIC ENTRY':'SPACE FLIGHT';}
}
