import test from 'node:test';
import assert from 'node:assert/strict';
import { censorProfanity, containsProfanity } from './profanity.js';

test('censors Thai and English profanity but keeps the rest of the sentence', () => {
  const { clean, censored } = censorProfanity('มึงเป็นหมาป่าแน่ ไอ้ควย you fucking wolf');

  assert.equal(censored, true);
  assert.ok(!clean.includes('ควย'));
  assert.ok(!/fucking/i.test(clean));
  assert.ok(clean.includes('เป็นหมาป่าแน่'), 'ใจความที่เหลือต้องอ่านรู้เรื่อง');
  assert.ok(clean.includes('wolf'));
});

test('catches symbol and stretched spellings', () => {
  assert.equal(containsProfanity('sh1t'), true);
  assert.equal(containsProfanity('fuuuuck'), true);
  assert.equal(containsProfanity('B!TCH'), true);
});

test('leaves clean messages untouched', () => {
  const text = 'I think p3 is the werewolf, he voted too fast';
  const { clean, censored } = censorProfanity(text);

  assert.equal(clean, text);
  assert.equal(censored, false);
});

test('does not censor innocent words that merely contain a bad substring', () => {
  // 'class' มี 'ass', 'grape' มี 'rape' — คำที่จับด้วยขอบเขตคำต้องไม่โดน
  const { clean, censored } = censorProfanity('the class is passing, cocktail at 5');

  assert.equal(censored, false);
  assert.equal(clean, 'the class is passing, cocktail at 5');
});

test('mask keeps the length of the word it replaces', () => {
  const { clean } = censorProfanity('shit');
  assert.equal(clean, '****');
});
