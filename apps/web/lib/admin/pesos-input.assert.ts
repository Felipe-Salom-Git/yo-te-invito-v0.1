import { pesosInputToCentsString } from './pesos-input';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(pesosInputToCentsString('30000') === '3000000', 'plain pesos');
assert(pesosInputToCentsString('30.000') === '3000000', 'thousands separator');
assert(pesosInputToCentsString('$ 20.000') === '2000000', 'currency sign');
assert(pesosInputToCentsString('') === '0', 'empty');
assert(pesosInputToCentsString('abc') === '0', 'no digits');
assert(pesosInputToCentsString('30000000000') === '3000000000000', 'beyond int32 pesos');

console.log('OK: pesos input → cents');
