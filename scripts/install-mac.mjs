// Copies the freshly built "My Mail.app" into /Applications and opens it.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

if (process.platform !== 'darwin') {
  console.error('This installer is for macOS.')
  process.exit(1)
}

const dist = path.resolve('dist')
const folder = fs.readdirSync(dist).find((d) => d.startsWith('mac') && fs.existsSync(path.join(dist, d, 'My Mail.app')))
if (!folder) {
  console.error('Could not find dist/mac*/My Mail.app. Did the build succeed?')
  process.exit(1)
}
const src = path.join(dist, folder, 'My Mail.app')
const dest = '/Applications/My Mail.app'

try { execFileSync('osascript', ['-e', 'quit app "My Mail"']) } catch { /* not running */ }
fs.rmSync(dest, { recursive: true, force: true })
execFileSync('ditto', [src, dest])
console.log(`\n✅ Installed to ${dest}`)
console.log('   Open it from Launchpad, Spotlight (⌘ Space → "My Mail"), or drag it to your Dock.\n')
execFileSync('open', [dest])
