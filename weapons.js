export const weaponCatalog = {
  slingshot: { key:'slingshot', name:'새총', len:1.1, color:0x6b4f2d, projectile:'stone' },
  wand: { key:'wand', name:'마법 지팡이', len:1.0, color:0x5b3a29, projectile:'magic' },
  k2: { key:'k2', name:'K2', len:1.3, color:0x2f343a, projectile:'bullet' },
  crossbow: { key:'crossbow', name:'석궁', len:1.2, color:0x5b4632, projectile:'bolt' }
};

export function resolveWeaponSelection() {
  const weaponPrompt = (localStorage.getItem('officecraft_weapon') || '').toLowerCase();
  const weaponInput = (prompt('무기 선택: 새총 / 마법 지팡이 / k2 / 석궁', weaponPrompt || '새총') || '새총').trim().toLowerCase();
  const weaponKey = weaponInput.includes('지팡이') ? 'wand' : weaponInput.includes('k2') ? 'k2' : weaponInput.includes('석궁') ? 'crossbow' : 'slingshot';
  localStorage.setItem('officecraft_weapon', weaponInput);
  return weaponCatalog[weaponKey];
}
