interface TiptapContentProps {
  html: string;
  className?: string;
}

const TIPTAP_CONTENT_CLASSES = [
  'tiptap-content prose max-w-none text-[16px]! leading-[1.8]! break-keep [overflow-wrap:break-word]',
  'prose-h1:mt-[32px]! prose-h1:mb-[16px]! prose-h1:text-[32px]! prose-h1:leading-[1.3]! prose-h1:font-bold',
  'prose-h2:mt-[28px]! prose-h2:mb-[12px]! prose-h2:text-[24px]! prose-h2:leading-[1.35]! prose-h2:font-bold',
  'prose-h3:mt-[24px]! prose-h3:mb-[8px]! prose-h3:text-[20px]! prose-h3:leading-[1.4]! prose-h3:font-semibold',
  'prose-p:my-[12px]! [&_p:first-child]:mt-0! [&_h1:first-child]:mt-0! [&_h2:first-child]:mt-0! [&_h3:first-child]:mt-0!',
  'prose-a:text-[#0056d6]! prose-a:underline prose-a:underline-offset-[2px] prose-a:hover:decoration-2',
  'prose-ul:my-[12px]! prose-ul:pl-[24px]! prose-ul:list-disc! prose-ol:my-[12px]! prose-ol:pl-[24px]! prose-ol:list-decimal! prose-li:my-[4px]!',
  '[&_li>ul]:my-[4px]! [&_li>ol]:my-[4px]! [&_ul_ul]:list-[circle]! [&_ul_ul_ul]:list-[square]!',
  'prose-blockquote:my-[16px]! prose-blockquote:border-l-[4px]! prose-blockquote:border-[#0056d6]! prose-blockquote:bg-[#f8f9fa] prose-blockquote:px-[16px]! prose-blockquote:py-[8px]! prose-blockquote:text-[#555]! prose-blockquote:not-italic',
  'prose-code:rounded-[4px] prose-code:bg-[#f1f3f5]! prose-code:px-[6px]! prose-code:py-[2px]! prose-code:text-[0.9em]! prose-code:font-mono [&_code::before]:content-none [&_code::after]:content-none',
  'prose-pre:my-[16px]! prose-pre:overflow-x-auto prose-pre:rounded-[8px] prose-pre:bg-[#1e1e1e]! prose-pre:p-[16px]! prose-pre:text-[#d4d4d4]! [&_pre_code]:rounded-none [&_pre_code]:bg-transparent! [&_pre_code]:p-0! [&_pre_code]:text-[14px]! [&_pre_code]:text-inherit!',
  'prose-hr:my-[24px]! prose-hr:border-t prose-hr:border-[#dee2e6]!',
  'prose-img:max-w-full prose-img:h-auto prose-img:rounded-[4px] [&_[style*="text-align:_center"]_img]:mx-0! [&_[style*="text-align:_center"]_img]:inline-block! [&_[style*="text-align:_right"]_img]:mx-0! [&_[style*="text-align:_right"]_img]:inline-block!',
  'prose-table:my-[16px]! prose-table:block! prose-table:w-full prose-table:overflow-x-auto prose-table:border-collapse [&_th]:border [&_th]:border-[#dee2e6] [&_th]:bg-[#f8f9fa] [&_th]:px-[12px] [&_th]:py-[8px] [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_td]:border [&_td]:border-[#dee2e6] [&_td]:px-[12px] [&_td]:py-[8px] [&_td]:text-left [&_td]:align-top',
  '[&_mark]:rounded-[2px] [&_mark]:bg-[#fff3bf] [&_mark]:px-[3px] [&_mark]:py-[1px] [&_s]:line-through [&_u]:underline [&_u]:underline-offset-[2px]',
  '[&_ul[data-type="taskList"]]:list-none! [&_ul[data-type="taskList"]]:pl-0! [&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:items-start [&_ul[data-type="taskList"]_li]:gap-[8px] [&_ul[data-type="taskList"]_li>label]:mt-[5px] [&_ul[data-type="taskList"]_li>label]:shrink-0 [&_ul[data-type="taskList"]_li>div]:flex-1',
].join(' ');

export function TiptapContent({ html, className = '' }: TiptapContentProps) {
  return (
    <div
      className={`${TIPTAP_CONTENT_CLASSES} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
