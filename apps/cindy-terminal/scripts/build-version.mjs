import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { valid } = createRequire(import.meta.url)('semver');

/** Release builds use the same APP_VERSION as Desktop. Source runs use the
 * nearest release in their own ancestry, never an unrelated newer tag. */
export function readCindyBuildVersion() {
  const version = process.env.APP_VERSION ?? execFileSync(
    'git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', 'HEAD'],
    { cwd: fileURLToPath(new URL('../../..', import.meta.url)), encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim().replace(/^v/, '');
  if (valid(version) !== version) throw new Error('CINDY_BUILD_VERSION_INVALID: set APP_VERSION to the Cindy release version');
  return version;
}
