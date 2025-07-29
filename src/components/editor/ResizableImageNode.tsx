import React, { useRef, useCallback } from 'react';
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import Image from '@tiptap/extension-image';

// The React component that will be rendered for our custom node
const ResizableImageView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor, selected } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  const isEditable = editor.isEditable;

  const onResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditable || !containerRef.current) return;
    event.preventDefault();

    const initialWidth = containerRef.current.offsetWidth;
    const startX = event.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const newWidth = initialWidth + (currentX - startX);
      
      // Enforce a minimum width
      if (newWidth > 50) {
        updateAttributes({ width: `${newWidth}px` });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isEditable, updateAttributes]);

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`relative my-2 inline-block ${node.attrs.align === 'left' ? 'float-left mr-4' : ''} ${node.attrs.align === 'right' ? 'float-right ml-4' : ''}`}
      style={{ width: node.attrs.width }}
      data-drag-handle
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        className="block rounded-md w-full h-auto"
      />
      {isEditable && selected && (
        <>
          {/* Top-left */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded z-10 cursor-nwse-resize" onMouseDown={onResizeStart} />
          {/* Top-right */}
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded z-10 cursor-nesw-resize" onMouseDown={onResizeStart} />
          {/* Bottom-left */}
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded z-10 cursor-nesw-resize" onMouseDown={onResizeStart} />
          {/* Bottom-right */}
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded z-10 cursor-nwse-resize" onMouseDown={onResizeStart} />
        </>
      )}
    </NodeViewWrapper>
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
          style: `width: ${attributes.width}`,
        }),
        parseHTML: element => element.style.width,
      },
      align: {
        default: 'none',
        renderHTML: attributes => ({
          class: `align-${attributes.align}`,
        }),
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLElement;
          const width = element.style.width;
          if (!width) return {};
          return { width };
        },
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;