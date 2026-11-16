export const requestRetryDelay = 2 * 60 * 60 * 1000;
export const isOpenServiceRequest = request => request.status==='Open'&&request.kind!=='food-order';
export const requestRetryAt = request => isOpenServiceRequest(request)&&!request.offers.length&&Number.isFinite(request.created)
 ? request.created+requestRetryDelay : null;
export const canClearRequest = request => ['Cancelled','Completed','Declined','Resent'].includes(request.status);
