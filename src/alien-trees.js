import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small reusable models: all trees of a species share three instanced draws.
function treeModel(species){
 const wood=[],leaves=[],buds=[];
 const up=new THREE.Vector3(0,1,0);
 function limb(a,b,base,tip){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
  const g=new THREE.CylinderGeometry(tip,base,direction.length(),6,1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray());wood.push(g);
 }
 function crown(x,y,z,sx,sy,sz,angle=0){
  const g=new THREE.IcosahedronGeometry(1,1);
  // Gently scalloped crowns keep an organic edge even at low polygon counts.
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(p,i);
   const ripple=1+.065*Math.sin(v.x*11+v.z*7+v.y*5);
   p.setXYZ(i,v.x*ripple,v.y*ripple,v.z*ripple);
  }
  g.scale(sx,sy,sz);g.rotateY(angle);g.translate(x,y,z);g.computeVertexNormals();leaves.push(g);
 }
 function bud(x,y,z){
  const g=new THREE.IcosahedronGeometry(1,0);g.scale(.024,.047,.024);g.translate(x,y,z);buds.push(g);
 }
 // Flared roots meet the ground; the bent trunk splits into visible boughs.
 for(let j=0;j<3;j++){
  const a=j*Math.PI*2/3;
  limb([Math.cos(a)*.105,-.018,Math.sin(a)*.105],[0,.15,0],.021,.03);
 }
 limb([0,0,0],[.035,.27,-.014],.052,.035);
 limb([.035,.27,-.014],[-.018,.51,.015],.035,.022);
 if(species===0){
  limb([-.018,.51,.015],[.035,.72,0],.022,.012);
  crown(.035,.75,0,.34,.12,.29);
  for(let j=0;j<3;j++){
   const a=j*2.4,x=Math.cos(a)*.21,z=Math.sin(a)*.21,y=.49+j*.045;
   limb([.015,.32,0],[x,y,z],.025,.011);
   crown(x,y+.05,z,.21,.095,.18,a);bud(x,y-.055,z);
  }
 }else if(species===1){
  for(let j=0;j<4;j++){
   const a=j*2.4,x=Math.cos(a)*.19,z=Math.sin(a)*.19,y=.43+j*.085;
   limb([.02,.26+j*.045,0],[x,y,z],.024,.01);
   crown(x,y+.065,z,.18,.15,.16,a);bud(x*.9,y-.075,z*.9);
  }
  crown(-.018,.79,.015,.17,.18,.16);
 }else{
  limb([-.018,.51,.015],[.025,.98,0],.022,.006);
  for(let j=0;j<4;j++){
   const y=.42+j*.16,s=.24-j*.046;
   crown(.02*Math.sin(j*2),y,0,s,.15,s*.82,j);
   bud(s*.7,y-.055,0);
  }
  crown(.025,1.02,0,.063,.17,.06);
 }
 return [wood,leaves,buds].map(parts=>{
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());return merged;
 });
}

export function addAlienTrees(group,data,center,radius,{blossom=false}={}){
 const palettes=blossom?['#45bfa6','#ed9fbd','#90bcc1']:['#318f82','#b77f9c','#79a7a0'];
 const materials=[
  new THREE.MeshStandardMaterial({color:'#a79382',roughness:.94}),
  new THREE.MeshStandardMaterial({roughness:.82,flatShading:true}),
  new THREE.MeshStandardMaterial({color:'#ffdc9a',emissive:'#efae61',emissiveIntensity:.35,roughness:.6})
 ];
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),color=new THREE.Color();
 const buckets=[[],[],[]];
 data.forEach((p,i)=>buckets[(p.i??i)%3].push(p));
 buckets.forEach((trees,species)=>{
  if(!trees.length)return;
  treeModel(species).forEach((geometry,part)=>{
   const mesh=new THREE.InstancedMesh(geometry,materials[part],trees.length);
   mesh.name=['Alien tree branches','Alien tree crowns','Alien tree seed pods'][part];
   trees.forEach((p,i)=>{
    const seed=p.i??p.a;
    const size=.72+.43*(.5+.5*Math.sin(seed*73.1));
    dummy.position.copy(center).addScaledVector(p.n,radius+p.h);
    dummy.quaternion.setFromUnitVectors(up,p.n);dummy.rotateY(p.a);
    dummy.scale.set(size*(.9+.15*Math.sin(seed*3)**2),size,size);
    dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    if(part===1){
     color.set(palettes[species]).offsetHSL(.025*Math.sin(seed*2),0,.035*Math.sin(seed*5));
     mesh.setColorAt(i,color);
    }
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
  });
 });
}