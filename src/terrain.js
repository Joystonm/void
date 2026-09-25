import {addAlienTrees} from './alien-trees.js';
import {peaceful} from './world.js';
import {gardenSignals,gardenColor,addGarden} from './elysia.js';
import * as THREE from 'three';
import {craterDelta,craterScorch} from './deformation.js';
const smooth=THREE.MathUtils.smoothstep;
// A designed river valley around the approach, with broader geography beyond it.
const valleyOrigin=new THREE.Vector3(-.65,.52,.55).normalize();
const valleyForward=new THREE.Vector3(0,0,-1).projectOnPlane(valleyOrigin).normalize();
const valleyRight=new THREE.Vector3().crossVectors(valleyForward,valleyOrigin).normalize();
const volcano=valleyOrigin.clone().multiplyScalar(65).addScaledVector(valleyRight,-17).addScaledVector(valleyForward,18).normalize();
const colors={ocean:new THREE.Color('#176478'),desert:new THREE.Color('#a18b69'),canyon:new THREE.Color('#876b63'),valley:new THREE.Color('#507b68'),ice:new THREE.Color('#acb8c4'),volcanic:new THREE.Color('#3e3947'),highlands:new THREE.Color('#77718b')};
export function terrainSignals(n){
 return peaceful?gardenSignals(n):aureliaSignals(n);
}
export function aureliaSignals(n){
 const x=n.dot(valleyRight)*65,z=n.dot(valleyForward)*65;
 const focus=smooth(n.dot(valleyOrigin),.55,.85);
 const rolling=.5+.5*Math.sin(n.x*12+n.z*7)*Math.cos(n.y*10-n.z*5);
 const broad=Math.sin(n.x*4+n.z*2)+Math.cos(n.y*5-n.z*3);
 const globalLand=smooth(broad,-1.35,-.35);
 const riverX=1.6*Math.sin(z*.16)+.5*Math.sin(z*.36);
 const bankDistance=Math.abs(x-riverX);
 const riverCore=1-smooth(bankDistance,.32,.8);
 const tributaryDistance=Math.abs(z+7-.6*x-.45*Math.sin(x*.5));
 const tributary=(1-smooth(tributaryDistance,.16,.4))*smooth(x,-.2,1)*(1-smooth(x,5,9));
 const river=Math.max(riverCore,tributary)*focus;
 const foothill=Math.exp(-Math.pow((bankDistance-9)/3.8,2));
 const localMountains=foothill*(2.7+.8*(.5+.5*Math.sin(z*.23+x*.1)));
 const globalMountains=Math.pow(.5+.5*Math.sin(n.x*8+n.y*6)*Math.cos(n.z*7),2)*1.7;
 const mountains=THREE.MathUtils.lerp(globalMountains,localMountains,focus);
 const dry=THREE.MathUtils.lerp(smooth(n.x*.6-n.y*.2+n.z*.3,.2,.65),smooth(x,13,22),focus);
 const dunes=.5+.5*Math.sin(x*1.8+Math.sin(z*.4)*1.2);
 const plateaus=smooth(Math.sin(z*.19+x*.14),.2,.8)*dry;
 const land=THREE.MathUtils.lerp(globalLand,smooth(z,-32,-25),focus);
 const ice=smooth(mountains,2.75,3.5)*smooth(Math.abs(n.y),.42,.85);
 const highlands=smooth(mountains,.7,2.1);
 let height=land*(.28+rolling*.22+mountains+dry*(.15+dunes*.16+plateaus*.3));
 height*=1-river;
 const d=Math.acos(THREE.MathUtils.clamp(n.dot(volcano),-1,1))*65;
 const volcanic=1-smooth(d,2.5,6);
 let lava=0;
 if(d<6){
  const cone=3.9*Math.exp(-d*d/11)-2.15*Math.exp(-d*d/1.0);
  height=THREE.MathUtils.lerp(height,.5+cone,volcanic);
  lava=1-smooth(d,.5,1.0);
 }
 const biome=land<.25?'Azure estuary':volcanic>.5?'Distant ember caldera':river>.4?'Jade river':ice>.55?'Snowcap ridge':highlands>.55?'Violet mountain range':dry>.65?'Saffron desert':'Emerald valley';
 return {height,land,dry,ice,rolling,plateaus,mountains,river:river*(1-volcanic),volcanic,lava,highlands,biome};
}
export function terrainHeight(n){return terrainSignals(n).height-8+craterDelta(n);}
export function terrainColor(n,out=new THREE.Color()){
 if(peaceful)return gardenColor(n,out);
 const t=terrainSignals(n);
 out.copy(colors.valley).lerp(colors.desert,t.dry);
 out.lerp(colors.canyon,t.dry*t.plateaus*.6);
 out.lerp(colors.highlands,t.highlands*.7);
 out.lerp(colors.ice,t.ice);
 out.lerp(colors.ocean,1-t.land);
 out.lerp(colors.ocean,t.river*.8);
 out.lerp(colors.volcanic,t.volcanic);
 if(t.lava>0)out.lerp(new THREE.Color('#ff5512'),t.lava);
 out.lerp(new THREE.Color('#29252b'),craterScorch(n));
 return out;
}
export function addSurfaceRocks(scene,center,radius){
 if(peaceful)return addGarden(scene,center,radius);
 const group=new THREE.Group();scene.add(group);
 const rockData=[],treeData=[];
 const normal=new THREE.Vector3();
 for(let i=0;i<18000;i++){
  const y=1-(i+.5)*2/18000,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));normal.set(Math.cos(a)*r,y,Math.sin(a)*r);
  const t=terrainSignals(normal);
  if(t.height<.12||t.lava>.01)continue;
  if(t.land>.8&&t.dry<.3&&t.ice<.2&&t.volcanic<.1&&t.river<.5&&t.highlands<.25&&(t.river>.02||Math.sin(i*.17)>.35)&&i%2===0)treeData.push({n:normal.clone(),h:t.height-8,a});
  else if(i%5===0)rockData.push({n:normal.clone(),h:t.height-8,a});
 }
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),c=new THREE.Color();
 function instances(data,geometry,material,type){
  const mesh=new THREE.InstancedMesh(geometry,material,data.length);
  data.forEach((p,i)=>{
   const size=.08+.09*(.5+.5*Math.sin(i*12.31));
   dummy.position.copy(center).addScaledVector(p.n,radius+p.h+(type==='canopy'?.40:type==='trunk'?.18:size*.25));
   dummy.quaternion.setFromUnitVectors(up,p.n);dummy.rotateY(p.a);
   if(type==='canopy')dummy.scale.set(.22,.3,.22);
   else if(type==='trunk')dummy.scale.set(.045,.36,.045);
   else dummy.scale.set(size*1.5,size*.7,size);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(type==='rock')terrainColor(p.n,c).multiplyScalar(.65);else c.set(type==='canopy'?0x2b746b:0x594a51).multiplyScalar(.8+.3*(i%7)/6);
   mesh.setColorAt(i,c);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
 }
 instances(rockData,new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),'rock');
 addAlienTrees(group,treeData,center,radius);

 group.userData={rocks:rockData.length,trees:treeData.length};return group;
}
