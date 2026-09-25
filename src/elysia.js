import * as THREE from 'three';
const smooth=THREE.MathUtils.smoothstep;
const origin=new THREE.Vector3(-.65,.52,.55).normalize();
const forward=new THREE.Vector3(0,0,-1).projectOnPlane(origin).normalize();
const right=new THREE.Vector3().crossVectors(forward,origin).normalize();
const palette=['#329e83','#81b875','#eddbac','#6a8390','#f0f5ed','#218da4'].map(c=>new THREE.Color(c));
export function gardenSignals(n){
 const x=n.dot(right)*65,z=n.dot(forward)*65;
 const focus=smooth(n.dot(origin),.45,.85);
 const rolling=.5+.5*Math.sin(n.x*23+n.z*11)*Math.cos(n.y*19-n.z*13);
 const broad=Math.sin(n.x*6+n.z*3)+Math.cos(n.y*7-n.z*4);
 const land=THREE.MathUtils.lerp(smooth(broad,-.8,-.1),smooth(z,-30,-23),focus);
 const riverDistance=Math.abs(x-2.4*Math.sin(z*.18)-.65*Math.sin(z*.43));
 const river=(1-smooth(riverDistance,.38,1.05))*focus;
 const ridge=Math.exp(-Math.pow((Math.abs(x)-12)/4.2,2))*(2.6+1.1*Math.sin(z*.17)**2);
 const mountains=THREE.MathUtils.lerp(Math.pow(.5+.5*Math.sin(n.x*11+n.y*8)*Math.cos(n.z*9),3)*3.5,ridge,focus);
 const height=land*(.15+rolling*.48+mountains)*(1-river);
 const ice=smooth(mountains,2.6,3.5),highlands=smooth(mountains,.8,2.8);
 const biome=land<.3?'Turquoise archipelago':river>.3?'Crystal river':ice>.4?'Pearl snow peaks':highlands>.45?'Alpine gardens':rolling>.6?'Blossom woodland':'Wildflower meadows';
 return {height,land,river,ice,highlands,mountains,rolling,dry:0,plateaus:0,volcanic:0,lava:0,biome};
}
export function gardenColor(n,out){
 const t=gardenSignals(n);
 out.copy(palette[0]).lerp(palette[1],t.rolling*.65).lerp(palette[2],1-smooth(t.height,.06,.3));
 out.lerp(palette[3],t.highlands*.7).lerp(palette[4],t.ice).lerp(palette[5],Math.max(1-t.land,t.river));
 return out;
}
export function addGarden(scene,center,radius){
 const group=new THREE.Group();group.name='Elysia forests and wildflowers';scene.add(group);
 const trees=[],flowers=[],rocks=[],n=new THREE.Vector3();
 for(let i=0;i<42000;i++){
  const y=1-(i+.5)*2/42000,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);n.set(Math.cos(a)*r,y,Math.sin(a)*r);
  const t=gardenSignals(n);if(t.height<.11)continue;
  const item={n:n.clone(),h:t.height-8,a,i};
  if(t.ice>.2||t.highlands>.5){if(i%5===0)rocks.push(item);}
  else if(Math.sin(n.x*91+n.z*47)+Math.cos(n.y*87)>.25&&i%2===0)trees.push(item);
  else if(i%2===0)flowers.push(item);
 }
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),color=new THREE.Color();
 function batch(data,geometry,kind){
  const material=new THREE.MeshStandardMaterial({roughness:kind==='flower'?.7:1,flatShading:true});
  const mesh=new THREE.InstancedMesh(geometry,material,data.length);
  data.forEach((p,i)=>{
   const s=.75+.5*(.5+.5*Math.sin(p.i*73.1));
   const canopy=kind==='canopy',trunk=kind==='trunk',flower=kind==='flower';
   dummy.position.copy(center).addScaledVector(p.n,radius+p.h+(canopy?.43:trunk?.2:flower?.065:.05)*s);
   dummy.quaternion.setFromUnitVectors(up,p.n);dummy.rotateY(p.a);
   dummy.scale.set(canopy?.29:trunk?.036:flower?.08:.15,canopy?.38:trunk?.4:flower?.065:.12,canopy?.29:trunk?.036:flower?.08:.12).multiplyScalar(s);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   color.set(canopy?(p.i%7<2?'#f6a7c6':p.i%3===0?'#74b88e':'#237d69'):trunk?'#775648':flower?['#ffd36d','#e896db','#c9b5ff','#f7ede0'][i%4]:'#92a7a6');
   color.multiplyScalar(.85+.25*(i%9)/8);mesh.setColorAt(i,color);
  });mesh.computeBoundingSphere();group.add(mesh);
 }
 batch(trees,new THREE.CylinderGeometry(1,1,1,5),'trunk');
 batch(trees,new THREE.IcosahedronGeometry(1,1),'canopy');
 batch(flowers,new THREE.IcosahedronGeometry(1,0),'flower');
 batch(rocks,new THREE.DodecahedronGeometry(1,0),'rock');
 group.userData={trees:trees.length,flowers:flowers.length,rocks:rocks.length};return group;
}

