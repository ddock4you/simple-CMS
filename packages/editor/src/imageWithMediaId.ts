import Image from '@tiptap/extension-image';

/**
 * 기본 `@tiptap/extension-image`를 확장해 `mediaId` attribute를 추가한다.
 *
 * - 본문에 삽입된 이미지가 Media 라이브러리의 어느 레코드를 참조하는지 추적
 * - HTML 직렬화: `data-media-id="cuid..."` 속성으로 보존
 * - 외부 URL 직접 입력 시 mediaId는 null (Media 무관)
 *
 * 활용: `findMediaReferences`가 contentJson을 재귀 탐색하여
 * 이 attr가 있는 image 노드를 찾아 사용처로 보고한다.
 *
 * resize 등 기존 Image 옵션은 `.configure({ ... })`로 동일하게 적용 가능
 * (extend 하더라도 부모 옵션은 그대로 상속).
 */
export const ImageWithMediaId = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-media-id'),
        renderHTML: (attrs) =>
          attrs.mediaId ? { 'data-media-id': attrs.mediaId } : {},
      },
    };
  },
});
