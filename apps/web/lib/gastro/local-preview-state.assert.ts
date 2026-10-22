import { gastroKeys } from '../query/keys';
import {
  GASTRO_LOCAL_PREVIEW_CLOSED,
  gastroLocalPreviewReducer,
} from './local-preview-state';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

let state = GASTRO_LOCAL_PREVIEW_CLOSED;
assert(state.profileId === null, 'starts closed');

state = gastroLocalPreviewReducer(state, { type: 'open', profileId: 'local-a' });
assert(state.profileId === 'local-a', 'open A → modal A');

state = gastroLocalPreviewReducer(state, { type: 'close' });
assert(state.profileId === null, 'close');

state = gastroLocalPreviewReducer(state, { type: 'open', profileId: 'local-b' });
assert(state.profileId === 'local-b', 'open B → modal B (not stuck on A)');

state = gastroLocalPreviewReducer(state, { type: 'open', profileId: 'local-a' });
assert(state.profileId === 'local-a', 'switch directly B → A');

assert(
  JSON.stringify(gastroKeys.local('local-a')) !== JSON.stringify(gastroKeys.local('local-b')),
  'preview query cache is per profile',
);

console.log('OK: gastro local preview modal follows clicked profile (A → close → B)');
