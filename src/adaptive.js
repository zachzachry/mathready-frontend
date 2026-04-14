// ─────────────────────────────────────────────────────────────
//  adaptive.js  —  Parametric question generators + adaptive picker
// ─────────────────────────────────────────────────────────────

// Helpers
const rnd  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const uid  = ()         => 'p_' + Math.random().toString(36).slice(2, 9);
const shuffle = arr     => [...arr].sort(() => Math.random() - 0.5);

// Fraction display helper — returns LaTeX string
function frac(n, d) { return `$\\frac{${n}}{${d}}$`; }

// Wrong answer helpers
function nearInts(correct, count = 3, spread = 15) {
  const wrongs = new Set();
  while (wrongs.size < count) {
    const delta = rnd(1, spread) * (Math.random() < 0.5 ? 1 : -1);
    const w = correct + delta;
    if (w !== correct && w > 0) wrongs.add(w);
  }
  return [...wrongs];
}

function wrongFracs(correctN, correctD, count = 3) {
  const wrongs = [];
  const seen   = new Set([`${correctN}/${correctD}`]);
  const tries  = [[correctN + 1, correctD], [correctN - 1, correctD],
                  [correctN, correctD + 1], [correctN, correctD - 1],
                  [correctN + correctD, correctD], [correctN, correctD + correctD]];
  for (const [n, d] of tries) {
    if (n > 0 && d > 1 && !seen.has(`${n}/${d}`)) {
      wrongs.push({ n, d });
      seen.add(`${n}/${d}`);
      if (wrongs.length === count) break;
    }
  }
  // Pad if needed
  while (wrongs.length < count) wrongs.push({ n: rnd(1, 9), d: rnd(2, 12) });
  return wrongs;
}

// ─────────────────────────────────────────────────────────────
//  PARAMETRIC GENERATORS  (one per standard cluster)
// ─────────────────────────────────────────────────────────────

