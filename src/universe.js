
import * as THREE from 'three';

// Bake the nebula once; flight only renders a textured sphere and point sprites.
function hash(x,y,z){
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);
 const mix=(p,q,t)=>p+(q-p)*t;
 return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),
  mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);
}
function cloud(x,y,z){
 let sum=0,weight=.55;
 for(let i=0;i<5;i++){sum+=noise(x,y,z)*weight;x=x*2.03+13.1;y=y*2.03-7.7;z=z*2.03+3.4;weight*=.48;}
 return sum;
}
export function createNebulaTexture(width=1024,height=512){
 const pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++){
  const theta=Math.PI*(1-y/(height-1)),sy=Math.cos(theta),ring=Math.sin(theta);
  for(let x=0;x<width;x++){
   const phi=x/(width-1)*Math.PI*2,sx=-Math.cos(phi)*ring,sz=Math.sin(phi)*ring;
   const broad=cloud(sx*2.4+4,sy*2.4,sz*2.4);
   const detail=cloud(sx*8,sy*8+17,sz*8);
   const latitude=sx*.35+sy*.91+sz*.22+(broad-.5)*.4;
   const band=Math.exp(-Math.pow(latitude/.24,2));
   const mist=Math.pow(Math.max(0,detail*1.65-.3),1.5);
   const cyan=Math.exp(-((sx+.4)**2+(sy-.15)**2+(sz+.9)**2)*4);
   const rose=Math.exp(-((sx-.55)**2+(sy-.3)**2+(sz+.75)**2)*3);
   const dust=THREE.MathUtils.smoothstep(cloud(sx*15+31,sy*15,sz*15),.49,.7);
   const density=(band*.9+cyan*.75+rose*.6)*mist*(1-dust*.65);
   const warm=THREE.MathUtils.clamp(rose*.9+(broad-.4)*1.2,0,1);
   const k=(y*width+x)*4;
   pixels[k]=Math.min(255,12+broad*10+density*(42+warm*112));
   pixels[k+1]=Math.min(255,18+broad*13+density*(88-warm*42));
   pixels[k+2]=Math.min(255,35+broad*24+density*(125-warm*10));
   pixels[k+3]=255;
  }
 }
 const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;return texture;
}
function galaxyTexture(){
 const size=192,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x/(size-1)-.5)*2,v=(y/(size-1)-.5)*2,r=Math.hypot(u,v),angle=Math.atan2(v,u);
  const arms=Math.pow(.5+.5*Math.cos(angle*2-r*19),5);
  const disk=Math.exp(-r*4)*( .22+arms*.78)*THREE.MathUtils.smoothstep(1-r,0,.25);
  const core=Math.exp(-r*r*95),k=(y*size+x)*4;
  pixels[k]=160+95*core;pixels[k+1]=185+60*core;pixels[k+2]=255-35*core;
  pixels[k+3]=Math.min(255,(disk*.85+core)*255);
 }
 const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
export function createUniverse(scene,pixelRatio=1){
 const root=new THREE.Group();root.name='Distant universe';scene.add(root);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1100,48,24),new THREE.MeshBasicMaterial({
  map:createNebulaTexture(),side:THREE.BackSide,depthWrite:false
 }));
 sky.renderOrder=-1000;root.add(sky);
 let seed=62891;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const count=6500,positions=[],colors=[],sizes=[],phases=[];
 const bandNormal=new THREE.Vector3(.35,.91,.22).normalize(),bandRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bandNormal);
 const direction=new THREE.Vector3(),color=new THREE.Color();
 for(let i=0;i<count;i++){
  const y=i<4500?random()*2-1:(random()-.5)*.35;
  const angle=random()*Math.PI*2,r=Math.sqrt(1-y*y);
  direction.set(Math.cos(angle)*r,y,Math.sin(angle)*r);if(i>=4500)direction.applyQuaternion(bandRotation);
  positions.push(...direction.multiplyScalar(1000).toArray());
  const tone=random();color.set(tone<.14?'#ffd8ad':tone<.48?'#a9d8ff':'#e6edff');
  color.multiplyScalar(.65+random()*1.4);colors.push(color.r,color.g,color.b);
  sizes.push(i%79===0?5+random()*3:1+Math.pow(random(),3)*2.4);phases.push(random()*Math.PI*2);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('starSize',new THREE.Float32BufferAttribute(sizes,1));
 geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
 const material=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},pixelRatio:{value:pixelRatio},visibility:{value:1}},
  vertexShader:`attribute vec3 color;attribute float starSize;attribute float phase;uniform float pixelRatio;uniform float time;varying vec3 starColor;
   void main(){starColor=color*(.92+.08*sin(time*.45+phase));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=starSize*pixelRatio;}`,
  fragmentShader:`varying vec3 starColor;uniform float visibility;
   void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;float glow=exp(-r*r*8.);float core=exp(-r*r*55.);
   gl_FragColor=vec4(starColor*(glow+core*.7)*visibility,1.);}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
 });
 const stars=new THREE.Points(geometry,material);stars.renderOrder=-990;stars.frustumCulled=false;root.add(stars);
 const galaxies=[],map=galaxyTexture();
 for(const [position,width,tilt] of [[[-.36,.22,-.91],100,-.45],[[.78,.4,.46],75,.6],[[-.65,-.28,.7],65,-.2]]){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,color:0xc4d8ff,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending,rotation:tilt}));
  sprite.position.fromArray(position).normalize().multiplyScalar(950);sprite.scale.set(width,width*.42,1);sprite.renderOrder=-980;root.add(sprite);galaxies.push(sprite);
 }
 return {
  update(camera,time,atmosphere=0){
   root.position.copy(camera.position);material.uniforms.time.value=time;
   material.uniforms.visibility.value=1-atmosphere*.65;sky.material.color.setScalar(1-atmosphere*.35);
   for(const galaxy of galaxies)galaxy.material.opacity=.75*(1-atmosphere*.7);
  },
  get diagnostics(){return {stars:count,galaxies:galaxies.length,background:'360-degree nebula',drawCalls:5};}
 };
}
