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
