/** Portal «Ver ficha» modal: which local is previewed (independent from the active local). */
export type GastroLocalPreviewState = { profileId: string | null };

export type GastroLocalPreviewAction =
  | { type: 'open'; profileId: string }
  | { type: 'close' };

export const GASTRO_LOCAL_PREVIEW_CLOSED: GastroLocalPreviewState = { profileId: null };

export function gastroLocalPreviewReducer(
  _state: GastroLocalPreviewState,
  action: GastroLocalPreviewAction,
): GastroLocalPreviewState {
  return action.type === 'open' ? { profileId: action.profileId } : GASTRO_LOCAL_PREVIEW_CLOSED;
}
