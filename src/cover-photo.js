// Existing cover uploads were saved under the flyer field.
export function coverPhotoUrl(entity, fallback){
 if(entity?.flyerPhotoId)return '/api/photos/'+entity.flyerPhotoId;
 return entity?.image || (fallback?coverPhotoUrl(fallback):'');
}
