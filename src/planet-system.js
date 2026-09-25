import * as THREE from 'three';
import {gardenColor} from './elysia.js';
import {aureliaSignals} from './terrain.js';
export const planetLocations={aurelia:new THREE.Vector3(40,-32,-150),elysia:new THREE.Vector3(-420,150,-820)};
export function createCompanionPlanet(scene,peaceful){
 const id=peaceful?'aurelia':'elysia',name=peaceful?'AURELIA VEIL':'ELYSIA';
 const center=planetLocations[id],radius=65;
 const root=new THREE.Group();root.name=name;root.position.copy(center);scene.add(root);
 const geometry=new THREE.SphereGeometry(radius,96,64),positions=geometry.attributes.position;
 const colors=[],n=new THREE.Vector3(),color=new THREE.Color();
 const ocean=new THREE.Color('#073954'),land=new THREE.Color('#146779'),ridge=new THREE.Color('#493f75'),ice=new THREE.Color('#7a8fab');
 for(let i=0;i<positions.count;i++){
  n.fromBufferAttribute(positions,i).normalize();
  if(id==='elysia')gardenColor(n,color);
  else{const t=aureliaSignals(n);color.copy(ocean).lerp(land,t.land*.78).lerp(ridge,t.highlands*.65).lerp(ice,t.ice*.5);}
  colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85})));
 const rim=new THREE.Mesh(new THREE.SphereGeometry(radius*1.025,64,32),new THREE.ShaderMaterial({
  vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 n;varying vec3 eye;void main(){float a=pow(1.-max(0.,dot(normalize(n),normalize(eye))),5.);gl_FragColor=vec4(.12,.8,1.,a*.7);}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
 }));root.add(rim);
 if(id==='aurelia'){
  const rings=new THREE.Mesh(new THREE.RingGeometry(86,108,192),new THREE.MeshBasicMaterial({color:0xa62e8f,side:THREE.DoubleSide,transparent:true,opacity:.35,depthWrite:false}));
  rings.rotation.set(-Math.PI/2+.24,0,-.2);root.add(rings);
 }
 return {id,name,center,radius,root};
}
