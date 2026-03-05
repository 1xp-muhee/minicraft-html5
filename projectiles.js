export function createProjectileMesh(THREE, weaponKey, ult) {
  let mesh;
  let speed = 28;

  if (weaponKey === 'wand') {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ult ? 0.16 : 0.08, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xaee7ff, emissive: 0x3a7bff, emissiveIntensity: ult ? 2.5 : 1.1 })
    );
    speed = ult ? 44 : 30;
  } else if (weaponKey === 'k2') {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, ult ? 0.45 : 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xd6b04d })
    );
    mesh.rotation.x = Math.PI / 2;
    speed = ult ? 70 : 48;
  } else if (weaponKey === 'crossbow') {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, ult ? 0.8 : 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    mesh.rotation.x = Math.PI / 2;
    speed = ult ? 55 : 34;
  } else if (weaponKey === 'galaxy26') {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ult ? 0.2 : 0.11, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xc4b5fd, emissive: 0x7c3aed, emissiveIntensity: ult ? 2.8 : 1.2 })
    );
    speed = ult ? 62 : 40;
  } else {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ult ? 0.14 : 0.06, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x7f8c8d })
    );
    speed = ult ? 42 : 28;
  }

  return { mesh, speed };
}
