import * as THREE from 'three';
import {worldName} from './world.js';
const worlds=new Map();
let impacts=[];
worlds.set(worldName,impacts);
export function selectDeformationWorld(){if(!worlds.has(worldName))worlds.set(worldName,[]);impacts=worlds.get(worldName);}
export function craterDelta(n){
 let depth=0;
 for(const c of impacts){const q=2*(1-THREE.MathUtils.clamp(n.dot(c.normal),-1,1))*65*65/(c.radius*c.radius);if(q<1)depth-=c.depth*(1-q)*(1-q);}
 return Math.max(-2.5,depth);
}
export function craterScorch(n){let strength=0;for(const c of impacts){const q=2*(1-THREE.MathUtils.clamp(n.dot(c.normal),-1,1))*65*65/(c.radius*c.radius);if(q<1.5)strength=Math.max(strength,Math.max(0,1-q/1.5)*.8);}return strength;}
export function addCrater(normal){
 const nearby=impacts.find(c=>c.normal.dot(normal)>.99997);
 if(nearby){nearby.depth=Math.min(2.5,nearby.depth+.35);nearby.radius=Math.min(2.2,nearby.radius+.12);return nearby;}
 if(impacts.length>=256)return null;
 const crater={normal:normal.clone().normalize(),radius:1.5,depth:.65};impacts.push(crater);return crater;
}
export function craterCount(){return impacts.length;}
