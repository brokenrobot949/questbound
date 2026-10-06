// A tiny in-browser test runner: register checks with test(), then call run() to show
// a pass or fail list on the page.

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message ? `${message}: ` : ''}expected ${e}, got ${a}`);
}

export function assertTrue(value, message = 'expected true') {
  if (value !== true) throw new Error(message);
}

export function assertThrows(fn, message = 'expected an error') {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(message);
}

// A stand-in RNG whose dice land on the faces you list, in order: scriptedRng([14, 7])
// makes the next two d20s come up 14 then 7. Only for tests.
export function scriptedRng(faces) {
  const queue = [...faces];
  return {
    nextInt(n) {
      if (queue.length === 0) throw new Error('scriptedRng ran out of faces');
      const face = queue.shift();
      if (face < 1 || face > n) throw new Error(`scriptedRng face ${face} doesn't fit a d${n}`);
      return face - 1;
    },
    remaining: () => queue.length,
  };
}

// Runs every check in order, waiting for any that are async.
export async function run(summaryEl, listEl) {
  let passed = 0;
  for (const t of tests) {
    const li = document.createElement('li');
    try {
      await t.fn();
      passed += 1;
      li.className = 'pass';
      li.textContent = `PASS  ${t.name}`;
    } catch (error) {
      li.className = 'fail';
      li.textContent = `FAIL  ${t.name}\n      ${error.message}`;
      console.error(t.name, error);
    }
    listEl.append(li);
  }
  const failed = tests.length - passed;
  summaryEl.textContent = `${passed} passed, ${failed} failed`;
  summaryEl.className = failed === 0 ? 'pass' : 'fail';
  document.title = `${failed === 0 ? 'PASS' : 'FAIL'} · ${document.title.replace(/^(PASS|FAIL) · /, '')}`;
}

// Like assertThrows, for async code.
export async function assertRejects(fn, message = 'expected an error') {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(message);
}
