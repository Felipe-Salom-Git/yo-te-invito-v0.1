/**
 * G12.1-A — QR preparing overlay: copy per stage and visibility rules.
 * Run: pnpm --filter api run test:qr-preparing-overlay
 */
import {
  isQrPreparingVisible,
  QR_PREPARING_CREATE_MESSAGE,
  QR_PREPARING_MODE,
  QR_PREPARING_SEND_MESSAGE,
  QR_PREPARING_SEND_STEP_MS,
  resolveQrPreparingMessage,
} from './qrPreparing';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const { CREATE, CREATE_AND_SEND } = QR_PREPARING_MODE;

assert(resolveQrPreparingMessage(CREATE, 0) === QR_PREPARING_CREATE_MESSAGE, 'create starts with "Creando tu QR…"');
assert(
  resolveQrPreparingMessage(CREATE, QR_PREPARING_SEND_STEP_MS * 10) === QR_PREPARING_CREATE_MESSAGE,
  'create-only never switches to the send copy',
);
assert(
  resolveQrPreparingMessage(CREATE_AND_SEND, 0) === QR_PREPARING_CREATE_MESSAGE,
  'send flow starts with "Creando tu QR…"',
);
assert(
  resolveQrPreparingMessage(CREATE_AND_SEND, QR_PREPARING_SEND_STEP_MS) === QR_PREPARING_SEND_MESSAGE,
  'send flow switches to "Preparando el envío…"',
);

const idle = { isPending: false, isSuccess: false };
const pending = { isPending: true, isSuccess: false };
const success = { isPending: false, isSuccess: true };

assert(!isQrPreparingVisible(idle), 'idle → hidden');
assert(isQrPreparingVisible(pending), 'pending → visible immediately');
assert(!isQrPreparingVisible(success), 'success → hidden (existing toast/result takes over)');
assert(isQrPreparingVisible(success, { keepOnSuccess: true }), 'redirecting claim keeps overlay until route change');
assert(!isQrPreparingVisible(idle, { keepOnSuccess: true }), 'error resets mutation → never left blocked');

console.log('OK: qr preparing overlay');