const GENERATORS = {

  // 5.NR.2.1 — multiply multi-digit whole numbers
  '5.NR.2.1': (opts = {}) => {
    const templates = [
      () => { const a=rnd(12,99),b=rnd(12,99); const ans=a*b;
               const ws=nearInts(ans,3,a+b);
               return { q:`What is ${a} × ${b}?`, correct:String(ans), wrongs:ws.map(String) }; },
      () => { const a=rnd(100,999),b=rnd(2,9); const ans=a*b;
               const ws=nearInts(ans,3,20);
               return { q:`What is ${a} × ${b}?`, correct:String(ans), wrongs:ws.map(String) }; },
      () => { const a=rnd(10,50),b=rnd(10,50),c=rnd(2,9); const ans=a*b*c;
               const ws=nearInts(ans,3,30);
               return { q:`What is ${a} × ${b} × ${c}?`, correct:String(ans), wrongs:ws.map(String) }; },
    ];
    const t = shuffle(templates)[0]();
    const choices = shuffle([t.correct, ...t.wrongs.slice(0,3)]);
    return { id:uid(), standard:'5.NR.2.1', dok:1, parametric:true,
             question: t.q, correct: t.correct, choices };
  },

  // 5.NR.2.2 — divide multi-digit whole numbers
  '5.NR.2.2': (opts = {}) => {
    const b = rnd(2, 12); const ans = rnd(10, 99); const a = b * ans;
    const ws = nearInts(ans, 3, 8);
    const choices = shuffle([String(ans), ...ws.slice(0,3).map(String)]);
    return { id:uid(), standard:'5.NR.2.2', dok:1, parametric:true,
             question:`What is ${a} ÷ ${b}?`,
             correct:String(ans), choices };
  },

  // 5.NR.3.1 — add/subtract fractions with unlike denominators
  '5.NR.3.1': (opts = {}) => {
    const DENOMS = [2,3,4,5,6,8,10,12];
    const d1 = shuffle(DENOMS)[0];
    const d2 = shuffle(DENOMS.filter(d=>d!==d1))[0];
    const lcd = d1 * d2 / gcd(d1, d2);
    const n1 = rnd(1, d1 - 1);
    const n2 = rnd(1, d2 - 1);
    const op = Math.random() < 0.5 ? '+' : '-';
    const rn1 = n1 * (lcd / d1);
    const rn2 = n2 * (lcd / d2);
    let resN = op === '+' ? rn1 + rn2 : rn1 - rn2;
    if (resN <= 0) { return GENERATORS['5.NR.3.1'](); } // retry if negative
    const g = gcd(Math.abs(resN), lcd);
    const finalN = resN / g, finalD = lcd / g;
    const correctStr = finalD === 1 ? String(finalN) : frac(finalN, finalD);
    const wf = wrongFracs(finalN, finalD, 3);
    const choices = shuffle([correctStr, ...wf.map(({n,d})=> d===1?String(n):frac(n,d))]);
    return { id:uid(), standard:'5.NR.3.1', dok:2, parametric:true,
             question:`What is ${frac(n1,d1)} ${op} ${frac(n2,d2)}?`,
             correct:correctStr, choices };
  },

  // 5.NR.3.2 — multiply fractions
  '5.NR.3.2': (opts = {}) => {
    const n1=rnd(1,5), d1=rnd(2,8), n2=rnd(1,5), d2=rnd(2,8);
    const rn=n1*n2, rd=d1*d2;
    const g=gcd(rn,rd); const fn=rn/g, fd=rd/g;
    const correctStr = fd===1 ? String(fn) : frac(fn,fd);
    const wf = wrongFracs(fn,fd,3);
    const choices = shuffle([correctStr, ...wf.map(({n,d})=>d===1?String(n):frac(n,d))]);
    return { id:uid(), standard:'5.NR.3.2', dok:2, parametric:true,
             question:`What is ${frac(n1,d1)} × ${frac(n2,d2)}?`,
             correct:correctStr, choices };
  },

  // 5.NR.3.3 — divide fractions
  '5.NR.3.3': (opts = {}) => {
    const n1=rnd(1,5), d1=rnd(2,8), n2=rnd(1,5), d2=rnd(2,8);
    // a/b ÷ c/d = (a*d)/(b*c)
    const rn=n1*d2, rd=d1*n2;
    const g=gcd(rn,rd); const fn=rn/g, fd=rd/g;
    const correctStr = fd===1 ? String(fn) : frac(fn,fd);
    const wf = wrongFracs(fn,fd,3);
    const choices = shuffle([correctStr, ...wf.map(({n,d})=>d===1?String(n):frac(n,d))]);
    return { id:uid(), standard:'5.NR.3.3', dok:2, parametric:true,
             question:`What is ${frac(n1,d1)} ÷ ${frac(n2,d2)}?`,
             correct:correctStr, choices };
  },

  // 5.NR.4.1 — add/subtract decimals
  '5.NR.4.1': (opts = {}) => {
    const places = rnd(1,2);
    const mul = Math.pow(10, places);
    const a = rnd(10, 999) / mul;
    const b = rnd(1,  500) / mul;
    const op = Math.random() < 0.5 ? '+' : '-';
    const raw = op === '+' ? a + b : a - b;
    if (raw <= 0) return GENERATORS['5.NR.4.1']();
    const ans = parseFloat(raw.toFixed(places));
    const ws  = [ans + 1/mul, ans - 1/mul, ans + 10/mul].filter(w=>w>0 && w!==ans).map(w=>parseFloat(w.toFixed(places)));
    const choices = shuffle([String(ans), ...ws.slice(0,3).map(String)]);
    return { id:uid(), standard:'5.NR.4.1', dok:1, parametric:true,
             question:`What is ${a} ${op} ${b}?`,
             correct:String(ans), choices };
  },

  // 5.NR.4.2 — multiply decimals
  '5.NR.4.2': (opts = {}) => {
    const a = rnd(1, 99) / 10;
    const b = rnd(1, 9);
    const ans = parseFloat((a * b).toFixed(2));
    const ws  = [ans + 0.1, ans - 0.1, ans + 1].filter(w=>w>0&&w!==ans).map(w=>parseFloat(w.toFixed(2)));
    const choices = shuffle([String(ans), ...ws.slice(0,3).map(String)]);
    return { id:uid(), standard:'5.NR.4.2', dok:1, parametric:true,
             question:`What is ${a} × ${b}?`,
             correct:String(ans), choices };
  },

  // 5.NR.1.1 — place value / read & write numbers
  '5.NR.1.1': (opts = {}) => {
    const n = rnd(10000, 999999);
    const places = ['ones','tens','hundreds','thousands','ten-thousands','hundred-thousands'];
    const digits  = String(n).split('').reverse();
    const idx  = rnd(0, Math.min(digits.length - 1, 5));
    const digit = Number(digits[idx]);
    const place = places[idx];
    const val   = digit * Math.pow(10, idx);
    const ws    = [val * 10, val / 10, val + Math.pow(10, idx)].filter(w=>w>0&&w!==val);
    const choices = shuffle([String(val), ...ws.slice(0,3).map(String)]);
    return { id:uid(), standard:'5.NR.1.1', dok:1, parametric:true,
             question:`In the number ${n.toLocaleString()}, what is the value of the digit in the ${place} place?`,
             correct:String(val), choices };
  },

  // ── Multiplication & Division Practice ──────────────────────

  // MUL.TRAD — multiplication computation (3 difficulty tiers, aligned to 5.NR.2.1)
  // easy: 2-digit × 1-digit | medium: 2-digit × 2-digit or 3-digit × 1-digit | hard: 3-digit × 2-digit
  'MUL.TRAD': (opts = {}) => {
    const tier = opts.tier || 'easy';
    const templates = [];

    if (tier === 'easy') {
      // 2-digit × 1-digit
      templates.push(() => {
        const a = rnd(10,99), b = rnd(2,9), ans = a*b;
        return { q:`What is ${a} × ${b}?`, ans, ws: nearInts(ans,3,Math.max(5,Math.floor(a/2))) };
      });
    } else if (tier === 'medium') {
      // 2-digit × 2-digit
      templates.push(() => {
        const a = rnd(10,99), b = rnd(10,99), ans = a*b;
        return { q:`What is ${a} × ${b}?`, ans, ws: nearInts(ans,3,Math.max(20,Math.floor(ans*0.08))) };
      });
      // 3-digit × 1-digit
      templates.push(() => {
        const a = rnd(100,999), b = rnd(2,9), ans = a*b;
        return { q:`What is ${a} × ${b}?`, ans, ws: nearInts(ans,3,Math.max(20,Math.floor(ans*0.08))) };
      });
    } else {
      // 3-digit × 2-digit (standard level: up to 999 × 99)
      templates.push(() => {
        const a = rnd(100,999), b = rnd(10,99), ans = a*b;
        return { q:`What is ${a} × ${b}?`, ans, ws: nearInts(ans,3,Math.max(50,Math.floor(ans*0.08))) };
      });
      // Missing factor (3-digit × 2-digit)
      templates.push(() => {
        const a = rnd(100,500), b = rnd(10,25), product = a*b;
        return { q:`${a} × ___ = ${product.toLocaleString()}. What is the missing factor?`, ans: b,
                 ws: nearInts(b,3,Math.max(3,Math.floor(b*0.2))) };
      });
    }

    const t = shuffle(templates)[0]();
    const choices = shuffle([String(t.ans), ...t.ws.slice(0,3).map(String)]);
    return { id:uid(), standard:'MUL.TRAD', dok:tier==='hard'?2:1, parametric:true,
             question:t.q, correct:String(t.ans), choices };
  },

  // MUL.WORD — multiplication word problems (3 difficulty tiers, aligned to 5.NR.2.1)
  'MUL.WORD': (opts = {}) => {
    const tier = opts.tier || 'easy';
    let a, b;
    if (tier === 'easy')        { a = rnd(10,99);  b = rnd(2,9);   }   // 2-digit × 1-digit
    else if (tier === 'medium') { a = rnd(10,99);  b = rnd(10,99); }   // 2-digit × 2-digit
    else                        { a = rnd(100,999);b = rnd(10,99); }   // 3-digit × 2-digit
    const ans = a * b;
    const ws  = nearInts(ans, 3, Math.max(10, Math.floor(ans * 0.08)));

    const stems = [
      `A teacher buys ${a} packs of pencils. Each pack has ${b} pencils. How many pencils does the teacher have in all?`,
      `A school orders ${a} boxes of crayons. Each box contains ${b} crayons. How many crayons were ordered in all?`,
      `A baker makes ${a} trays of muffins. Each tray holds ${b} muffins. How many muffins did the baker make in all?`,
      `A cafeteria sets up ${a} tables. Each table seats ${b} students. How many students can be seated in all?`,
      `Each pencil case costs $${a}. How much will ${b} pencil cases cost in all?`,
      `Tickets to the school fair cost $${a} each. How much will ${b} tickets cost in all?`,
      `A soccer player scores ${a} points per game. How many points will the player score after ${b} games?`,
      `During practice, each player does ${a} push-ups. There are ${b} players on the team. How many push-ups are done in all?`,
      `A garden has ${a} rows of flowers. Each row has ${b} flowers. How many flowers are in the garden?`,
      `A rectangular field is ${a} meters long and ${b} meters wide. What is the area of the field in square meters?`,
      `A school building has ${a} floors. Each floor has ${b} classrooms. How many classrooms are there in all?`,
      `A bookshelf has ${a} shelves. Each shelf holds ${b} books. How many books can the bookshelf hold in all?`,
    ];

    const q = shuffle(stems)[0];
    const isMoney = (q.startsWith('Each') && q.includes('$')) || q.startsWith('Tickets');
    const correctStr = isMoney ? `$${ans}` : String(ans);
    const wrongStrs  = isMoney ? ws.map(n => `$${n}`) : ws.map(String);
    const choices    = shuffle([correctStr, ...wrongStrs.slice(0,3)]);
    return { id:uid(), standard:'MUL.WORD', dok:2, parametric:true,
             question:q, correct:correctStr, choices };
  },

  // DIV.TRAD — division computation (3 difficulty tiers, aligned to 5.NR.2.2)
  // easy: basic facts ÷ 1-digit | medium: 3-digit ÷ 1-digit | hard: 4-digit ÷ 2-digit (divisor ≤ 25)
  // All problems may have a remainder; students enter quotient + remainder (0 if none)
  'DIV.TRAD': (opts = {}) => {
    const tier = opts.tier || 'easy';
    let divisor, quotient;
    if (tier === 'easy')        { divisor = rnd(2,9);  quotient = rnd(2,9);   }
    else if (tier === 'medium') { divisor = rnd(2,9);  quotient = rnd(10,99); }
    else                        { divisor = rnd(11,25);quotient = rnd(40,399);}
    const remainder = rnd(0, divisor - 1);
    const dividend  = divisor * quotient + remainder;
    return { id:uid(), standard:'DIV.TRAD', dok:tier==='hard'?2:1, parametric:true,
             question:`What is ${dividend.toLocaleString()} ÷ ${divisor}?`,
             correct:String(quotient), remainder:String(remainder), choices:[] };
  },

  // DIV.WORD — division word problems (3 difficulty tiers, aligned to 5.NR.2.2)
  'DIV.WORD': (opts = {}) => {
    const tier = opts.tier || 'easy';
    let groups, quotient;
    if (tier === 'easy')        { groups = rnd(2,9);  quotient = rnd(2,9);   }   // basic facts
    else if (tier === 'medium') { groups = rnd(2,9);  quotient = rnd(10,99); }   // 3-digit ÷ 1-digit
    else                        { groups = rnd(11,25);quotient = rnd(40,399);}   // 4-digit ÷ 2-digit ≤ 25
    const total  = groups * quotient;
    const spread = Math.max(2, Math.floor(quotient * 0.12));
    const ws     = nearInts(quotient, 3, spread);

    const stems = [
      `A teacher has ${total} stickers to share equally among ${groups} students. How many stickers does each student get?`,
      `A class of ${groups} students will share ${total} colored pencils equally. How many pencils does each student get?`,
      `A chef made ${total} sandwiches for ${groups} tables. Each table gets the same number. How many sandwiches does each table get?`,
      `There are ${total} pieces of fruit divided equally into ${groups} bowls. How many pieces of fruit are in each bowl?`,
      `${total} chairs are arranged equally in ${groups} rows. How many chairs are in each row?`,
      `A coach has ${total} tennis balls to put equally into ${groups} containers. How many tennis balls go in each container?`,
      `There are ${total} students divided into ${groups} equal teams. How many students will be on each team?`,
      `A farmer picks ${total} apples and places them equally into ${groups} baskets. How many apples go in each basket?`,
      `A school has ${total} books to place equally on ${groups} shelves. How many books go on each shelf?`,
      `${total} concert tickets are divided equally among ${groups} classrooms. How many tickets does each classroom get?`,
      `A store sold ${groups} identical items for a total of $${total}. How much did each item cost?`,
      `${groups} friends split the cost of supplies equally. The total was $${total}. How much did each friend pay?`,
    ];

    const q = shuffle(stems)[0];
    const isMoney = q.includes(`$${total}`);
    const correctStr = isMoney ? `$${quotient}` : String(quotient);
    const wrongStrs  = isMoney ? ws.map(n => `$${n}`) : ws.map(String);
    const choices    = shuffle([correctStr, ...wrongStrs.slice(0,3)]);
    return { id:uid(), standard:'DIV.WORD', dok:2, parametric:true,
             question:q, correct:correctStr, choices };
  },

  // ── Fraction Practice Standards ──────────────────────────────

  // FRA.DIV — 5.NR.3.1: Fraction as division (a ÷ b = a/b)
  // easy: "What fraction equals a ÷ b?" (proper fraction, no reduction needed)
  // medium: word problem (sharing, result is proper fraction)
  // hard: "What fraction in simplest form equals a ÷ b?" (requires GCD reduction)
  'FRA.DIV': (opts = {}) => {
    const tier = opts.tier || 'easy';

    if (tier === 'easy') {
      const a = rnd(1, 6), b = rnd(a + 1, 9);
      const correctStr = frac(a, b);
      const wf = wrongFracs(a, b, 3);
      const choices = shuffle([correctStr, ...wf.map(({ n, d }) => d === 1 ? String(n) : frac(n, d))]);
      return { id: uid(), standard: 'FRA.DIV', dok: 1, parametric: true,
               question: `What fraction is equal to ${a} ÷ ${b}?`, correct: correctStr, choices };
    }

    if (tier === 'medium') {
      // Sharing word problems: k items shared among n people → k/n (k < n)
      const n = rnd(4, 10), k = rnd(1, n - 1);
      const correctStr = frac(k, n);
      const wf = wrongFracs(k, n, 3);
      const choices = shuffle([correctStr, ...wf.map(({ n: wn, d: wd }) => wd === 1 ? String(wn) : frac(wn, wd))]);
      const stems = [
        `${n} students share ${k} pizza${k > 1 ? 's' : ''} equally. What fraction of a pizza does each student get?`,
        `${k} gallon${k > 1 ? 's' : ''} of lemonade ${k > 1 ? 'are' : 'is'} shared equally among ${n} people. What fraction of a gallon does each person get?`,
        `A teacher divides ${k} pound${k > 1 ? 's' : ''} of clay equally among ${n} students. What fraction of a pound does each student receive?`,
        `${n} friends split ${k} yard${k > 1 ? 's' : ''} of ribbon equally. What fraction of a yard does each friend get?`,
        `${k} sandwich${k > 1 ? 'es' : ''} ${k > 1 ? 'are' : 'is'} divided equally among ${n} campers. What fraction of a sandwich does each camper get?`,
      ];
      return { id: uid(), standard: 'FRA.DIV', dok: 2, parametric: true,
               question: shuffle(stems)[0], correct: correctStr, choices };
    }

    // hard: requires GCD reduction
    let p, q, k;
    do { p = rnd(1, 5); q = rnd(p + 1, 8); k = rnd(2, 4); } while (gcd(p, q) !== 1);
    const a = k * p, b = k * q;
    const correctStr = frac(p, q);
    const wf = wrongFracs(p, q, 3);
    const choices = shuffle([correctStr, ...wf.map(({ n, d }) => d === 1 ? String(n) : frac(n, d))]);
    return { id: uid(), standard: 'FRA.DIV', dok: 2, parametric: true,
             question: `What fraction in simplest form is equal to ${a} ÷ ${b}?`,
             correct: correctStr, choices };
  },

  // FRA.MUL — 5.NR.3.4: Multiply a fraction by a whole number
  // easy: 1/d × (d × k) = k  (whole number result, straightforward)
  // medium: p/q × (q × k) = p × k  (larger numbers, still whole result)
  // hard: word problem version
  'FRA.MUL': (opts = {}) => {
    const tier = opts.tier || 'easy';
    const d = rnd(2, 6), k = rnd(2, 8);

    if (tier === 'easy') {
      const whole = d * k, ans = k;
      const ws = nearInts(ans, 3, Math.max(2, Math.floor(ans * 0.4)));
      const choices = shuffle([String(ans), ...ws.slice(0, 3).map(String)]);
      return { id: uid(), standard: 'FRA.MUL', dok: 1, parametric: true,
               question: `What is ${frac(1, d)} × ${whole}?`, correct: String(ans), choices };
    }

    if (tier === 'medium') {
      const p = rnd(2, d - 1 > 1 ? d - 1 : 2), whole = d * k, ans = p * k;
      const ws = nearInts(ans, 3, Math.max(3, Math.floor(ans * 0.2)));
      const choices = shuffle([String(ans), ...ws.slice(0, 3).map(String)]);
      return { id: uid(), standard: 'FRA.MUL', dok: 2, parametric: true,
               question: `What is ${frac(p, d)} × ${whole}?`, correct: String(ans), choices };
    }

    // hard: word problem
    const p = rnd(2, d - 1 > 1 ? d - 1 : 2), whole = d * k, ans = p * k;
    const ws = nearInts(ans, 3, Math.max(3, Math.floor(ans * 0.2)));
    const choices = shuffle([String(ans), ...ws.slice(0, 3).map(String)]);
    const stems = [
      `A garden has ${whole} flowers. ${frac(p, d)} of the flowers are roses. How many flowers are roses?`,
      `A school ordered ${whole} books. ${frac(p, d)} of the books are math books. How many math books were ordered?`,
      `There are ${whole} students at field day. ${frac(p, d)} of the students are on the red team. How many students are on the red team?`,
      `A baker made ${whole} muffins. ${frac(p, d)} of the muffins are blueberry. How many blueberry muffins are there?`,
      `A parking lot has ${whole} spaces. ${frac(p, d)} of the spaces are reserved. How many spaces are reserved?`,
    ];
    return { id: uid(), standard: 'FRA.MUL', dok: 2, parametric: true,
             question: shuffle(stems)[0], correct: String(ans), choices };
  },

  // FRA.SCALE — 5.NR.3.5: Fraction scaling (explain why multiplying by fraction > 1 or < 1)
  // easy: compare product to original whole number (greater/less/equal)
  // medium: "Which expression gives a product greater than [n]?"
  // hard: general reasoning about multiplying by a fraction
  'FRA.SCALE': (opts = {}) => {
    const tier = opts.tier || 'easy';
    const whole = rnd(8, 24);

    if (tier === 'easy') {
      const type = rnd(0, 2); // 0=less, 1=greater, 2=equal
      let p, q;
      if (type === 0) { q = rnd(3, 8); p = rnd(1, q - 1); }
      else if (type === 1) { q = rnd(2, 5); p = q + rnd(1, 3); }
      else { q = rnd(2, 8); p = q; }
      const correct = type === 0 ? `Less than ${whole}`
                    : type === 1 ? `Greater than ${whole}`
                    : `Equal to ${whole}`;
      const choices = shuffle([`Greater than ${whole}`, `Less than ${whole}`,
                                `Equal to ${whole}`, 'Cannot be determined']);
      return { id: uid(), standard: 'FRA.SCALE', dok: 2, parametric: true,
               question: `What is ${whole} × ${frac(p, q)} compared to ${whole}?`,
               correct, choices };
    }

    if (tier === 'medium') {
      // Which expression gives a product GREATER THAN whole?
      const q = rnd(3, 6);
      const correctP = q + rnd(1, 3);                             // fraction > 1
      const wrongPs = [rnd(1, q - 1), rnd(1, q - 1), rnd(1, q - 1)]; // fractions < 1
      const correctExpr = `${whole} × ${frac(correctP, q)}`;
      const wrongExprs  = wrongPs.map(p2 => `${whole} × ${frac(p2, q)}`);
      const choices = shuffle([correctExpr, ...wrongExprs.slice(0, 3)]);
      return { id: uid(), standard: 'FRA.SCALE', dok: 2, parametric: true,
               question: `Which expression gives a product greater than ${whole}?`,
               correct: correctExpr, choices };
    }

    // hard: general reasoning
    const type = rnd(0, 1);
    let p, q;
    if (type === 0) { q = rnd(3, 8); p = rnd(1, q - 1); }
    else             { q = rnd(2, 5); p = q + rnd(1, 3); }
    const correct = type === 0
      ? 'The product is less than the whole number'
      : 'The product is greater than the whole number';
    const choices = shuffle([
      'The product is less than the whole number',
      'The product is greater than the whole number',
      'The product equals the whole number',
      'The product could be any value',
    ]);
    return { id: uid(), standard: 'FRA.SCALE', dok: 3, parametric: true,
             question: `A whole number is multiplied by ${frac(p, q)}. What must be true about the product?`,
             correct, choices };
  },

  // FRA.DIV_UNIT — 5.NR.3.6: Divide unit fractions by whole numbers and whole numbers by unit fractions
  // easy:   1/n ÷ k  = 1/(n×k)
  // medium: k ÷ 1/n  = k×n
  // hard:   word problem (k ÷ 1/n)
  'FRA.DIV_UNIT': (opts = {}) => {
    const tier = opts.tier || 'easy';

    if (tier === 'easy') {
      const n = rnd(2, 6), k = rnd(2, 6);
      const correctStr = frac(1, n * k);
      const wf = wrongFracs(1, n * k, 3);
      const choices = shuffle([correctStr, ...wf.map(({ n: wn, d: wd }) => wd === 1 ? String(wn) : frac(wn, wd))]);
      return { id: uid(), standard: 'FRA.DIV_UNIT', dok: 1, parametric: true,
               question: `What is ${frac(1, n)} ÷ ${k}?`, correct: correctStr, choices };
    }

    if (tier === 'medium') {
      const k = rnd(2, 8), n = rnd(2, 8), ans = k * n;
      const ws = nearInts(ans, 3, Math.max(3, Math.floor(ans * 0.15)));
      const choices = shuffle([String(ans), ...ws.slice(0, 3).map(String)]);
      return { id: uid(), standard: 'FRA.DIV_UNIT', dok: 2, parametric: true,
               question: `What is ${k} ÷ ${frac(1, n)}?`, correct: String(ans), choices };
    }

    // hard: word problem (whole ÷ unit fraction)
    const k = rnd(2, 8), n = rnd(2, 8), ans = k * n;
    const ws = nearInts(ans, 3, Math.max(3, Math.floor(ans * 0.15)));
    const choices = shuffle([String(ans), ...ws.slice(0, 3).map(String)]);
    const stems = [
      `A baker has ${k} pound${k > 1 ? 's' : ''} of flour. Each loaf of bread uses ${frac(1, n)} pound of flour. How many loaves can the baker make?`,
      `A rope is ${k} foot${k > 1 ? ' long' : ''}. It is cut into pieces that are each ${frac(1, n)} foot long. How many pieces are there?`,
      `A pitcher holds ${k} cup${k > 1 ? 's' : ''} of juice. Each serving is ${frac(1, n)} cup. How many servings are in the pitcher?`,
      `A shelf is ${k} foot${k > 1 ? ' long' : ''}. Each book is ${frac(1, n)} foot wide. How many books fit on the shelf?`,
      `A garden has ${k} pound${k > 1 ? 's' : ''} of seeds. Each row needs ${frac(1, n)} pound of seeds. How many rows can be planted?`,
    ];
    return { id: uid(), standard: 'FRA.DIV_UNIT', dok: 2, parametric: true,
             question: shuffle(stems)[0], correct: String(ans), choices };
  },
};

