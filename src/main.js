import {GardenRace} from './racing.js';
import {selectDeformationWorld} from './deformation.js';
import {createCompanionPlanet,planetLocations} from './planet-system.js';
import {peaceful,worldName,selectWorld} from './world.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import shipUrl from '../Main.glb?url';
import { updateChaseCamera } from './camera.js';
import {createUniverse} from './universe.js';
import {PulseCannons} from './weapons.js';
import {AtmosphereCombat} from './combat.js';
import {loadEnemyTemplates} from './enemy-assets.js';
import {terrainColor,terrainSignals,addSurfaceRocks} from './terrain.js';
import { FlightJourney, METRES_PER_UNIT, terrainHeight } from './flight.js';
const $=id=>document.getElementById(id);
document.title='Void Explorer - '+worldName;
document.querySelector('.navigation h1').textContent=worldName;
const destinations=document.createElement('div');destinations.className='planet-destinations';
destinations.innerHTML='<small>CHOOSE YOUR DESTINATION</small><a href="?planet=aurelia">AURELIA VEIL <span>Ocean world / patrols</span></a><a href="?planet=elysia">ELYSIA <span>Garden world / peaceful exploration</span></a>';
$('menu').insertBefore(destinations,$('resume'));
destinations.querySelector(peaceful?'a:last-child':'a:first-of-type').setAttribute('aria-current','page');
const travel=document.createElement('button');travel.textContent='PLANETS';travel.onclick=()=>{keys.clear();rightFire=false;$('menu').showModal();};document.querySelector('.actions').prepend(travel);
const renderer=new THREE.WebGLRenderer({canvas:$('space'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x10182d);
const universe=createUniverse(scene,renderer.getPixelRatio());
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.1,2500);camera.position.set(0,3,19);camera.lookAt(0,0,-40);
const composer=new EffectComposer(renderer);
const samples=Math.min(4,renderer.capabilities.maxSamples);composer.renderTarget1.samples=samples;composer.renderTarget2.samples=samples;composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.68,.65,.85);composer.addPass(bloom);composer.addPass(new OutputPass());
let seed=417;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const planetCenter=planetLocations[peaceful?'elysia':'aurelia'].clone(),radius=65;
let companion=createCompanionPlanet(scene,peaceful);
const geometry=new THREE.IcosahedronGeometry(radius,150);const pos=geometry.attributes.position,colors=[],emissions=[];
const terrainNormal=new THREE.Vector3();
for(let i=0;i<pos.count;i++){terrainNormal.fromBufferAttribute(pos,i).normalize();terrainNormal.multiplyScalar(radius+terrainHeight(terrainNormal));pos.setXYZ(i,terrainNormal.x,terrainNormal.y,terrainNormal.z);}
geometry.computeVertexNormals();
const v=new THREE.Vector3(),faceColor=new THREE.Color();
for(let i=0;i<pos.count;i+=3){
 v.set(0,0,0);for(let j=0;j<3;j++)v.add(new THREE.Vector3().fromBufferAttribute(pos,i+j));v.normalize();
 terrainColor(v,faceColor).multiplyScalar(.94+rand()*.12);
 const lava=terrainSignals(v).lava;
 for(let j=0;j<3;j++){colors.push(faceColor.r,faceColor.g,faceColor.b);emissions.push(lava*3,lava*.35,lava*.015);}
}
geometry.setAttribute('terrainEmission',new THREE.Float32BufferAttribute(emissions,3));
geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const planet=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:.05,flatShading:true}));planet.position.copy(planetCenter);scene.add(planet);
// Round exterior and interior terrain use complementary opaque pixel masks.
const entryBlend={value:0};
function entryMaterial(material,interior){
 material.onBeforeCompile=shader=>{
  shader.uniforms.entryBlend=entryBlend;
  shader.fragmentShader='uniform float entryBlend;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
   if(${interior?'grain >= entryBlend':'grain < entryBlend'}) discard;`);
 };
 material.customProgramCacheKey=()=>interior?'entry-interior':'entry-exterior';
}
entryMaterial(planet.material,true);
const terrainCompile=planet.material.onBeforeCompile;
planet.material.onBeforeCompile=shader=>{
 terrainCompile(shader);
 shader.vertexShader='attribute vec3 terrainEmission; varying vec3 vTerrainEmission;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTerrainEmission=terrainEmission;');
 shader.fragmentShader='varying vec3 vTerrainEmission;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=vTerrainEmission;');
};
planet.material.customProgramCacheKey=()=> 'entry-terrain-lava';
const exteriorGeometry=new THREE.IcosahedronGeometry(radius,80);
const exteriorColors=[],exteriorPosition=exteriorGeometry.attributes.position;
const oceanColor=new THREE.Color('#073954'),landColor=new THREE.Color('#146779'),ridgeColor=new THREE.Color('#493f75');
const exteriorColor=new THREE.Color();
for(let i=0;i<exteriorPosition.count;i++){
 v.fromBufferAttribute(exteriorPosition,i).normalize();const geography=terrainSignals(v);
 exteriorColor.copy(oceanColor).lerp(landColor,geography.land*.78).lerp(ridgeColor,geography.highlands*.65);
 exteriorColor.lerp(new THREE.Color('#7a8fab'),geography.ice*.5);
 const detail=Math.sin(v.x*75+Math.sin(v.z*31))*Math.cos(v.y*63-v.z*19);
 exteriorColor.multiplyScalar(.97+detail*.035);
 if(peaceful)terrainColor(v,exteriorColor);
 exteriorColors.push(exteriorColor.r,exteriorColor.g,exteriorColor.b);
}
exteriorGeometry.setAttribute('color',new THREE.Float32BufferAttribute(exteriorColors,3));
const exterior=new THREE.Mesh(exteriorGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,flatShading:false}));
exterior.material.side=THREE.DoubleSide;
exterior.position.copy(planetCenter);entryMaterial(exterior.material,false);scene.add(exterior);
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.008,128,64),new THREE.ShaderMaterial({uniforms:{},vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 eye;void main(){float f=1.-max(0.,dot(normalize(n),normalize(eye)));float a=pow(f,8.);gl_FragColor=vec4(vec3(.025,.58,1.5)*a*2.,a*.85);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));atmosphere.position.copy(planetCenter);scene.add(atmosphere);
let surfaceRocks=addSurfaceRocks(scene,planetCenter,radius);
const water=new THREE.Mesh(new THREE.SphereGeometry(radius-8+.025,160,80),new THREE.MeshStandardMaterial({color:0x07566b,roughness:.3,metalness:.35}));water.position.copy(planetCenter);scene.add(water);
entryMaterial(water.material,true);surfaceRocks.traverse(o=>{if(o.material)entryMaterial(o.material,true);});
if(peaceful){water.material.color.set('#28b6be');water.material.roughness=.22;water.material.metalness=.15;}
const surfaceFill=new THREE.HemisphereLight(0xb2c8ef,0x4e224a,0);scene.add(surfaceFill);
// A volume visible from inside the atmosphere; the orbital rim alone is not a sky.
const skyMaterial=new THREE.ShaderMaterial({
  uniforms:{up:{value:new THREE.Vector3(0,1,0)},density:{value:0}},
  vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
  fragmentShader:`varying vec3 world;uniform vec3 up;uniform float density;void main(){vec3 ray=normalize(world-cameraPosition);float h=max(0.,dot(ray,up));vec3 horizon=vec3(.035,.23,.38);vec3 zenith=vec3(.006,.009,.045);vec3 col=mix(horizon,zenith,smoothstep(0.,.7,h));col+=vec3(.1,.012,.09)*pow(1.-h,8.);gl_FragColor=vec4(col,density*(.95-.22*h));}`,
  side:THREE.BackSide,transparent:true,depthWrite:false
});
const sky=new THREE.Mesh(new THREE.SphereGeometry(radius+22,64,32),skyMaterial);sky.position.copy(planetCenter);scene.add(sky);
const ringGroup=new THREE.Group();ringGroup.position.copy(planetCenter);ringGroup.rotation.set(.24,0,-.20);scene.add(ringGroup);
function ring(r,w,color,opacity){const g=new THREE.RingGeometry(r,r+w,512);g.rotateX(-Math.PI/2);const m=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});const mesh=new THREE.Mesh(g,m);ringGroup.add(mesh);}
for(let i=0;i<9;i++){const r=86+i*2.2+(i>4?4:0);ring(r,.13,i%3===0?new THREE.Color(2.4,.015,1.2):new THREE.Color(1.1,.008,.53),.8);ring(r-.5,1.2,0x9c086c,.10);ring(r-1.5,3.1,0x570639,.035);}
ring(85,26,0x570b46,.027);
if(peaceful)ringGroup.visible=false;
const ambient=new THREE.AmbientLight(0x6584ba,1.3);scene.add(ambient);const sun=new THREE.DirectionalLight(0x95e6ff,3.2);sun.position.set(-50,90,40);scene.add(sun);const violet=new THREE.DirectionalLight(0x8f3eac,1.4);violet.position.set(80,0,-70);scene.add(violet);

const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const ctx=glowCanvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.08,'rgba(255,255,255,.8)');grad.addColorStop(.22,'rgba(255,255,255,.2)');grad.addColorStop(.5,'rgba(255,255,255,.045)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const glowTexture=new THREE.CanvasTexture(glowCanvas);
function glow(color,size,parent,position,opacity=1){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);s.position.copy(position);parent.add(s);return s;}
function star(p,r,color){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,3),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(3)}));m.position.copy(p);scene.add(m);glow(color,r*13,scene,p,.65);}
star(new THREE.Vector3(66,47,-220),1.65,0xff5630);star(new THREE.Vector3(100,50,-240),2.65,0xffd252);
const flightRig=new THREE.Group();scene.add(flightRig);scene.add(camera);
const journey=new FlightJourney(planetCenter,radius);
const ship=new THREE.Group();ship.position.set(0,-2,0);flightRig.add(ship);const engines=[],engineLights=[],engineCores=[];let loaded=false;
new GLTFLoader().load(shipUrl,gltf=>{const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.sub(center);const pivot=new THREE.Group();pivot.add(model);pivot.scale.setScalar(5.8);ship.add(pivot);model.traverse(o=>{if(o.isMesh){o.material.metalness=.55;o.material.roughness=.48;}});for(const x of [-1.03,1.03]){const p=new THREE.Vector3(x,-.20,1.70);const engine=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),new THREE.MeshBasicMaterial({color:new THREE.Color(.08,2.5,4)}));engine.position.copy(p);ship.add(engine);engineCores.push(engine);engines.push(glow(0x22ceff,2.3,ship,p,.85));const light=new THREE.PointLight(0x16bfff,5,4);light.position.copy(p);ship.add(light);engineLights.push(light);}loaded=true;$('loading').style.opacity='0';setTimeout(()=>$('loading').remove(),1100);},undefined,error=>{$('loading').textContent='SPACECRAFT LOAD FAILED â€” RELOAD TO RETRY';console.error(error);});
const weapons=new PulseCannons(scene,ship,planet,surfaceRocks,planetCenter,radius);
const combat=new AtmosphereCombat(scene,planetCenter,radius);weapons.combat=combat;
if(!peaceful)loadEnemyTemplates().then(templates=>combat.setTemplates(templates)).catch(error=>{combat.loadingError=true;console.error('Enemy assets failed to load',error);});
let rightFire=false,aimPitch=0,aimYaw=0,missionComplete=false;
const keys=new Set();let paused=false,focusPaused=false,hud=true,elapsed=0,boost=0,returnAssist=false;
const orientation = new THREE.Matrix4();
const targetRotation = new THREE.Quaternion();
const worldShip = new THREE.Vector3();
const directionTarget = new THREE.Vector3();
const speedPositions = new Float32Array(90 * 6);
const motes = Array.from({length:90}, () => new THREE.Vector3((rand()-.5)*100,(rand()-.5)*65,-rand()*150));
const speedGeometry = new THREE.BufferGeometry();
speedGeometry.setAttribute('position',new THREE.BufferAttribute(speedPositions,3));
const speedMaterial = new THREE.LineBasicMaterial({color:0x6ac9e5,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending});
const speedLines = new THREE.LineSegments(speedGeometry,speedMaterial);
speedLines.frustumCulled=false;
flightRig.add(speedLines);
const phaseLabel=document.querySelector('.arrival');
phaseLabel.firstChild.textContent='ORBITAL APPROACH ';
const hint=document.createElement('div');hint.className='flight-hint';hint.textContent='W THRUST / S BRAKE / A D TURN / UP DOWN AIM';$('hud').append(hint);
const orbit={active:false,yaw:0,pitch:.18,zoom:1};
const weaponHud=document.createElement('div');weaponHud.className='weapon-hud';$('hud').append(weaponHud);
const combatHud=document.createElement('div');combatHud.className='combat-hud';$('hud').append(combatHud);
const missionHud=document.createElement('div');missionHud.className='mission-hud';$('hud').append(missionHud);
const race=new GardenRace(scene);
let raceVisitAsked=false;
const raceInvite=document.createElement('dialog');raceInvite.className='race-invite';
raceInvite.innerHTML='<small>WELCOME TO ELYSIA</small><h2>Ready for a ring rush?</h2><p>Follow the flowing dotted trail between distant rings. Hit the centers for combos and double rings for a burst of speed.</p><button type="button" class="invite-play">PLAY RING RUSH</button><button type="button" class="invite-explore">JUST EXPLORE</button><small>You can start later with B while inside Elysia.</small>';
$('flight').append(raceInvite);
let raceAudio=null;
function raceTone(frequency=660){if(!raceAudio||raceAudio.state!=='running')return;const oscillator=raceAudio.createOscillator(),gain=raceAudio.createGain();oscillator.connect(gain);gain.connect(raceAudio.destination);oscillator.frequency.setValueAtTime(frequency,raceAudio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(frequency*1.4,raceAudio.currentTime+.12);gain.gain.setValueAtTime(.035,raceAudio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,raceAudio.currentTime+.16);oscillator.start();oscillator.stop(raceAudio.currentTime+.17);}
raceInvite.querySelector('.invite-play').onclick=()=>{raceInvite.close();startRace();};
raceInvite.querySelector('.invite-explore').onclick=()=>{raceInvite.close();resumeFlight();};
raceInvite.addEventListener('cancel',e=>{e.preventDefault();raceInvite.close();resumeFlight();});
const racePanel=document.createElement('section');racePanel.className='race-panel';racePanel.hidden=true;
racePanel.innerHTML='<small>ELYSIA / SKY FESTIVAL</small><h2>RING RUSH</h2><p class="race-description">Center hits build combos. Double rings give a speed burst.</p><div class="race-stats"><strong class="race-time">00.00</strong><span class="race-progress">RING CHALLENGE</span></div><p class="race-message"></p><div class="race-buttons"><button type="button" class="race-start">START / B</button><button type="button" class="race-recover">REALIGN / T</button><button type="button" class="race-exit">LEAVE / X</button></div><small>W fly / A D or arrows steer / Q E height / S brake</small>';
$('hud').append(racePanel);
const raceBanner=document.createElement('div');raceBanner.className='race-banner';raceBanner.hidden=true;$('hud').append(raceBanner);
function startRace(){if(!peaceful||!journey.inside||!loaded||$('menu').open||raceInvite.open)return;try{raceAudio??=new (window.AudioContext||window.webkitAudioContext)();raceAudio.resume().catch(()=>{});}catch{}resetView();resumeFlight();returnAssist=false;weapons.clearEffects();race.start(journey);}
racePanel.querySelector('.race-start').onclick=startRace;
racePanel.querySelector('.race-recover').onclick=()=>{if(!paused&&!focusPaused)race.recover(journey);};
racePanel.querySelector('.race-exit').onclick=()=>race.cancel();
const markers=document.createElement('div');markers.className='enemy-markers';$('hud').append(markers);
const damageOverlay=document.createElement('div');damageOverlay.className='damage-overlay';$('flight').append(damageOverlay);
const defeated=document.createElement('div');defeated.className='defeated';defeated.hidden=true;defeated.innerHTML='<strong>VESSEL DISABLED</strong><p>Your expedition is still here. Retry the patrol with full shields.</p><button id="retryPatrol">RETRY PATROL / ENTER</button><button id="restartExpedition">RESTART EXPEDITION / R</button>';$('flight').append(defeated);
function retryPatrol(){combat.reset();combat.time=20;combat.startPatrol();journey.speed=0;journey.velocity.set(0,0,0);weapons.clearEffects();keys.clear();rightFire=false;paused=false;focusPaused=false;aimPitch=0;aimYaw=0;journey.dodgeTime=0;journey.dodgeCooldown=0;journey.strafeTime=0;defeated.hidden=true;resetView();}
$('retryPatrol').onclick=retryPatrol;$('restartExpedition').onclick=()=>reset();
const canvas=$('space');canvas.tabIndex=0;let dragPointer=null,lastPointerX=0,lastPointerY=0;
const pauseNotice=document.createElement('div');pauseNotice.className='pause-notice';pauseNotice.hidden=true;
pauseNotice.innerHTML='<strong>FLIGHT PAUSED</strong><p></p><button type="button">RESUME FLIGHT / SPACE</button>';$('flight').append(pauseNotice);
function resumeFlight(){paused=false;focusPaused=false;keys.clear();rightFire=false;clock.getDelta();canvas.focus({preventScroll:true});}
pauseNotice.querySelector('button').onclick=resumeFlight;
const flightKeys=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyZ','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyJ']);
canvas.addEventListener('pointerdown',()=>{if(!loaded||$('menu').open)return;focusPaused=false;canvas.focus({preventScroll:true});});
function activateOrbit(){
  if(orbit.active)return;
  const scale=.12+.88*THREE.MathUtils.smoothstep(journey.altitude,1,22);
  const local=flightRig.worldToLocal(camera.position.clone()).sub(new THREE.Vector3(0,-2*scale,0));
  orbit.yaw=Math.atan2(local.x,local.z);orbit.pitch=Math.asin(local.y/local.length());
  orbit.zoom=THREE.MathUtils.clamp(local.length()/(19*scale),.65,2.5);orbit.active=true;
}
function finishDrag(){
  if(dragPointer!==null&&canvas.hasPointerCapture(dragPointer))canvas.releasePointerCapture(dragPointer);
  dragPointer=null;canvas.classList.remove('dragging');
}
function resetView(){weapons.pointerAim=null;aimPitch=0;aimYaw=0;finishDrag();Object.assign(orbit,{active:false,yaw:0,pitch:.18,zoom:1});}
function pointAim(e){
 if(race.active||!loaded||paused||focusPaused||$('menu').open||combat.destroyed||orbit.active)return;
 const rect=canvas.getBoundingClientRect();
 weapons.pointerAim=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
}
canvas.addEventListener('pointermove',e=>{if(dragPointer===null&&e.pointerType!=='touch')pointAim(e);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button===2&&loaded&&!paused&&!$('menu').open&&!combat.destroyed){resetView();pointAim(e);rightFire=true;canvas.setPointerCapture(e.pointerId);e.preventDefault();}});
addEventListener('pointerup',e=>{if(e.button===2)rightFire=false;});
canvas.addEventListener('pointercancel',()=>{rightFire=false;});
addEventListener('blur',()=>{rightFire=false;});
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||race.active||$('menu').open||!loaded)return;
  weapons.pointerAim=null;activateOrbit();dragPointer=e.pointerId;lastPointerX=e.clientX;lastPointerY=e.clientY;
  canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==dragPointer)return;
  orbit.yaw-=(e.clientX-lastPointerX)*.006;
  orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+(e.clientY-lastPointerY)*.005,-1.45,1.45);
  lastPointerX=e.clientX;lastPointerY=e.clientY;
});
canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',finishDrag);
canvas.addEventListener('lostpointercapture',()=>{dragPointer=null;canvas.classList.remove('dragging');});
addEventListener('blur',finishDrag);
canvas.addEventListener('wheel',e=>{
  if(race.active||$('menu').open||!loaded)return;
  e.preventDefault();activateOrbit();orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(e.deltaY*.001),.65,2.5);
},{passive:false});
function reset(){
  race.cancel();raceVisitAsked=false;raceInvite.close();
  rightFire=false;aimPitch=0;aimYaw=0;missionComplete=false;weapons.clearEffects();combat.reset();returnAssist=false;markers.replaceChildren();resetView();journey.reset();paused=false;focusPaused=false;elapsed=0;boost=0;keys.clear();
  ship.position.set(0,-2,0);ship.scale.setScalar(1);ship.rotation.set(0,0,0);
  flightRig.position.set(0,0,0);flightRig.quaternion.identity();
  bloom.strength=.68;bloom.threshold=.85;
  camera.position.set(0,3,19);camera.lookAt(0,0,-40);camera.fov=53;camera.updateProjectionMatrix();
}
// Activate the complete world before the ship reaches its atmosphere.
function activateWorld(id){
 if(id===(peaceful?'elysia':'aurelia'))return;
 race.cancel();raceVisitAsked=false;raceInvite.close();
 weapons.clearEffects();combat.reset();missionComplete=false;rightFire=false;
 selectWorld(id);selectDeformationWorld();
 planetCenter.copy(planetLocations[id]);journey.center.copy(planetCenter);
 journey.inside=false;journey.entryProgress=0;journey.terrainFollowing=false;journey.contact=false;
 journey.normal.copy(journey.position).sub(planetCenter).normalize();
 for(const object of [planet,exterior,atmosphere,water,sky,ringGroup])object.position.copy(planetCenter);
 // The triangle topology is unchanged; rebuild heights, colors and emission.
 const p=geometry.attributes.position,c=geometry.attributes.color,e=geometry.attributes.terrainEmission;
 for(let i=0;i<p.count;i++){
  terrainNormal.fromArray(weapons.normals,i*3);
  const height=radius+terrainHeight(terrainNormal);
  p.setXYZ(i,terrainNormal.x*height,terrainNormal.y*height,terrainNormal.z*height);
 }
 for(let i=0;i<p.count;i+=3){
  v.set(0,0,0);for(let j=0;j<3;j++)v.add(terrainNormal.fromBufferAttribute(p,i+j));v.normalize();
  terrainColor(v,faceColor);const lava=terrainSignals(v).lava;
  for(let j=0;j<3;j++){c.setXYZ(i+j,faceColor.r,faceColor.g,faceColor.b);e.setXYZ(i+j,lava*3,lava*.35,lava*.015);}
 }
 p.needsUpdate=true;c.needsUpdate=true;e.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
 const ec=exteriorGeometry.attributes.color;
 for(let i=0;i<exteriorPosition.count;i++){
  v.fromBufferAttribute(exteriorPosition,i).normalize();
  if(peaceful)terrainColor(v,exteriorColor);
  else{const t=terrainSignals(v);exteriorColor.copy(oceanColor).lerp(landColor,t.land*.78).lerp(ridgeColor,t.highlands*.65);}
  ec.setXYZ(i,exteriorColor.r,exteriorColor.g,exteriorColor.b);
 }
 ec.needsUpdate=true;
 function disposeGroup(group){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 disposeGroup(surfaceRocks);surfaceRocks=addSurfaceRocks(scene,planetCenter,radius);
 surfaceRocks.traverse(o=>{if(o.material)entryMaterial(o.material,true);});weapons.scenery=surfaceRocks;
 disposeGroup(companion.root);companion=createCompanionPlanet(scene,peaceful);
 ringGroup.visible=!peaceful;water.material.color.set(peaceful?'#28b6dE':'#07566b');water.material.roughness=peaceful?.22:.3;water.material.metalness=peaceful?.15:.35;
 if(!peaceful&&!combat.templates)loadEnemyTemplates().then(t=>combat.setTemplates(t)).catch(error=>{combat.loadingError=true;console.error(error);});
 document.title='Void Explorer - '+worldName;document.querySelector('.navigation h1').textContent=worldName;
 for(const link of destinations.querySelectorAll('a')){link.removeAttribute('aria-current');if(link.search==='?planet='+id)link.setAttribute('aria-current','page');}
 const url=new URL(location.href);url.searchParams.set('planet',id);history.replaceState(null,'',url);
}
function toggleMenu(){if(raceInvite.open)return;keys.clear();rightFire=false;if($('menu').open)$('menu').close();else $('menu').showModal();}
$('menuButton').onclick=toggleMenu;$('resume').onclick=()=>{$('menu').close();resumeFlight();};$('reset').onclick=()=>{reset();$('menu').close();};function toggleHud(){hud=!hud;$('hud').classList.toggle('hidden',!hud);}$('photo').onclick=toggleHud;
addEventListener('keydown',e=>{if(raceInvite.open)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyJ'].includes(e.code))e.preventDefault();if(flightKeys.has(e.code)&&!document.hidden&&!$('menu').open)focusPaused=false;keys.add(e.code);if(e.repeat)return;
if(e.code==='KeyB'&&peaceful&&!paused&&!$('menu').open)startRace();
if(e.code==='KeyT'&&peaceful&&!paused&&!focusPaused&&!$('menu').open)race.recover(journey);
if(e.code==='KeyX'&&peaceful)race.cancel();
if(e.code==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(combat.destroyed)retryPatrol();else if(!paused&&!$('menu').open&&journey.inside)combat.startPatrol();}
if((e.code==='KeyZ'||e.code==='KeyC')&&!race.active&&!paused&&!$('menu').open&&!combat.destroyed)journey.dodge(e.code==='KeyZ'?-1:1);
if(e.code.startsWith('Arrow'))weapons.pointerAim=null;if(e.code==='KeyH')toggleHud();if(e.code==='Space'&&!$('menu').open){if(paused||focusPaused)resumeFlight();else paused=true;}if(e.code==='KeyR')reset();if(e.code==='KeyV')resetView();if(e.code==='KeyG'&&!journey.inside)returnAssist=!returnAssist;if(e.code==='Escape'){e.preventDefault();toggleMenu();}if(e.code==='KeyF'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(loaded)focusPaused=true;});
document.addEventListener('visibilitychange',()=>{keys.clear();rightFire=false;if(document.hidden&&loaded)focusPaused=true;clock.getDelta();});
$('menu').addEventListener('cancel',e=>{e.preventDefault();$('menu').close();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.25);
  const stopped=paused||focusPaused||$('menu').open||raceInvite.open||document.hidden||combat.destroyed;
  if(!stopped&&loaded){
    elapsed+=dt;
    const dx=Number(keys.has('KeyD')||((race.active||!journey.terrainFollowing)&&keys.has('ArrowRight')))-Number(keys.has('KeyA')||((race.active||!journey.terrainFollowing)&&keys.has('ArrowLeft')));
    const aimHorizontal=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
    const strafe=Number(keys.has('KeyC'))-Number(keys.has('KeyZ'));
    const dy=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
    const vertical=Number(keys.has('KeyQ'))-Number(keys.has('KeyE'));
    if(dx!==0||dy!==0||vertical!==0)returnAssist=false;
    const boosting=!keys.has('KeyS')&&(keys.has('ShiftLeft')||keys.has('ShiftRight'));
    const thrust=keys.has('KeyS')?0:Number(keys.has('KeyW')||boosting);
    let remaining=dt;while(remaining>0){const step=Math.min(remaining,1/120);if(journey.position.distanceTo(companion.center)<companion.radius+50)activateWorld(companion.id);if(race.state==='running')race.drive(step,journey,{turn:dx,lift:vertical+dy,thrust,boost:boosting});else if(race.state!=='countdown')journey.step(step,boosting,dx,journey.terrainFollowing?0:dy,thrust,vertical,returnAssist,strafe);if(peaceful)race.update(step,journey);remaining-=step;}
    if(journey.inside)returnAssist=false;
    boost=journey.boost;
    flightRig.position.copy(journey.position);
    directionTarget.copy(journey.position).add(journey.forward);
    orientation.lookAt(journey.position,directionTarget,journey.up);
    targetRotation.setFromRotationMatrix(orientation);
    // Surface contours change quickly; let the visual rig keep up so the ship
    // does not appear to slide ahead while its attitude catches up.
    if(race.active)flightRig.quaternion.copy(targetRotation);else flightRig.quaternion.slerp(targetRotation,1-Math.exp(-(journey.terrainFollowing?10:5)*dt));
    // Tighten chase distance continuously near the ground so terrain becomes a landscape.
    const visualScale=race.active?.16:.12+.88*THREE.MathUtils.smoothstep(journey.altitude,1,22);
    ship.scale.setScalar(visualScale);
    ship.position.set(0,race.active?0:-2*visualScale,0);

    surfaceFill.intensity=entryBlend.value*(peaceful?1.15:.35);
    surfaceRocks.visible=entryBlend.value>0;
    skyMaterial.uniforms.up.value.copy(journey.normal);
    skyMaterial.uniforms.density.value=1-THREE.MathUtils.smoothstep(journey.shellAltitude,-3,14);
    ship.rotation.z=THREE.MathUtils.damp(ship.rotation.z,-dx*.28-(journey.dodgeTime>0?journey.dodgeDirection*.45:strafe*.15),12,dt);
    aimPitch=journey.terrainFollowing?THREE.MathUtils.clamp(aimPitch+dy*dt*.5,-.65,.9):0;
    aimYaw=journey.terrainFollowing?THREE.MathUtils.clamp(aimYaw+aimHorizontal*dt*.5,-.8,.8):0;
    const terrainPitch=journey.terrainFollowing?THREE.MathUtils.clamp(-journey.pitch*.35,-.22,.22):0;
    ship.rotation.x=race.active?0:aimPitch+terrainPitch;ship.rotation.y=race.active?0:-aimYaw;
    const surfaceLight=entryBlend.value;
    // Point-light intensity follows squared model scale to preserve irradiance.
    engineLights.forEach(light=>{
      light.intensity=5*visualScale*visualScale*THREE.MathUtils.lerp(1,.22,surfaceLight)*(1+boost*.15);
      light.distance=4*visualScale;
    });
    engineCores.forEach(core=>core.material.color.setRGB(.04,THREE.MathUtils.lerp(2.5,1.05,surfaceLight),THREE.MathUtils.lerp(4,1.8,surfaceLight)));
    engines.forEach((s,i)=>{
      const size=THREE.MathUtils.lerp(2.3,1.25,surfaceLight)+boost*.18+Math.sin(elapsed*18+i)*.025;
      s.scale.set(size,size,1);s.material.opacity=THREE.MathUtils.lerp(.85,.36,surfaceLight);
    });
    bloom.strength=THREE.MathUtils.lerp(.68,.28,surfaceLight);
    bloom.threshold=THREE.MathUtils.lerp(.85,1.15,surfaceLight);
    motes.forEach((p,i)=>{
      p.z+=journey.speed*dt*2.5;
      if(p.z>18){p.z=-150;p.x=(rand()-.5)*100;p.y=(rand()-.5)*65;}
      const k=i*6;speedPositions[k]=p.x;speedPositions[k+1]=p.y;speedPositions[k+2]=p.z;
      speedPositions[k+3]=p.x;speedPositions[k+4]=p.y;speedPositions[k+5]=p.z+.14+boost*1.5;
    });
    speedGeometry.attributes.position.needsUpdate=true;
    speedMaterial.opacity=journey.surface?.1:.22+boost*.1;
    camera.fov=THREE.MathUtils.damp(camera.fov,53+boost*7,2,dt);camera.updateProjectionMatrix();
  }
  entryBlend.value=journey.terrainBlend;
  exterior.visible=entryBlend.value<1;
  planet.visible=entryBlend.value>0;water.visible=entryBlend.value>0;surfaceRocks.visible=entryBlend.value>0;
  atmosphere.visible=entryBlend.value<1;
  flightRig.updateMatrixWorld(true);
  if(race.active){
   camera.position.copy(journey.position).addScaledVector(journey.forward,-4).addScaledVector(journey.up,1.25);
   camera.up.copy(journey.up);camera.lookAt(journey.position.clone().addScaledVector(journey.forward,12));camera.updateMatrixWorld(true);
  }else updateChaseCamera(camera,flightRig,planetCenter,radius,journey.altitude,orbit);
  ship.getWorldPosition(worldShip);
  if(!stopped&&loaded){
    combat.update(dt,journey,worldShip,Math.max(.22,ship.scale.x*.85),(origin,direction,length)=>weapons.rayHit(origin,direction,length));
    weapons.shipVelocity.copy(journey.velocity);
    weapons.updateAim(camera,journey);
    weapons.update(dt,!peaceful&&(rightFire||keys.has('KeyJ')));
  }
  if(combat.patrolComplete&&!journey.inside)missionComplete=true;
  missionHud.textContent=peaceful?(!journey.inside?'ELYSIA / G approach assist, then hold W. A peaceful garden awaits.':'SANCTUARY / Explore rivers, blossom forests and alpine gardens. W fly / A D turn / Q E altitude.'):missionComplete?'EXPEDITION COMPLETE / Patrol cleared and survey returned. Explore freely or R to restart.':
   combat.patrolComplete?'04 / RETURN TO ORBIT / Hold Q to climb out of the atmosphere.':
   !journey.inside?'01 / REACH AURELIA / Press G for approach assist, then hold W.':
   !combat.patrolStarted?(combat.time<20?'02 / SURVEY / Explore for '+Math.ceil(20-combat.time)+'s. W fly, A D turn, Q E altitude. No hostiles.':'02 / SURVEY COMPLETE / Press ENTER when ready for a three-wave patrol. Hold Z C to evade, move mouse to aim, J fire.'):
   combat.waveCleared?'03 / REGROUP / Shields restored. Next wave in '+combat.secondsToWave+'s.':
   combat.wave===0?'03 / PATROL / First contact in '+combat.secondsToWave+'s. Z C dodge incoming fire.':
   '03 / CLEAR PATROL '+combat.wave+' OF 3 / '+(combat.aliveCount+combat.incomingCount)+' remaining. Put the reticle on a ship; hold J to fire. Z C dodge.';
  pauseNotice.hidden=!loaded||combat.destroyed||$('menu').open||!(paused||focusPaused);
  pauseNotice.querySelector('p').textContent=paused?'Press Space or Resume Flight to continue.':'Game focus was lost. Press a flight key or Resume Flight to continue.';
  defeated.hidden=!combat.destroyed;
  combatHud.hidden=peaceful||!journey.inside;
  combatHud.textContent=combat.loadingError?'PATROL ASSETS UNAVAILABLE':!combat.templates?'PATROL SCAN...':'SHIELD '+Math.ceil(combat.shield)+' / HULL '+Math.ceil(combat.hull)+' / HOSTILES '+combat.aliveCount+' / DODGE '+(journey.dodgeTime>0?'EVADING':journey.dodgeCooldown>0?journey.dodgeCooldown.toFixed(1)+'s':'READY [Z C]');
  damageOverlay.style.opacity=combat.active&&combat.time-combat.lastDamage<.25?'.5':'0';
  const liveIds=new Set(combat.enemies.map(e=>String(e.id)));
  for(const label of Array.from(markers.children)){if(!liveIds.has(label.dataset.enemy))label.remove();}
  for(const enemy of combat.enemies){
    let label=markers.querySelector(`[data-enemy="${enemy.id}"]`);
    if(!label){label=document.createElement('div');label.className='enemy-marker';label.dataset.enemy=enemy.id;markers.append(label);}
    const point=enemy.root.position.clone().project(camera);
    label.hidden=enemy.dead||!combat.active||enemy.opacity<.15||Math.abs(point.x)>1||Math.abs(point.y)>1||Math.abs(point.z)>1;
    if(!label.hidden){label.style.left=(point.x*.5+.5)*100+'%';label.style.top=(-point.y*.5+.5)*100+'%';label.style.opacity=String(enemy.opacity);label.textContent=enemy.state==='INBOUND'?'INBOUND / '+(enemy.root.position.distanceTo(worldShip)*.1).toFixed(1)+' km':(enemy.fireIn<1?'INCOMING FIRE / Z C DODGE / ':'')+enemy.name+' '+Math.ceil(enemy.hp/enemy.maxHP*100)+'%';}
  }
  const aiming=weapons.aimPreview?.clone().project(camera);
  const reticle=document.querySelector('.reticle');reticle.style.display=race.active?'none':'';reticle.classList.toggle('on-target',weapons.onTarget&&!stopped);reticle.classList.toggle('hit',weapons.hitFlash>0);
  if(aiming&&Math.abs(aiming.x)<1&&Math.abs(aiming.y)<1&&aiming.z<1){reticle.style.left=(aiming.x*.5+.5)*100+'%';reticle.style.top=(-aiming.y*.5+.5)*100+'%';}
  else{reticle.style.left='50%';reticle.style.top='50%';}
  weaponHud.hidden=peaceful;
  weaponHud.textContent='MOUSE OR ARROWS AIM / J OR RIGHT CLICK FIRE / '+(weapons.hitFlash>0?'HIT':weapons.onTarget?'ON TARGET':weapons.projectiles.length?'FIRING':weapons.aimPoint?'AIM ON TERRAIN':'READY');
  const groundNormal=worldShip.clone().sub(planetCenter).normalize();
  const altitude=Math.max(0,(worldShip.distanceTo(planetCenter)-radius-terrainHeight(groundNormal))*METRES_PER_UNIT);
  const surface=journey.surface;
  document.querySelector('.navigation h1 + small').textContent=surface?terrainSignals(journey.normal).biome.toUpperCase():peaceful?'GARDEN WORLD / PEACEFUL SANCTUARY':'OCEANIC WORLD / CLASS IV';
  $('velocity').textContent=stopped?'0':Math.round(journey.velocity.length()*METRES_PER_UNIT);
  document.querySelector('#velocity + .unit').textContent='m/s';
  $('profile').textContent=stopped?'HOLD':returnAssist?'RETURN ASSIST':journey.velocity.length()<.01?'IDLE':boost>.4?'BOOST x4':journey.terrainFollowing?'TERRAIN FOLLOW':surface?(boost>.4?'SURFACE BOOST':'SURFACE CRUISE'):(boost>.4?'PULSE BOOST':journey.assisted?'DESCENT ASSIST':'MANUAL FLIGHT');
  $('range').textContent=returnAssist?((worldShip.distanceTo(planetCenter)-radius).toFixed(1)):altitude<1000?Math.round(altitude).toLocaleString('en-US'):(altitude/1000).toFixed(2);
  document.querySelector('.navigation p b').textContent=returnAssist?'km':altitude<1000?'m':'km';
  $('altitude').textContent=$('range').textContent;
  document.querySelector('#altitude + .unit').textContent=altitude<1000?'m':'km';
  $('bearing').textContent=((Math.round(THREE.MathUtils.radToDeg(Math.atan2(journey.forward.x,-journey.forward.z)))+360)%360)+'\u00b0';
  phaseLabel.firstChild.textContent=journey.phase+' ';
  const eta=Math.ceil(journey.remainingSeconds);
  $('arrival').textContent=!journey.assisted?'MANUAL':surface?'LIVE':String(Math.floor(eta/60)).padStart(2,'0')+':'+String(eta%60).padStart(2,'0');
  hint.textContent=combat.destroyed?'ENTER RETRY PATROL / R RESTART':stopped?($('menu').open?'MENU / ESC TO RESUME':'FLIGHT HOLD / SPACE TO RESUME'):returnAssist?'RETURN ASSIST / G TO CANCEL / W BOOST':journey.terrainFollowing?'W FLY / Q E ALTITUDE / A D TURN / HOLD Z C EVADE / V CENTER AIM':'W THRUST / Q E RISE DESCEND / G RETURN ASSIST / SHIFT BOOST / A D TURN / DRAG TO LOOK 360';
  document.querySelector('.coordinates').textContent=`X ${worldShip.x.toFixed(2)}  Y ${worldShip.y.toFixed(2)}  Z ${worldShip.z.toFixed(2)}`;
  if(race.active)hint.textContent='W FLY / S BRAKE / A D OR ARROWS STEER / Q E HEIGHT / T REALIGN / X LEAVE';
  if(!peaceful||!journey.inside)raceVisitAsked=false;
  if(peaceful&&journey.inside&&loaded&&!stopped&&!raceVisitAsked&&race.state==='idle'){
   raceVisitAsked=true;keys.clear();rightFire=false;raceInvite.showModal();
  }
  race.root.visible=peaceful&&journey.inside&&race.state!=='idle';
  if(peaceful)race.updateGuide(journey,elapsed);
  racePanel.hidden=!peaceful||!journey.inside||race.state==='idle';
  missionHud.hidden=peaceful;
  racePanel.querySelector('.race-time').textContent=race.points.toLocaleString()+' pts';
  racePanel.querySelector('.race-progress').textContent=race.state==='finished'?'ALL RINGS CLEARED':race.active?'RING '+Math.min(race.index+1,race.gates.length)+' / '+race.gates.length:'RING CHALLENGE';
  racePanel.querySelector('.race-message').textContent=race.state==='finished'?'Finished in '+race.score.toFixed(2)+'s! Best '+race.best.toFixed(2)+'s. Play again?':race.state==='running'?(race.turbo>0?'BOOST ACTIVE! ':race.combo>1?'COMBO x'+Math.min(4,race.combo)+' / ':'')+'Follow the dotted arrows to the next ring. Shift boosts / T realigns.':race.state==='countdown'?'On the starting grid. Get ready!':'Start places you facing the first ring. No time limit. Release W to stop; hold Shift for a little extra speed.';
  racePanel.querySelector('.race-start').hidden=race.active;
  racePanel.querySelector('.race-recover').hidden=race.state!=='running';
  racePanel.querySelector('.race-exit').hidden=race.state==='idle';
  raceBanner.hidden=!peaceful||(!race.active&&race.state!=='finished')||(race.state==='running'&&race.flash===0);
  raceBanner.textContent=race.state==='countdown'?String(Math.ceil(race.countdown)):race.state==='finished'?'COURSE COMPLETE':race.index===0?'GO!':race.event;
  if(race.active&&!stopped){const cue=race.state==='countdown'?Math.ceil(race.countdown):race.index+10;if(cue!==racePanel._cue){racePanel._cue=cue;raceTone(race.state==='countdown'?440:660+race.index*35);}}
  universe.update(camera,elapsed,skyMaterial.uniforms.density.value);
  composer.render();
}
// Read-only diagnostics let browser checks verify actual travel and clearance.
window.__VOID_EXPLORER__={getState:()=>({planet:worldName,peaceful,visiblePlanets:[worldName,companion.name],companionPosition:companion.center.toArray(),race:race.diagnostics,scenery:surfaceRocks.userData,loaded,paused,focusPaused,pauseReason:combat.destroyed?'disabled':$('menu').open?'menu':paused?'manual':focusPaused?'focus':document.hidden?'hidden':null,missionComplete,mission:missionHud.textContent,dodgeCooldown:journey.dodgeCooldown,strafeActive:journey.strafeTime>0||keys.has('KeyZ')||keys.has('KeyC'),phase:journey.phase,position:journey.position.toArray(),shipPosition:worldShip.toArray(),altitudeMetres:journey.altitude*METRES_PER_UNIT,assisted:journey.assisted,pitch:journey.pitch,cameraPosition:camera.position.toArray(),cameraMode:orbit.active?'ORBIT':'CHASE',cameraYaw:orbit.yaw,insideAtmosphere:journey.shellAltitude<14,terrainBlend:entryBlend.value,terrainContact:journey.contact,altitudeHold:journey.terrainFollowing,targetClearanceMetres:journey.followHeight*METRES_PER_UNIT,remainingSeconds:journey.remainingSeconds,speedMetresPerSecond:journey.speed*METRES_PER_UNIT,returnAssist,weapons:weapons.diagnostics,combat:combat.diagnostics,universe:universe.diagnostics,drawCalls:renderer.info.render.calls})};
frame();
