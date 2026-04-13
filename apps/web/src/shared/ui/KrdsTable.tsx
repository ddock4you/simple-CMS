import type { ReactNode, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

interface KrdsTableProps extends TableHTMLAttributes<HTMLTableElement> {
  scroll?: boolean;
  mobScroll?: boolean;
  caption?: string;
  children: ReactNode;
}

function KrdsTableRoot({ scroll, mobScroll, caption, children, className, ...props }: KrdsTableProps) {
  const wrapClass = [
    'krds-table-wrap',
    scroll && 'scroll',
    mobScroll && 'mob-scroll',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClass}>
      <table className={`tbl data ${className ?? ''}`} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

function Thead({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props}>{children}</thead>;
}

function Tbody({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

function Tr({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props}>{children}</tr>;
}

function Th({ children, ...props }: { children: ReactNode } & ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={props.scope ?? 'col'} {...props}>{children}</th>;
}

function Td({ children, ...props }: { children: ReactNode } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props}>{children}</td>;
}

export const KrdsTable = Object.assign(KrdsTableRoot, {
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
});
