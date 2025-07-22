import React, { useRef, useCallback } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';

// The React component that will be rendered for our custom node
const ResizableImageView = (props: any) => {
  const { node, updateAttributes, editor } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isResizable = editor.isEditable;

  const onMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizable || !containerRef.current || !imgRef.current) return;
    event.preventDefault();

    const handle = event.currentTarget;
    const initialImgWidth = imgRef.current.offsetWidth;
    const startX = event.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const newWidth = initialImgWidth + (currentX - startX);
      updateAttributes({ width: newWidth });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isResizable, updateAttributes]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${node.attrs.align === 'left' ? 'float-left mr-4' : ''} ${node.attrs.align === 'right' ? 'float-right ml-4' : ''}`}
      style={{ width: node.attrs.width }}
      data-drag-handle // Important for Tiptap's drag and drop
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        className="block"
        style={{ width: '100%' }}
      />
      {isResizable && (
        <>
          <div
            className="absolute top-0 right-0 w-2 h-full bg-blue-400 opacity-50 cursor-col-resize"
            onMouseDown={onMouseDown}
          />
          <div
            className="absolute top-0 left-0 w-2 h-full bg-blue-400 opacity-50 cursor-col-resize"
            onMouseDown={onMouseDown}
          />
        </>
      )}
    </div>
  );
};


// The Tiptap extension itself
export const ResizableImage = Image.extend({
  name: 'resizableImage',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          width: attributes.width,
        }),
      },
      align: {
        default: 'none',
        renderHTML: attributes => ({
          class: `align-${attributes.align}`,
        }),
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;