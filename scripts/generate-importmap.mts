import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const generateImportMapPath = path.resolve(
  scriptDir,
  '../node_modules/payload/dist/bin/generateImportMap/index.js'
)
const { generateImportMap } = await import(generateImportMapPath)

// Import the payload config — tsx may compile it as CJS, so the ESM interop
// wraps it in { default: ... }. Mirror what the payload CLI bin does.
let configModule = await import('../src/payload.config.ts')
let config: any = configModule.default ?? configModule
if (config && typeof config.default !== 'undefined') {
  config = await config.default
}
if (config instanceof Promise) {
  config = await config
}

await generateImportMap(config)

// Payload writes to importMap.js but Next.js resolves importMap.ts first.
// Copy the generated JS content into the TS file so the admin panel picks it up.
const adminDir = path.resolve(scriptDir, '../src/app/(payload)/admin')
const jsFile = path.join(adminDir, 'importMap.js')
const tsFile = path.join(adminDir, 'importMap.ts')
try {
  const content = await fs.readFile(jsFile, 'utf-8')
  await fs.writeFile(tsFile, content, 'utf-8')
  console.log('Synced importMap.js → importMap.ts')
} catch {
  // importMap.js may not exist if no changes were needed
}
