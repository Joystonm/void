import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import corvetteURL from '../enemies/Corvette_03.fbx?url';
import frigateURL from '../enemies/Frigate_01.fbx?url';
import heavyURL from '../enemies/Frigate_05.fbx?url';
import textureURL from '../enemies/Texture/T_Spase_64.png?url';
export async function loadEnemyTemplates(){
 const manager=new THREE.LoadingManager();
 manager.setURLModifier(url=>/\.(png|jpg|jpeg)$/i.test(url)?textureURL:url);
 const loader=new FBXLoader(manager);
 return Promise.all([corvetteURL,frigateURL,heavyURL].map(async url=>{
  const asset=await loader.loadAsync(url);const bounds=new THREE.Box3().setFromObject(asset),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  asset.position.sub(center);const normalized=new THREE.Group();normalized.add(asset);normalized.scale.setScalar(1/Math.max(size.x,size.y,size.z));
  const root=new THREE.Group();root.add(normalized);root.rotation.y=Math.PI/2;
  asset.traverse(o=>{if(o.isMesh){o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const material=new THREE.MeshStandardMaterial({map:m.map,color:0x8f94a0,metalness:.45,roughness:.65});return material;});if(o.material.length===1)o.material=o.material[0];}});
  return root;
 }));
}
