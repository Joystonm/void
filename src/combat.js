import * as THREE from 'three';
import {terrainHeight} from './terrain.js';
export class AtmosphereCombat{
 constructor(scene,center,radius){Object.assign(this,{scene,center,radius});this.templates=null;this.loadingError=false;this.enemies=[];this.bolts=[];this.effects=[];this.reset();}
 setTemplates(templates){this.templates=templates;}
 reset(){
  for(const enemy of this.enemies??[])this.removeEnemy(enemy);
  for(const item of [...(this.bolts??[]),...(this.effects??[])]){this.scene.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();}
  this.enemies=[];this.bolts=[];this.effects=[];this.shield=100;this.hull=100;this.kills=0;this.time=0;this.lastDamage=-10;this.spawned=false;this.active=false;this.wave=0;this.nextWaveAt=0;this.pending=[];this.nextEnemyId=0;this.maxActive=24;
 }
 get destroyed(){return this.hull<=0;}
 removeEnemy(enemy){this.scene.remove(enemy.root);for(const record of enemy.fadeMaterials??[])record.material.dispose();if(enemy.engine)enemy.engine.geometry.dispose();if(enemy.trail)enemy.trail.geometry.dispose();}
 get aliveCount(){return this.enemies.filter(e=>!e.dead).length;}
 get inboundCount(){return this.enemies.filter(e=>!e.dead&&e.state==='INBOUND').length;}
 get engagedCount(){return this.enemies.filter(e=>!e.dead&&e.state==='ENGAGING').length;}
 get incomingCount(){return this.pending.reduce((sum,batch)=>sum+batch.remaining,0);}
 get secondsToWave(){return Math.max(0,Math.ceil(this.nextWaveAt-this.time));}
 queueWave(){
  this.wave++;this.spawned=true;
  this.pending.push({tier:this.wave,total:Math.min(24,5+(this.wave-1)*2),remaining:Math.min(24,5+(this.wave-1)*2),nextLaunchAt:this.time});
  this.nextWaveAt=this.time+Math.max(18,25-Math.floor(this.wave/3));
 }
 spawn(journey){
  if(!this.templates)return;
  if(this.wave===0)this.queueWave();
  if(this.time>=this.nextWaveAt)this.queueWave();
  const kept=[];for(const e of this.enemies){if(e.dead)this.removeEnemy(e);else kept.push(e);}this.enemies=kept;
  const forward=journey.forward.clone().projectOnPlane(journey.normal).normalize(),right=new THREE.Vector3().crossVectors(forward,journey.normal).normalize();
  while(this.pending.length&&this.aliveCount<this.maxActive){
   const batch=this.pending[0];if(this.time<batch.nextLaunchAt)break;
   const slot=batch.total-batch.remaining,tier=batch.tier;
   const heavy=tier>=3&&slot%5===0,frigate=heavy||slot%Math.max(2,5-Math.floor(tier/3))===0;
   const size=heavy?3.2:frigate?2.3:1.7;
   const hp=Math.round((heavy?440:frigate?220:132)*(1+(tier-1)*.32));
   const root=new THREE.Group(),model=this.templates[heavy?Math.min(2,this.templates.length-1):frigate?1:0].clone(true);root.add(model);root.scale.setScalar(size);
   const fadeMaterials=[];
   model.traverse(o=>{if(!o.isMesh)return;const original=Array.isArray(o.material)?o.material:[o.material];const copied=original.map(m=>m.clone());o.material=Array.isArray(o.material)?copied:copied[0];for(const material of copied)fadeMaterials.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});});
   const engine=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:heavy?0xffb34f:0xff5e38}));engine.position.z=.46;root.add(engine);fadeMaterials.push({material:engine.material,opacity:1,transparent:false,depthWrite:true});
   const trail=new THREE.Mesh(new THREE.CylinderGeometry(.015,.065,1.8,6),new THREE.MeshBasicMaterial({color:0xff9d64,transparent:true,opacity:.48,depthWrite:false}));trail.rotation.x=Math.PI/2;trail.position.z=1.25;root.add(trail);fadeMaterials.push({material:trail.material,opacity:.48,transparent:true,depthWrite:false});
   for(const record of fadeMaterials){record.material.transparent=true;record.material.opacity=0;record.material.depthWrite=false;}
   const id=this.nextEnemyId++,phase=(id%7-3)*.34+(tier>=3?Math.floor(id%21/7)*2.1:0),range=14+(id%4)*3;
   const arrivalDistance=105+(slot%4)*10;
   root.position.copy(journey.position).addScaledVector(forward,Math.cos(phase)*arrivalDistance).addScaledVector(right,Math.sin(phase)*arrivalDistance).addScaledVector(journey.normal,16+(slot%3)*3);
   const approachTarget=journey.position.clone().addScaledVector(forward,Math.cos(phase)*range).addScaledVector(right,Math.sin(phase)*range);
   root.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(root.position,approachTarget,journey.normal));
   const n=root.position.clone().sub(this.center).normalize(),floor=this.radius+terrainHeight(n)+2;if(root.position.distanceTo(this.center)<floor)root.position.copy(this.center).addScaledVector(n,floor);
   this.scene.add(root);this.enemies.push({root,engine,trail,fadeMaterials,fadeRestored:false,opacity:0,arrivalAge:0,state:'INBOUND',flightSpeed:12,speedLimit:12,spawnDistance:root.position.distanceTo(journey.position),id,tier,phase,range,name:(heavy?'DREADNOUGHT':frigate?'WARDEN FRIGATE':'RAIDER')+' / T'+tier,hp,maxHP:hp,radius:size*.5,velocity:new THREE.Vector3(),fireIn:4+(slot%7)*.5,fireInterval:Math.max(.75,(heavy?2.8:frigate?2.6:2.3)/(1+(tier-1)*.10)),damage:Math.round((heavy?19:frigate?12:8)*(1+(tier-1)*.12)),boltSpeed:Math.min(32,18+tier*.7),moveSpeed:(heavy?1.7:2.1)+Math.min(2,tier*.14),dead:false});
   batch.remaining--;batch.nextLaunchAt=this.time+.55;if(batch.remaining===0)this.pending.shift();
  }
  if(this.aliveCount===0&&this.pending.length===0)this.nextWaveAt=Math.min(this.nextWaveAt,this.time+5);
 }
 raycastEnemies(origin,direction,distance){
  let nearest=null;
  for(const enemy of this.enemies){if(enemy.dead||!enemy.root.visible)continue;const offset=origin.clone().sub(enemy.root.position),b=offset.dot(direction),c=offset.lengthSq()-enemy.radius*enemy.radius,disc=b*b-c;if(disc<0)continue;const t=c<=0?0:-b-Math.sqrt(disc);if(t>=0&&t<=distance&&(!nearest||t<nearest.distance))nearest={enemy,distance:t,point:origin.clone().addScaledVector(direction,t)};}
  return nearest;
 }
 aimTarget(origin,forward){
  if(!this.active)return null;
  let target=null,best=.982;
  for(const e of this.enemies){if(e.dead)continue;const offset=e.root.position.clone().sub(origin),distance=offset.length();if(distance>65||distance<1)continue;const alignment=offset.normalize().dot(forward);if(alignment>best){best=alignment;target=e;}}
  return target;
 }
 burst(point,size=1){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(size,1),new THREE.MeshBasicMaterial({color:0xff9b48,transparent:true,opacity:.8,wireframe:true,depthWrite:false}));mesh.position.copy(point);this.scene.add(mesh);this.effects.push({mesh,life:.7});}
 damageEnemy(enemy,damage,point){if(enemy.dead)return;enemy.hp=Math.max(0,enemy.hp-damage);this.burst(point,.15);if(enemy.hp===0){enemy.dead=true;enemy.root.visible=false;this.kills++;this.burst(enemy.root.position,enemy.radius);if(this.aliveCount===0&&this.pending.length===0)this.nextWaveAt=Math.min(this.nextWaveAt,this.time+5);}}
 damagePlayer(damage){const absorbed=Math.min(this.shield,damage);this.shield-=absorbed;this.hull=Math.max(0,this.hull-(damage-absorbed));this.lastDamage=this.time;}
 shoot(enemy,playerPosition,journey){
  const from=enemy.root.position.clone(),distance=from.distanceTo(playerPosition);
  const aim=playerPosition.clone().addScaledVector(journey.forward,journey.speed*distance/enemy.boltSpeed*.35);
  const right=new THREE.Vector3().crossVectors(journey.forward,journey.normal).normalize();aim.addScaledVector(right,Math.sin(this.time*2.1+enemy.id)*.55);
  const direction=aim.sub(from).normalize();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.65,6),new THREE.MeshBasicMaterial({color:0xff694b,toneMapped:false}));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);mesh.position.copy(from);this.scene.add(mesh);this.bolts.push({mesh,position:from,direction,life:5,speed:enemy.boltSpeed,damage:enemy.damage});
 }
 update(dt,journey,playerPosition,playerRadius,groundRay){
  this.active=journey.inside&&!this.destroyed;
  if(!this.active){for(const enemy of this.enemies)enemy.root.visible=false;for(const bolt of this.bolts){this.scene.remove(bolt.mesh);bolt.mesh.geometry.dispose();bolt.mesh.material.dispose();}this.bolts=[];for(const effect of this.effects){this.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();}this.effects=[];return;}
  this.time+=dt;this.spawn(journey);
  if(this.time-this.lastDamage>6)this.shield=Math.min(100,this.shield+dt*7);
  const forward=journey.forward.clone().projectOnPlane(journey.normal).normalize(),right=new THREE.Vector3().crossVectors(forward,journey.normal).normalize(),matrix=new THREE.Matrix4();
  for(const enemy of this.enemies){if(enemy.dead)continue;enemy.root.visible=true;
   enemy.arrivalAge+=dt;enemy.opacity=THREE.MathUtils.smoothstep(enemy.arrivalAge,0,1.8);
   for(const record of enemy.fadeMaterials){record.material.opacity=record.opacity*enemy.opacity;if(enemy.opacity>=1&&!enemy.fadeRestored){record.material.transparent=record.transparent;record.material.depthWrite=record.depthWrite;record.material.needsUpdate=true;}}
   if(enemy.opacity>=1)enemy.fadeRestored=true;
   const angle=enemy.phase+Math.sin(this.time*.22+enemy.id*1.8)*.3,range=enemy.range;
   const desired=journey.position.clone().addScaledVector(forward,Math.cos(angle)*range).addScaledVector(right,Math.sin(angle)*range);
   const normal=desired.clone().sub(this.center).normalize();const floor=this.radius+terrainHeight(normal)+1.6;
   if(desired.distanceTo(this.center)<floor)desired.copy(this.center).addScaledVector(normal,floor);
   const delta=desired.clone().sub(enemy.root.position);
   const remaining=delta.length();
   if(enemy.state==='INBOUND'&&remaining<5&&enemy.root.position.distanceTo(playerPosition)<35){enemy.state='ENGAGING';enemy.fireIn=1.25+(enemy.id%3)*.25;}
   const cruise=enemy.moveSpeed+journey.speed*.75;
   const approachSpeed=THREE.MathUtils.lerp(cruise,12+journey.speed,THREE.MathUtils.smoothstep(remaining,5,35));
   enemy.speedLimit=enemy.state==='INBOUND'?approachSpeed:cruise;
   enemy.flightSpeed=THREE.MathUtils.damp(enemy.flightSpeed,enemy.speedLimit,2,dt);
   const step=Math.min(remaining,dt*enemy.flightSpeed);enemy.velocity.copy(delta).normalize().multiplyScalar(step/Math.max(dt,.001));enemy.root.position.addScaledVector(enemy.velocity,dt);
   const currentNormal=enemy.root.position.clone().sub(this.center).normalize(),currentFloor=this.radius+terrainHeight(currentNormal)+1.6;if(enemy.root.position.distanceTo(this.center)<currentFloor)enemy.root.position.copy(this.center).addScaledVector(currentNormal,currentFloor);
   const facing=enemy.state==='INBOUND'?desired:playerPosition;
   matrix.lookAt(enemy.root.position,facing,currentNormal);enemy.root.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(matrix),1-Math.exp(-4*dt));
   enemy.trail.visible=enemy.state==='INBOUND';
   if(enemy.state==='INBOUND')continue;
   enemy.fireIn-=dt;
   if(enemy.fireIn<=0){const direction=playerPosition.clone().sub(enemy.root.position).normalize(),distance=enemy.root.position.distanceTo(playerPosition);if(distance<45&&!groundRay(enemy.root.position,direction,distance))this.shoot(enemy,playerPosition,journey);enemy.fireIn=enemy.fireInterval;}
  }
  for(let i=this.bolts.length-1;i>=0;i--){const bolt=this.bolts[i],travel=bolt.speed*dt,ground=groundRay(bolt.position,bolt.direction,travel),groundDistance=ground?ground.distanceTo(bolt.position):Infinity;
   const offset=bolt.position.clone().sub(playerPosition),b=offset.dot(bolt.direction),c=offset.lengthSq()-playerRadius*playerRadius,disc=b*b-c,t=disc<0?Infinity:c<=0?0:-b-Math.sqrt(disc);
   if(t>=0&&t<=travel&&t<groundDistance){this.damagePlayer(bolt.damage);bolt.life=0;}else if(ground)bolt.life=0;else{bolt.position.addScaledVector(bolt.direction,travel);bolt.mesh.position.copy(bolt.position);}
   bolt.life-=dt;if(bolt.life<=0){this.scene.remove(bolt.mesh);bolt.mesh.geometry.dispose();bolt.mesh.material.dispose();this.bolts.splice(i,1);}
  }
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.mesh.scale.multiplyScalar(1+dt*1.5);e.mesh.material.opacity=Math.max(0,e.life);if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);}}
 }
 get diagnostics(){return {active:this.active,ready:!!this.templates,shield:this.shield,hull:this.hull,kills:this.kills,wave:this.wave,incoming:this.incomingCount,approaching:this.inboundCount,engaged:this.engagedCount,nextWaveSeconds:this.secondsToWave,activeLimit:this.maxActive,enemies:this.enemies.map(e=>({id:e.id,state:e.state,opacity:e.opacity,spawnDistance:e.spawnDistance,hp:e.hp,tier:e.tier,damage:e.damage,fireInterval:e.fireInterval,position:e.root.position.toArray()})),enemyProjectiles:this.bolts.length};}
}
