import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/markdown.ts';

test('normales Markdown funktioniert', () => {
  const html = renderMarkdown('**fett** und _kursiv_');
  assert.match(html, /<strong>fett<\/strong>/);
  assert.match(html, /<em>kursiv<\/em>/);
});

test('rohes HTML wird zu Text, nicht ausgeführt', () => {
  const html = renderMarkdown('hallo <img src=x onerror=alert(1)> welt');
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;img/);
});

test('script-Block wird neutralisiert', () => {
  const html = renderMarkdown('<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script/i);
});

test('javascript-Links werden zu reinem Text', () => {
  const html = renderMarkdown('[klick](javascript:alert(1))');
  assert.doesNotMatch(html, /href/i);
  assert.match(html, /klick/);
});

test('https- und mailto-Links bleiben, mit sicheren Attributen', () => {
  const html = renderMarkdown('[a](https://example.com) [m](mailto:x@y.at)');
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /rel="noopener noreferrer nofollow"/);
  assert.match(html, /href="mailto:x@y\.at"/);
});

test('Bilder entfallen (kein Tracking-Pixel)', () => {
  const html = renderMarkdown('![pixel](https://tracker.example/p.gif)');
  assert.doesNotMatch(html, /<img/i);
});
