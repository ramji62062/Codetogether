const fs = require('fs');
const glob = require('glob'); // Note: we'll use a simple walk if glob is not installed, but it's not.
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // A naive regex to merge className="a" className="b"
  // It handles up to 3 classNames on the same line, which is usually the max here.
  let prev = '';
  while (prev !== newContent) {
    prev = newContent;
    newContent = newContent.replace(/className="([^"]*)"\s+className="([^"]*)"/g, 'className="$1 $2"');
    newContent = newContent.replace(/className=\{([^}]+)\}\s+className="([^"]*)"/g, 'className={`$1 $2`}');
    newContent = newContent.replace(/className="([^"]*)"\s+className=\{([^}]+)\}/g, 'className={`$1 $2`}');
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
  }
});
