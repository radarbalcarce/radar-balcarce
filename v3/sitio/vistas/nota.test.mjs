import test from 'node:test';
import assert from 'node:assert/strict';

test('en las notas de la redacción, las cuentas con arroba son enlaces a su Instagram (y la nota de otro medio no se toca)', async () => {
  const { conCuentasEnlazadas } = await import('./nota.mjs');
  const r = { origen: 'redaccion' };
  assert.equal(conCuentasEnlazadas('Bodegas (@vinedos.balcarce) abre. Viñedo (@vinedolospinos).', r),
    'Bodegas (<a href="https://www.instagram.com/vinedos.balcarce/" target="_blank" rel="noopener nofollow ugc">@vinedos.balcarce</a>) abre. Viñedo (<a href="https://www.instagram.com/vinedolospinos/" target="_blank" rel="noopener nofollow ugc">@vinedolospinos</a>).');
  assert.match(conCuentasEnlazadas('Gracias a @thewinesco.', r), /instagram\.com\/thewinesco\/".*>@thewinesco<\/a>\.$/);
  assert.equal(conCuentasEnlazadas('mail a juan@correo.com y @algo', { origen: 'nucleo' }), 'mail a juan@correo.com y @algo');
  assert.doesNotMatch(conCuentasEnlazadas('escribinos a juan@correo.com', r), /<a /);
});

test('en las notas de la redacción, [texto](https://radarbalcarce.com/…) es un enlace a otra nota nuestra (de otro sitio, no)', async () => {
  const { conCuentasEnlazadas } = await import('./nota.mjs');
  const r = { origen: 'redaccion' };
  assert.equal(conCuentasEnlazadas('Está en la nota [«El origen»](https://radarbalcarce.com/nota/x-abc1234).', r),
    'Está en la nota <a href="https://radarbalcarce.com/nota/x-abc1234">«El origen»</a>.');
  assert.doesNotMatch(conCuentasEnlazadas('[clic](https://malo.example.com/x)', r), /<a /);
  assert.doesNotMatch(conCuentasEnlazadas('[clic](https://radarbalcarce.com/x)', { origen: 'nucleo' }), /<a /);
});
