const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function packSibling(dir) {
  const abs = path.resolve(__dirname, '..', '..', dir);
  if (!fs.existsSync(abs)) return null;
  try {
    // run build if available
    try { execSync('npm run build --silent', { cwd: abs, stdio: 'inherit' }); } catch (_) {}
    // run npm pack
    const out = execSync('npm pack --silent', { cwd: abs }).toString().trim();
    const packed = out.split('\n').pop().trim();
    const packedPath = path.join(abs, packed);
    if (fs.existsSync(packedPath)) return packedPath;
    const files = fs.readdirSync(abs).filter(f => f.endsWith('.tgz'));
    if (files.length) return path.join(abs, files[files.length - 1]);
  } catch (err) {
    // ignore and continue
  }
  return null;
}

function copyToDest(srcPath, destDir) {
  if (!srcPath) return null;
  const base = path.basename(srcPath);
  const dest = path.join(destDir, base);
  fs.copyFileSync(srcPath, dest);
  return base;
}

function resolveTgzNameFromPkg(dir, name) {
  const pkgPath = path.resolve(__dirname, '..', '..', dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = require(pkgPath);
  return `${name}-${pkg.version}.tgz`;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

  const storageEnv = process.env.PCURICH_CLIENT_STORAGE_TGZ;
  console.log('storageEnv:', storageEnv);
  const httpEnv = process.env.PCURICH_HTTP_TGZ;
  console.log('httpEnv:', httpEnv);

  // Try packing siblings and get resulting paths
  const storagePacked = packSibling('..\\pcurich-client-storage'.replace(/\\\\/g, path.sep));
  const httpPacked = packSibling('..\\pcurich-http-mock-workbench'.replace(/\\\\/g, path.sep));

  // Prefer env var, then packed file, then compute expected name from package.json
  let storageName = storageEnv || (storagePacked ? path.basename(storagePacked) : null) || resolveTgzNameFromPkg('..\\pcurich-client-storage'.replace(/\\\\/g, path.sep), 'pcurich-client-storage');
  let httpName = httpEnv || (httpPacked ? path.basename(httpPacked) : null) || resolveTgzNameFromPkg('..\\pcurich-http-mock-workbench'.replace(/\\\\/g, path.sep), 'pcurich-http-mock-workbench');

  if (storagePacked) copyToDest(storagePacked, root);
  else if (storageName) {
    const candidate = path.resolve(root, storageName);
    if (fs.existsSync(candidate)) copyToDest(candidate, root);
  }

  if (httpPacked) copyToDest(httpPacked, root);
  else if (httpName) {
    const candidate = path.resolve(root, httpName);
    if (fs.existsSync(candidate)) copyToDest(candidate, root);
  }

  console.log('prepare-pack completed. storage:', storageName, 'http:', httpName);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
