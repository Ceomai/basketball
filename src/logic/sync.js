// @ts-check
/**
 * Bulut kayıt çakışma kararı (saf): her yuvada daha yeni olan kazanır; buluttaki daha yeniyse oyuncuya sorulur.
 * @param {{ts?:number}|null} local @param {{ts?:number}|null} remote
 * @returns {"upload"|"download"|"ask"|"none"}
 */
export function syncDecision(local, remote) {
  const lt = (local && local.ts) || 0,
    rt = (remote && remote.ts) || 0;
  if (!lt && !rt) return "none";
  if (!rt) return "upload";
  if (!lt) return "download";
  if (Math.abs(lt - rt) < 2000) return "none";
  return lt > rt ? "upload" : "ask";
}
