import * as THREE from 'three';
import {gardenSignals} from './elysia.js';
import {planetLocations} from './planet-system.js';
export class GardenRace{
 constructor(scene){
  this.root=new THREE.Group();this.root.name='Elysia sky circuit';scene.add(this.root);
  this.state='idle';this.points=0;this.combo=0;this.turbo=0;this.event='';this.elapsed=0;this.index=0;this.countdown=0;this.penalties=0;this.best=null;this.flash=0;
  try{const saved=Number(globalThis.localStorage?.getItem('elysia-rings-best-v4'));if(saved>0&&Number.isFinite(saved))this.best=saved;}catch{}
  this.center=planetLocations.elysia;this.gates=[];
  const origin=new THREE.Vector3(-.65,.52,.55).normalize();
  const forward=new THREE.Vector3(0,0,-1).projectOnPlane(origin).normalize();
  const right=new THREE.Vector3().crossVectors(forward,origin).normalize();
  const points=[];
  this.ringRadius=3.5;
  for(let i=0;i<=12;i++){
   const angle=-.65+i*.42;
   const n=origin.clone().multiplyScalar(Math.cos(angle)).addScaledVector(forward,Math.sin(angle));
   n.addScaledVector(right,.075*Math.sin(i*.65)).normalize();
   points.push(this.center.clone().addScaledVector(n,66.5+1.2*Math.sin(i*.65)));
  }
  this.startPosition=points[0];this.startDirection=points[1].clone().sub(points[0]).normalize();
  this.materials=[0x38e8df,0xffcc66,0x7465d9,0x5dff99].map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  const ringGeometry=new THREE.TorusGeometry(this.ringRadius,.1,10,64);
  for(let i=1;i<points.length;i++){
   const normal=points[i].clone().sub(points[i-1]).normalize();
   const ring=new THREE.Mesh(ringGeometry,this.materials[2]);ring.position.copy(points[i]);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);this.root.add(ring);
   const booster=i%4===0;
   let halo=null;
   if(booster){halo=new THREE.Mesh(new THREE.TorusGeometry(this.ringRadius+.3,.045,6,64),this.materials[0]);halo.position.copy(ring.position);halo.quaternion.copy(ring.quaternion);this.root.add(halo);}
   this.gates.push({position:points[i],normal,ring,booster,halo});
  }
  // Only the current destination gets a guide, so branches never compete.
  this.guidePositions=new Float32Array(80*3);this.guideColors=new Float32Array(80*3);
  const guideGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(this.guidePositions,3)).setAttribute('color',new THREE.BufferAttribute(this.guideColors,3));
  this.guide=new THREE.Points(guideGeometry,new THREE.PointsMaterial({vertexColors:true,size:.19,toneMapped:false,depthWrite:false}));
  this.guide.frustumCulled=false;this.root.add(this.guide);
  this.guideArrows=new THREE.InstancedMesh(new THREE.ConeGeometry(.17,.55,4),this.materials[0],7);
  this.guideArrows.frustumCulled=false;this.root.add(this.guideArrows);
  this.confettiPositions=new Float32Array(120*3);this.confettiVelocities=[];
  const confettiColors=[];
  for(let i=0;i<120;i++){const a=i*2.39996;this.confettiVelocities.push(new THREE.Vector3(Math.cos(a),Math.sin(a*.7),Math.sin(a)).normalize().multiplyScalar(2+(i%5)*.4));const c=new THREE.Color([0xffdf75,0x6affdb,0xee87ff][i%3]);confettiColors.push(c.r,c.g,c.b);}
  const confettiGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(this.confettiPositions,3)).setAttribute('color',new THREE.Float32BufferAttribute(confettiColors,3));
  this.confetti=new THREE.Points(confettiGeometry,new THREE.PointsMaterial({vertexColors:true,size:.1,transparent:true,toneMapped:false,depthWrite:false}));this.confetti.frustumCulled=false;this.confetti.visible=false;this.root.add(this.confetti);this.celebration=0;
  this.previous=new THREE.Vector3();this.root.visible=false;this.guide.visible=false;this.guideArrows.visible=false;this.paint();
 }
 get active(){return this.state==='countdown'||this.state==='running';}
 get score(){return this.elapsed+this.penalties;}
 get medal(){return this.score<=18?'GOLD':this.score<=28?'SILVER':'BRONZE';}
 place(journey,position,direction){
  journey.position.copy(position);journey.normal.copy(position).sub(this.center).normalize();journey.up.copy(journey.normal);
  journey.forward.copy(direction).projectOnPlane(journey.normal).normalize();journey.velocity.set(0,0,0);journey.speed=0;journey.boost=0;
  journey.inside=true;journey.entryProgress=1;journey.terrainFollowing=false;journey.followHeight=1.8;journey.liftSpeed=0;journey.turnRate=0;
  journey.dodgeTime=0;journey.dodgeCooldown=0;journey.strafeTime=0;this.previous.copy(journey.position);
 }
 start(journey){this.confetti.visible=false;this.celebration=0;this.state='countdown';this.points=0;this.combo=0;this.turbo=0;this.event='';this.countdown=3;this.elapsed=0;this.penalties=0;this.index=0;this.flash=0;this.place(journey,this.startPosition,this.startDirection);this.paint();}
 cancel(){this.guide.visible=false;this.guideArrows.visible=false;this.confetti.visible=false;this.state='idle';this.turbo=0;this.flash=0;this.paint();}
 recover(journey){
  if(this.state!=='running')return;
  const position=this.index===0?this.startPosition:this.gates[this.index-1].position;
  this.place(journey,position,this.gates[this.index].position.clone().sub(position));this.flash=0;this.combo=0;this.turbo=0;
 }
 paint(){this.gates.forEach((g,i)=>{g.ring.material=this.materials[i<this.index?3:i===this.index?1:2];g.ring.visible=i>=this.index&&i<this.index+3;if(g.halo)g.halo.visible=g.ring.visible;});}
 // Follow the planet's curvature; a straight chord can lead underground.
 updateGuide(journey,time=0){
  const visible=this.active;this.guide.visible=visible;this.guideArrows.visible=visible;
  if(!visible)return;
  const target=this.gates[this.index].position;
  const startNormal=journey.position.clone().sub(this.center).normalize(),endNormal=target.clone().sub(this.center).normalize();
  const rotation=new THREE.Quaternion().setFromUnitVectors(startNormal,endNormal),q=new THREE.Quaternion();
  const startRadius=journey.position.distanceTo(this.center),endRadius=target.distanceTo(this.center);
  const arc=startNormal.angleTo(endNormal)*(startRadius+endRadius)/2;
  const count=THREE.MathUtils.clamp(Math.ceil(arc/.65),8,80);
  const point=t=>{
   q.identity().slerp(rotation,t);
   return startNormal.clone().applyQuaternion(q).multiplyScalar(THREE.MathUtils.lerp(startRadius,endRadius,t)).add(this.center);
  };
  for(let i=0;i<count;i++){
   const t=(i+1)/(count+1),p=point(t),wave=.55+.45*Math.cos((t*6-time*2)*Math.PI*2);
   this.guidePositions.set(p.toArray(),i*3);this.guideColors.set([.2+wave*.35,.55+wave*.7,.45+wave*.6],i*3);
  }
  this.guide.geometry.setDrawRange(0,count);this.guide.geometry.attributes.position.needsUpdate=true;this.guide.geometry.attributes.color.needsUpdate=true;
  const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  this.guideArrows.count=arc>3?7:0;
  for(let i=0;i<this.guideArrows.count;i++){
   const t=(i+1)/8,p=point(t),ahead=point(Math.min(1,t+.015));
   dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(up,ahead.sub(p).normalize());dummy.updateMatrix();this.guideArrows.setMatrixAt(i,dummy.matrix);
  }
  this.guideArrows.instanceMatrix.needsUpdate=true;
 }
 // Ring flight follows a smooth sphere, so mountains cannot push the craft sideways.
 // Heading, movement and model orientation use the same vector without turn inertia.
 drive(dt,journey,{turn=0,lift=0,thrust=0,boost=false}={}){
  if(this.state!=='running')return;
  const old=journey.position.clone(),normal=old.clone().sub(this.center).normalize();
  const heading=journey.forward.clone().projectOnPlane(normal).normalize();
  heading.applyAxisAngle(normal,-turn*1.25*dt);
  journey.turnRate=turn*1.25;
  journey.speed=THREE.MathUtils.damp(journey.speed,thrust*(this.turbo>0?10:boost?8:5),thrust?14:28,dt);
  if(journey.speed<.025)journey.speed=0;
  const height=THREE.MathUtils.clamp(old.distanceTo(this.center)+lift*2.5*dt,64.5,70);
  const nextNormal=normal.clone().multiplyScalar(height).addScaledVector(heading,journey.speed*dt).normalize();
  const transport=new THREE.Quaternion().setFromUnitVectors(normal,nextNormal);
  journey.position.copy(this.center).addScaledVector(nextNormal,height);
  journey.forward.copy(heading).applyQuaternion(transport).normalize();journey.normal.copy(nextNormal);journey.up.copy(nextNormal);
  journey.velocity.copy(journey.position).sub(old).divideScalar(dt);journey.distance+=journey.position.distanceTo(old);
  journey.pitch=0;journey.liftSpeed=0;journey.boost=thrust?(this.turbo>0?1.3:boost?1:0):0;journey.inside=true;journey.entryProgress=1;journey.terrainFollowing=false;
  journey.dodgeTime=0;journey.strafeTime=0;journey.contact=false;
 }
 update(dt,journey){
  this.flash=Math.max(0,this.flash-dt);this.turbo=Math.max(0,this.turbo-dt);
  if(this.state==='finished'){
   this.celebration+=dt;this.confetti.visible=this.celebration<3;
   const up=this.gates[this.gates.length-1].position.clone().sub(this.center).normalize();
   this.confettiVelocities.forEach((v,i)=>{const p=v.clone().multiplyScalar(this.celebration).addScaledVector(up,-.4*this.celebration*this.celebration);this.confettiPositions.set(p.toArray(),i*3);});
   this.confetti.geometry.attributes.position.needsUpdate=true;this.confetti.material.opacity=Math.max(0,1-this.celebration/3);
  }
  if(this.state==='countdown'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown===0){this.state='running';this.flash=.7;}this.previous.copy(journey.position);return;}
  if(this.state!=='running')return;
  this.elapsed+=dt;
  const gate=this.gates[this.index];
  const a=this.previous.clone().sub(gate.position).dot(gate.normal),b=journey.position.clone().sub(gate.position).dot(gate.normal);
  if(a<=0&&b>0){
   const hit=this.previous.clone().lerp(journey.position,-a/(b-a));
   if(hit.distanceTo(gate.position)<=this.ringRadius-.35){
    const perfect=hit.distanceTo(gate.position)<1.35;
    this.combo=perfect?this.combo+1:0;this.points+=(perfect?250:100)*Math.min(4,Math.max(1,this.combo));
    if(gate.booster)this.turbo=1.8;
    this.event=gate.booster?'BOOST RING!':perfect?'PERFECT / x'+Math.min(4,this.combo):'RING CLEARED!';
    this.index++;this.flash=.7;this.paint();
    if(this.index===this.gates.length){this.state='finished';this.confetti.position.copy(gate.position);this.celebration=0;if(!this.best||this.score<this.best){this.best=this.score;try{globalThis.localStorage?.setItem('elysia-rings-best-v4',String(this.best));}catch{}}}
   }
  }
  this.previous.copy(journey.position);
 }
 get diagnostics(){return {state:this.state,checkpoint:this.index,total:this.gates.length,time:this.score,best:this.best,penalties:this.penalties,points:this.points,combo:this.combo,turbo:this.turbo};}
}
