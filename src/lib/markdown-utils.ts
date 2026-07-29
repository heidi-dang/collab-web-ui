export const fixUnclosedFences = (markdown: string): string => {
  // Fast path: bypass if no code blocks exist
  if (!markdown.includes('```')) return markdown;
  
  // Count exact occurrences of fence initiators at the start of lines or strings
  const fenceMatches = markdown.match(/(?:^|\n)```/g);
  
  // If the count is odd, the AI is currently inside an open code fence
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    // Inject a synthetic closing fence strictly for the render phase
    return markdown + (markdown.endsWith('\n') ? '```' : '\n```');
  }
  
  return markdown;
};
