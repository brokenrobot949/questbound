// Loads the Ink story files and compiles them in the browser with inkjs.
// story/main.ink is the root; every file it INCLUDEs (and they INCLUDE) is fetched first,
// because the compiler reads included files synchronously.

import { Compiler, CompilerOptions, JsonFileHandler } from '../../../vendor/ink-full.js';

const INCLUDE_LINE = /^[ \t]*INCLUDE[ \t]+(.+?)[ \t]*$/gm;

// storyFolderUrl: a URL object for the story/ folder. INCLUDE paths are relative to it.
export async function loadStory(storyFolderUrl, rootFile = 'main.ink') {
  const files = {};
  const queue = [rootFile];
  while (queue.length > 0) {
    const name = queue.shift();
    if (name in files) continue;
    const response = await fetch(new URL(name, storyFolderUrl), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Couldn't load story file ${name} (${response.status})`);
    files[name] = await response.text();
    for (const match of files[name].matchAll(INCLUDE_LINE)) queue.push(match[1]);
  }

  const options = new CompilerOptions(rootFile, [], false, null, new JsonFileHandler(files));
  const compiler = new Compiler(files[rootFile], options);
  let story = null;
  try {
    story = compiler.Compile();
  } catch (error) {
    if (compiler.errors.length === 0) throw error;
  }
  if (compiler.errors.length > 0 || !story) {
    throw new Error(`The story has errors:\n${compiler.errors.join('\n')}`);
  }
  for (const warning of compiler.warnings) console.warn(warning);
  return story;
}
