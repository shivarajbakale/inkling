import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'inkling-diagram': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        autoplay?: string;
        theme?: string;
        paper?: string;
        pen?: string;
        controls?: string;
        source?: string;
      };
    }
  }
}
