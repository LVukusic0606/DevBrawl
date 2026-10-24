// Writes learn-content.json from frontend/src/learn/content.ts, the single source of the Learn lessons.
// Needs Node 22.18+ or 23.6+, which run TypeScript files by stripping their types.
// The build runs this automatically when the learn content changes; run it by hand with:
//   node backend/DevBrawl.Interview/Knowledge/export-learn-content.mjs
import { writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The frontend imports like Vite allows ('./lessons', './databases'), without extensions or index files.
// Node needs those spelled out, so try the .ts file and the folder's index.ts when a relative import fails.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context)
        } catch {
          // Try the next form
        }
      }
      throw error
    }
  },
})

const here = path.dirname(fileURLToPath(import.meta.url))
const source = path.resolve(here, '../../../frontend/src/learn/content.ts')
const { CATEGORIES } = await import(pathToFileURL(source).href)

await writeFile(path.join(here, 'learn-content.json'), JSON.stringify(CATEGORIES, null, 2) + '\n')
console.log(`learn-content.json: ${CATEGORIES.length} categories, ${CATEGORIES.flatMap((c) => c.lessons).length} lessons`)
