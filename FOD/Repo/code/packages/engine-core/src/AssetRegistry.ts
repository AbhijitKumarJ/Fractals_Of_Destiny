import * as THREE from 'three';
import { CharacterRigInstance } from './ProceduralRigBuilder';

export class AssetRegistry {
  private characterRigs = new Map<string, CharacterRigInstance>();
  private sceneObjects = new Map<string, THREE.Object3D>();
  private sharedGeometries = new Map<string, THREE.BufferGeometry>();
  private sharedMaterials = new Map<string, THREE.Material>();

  public registerCharacterRig(id: string, rig: CharacterRigInstance): void {
    this.characterRigs.set(id, rig);
    this.sceneObjects.set(id, rig.root);
  }

  public getCharacterRig(id: string): CharacterRigInstance | undefined {
    return this.characterRigs.get(id);
  }

  public getAllCharacterRigs(): Map<string, CharacterRigInstance> {
    return this.characterRigs;
  }

  public registerProp(id: string, object: THREE.Object3D): void {
    object.name = id;
    this.sceneObjects.set(id, object);
  }

  public getObject(id: string): THREE.Object3D | undefined {
    return this.sceneObjects.get(id);
  }

  public getOrCreateGeometry(
    key: string,
    factory: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    if (!this.sharedGeometries.has(key)) {
      this.sharedGeometries.set(key, factory());
    }
    return this.sharedGeometries.get(key)!;
  }

  public getOrCreateMaterial<T extends THREE.Material>(
    key: string,
    factory: () => T
  ): T {
    if (!this.sharedMaterials.has(key)) {
      this.sharedMaterials.set(key, factory());
    }
    return this.sharedMaterials.get(key) as T;
  }

  public disposeAll(): void {
    this.sharedGeometries.forEach((geo) => geo.dispose());
    this.sharedMaterials.forEach((mat) => mat.dispose());
    this.sharedGeometries.clear();
    this.sharedMaterials.clear();
    this.characterRigs.clear();
    this.sceneObjects.clear();
  }
}