// GCD helper
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// Standards that have parametric generators
export const PARAMETRIC_STANDARDS = Object.keys(GENERATORS);

// Generate a fresh parametric question for a given standard
export function generateParametric(standard, opts = {}) {
  const gen = GENERATORS[standard];
  if (!gen) return null;
  try { return gen(opts); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
//  ADAPTIVE PICKER
// ─────────────────────────────────────────────────────────────

/**
 * Build a weight map per standard from session history.
 * Lower accuracy → higher weight (more likely to be picked).
 */
export function buildWeightMap(sessions) {
  const map = {};     // standard → { correct, total }
  sessions.forEach(sess => {
    Object.entries(sess.answers || {}).forEach(([, ans]) => {
      // We don't have the question object here, just store what we can
    });
    // Use standardMastery if included in session
    Object.entries(sess.standardMastery || {}).forEach(([std, d]) => {
      if (!map[std]) map[std] = { correct:0, total:0 };
      map[std].correct += d.correct || 0;
      map[std].total   += d.total   || 0;
    });
  });

  // Convert to weights: 1 - accuracy, floor at 0.1 so all standards have some chance
  const weights = {};
  Object.entries(map).forEach(([std, d]) => {
    const acc = d.total > 0 ? d.correct / d.total : 0.5;
    weights[std] = Math.max(0.1, 1 - acc);
  });
  return weights;
}

/**
 * Update weights based on in-session performance.
 * Two wrong in a row on a standard → boost it. Three right → reduce it.
 */
export function updateSessionWeights(weights, sessionHistory, allStandards) {
  const updated = { ...weights };

  // Seed any standard not yet in weights
  allStandards.forEach(std => { if (!updated[std]) updated[std] = 0.5; });

  // Tally recent per-standard streak
  const recent = {};
  [...sessionHistory].reverse().forEach(item => {
    const std = item.q?.standard;
    if (!std || recent[std]) return;
    recent[std] = { correct: item.correct, count: 1 };
  });
  // Second pass for streak of 2
  const counts = {};
  sessionHistory.forEach(item => {
    const std = item.q?.standard;
    if (!std) return;
    if (!counts[std]) counts[std] = { correct:0, total:0 };
    counts[std].total++;
    if (item.correct) counts[std].correct++;
  });

  Object.entries(counts).forEach(([std, d]) => {
    const acc = d.correct / d.total;
    if (acc < 0.5 && d.total >= 2)  updated[std] = Math.min(1.0, (updated[std] || 0.5) + 0.2);
    if (acc >= 0.7 && d.total >= 2) updated[std] = Math.max(0.05, (updated[std] || 0.5) - 0.3);
  });

  return updated;
}

/**
 * Pick the next question adaptively.
 * - Uses weighted random standard selection
 * - Prefers bank questions student hasn't seen this session
 * - Falls back to parametric for standards with generators
 * - Falls back to pure random if nothing else works
 */
export function pickAdaptiveQuestion(bankQ, weights, seenIds, allStandards) {
  // Build weighted list of standards
  const stds = allStandards.length ? allStandards :
    [...new Set(bankQ.map(q => q.standard))];

  // Weighted random selection of standard
  const totalWeight = stds.reduce((sum, std) => sum + (weights[std] || 0.5), 0);
  let r = Math.random() * totalWeight;
  let chosenStd = stds[stds.length - 1];
  for (const std of stds) {
    r -= (weights[std] || 0.5);
    if (r <= 0) { chosenStd = std; break; }
  }

  // Try unseen bank question for this standard
  const unseenForStd = bankQ.filter(q => q.standard === chosenStd && !seenIds.has(q.id));
  if (unseenForStd.length > 0) {
    return unseenForStd[Math.floor(Math.random() * unseenForStd.length)];
  }

  // Try parametric for this standard
  if (PARAMETRIC_STANDARDS.includes(chosenStd)) {
    const pq = generateParametric(chosenStd);
    if (pq) return pq;
  }

  // Fallback: any unseen bank question
  const unseen = bankQ.filter(q => !seenIds.has(q.id));
  if (unseen.length > 0) return unseen[Math.floor(Math.random() * unseen.length)];

  // Last resort: generate any parametric
  const pStd = shuffle(PARAMETRIC_STANDARDS)[0];
  return generateParametric(pStd) || bankQ[Math.floor(Math.random() * bankQ.length)];
}

// Standards for the Multiplication & Division practice mode
export const MUL_DIV_STANDARDS = ['MUL.TRAD', 'MUL.WORD', 'DIV.TRAD', 'DIV.WORD'];

// Standards for the Fractions practice mode (5.NR.3)
export const FRAC_STANDARDS = ['FRA.DIV', 'FRA.MUL', 'FRA.SCALE', 'FRA.DIV_UNIT'];

// All GSE 5th grade standards (for seeding weights)
export const ALL_STANDARDS = [
  '5.NR.1.1','5.NR.1.2',
  '5.NR.2.1','5.NR.2.2',
  '5.NR.3.1','5.NR.3.2','5.NR.3.3','5.NR.3.4','5.NR.3.5','5.NR.3.6',
  '5.NR.4.1','5.NR.4.2','5.NR.4.3','5.NR.4.4','5.NR.5.1',
  '5.PAR.6.1','5.PAR.6.2',
  '5.MDR.7.1','5.MDR.7.2','5.MDR.7.3','5.MDR.7.4',
  '5.GSR.8.1','5.GSR.8.2','5.GSR.8.3','5.GSR.8.4',
];

/**
 * Generate a full drill session — N unique parametric questions
 * spread evenly across the given standards.
 */
export function generateDrill(standards, count) {
  const qs = [];
  const validStds = standards.filter(s => GENERATORS[s]);
  if (!validStds.length) return [];

  let stdIdx = 0;
  let attempts = 0;
  while (qs.length < count && attempts < count * 4) {
    attempts++;
    const std = validStds[stdIdx % validStds.length];
    stdIdx++;
    const q = generateParametric(std);
    if (q) qs.push(q);
  }
  return qs;
}
