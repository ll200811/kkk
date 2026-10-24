import { afterEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listDir } from '../scanner';
import { loadIgnoreMatcher } from '../ignore';

// Narrow the real readdir overload used by listDir so enumeration mocks stay typed.
const directoryReader: {
  readdir(directory: string, options: { withFileTypes: true }): Promise<Dirent[]>;
} = fs;

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

it('separates complete enumeration from tree presentation filters', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-dir-'));
  roots.push(root);
  for (const name of ['dist', 'build', 'vendor']) await fs.mkdir(path.join(root, name));
  for (const name of ['.env', 'asset.meta', 'index.html']) await fs.writeFile(path.join(root, name), 'fixture');
  await fs.writeFile(path.join(root, 'dist/app.js'), 'fixture');
  expect((await listDir(root, '')).map(e => e.name).sort()).toEqual(
    ['.env', 'asset.meta', 'build', 'dist', 'index.html', 'vendor'],
  );
  const matcher = await loadIgnoreMatcher(root, { hideMetaFiles: true, honorVcsIgnore: false });
  expect((await listDir(root, '', matcher)).map(e => e.name)).toEqual(['.env', 'index.html']);
  expect((await listDir(root, 'dist')).map(e => e.relPath)).toEqual(['dist/app.js']);
  await expect(listDir(root, '', null, { maxEntries: 2 })).rejects.toThrow('DIRECTORY_TOO_LARGE');
  await expect(listDir(root, '', null, { maxEntries: NaN })).rejects.toThrow('Invalid');
  await expect(listDir(root, '../')).rejects.toThrow('escapes');
});

it('retains realpath boundaries when listing without presentation filters', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-dir-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-outside-'));
  roots.push(root, outside);
  await fs.symlink(outside, path.join(root, 'link'), 'junction');
  expect(await listDir(root, '')).toEqual([]);
  await expect(listDir(root, 'link')).rejects.toThrow('escapes');
});

// Regression: numbered lessons appeared as 01, 02, 10, 29, 3 in the file tree.
// Entry/result: listDir must return naturally ordered names, with directories first.
// Existing coverage only used alphabetic names. Minimal failure: 3.md / 10.md.
// Tier: unit; a small temporary directory exercises the production scanner.
it('sorts numbered files and directories naturally while ignoring case', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-dir-'));
  roots.push(root);
  for (const name of ['Chapter10', 'chapter2']) await fs.mkdir(path.join(root, name));
  for (const name of ['30.md', '3.md', '10.md', '02.md', '01.md', '29.md', 'Chapter10.md', 'chapter2.md']) {
    await fs.writeFile(path.join(root, name), 'fixture');
  }

  expect((await listDir(root, '')).map(entry => entry.name)).toEqual([
    'chapter2', 'Chapter10',
    '01.md', '02.md', '3.md', '10.md', '29.md', '30.md', 'chapter2.md', 'Chapter10.md',
  ]);
});

// Regression: numeric collation treats 1, 01 and 001 as equal. The directory
// reader's order must not replace the previous lexical tie-break rule.
// Entry/result: listDir returns 001.md, 01.md, 1.md regardless of enumeration.
// Existing tests do not contain equal numeric values. Tier: unit; real scanner.
it('uses the previous name order when numeric values are equal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-dir-'));
  roots.push(root);
  const names = ['1.md', '01.md', '001.md', '2.md'];
  for (const name of names) await fs.writeFile(path.join(root, name), 'fixture');
  const entries = await fs.readdir(root, { withFileTypes: true });
  entries.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
  // Supply a known enumeration order; the assertion must not depend on the OS.
  const readDir = vi.spyOn(directoryReader, 'readdir').mockResolvedValueOnce(entries);
  try {
    expect((await listDir(root, '')).map(entry => entry.name)).toEqual([
      '001.md', '01.md', '1.md', '2.md',
    ]);
  } finally {
    readDir.mockRestore();
  }
});

// Regression: sensitivity='accent' also collapses full/half-width letters.
// Entry/result: listDir retains the previous locale-aware text ordering.
// Existing coverage omits width and accent distinctions; A / Ａ is the minimal
// failure. Tier: unit; enumerate in reverse legacy order to expose equal ranks.
it('preserves the previous text order including width and accent distinctions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'complete-dir-'));
  roots.push(root);
  const names = ['zebra.md', 'README.md', 'apple.md', 'a.md', 'Ａ.md', 'á.md'];
  for (const name of names) await fs.writeFile(path.join(root, name), 'fixture');
  // Use the previous public behavior as a locale-aware compatibility oracle.
  const expected = [...names].sort((a, b) =>
    a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));
  const entries = await fs.readdir(root, { withFileTypes: true });
  entries.sort((a, b) => expected.indexOf(b.name) - expected.indexOf(a.name));
  const readDir = vi.spyOn(directoryReader, 'readdir').mockResolvedValueOnce(entries);
  try {
    expect((await listDir(root, '')).map(entry => entry.name)).toEqual(expected);
  } finally {
    readDir.mockRestore();
  }
});
