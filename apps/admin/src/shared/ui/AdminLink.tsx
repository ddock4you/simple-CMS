import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type AdminLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode;
  };

export function AdminLink({ prefetch, ...props }: AdminLinkProps) {
  return <Link prefetch={prefetch ?? false} {...props} />;
}
