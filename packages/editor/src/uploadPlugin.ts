import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Tiptap 이미지 업로드 플러그인.
 *
 * - paste/drop으로 들어온 이미지 파일을 가로채 `uploadImage` 콜백 호출
 * - 업로드 성공 시 image 노드를 paste/drop 시점의 위치에 삽입 (mediaId 포함)
 * - 업로드 중에는 토스트 등 진행 상태 표시는 호출자(uploadImage)에 위임
 *   (단순화: ProseMirror decoration placeholder는 생략 — 향후 도입 가능)
 *
 * packages/editor는 프레임워크 독립이므로 `uploadImage` 함수를 옵션으로 받는다.
 * `uploadImage`가 null이면 paste/drop 가로채지 않음 → web 렌더링에서도 안전.
 */

export interface UploadResult {
  src: string;
  mediaId?: string | null;
  alt?: string;
}

export interface ImageUploadOptions {
  uploadImage:
    | ((file: File) => Promise<UploadResult>)
    | null;
  /** 업로드 실패 시 호출 (호출자가 토스트 노출). 미지정 시 console.error만 */
  onError?: (error: Error) => void;
}

const imageUploadKey = new PluginKey('imageUpload');

export const ImageUploadExtension = Extension.create<ImageUploadOptions>({
  name: 'imageUpload',

  addOptions() {
    return {
      uploadImage: null,
      onError: undefined,
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;

    const handleFiles = (
      view: Parameters<NonNullable<Plugin['props']['handlePaste']>>[0],
      pos: number,
      files: File[],
    ) => {
      if (!opts.uploadImage) return false;
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return false;

      let insertPos = pos;
      for (const file of imageFiles) {
        const capturedPos = insertPos;
        opts
          .uploadImage(file)
          .then(({ src, mediaId, alt }) => {
            const imageNode = view.state.schema.nodes.image;
            if (!imageNode) return;
            const node = imageNode.create({
              src,
              alt: alt ?? file.name,
              mediaId: mediaId ?? null,
            });
            const tr = view.state.tr.insert(capturedPos, node);
            view.dispatch(tr);
          })
          .catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err));
            if (opts.onError) {
              opts.onError(error);
            } else {
              console.error('[ImageUpload] 업로드 실패:', error);
            }
          });
        insertPos += 1; // 다음 이미지를 다음 위치에 삽입
      }
      return true;
    };

    return [
      new Plugin({
        key: imageUploadKey,
        props: {
          handlePaste(view, event) {
            if (!opts.uploadImage) return false;
            const items = event.clipboardData?.files;
            if (!items || items.length === 0) return false;
            const files = Array.from(items);
            const handled = handleFiles(view, view.state.selection.from, files);
            if (handled) {
              event.preventDefault();
            }
            return handled;
          },
          handleDrop(view, event, _slice, _moved) {
            if (!opts.uploadImage) return false;
            const items = event.dataTransfer?.files;
            if (!items || items.length === 0) return false;
            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const pos = coords?.pos ?? view.state.selection.from;
            const files = Array.from(items);
            const handled = handleFiles(view, pos, files);
            if (handled) {
              event.preventDefault();
            }
            return handled;
          },
        },
      }),
    ];
  },
});
