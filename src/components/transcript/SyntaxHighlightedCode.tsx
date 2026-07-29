import React from 'react';
import { VirtualizedCodeBlock } from './VirtualizedCodeBlock';

export interface SyntaxHighlightedCodeProps {
  language: string;
  code: string;
}

export const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({ language, code }) => {
  return <VirtualizedCodeBlock code={code} language={language} />;
};
