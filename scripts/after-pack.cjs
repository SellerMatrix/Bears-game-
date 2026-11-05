// electron-builder afterPack hook.
// Without a paid Apple Developer certificate we "ad-hoc" sign the app.
// Apple Silicon Macs refuse to run code with no valid signature at all, and
// renaming Electron to "My Mail" invalidates its original signature.
const { execFileSync } = require('node:child_process')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (process.platform !== 'darwin') {
    console.warn('  • skipping ad-hoc signing: macOS apps must be built on a Mac')
    return
  }
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  console.log(`  • ad-hoc signing ${app}`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
