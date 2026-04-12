interface TiptapContentProps {
  html: string;
}

export function TiptapContent({ html }: TiptapContentProps) {
  return (
    <div
      className="tiptap-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
