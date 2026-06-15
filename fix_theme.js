const fs = require('fs');

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/text-slate-900/g, 'text-foreground');
  content = content.replace(/text-slate-800/g, 'text-foreground');
  content = content.replace(/text-slate-500/g, 'text-muted-foreground');
  content = content.replace(/text-slate-400/g, 'text-muted-foreground');
  content = content.replace(/text-slate-300/g, 'text-muted-foreground/50');
  content = content.replace(/hover:text-slate-900/g, 'hover:text-foreground');
  content = content.replace(/hover:text-slate-700/g, 'hover:text-foreground');
  content = content.replace(/hover:bg-slate-50\/80/g, 'hover:bg-accent');
  content = content.replace(/hover:bg-slate-50/g, 'hover:bg-accent');
  content = content.replace(/bg-slate-100\/70/g, 'bg-accent');
  content = content.replace(/bg-slate-100\/80/g, 'bg-accent');
  content = content.replace(/border-slate-100/g, 'border-border');
  content = content.replace(/border-slate-200/g, 'border-border');
  
  fs.writeFileSync(filePath, content);
}

replaceColors('src/app/page.tsx');
