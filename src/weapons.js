import * as THREE from 'three';
import {terrainHeight,terrainColor} from './terrain.js';
import {addCrater,craterCount} from './deformation.js';
export class PulseCannons{
 constructor(scene,ship,terrain,scenery,center,radius){
  Object.assign(this,{scene,ship,terrain,scenery,center,radius});this.cooldown=0;this.effects=[];this.projectiles=[];this.shipVelocity=new THREE.Vector3();this.aimPoint=null;this.status='READY';this.hits=0;
  this.muzzles=[];
  const housing=new THREE.MeshStandardMaterial({color:0x202b35,metalness:.75,roughness:.48});
  const emitter=new THREE.MeshBasicMaterial({color:new THREE.Color(.08,1.1,1.7)});
  for(const x of [-1.55,1.55]){
   const gun=new THREE.Mesh(new THREE.CylinderGeometry(.11,.17,1.65,8),housing);gun.rotation.x=Math.PI/2;gun.position.set(x,-.25,-.6);ship.add(gun);
   const tip=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.12,8),emitter);tip.rotation.x=Math.PI/2;tip.position.set(x,-.25,-1.48);ship.add(tip);this.muzzles.push(tip);
  }
  // Index triangles by surface direction so impacts only update nearby faces.
  this.cells=new Map();const p=terrain.geometry.attributes.position;
  this.normals=new Float32Array(p.count*3);const n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){n.fromBufferAttribute(p,i).normalize();this.normals.set(n.toArray(),i*3);}
  for(let i=0;i<p.count;i+=3){n.fromArray(this.normals,i*3);const key=this.key(n);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(i);}
 }
 key(n){return `${Math.floor(n.x*24)},${Math.floor(n.y*24)},${Math.floor(n.z*24)}`;}
 surfaceDistance(p){const n=p.clone().sub(this.center).normalize();return p.distanceTo(this.center)-this.radius-Math.max(-7.975,terrainHeight(n));}
 rayHit(origin,direction,maxDistance=220){
  if(maxDistance<=0)return null;
  const offset=origin.clone().sub(this.center),b=offset.dot(direction),c=offset.lengthSq()-(this.radius+1)**2,disc=b*b-c;
  if(disc<0)return null;
  const near=-b-Math.sqrt(disc),far=-b+Math.sqrt(disc);
  if(far<0||near>maxDistance)return null;
  if(this.surfaceDistance(origin)<=0)return origin.clone();
  let last=Math.max(0,near-.1),distance=Math.min(last+.2,maxDistance);
  while(true){
   const p=origin.clone().addScaledVector(direction,distance);
   if(this.surfaceDistance(p)<=0){
    let lo=last,hi=distance;
    for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(this.surfaceDistance(origin.clone().addScaledVector(direction,mid))>0)lo=mid;else hi=mid;}
    return origin.clone().addScaledVector(direction,(lo+hi)/2);
   }
   if(distance>=maxDistance)break;
   last=distance;distance=Math.min(maxDistance,distance+.2);
  }return null;
 }
 updateAim(camera,journey){
  this.ship.updateWorldMatrix(true,true);
  const origin=this.muzzles[0].getWorldPosition(new THREE.Vector3()).add(this.muzzles[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(this.ship.getWorldQuaternion(new THREE.Quaternion()));
  this.aimPoint=this.rayHit(origin,direction,180);
  this.enemyTarget=this.combat?.aimTarget(origin,direction);
  if(this.enemyTarget){const targetDistance=origin.distanceTo(this.enemyTarget.root.position);if(!this.rayHit(origin,this.enemyTarget.root.position.clone().sub(origin).normalize(),targetDistance))this.aimPoint=this.enemyTarget.root.position.clone();else this.enemyTarget=null;}
  this.aimPreview=this.aimPoint??origin.clone().addScaledVector(direction,60);
 }
 deform(point){
  const n=point.clone().sub(this.center).normalize();
  if(terrainHeight(n)<=-7.97){this.status='WATER IMPACT';return false;}
  const crater=addCrater(n);if(!crater){this.status='CRATER LIMIT';return false;}
  const g=this.terrain.geometry,p=g.attributes.position,c=g.attributes.color,e=g.attributes.terrainEmission,normal=g.attributes.normal;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),d=new THREE.Vector3(),face=new THREE.Vector3(),color=new THREE.Color();
  const origin=[Math.floor(n.x*24),Math.floor(n.y*24),Math.floor(n.z*24)];
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
   const faces=this.cells.get(`${origin[0]+x},${origin[1]+y},${origin[2]+z}`);if(!faces)continue;
   for(const i of faces){a.fromArray(this.normals,i*3);if(a.dot(n)<1-Math.pow((crater.radius+1.4)/65,2)/2)continue;
    for(let j=0;j<3;j++){a.fromArray(this.normals,(i+j)*3);d.copy(a).multiplyScalar(this.radius+terrainHeight(a));p.setXYZ(i+j,d.x,d.y,d.z);terrainColor(a,color);c.setXYZ(i+j,color.r,color.g,color.b);e.setXYZ(i+j,0,0,0);}
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);d.fromBufferAttribute(p,i+2);face.subVectors(b,a).cross(d.sub(a)).normalize();
    for(let j=0;j<3;j++)normal.setXYZ(i+j,face.x,face.y,face.z);
    for(const attr of [p,c,e,normal])attr.addUpdateRange(i*3,9);
   }
  }
  for(const attr of [p,c,e,normal])attr.needsUpdate=true;
  const matrix=new THREE.Matrix4(),location=new THREE.Vector3();
  this.scenery.traverse(mesh=>{if(!mesh.isInstancedMesh)return;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);location.setFromMatrixPosition(matrix);if(location.distanceTo(point)<crater.radius){matrix.makeScale(0,0,0);mesh.setMatrixAt(i,matrix);}}mesh.instanceMatrix.needsUpdate=true;});
  this.status='TERRAIN IMPACT';this.hits++;return true;
 }
 fire(){
  if(this.cooldown>0)return;this.cooldown=.18;
  this.ship.updateWorldMatrix(true,true);
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(this.ship.getWorldQuaternion(new THREE.Quaternion())).normalize();
  if(this.enemyTarget&&!this.enemyTarget.dead){
   const origin=this.ship.getWorldPosition(new THREE.Vector3());
   const lead=this.enemyTarget.root.position.clone().addScaledVector(this.enemyTarget.velocity,origin.distanceTo(this.enemyTarget.root.position)/(90+this.shipVelocity.length()));
   const assisted=lead.sub(origin).normalize();if(assisted.dot(direction)>.97)direction.copy(assisted);
  }
  const launchVelocity=direction.clone().multiplyScalar(90).add(this.shipVelocity);
  const launchSpeed=launchVelocity.length(),launchDirection=launchVelocity.normalize();
  const scale=this.ship.getWorldScale(new THREE.Vector3()).x;
  for(const muzzle of this.muzzles){
   const from=muzzle.getWorldPosition(new THREE.Vector3()).addScaledVector(direction,.1*scale);
   const width=Math.max(.025,.07*scale),length=Math.max(1.2,launchSpeed*.025);
   const bolt=new THREE.Mesh(new THREE.CylinderGeometry(width,width,length,6),new THREE.MeshBasicMaterial({color:0x7ef5ff,toneMapped:false}));
   bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),launchDirection);
   bolt.position.copy(from).addScaledVector(launchDirection,-length*.5);this.scene.add(bolt);
   this.projectiles.push({mesh:bolt,position:from,direction:launchDirection.clone(),speed:launchSpeed,life:Math.min(7,360/launchSpeed),length});
   const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.14*scale,1),new THREE.MeshBasicMaterial({color:0xbaffff,transparent:true,opacity:.8,toneMapped:false}));
   flash.position.copy(from);this.scene.add(flash);this.effects.push({mesh:flash,life:.07,total:.07,burst:false});
  }
  this.status='FIRING';
 }
 impact(point){
  const land=this.deform(point);
  const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:land?0xffac61:0x79d8ff,transparent:true,opacity:.65,depthWrite:false,wireframe:!land}));
  flash.position.copy(point);flash.scale.setScalar(.08);this.scene.add(flash);this.effects.push({mesh:flash,life:.38,total:.38,burst:true});
 }
 update(dt,firing){
  this.cooldown=Math.max(0,this.cooldown-dt);if(firing)this.fire();
  for(let i=this.projectiles.length-1;i>=0;i--){
   const bolt=this.projectiles[i],travel=bolt.speed*Math.min(dt,bolt.life);
   const hit=this.rayHit(bolt.position,bolt.direction,travel);
   const enemyHit=this.combat?.raycastEnemies(bolt.position,bolt.direction,travel);
   bolt.life-=dt;
   if(enemyHit&&(!hit||enemyHit.distance<hit.distanceTo(bolt.position))){this.combat.damageEnemy(enemyHit.enemy,22,enemyHit.point);bolt.life=0;this.status='ENEMY HIT';}
   else if(hit){this.impact(hit);bolt.life=0;}
   else{bolt.position.addScaledVector(bolt.direction,travel);bolt.mesh.position.copy(bolt.position).addScaledVector(bolt.direction,-bolt.length*.5);}
   if(bolt.life<=0){this.scene.remove(bolt.mesh);bolt.mesh.geometry.dispose();bolt.mesh.material.dispose();this.projectiles.splice(i,1);}
  }
  for(let i=this.effects.length-1;i>=0;i--){const effect=this.effects[i];effect.life-=dt;effect.mesh.material.opacity=Math.max(0,effect.life/effect.total)*.8;if(effect.burst)effect.mesh.scale.setScalar(.08+(1-effect.life/effect.total)*.7);if(effect.life<=0){this.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();this.effects.splice(i,1);}}
 }
 clearEffects(){for(const e of [...this.effects,...this.projectiles]){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects=[];this.projectiles=[];this.cooldown=0;}
 get diagnostics(){return {craters:craterCount(),hits:this.hits,projectiles:this.projectiles.length,status:this.status};}
}
