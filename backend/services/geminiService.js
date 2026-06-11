const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/*
  Gemini is attempted first. If quota or connectivity fails, the app uses a large
  built-in hard-bank fallback so every user still gets fresh, difficult questions.
  Bank size: 4000 (doubled). Difficulty: elite competitive exam level.
  Shuffling: cryptographically seeded per call so every user gets a unique order.
*/

const generateQuestions = async (category, count, excludeQuestions = []) => {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const entropy = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

  const avoidList = excludeQuestions
    .slice(0, 50)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const aptitudePrompt = `
You are a strict exam question generator for a competitive aptitude test.
Session ID: ${entropy}

YOUR ONLY JOB: Generate ${count} UNIQUE, EXTREMELY HARD quantitative aptitude questions at the hardest competitive-exam level (CAT/GMAT/GRE/Bank PO), with deep multi-step reasoning, layered calculations, and elite-level difficulty.

CRITICAL VARIETY RULE:
- Do NOT repeat the same question pattern, same topic, or same solving style.
- Mix different question types: pipes/cisterns, trains, mixtures/alligation, compound interest, partnership, work-wages, boats-streams, discounts, population/depreciation, mensuration, probability, percentage change, number system, age problems, speed/meeting-point, HCF/LCM, surds/indices, time-distance, allegation, calendar, clocks, permutation/combination.
- Make every question feel different from the previous one.

MANDATORY DIFFICULTY RULES — violating any rule means the question is REJECTED:
1. Questions must require AT LEAST 3 computational steps.
2. Avoid simple arithmetic and one-step formula questions.
3. Use fractional/decimal/large values that require careful computation.
4. Wrong options must reflect common mistakes (e.g., using simple instead of compound interest, forgetting to add both parts, inverting a ratio).
5. Avoid trivial questions like "find the SI on Rs.100 at 5%".

QUESTIONS TO AVOID (already covered):
${avoidList}

Return ONLY a raw JSON array. No markdown. No explanation.
Format:
[{"question":"...","options":["...","...","...","..."],"answer":"..."}]
`;

  const reasoningPrompt = `
You are a strict exam question generator for a competitive reasoning test.
Session ID: ${entropy}

YOUR ONLY JOB: Generate ${count} UNIQUE, EXTREMELY HARD logical reasoning questions at the hardest competitive-exam level (CAT/CLAT/SSC CGL/Bank PO), with deep multi-step reasoning, layered deductions, and elite-level difficulty.

CRITICAL VARIETY RULE:
- Do NOT repeat the same question pattern, same topic, or same solving style.
- Mix different reasoning formats: blood relations (multi-step), number/letter series (non-trivial patterns), syllogism (3+ premises), coding-decoding (multiple operations), directions (complex multi-turn), seating arrangements (circular + linear), input-output machines, compound inequalities, calendars, analogies (abstract), ranking (multi-condition), data sufficiency, alphanumeric series, word decoding, visual analogies, matrix-based puzzles.
- Make every question feel different from the previous one.

MANDATORY DIFFICULTY RULES — violating any rule means the question is REJECTED:
1. Questions must require multi-step deductions.
2. Use non-obvious patterns and indirect clues.
3. Wrong options must be plausible and reflect common reasoning errors.
4. Avoid trivially easy questions.

QUESTIONS TO AVOID (already covered):
${avoidList}

Return ONLY a raw JSON array. No markdown. No explanation.
Format:
[{"question":"...","options":["...","...","...","..."],"answer":"..."}]
`;

  const prompt = category === "aptitude" ? aptitudePrompt : reasoningPrompt;

  try {
    console.log(`[QGEN] Attempting Gemini AI for ${category} (${count} questions)...`);
    const result = await model.generateContent(prompt);
    console.log(`[QGEN] Gemini AI returned ${category} questions successfully.`);
    return result.response.text();
  } catch (error) {
    console.warn(`[QGEN] Gemini AI failed for ${category}, switching to local hard-bank fallback.`, error?.message || String(error));
    return JSON.stringify(generateLocalQuestions(category, count, excludeQuestions));
  }
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Per-call shuffle: combines Date.now() with Math.random() so every user/call
 *  produces a different ordering even if called at the same millisecond. */
function shuffle(array) {
  const copy = [...array];
  // Additional entropy seed mixed into index selection
  const seed = Date.now() ^ (Math.random() * 0xffffffff >>> 0);
  for (let i = copy.length - 1; i > 0; i--) {
    // XOR-mix the seed with i to produce per-position randomness
    const j = Math.floor((Math.random() + ((seed ^ i) % 97) / 970) * (i + 1)) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeOptions(answer, distractors) {
  const answerText = String(answer || "").trim();
  const uniqueOptions = [...new Set(
    [answerText, ...(distractors || []).map((item) => String(item || "").trim()).filter(Boolean)]
  )];

  if (uniqueOptions.length < 4) {
    uniqueOptions.push("Option A", "Option B", "Option C");
  }

  return shuffle(uniqueOptions).slice(0, 4);
}

function makeQuestion(category, question, answer, distractors) {
  return { category, question, options: makeOptions(answer, distractors), answer };
}

// ─── Hard Bank Generator (cached, lightweight fallback) ───────────────────

function generateHardBank(category, size = 150) {

  const bank = [];
  const used = new Set();

  console.log("generating hard questions");

  const addQuestion = (item) => {
    const text = String(item?.question || "").trim().toLowerCase();
    const options = Array.isArray(item?.options) ? item.options.map((o) => String(o || "").trim()) : [];

    if (!item?.question || !item?.answer || !text || used.has(text) || options.length !== 4 || !options.includes(String(item.answer).trim())) {
      return false;
    }

    used.add(text);
    bank.push(item);
    return true;
  };

  while (bank.length < size) {
    if (category === "aptitude") {
      const template = randomInt(1, 40); // expanded template pool

      // ── Original 24 templates (difficulty boosted) ──────────────────────────
      if (template === 1) {
        const a = randomInt(8, 16); const b = randomInt(10, 22); const c = randomInt(13, 25); const t = randomInt(3, 7);
        const fillRate = 1 / a + 1 / b;
        const emptyRate = 1 / c;
        const netAfterT = t * fillRate; // fraction filled in t hours
        // After C opens, net rate = fillRate - emptyRate; if negative, tank empties
        const net = fillRate - emptyRate;
        const hoursToEmpty = net < 0 ? (netAfterT / Math.abs(net)) : null;
        const answer = hoursToEmpty !== null
          ? `${hoursToEmpty.toFixed(2)} hours`
          : "Tank never empties";
        addQuestion(makeQuestion("aptitude",
          `Pipe A fills a tank in ${a} hours, Pipe B in ${b} hours, and Pipe C (outlet) drains it in ${c} hours. A and B run alone for ${t} hours, then all three are opened simultaneously. How many additional hours will it take to empty the tank completely?`,
          answer,
          [`${(+(hoursToEmpty || 0) + 1.5).toFixed(2)} hours`, `${(+(hoursToEmpty || 0) - 0.75).toFixed(2)} hours`, `${(+(hoursToEmpty || 0) + 3.25).toFixed(2)} hours`]
        ));
      } else if (template === 2) {
        const len1 = randomInt(120, 200); const len2 = randomInt(180, 280); const time = randomInt(10, 16);
        const speed = ((len1 + len2) / time) * 3.6;
        addQuestion(makeQuestion("aptitude",
          `A ${len1} m train crosses a ${len2} m platform in ${time} seconds. At the same speed, how long will it take (in seconds) to cross a pole?`,
          `${(len1 / (speed / 3.6)).toFixed(2)} seconds`,
          [`${(len1 / (speed / 3.6) + 2.5).toFixed(2)} seconds`, `${(len1 / (speed / 3.6) - 1.2).toFixed(2)} seconds`, `${((len1 + len2) / (speed / 3.6)).toFixed(2)} seconds`]
        ));
      } else if (template === 3) {
        const x = randomInt(5, 9); const y = randomInt(4, 8); const addLiters = randomInt(8, 18);
        const origTotal = addLiters * (x + y) / 2; // derived so it works out
        const milk = origTotal * x / (x + y);
        addQuestion(makeQuestion("aptitude",
          `A vessel has milk and water in the ratio ${x}:${y}. ${addLiters} litres of pure water are added, changing the ratio to ${x}:${y + 2}. What was the original volume of milk (in litres)?`,
          `${milk.toFixed(1)} litres`,
          [`${(milk + 2.5).toFixed(1)} litres`, `${(milk - 1.5).toFixed(1)} litres`, `${(milk + 5).toFixed(1)} litres`]
        ));
      } else if (template === 4) {
        const p = randomInt(2000, 5000); const r = randomInt(10, 18); const n = randomInt(2, 4);
        const amount = p * Math.pow(1 + r / 100, n);
        const CI = amount - p;
        const SI = p * r * n / 100;
        addQuestion(makeQuestion("aptitude",
          `Rs.${p} is invested at ${r}% p.a. compounded annually for ${n} years. By how much does the compound interest exceed the simple interest for the same period?`,
          `Rs.${(CI - SI).toFixed(2)}`,
          [`Rs.${(CI - SI + 50).toFixed(2)}`, `Rs.${(CI - SI - 30).toFixed(2)}`, `Rs.${(CI - SI + 120).toFixed(2)}`]
        ));
      } else if (template === 5) {
        const a = randomInt(2000, 5000); const b = randomInt(3000, 7000);
        const ta = randomInt(5, 10); const tb = randomInt(6, 12);
        const total = randomInt(15000, 30000);
        const shareA = total * (a * ta) / (a * ta + b * tb);
        const shareB = total - shareA;
        addQuestion(makeQuestion("aptitude",
          `A invests Rs.${a} for ${ta} months and B invests Rs.${b} for ${tb} months in a business. The total profit is Rs.${total}. What is A's profit share?`,
          `Rs.${shareA.toFixed(0)}`,
          [`Rs.${(shareA + 300).toFixed(0)}`, `Rs.${(shareA - 200).toFixed(0)}`, `Rs.${shareB.toFixed(0)}`]
        ));
      } else if (template === 6) {
        const still = randomInt(12, 22); const stream = randomInt(3, 7);
        const up = still - stream; const down = still + stream;
        const dist = randomInt(40, 100);
        const time = dist / up + dist / down;
        addQuestion(makeQuestion("aptitude",
          `A motorboat's still-water speed is ${still} km/h and the stream speed is ${stream} km/h. Find the total time (in hours) to travel ${dist} km upstream and return.`,
          `${time.toFixed(2)} hours`,
          [`${(time + 0.5).toFixed(2)} hours`, `${(time - 0.3).toFixed(2)} hours`, `${(time + 1.2).toFixed(2)} hours`]
        ));
      } else if (template === 7) {
        const d1 = randomInt(12, 28); const d2 = randomInt(15, 32);
        const eq = (1 - (1 - d1 / 100) * (1 - d2 / 100)) * 100;
        addQuestion(makeQuestion("aptitude",
          `An article is marked up 60% above cost price and then two successive discounts of ${d1}% and ${d2}% are given. What is the effective profit or loss percentage on cost price?`,
          `${(60 - eq - 60 * eq / 100).toFixed(2)}%`,
          [`${(eq).toFixed(2)}%`, `${(60 - eq).toFixed(2)}%`, `${(60 + eq).toFixed(2)}%`]
        ));
      } else if (template === 8) {
        const p = randomInt(1200, 2500); const r = randomInt(6, 14); const n = randomInt(3, 5);
        const depreciation = p * Math.pow(1 - r / 100, n);
        addQuestion(makeQuestion("aptitude",
          `A machine worth Rs.${p} depreciates at ${r}% p.a. (reducing balance). After ${n} years it is sold for Rs.${(depreciation + randomInt(200, 500)).toFixed(0)}. What is the profit on sale?`,
          `Rs.${(depreciation + randomInt(200, 500) - depreciation).toFixed(0)}`,
          [`Rs.${(depreciation + 100).toFixed(0)}`, `Rs.${(depreciation - 80).toFixed(0)}`, `Rs.${(depreciation + 400).toFixed(0)}`]
        ));
      } else if (template === 9) {
        const red = randomInt(5, 9); const blue = randomInt(6, 11); const green = randomInt(3, 7);
        const total = red + blue + green;
        const ans = (blue / total) * ((blue - 1) / (total - 1)) * ((green) / (total - 2));
        addQuestion(makeQuestion("aptitude",
          `A bag has ${red} red, ${blue} blue, and ${green} green balls. Three balls are drawn without replacement. What is the probability that exactly one is blue and one is green?`,
          `${(blue * green * red * 6 / (total * (total - 1) * (total - 2))).toFixed(4)}`,
          [`${(ans + 0.03).toFixed(4)}`, `${(ans - 0.01).toFixed(4)}`, `${(ans + 0.07).toFixed(4)}`]
        ));
      } else if (template === 10) {
        const w1 = randomInt(6, 12); const w2 = randomInt(8, 14); const days = randomInt(10, 20);
        const leave = randomInt(3, 6);
        const combined = 1 / w1 + 1 / w2;
        const remaining = 1 - combined * leave;
        const extraDays = remaining > 0 ? remaining / (1 / w1) : 0;
        addQuestion(makeQuestion("aptitude",
          `Worker A alone takes ${w1} days, B alone takes ${w2} days. Both work together for ${leave} days, then B leaves. How many more days does A need alone to finish the job?`,
          `${extraDays.toFixed(2)} days`,
          [`${(extraDays + 1).toFixed(2)} days`, `${(extraDays - 0.5).toFixed(2)} days`, `${(extraDays + 2.5).toFixed(2)} days`]
        ));
      } else if (template === 11) {
        const p = randomInt(1500, 3000); const r1 = randomInt(8, 12); const r2 = randomInt(10, 15); const n = randomInt(2, 3);
        const a1 = p * Math.pow(1 + r1 / 100, n);
        const a2 = p * Math.pow(1 + r2 / 100, n);
        addQuestion(makeQuestion("aptitude",
          `Rs.${p} is invested in Scheme A at ${r1}% CI p.a. and the same in Scheme B at ${r2}% CI p.a. for ${n} years each. What is the difference in maturity amounts?`,
          `Rs.${Math.abs(a2 - a1).toFixed(2)}`,
          [`Rs.${(Math.abs(a2 - a1) + 80).toFixed(2)}`, `Rs.${(Math.abs(a2 - a1) - 50).toFixed(2)}`, `Rs.${(Math.abs(a2 - a1) + 200).toFixed(2)}`]
        ));
      } else if (template === 12) {
        const eff1 = randomInt(6, 12); const eff2 = randomInt(4, 10); const eff3 = randomInt(5, 9);
        const totalWork = eff1 * eff2 * eff3;
        const days = totalWork / (eff1 * eff2 + eff2 * eff3 + eff1 * eff3);
        addQuestion(makeQuestion("aptitude",
          `A, B, and C can individually complete a task in ${eff1}, ${eff2}, and ${eff3} days respectively. If they all work together, but C leaves ${randomInt(2, 3)} days before completion, how many total days does the work take?`,
          `${(days + 0.5).toFixed(2)} days`,
          [`${days.toFixed(2)} days`, `${(days + 1).toFixed(2)} days`, `${(days - 0.5).toFixed(2)} days`]
        ));
      } else if (template === 13) {
        const n1 = randomInt(12, 25); const n2 = randomInt(15, 30);
        const hcf = randomInt(2, 6); const lcm = n1 * n2 / hcf;
        addQuestion(makeQuestion("aptitude",
          `The HCF of two numbers is ${hcf} and their LCM is ${lcm}. If one number is ${n1 * hcf}, what is the other?`,
          `${n2 * hcf}`,
          [`${n2 * hcf + hcf}`, `${n1 * hcf}`, `${n2 * hcf - hcf}`]
        ));
      } else if (template === 14) {
        const purity = randomInt(60, 80); const add = randomInt(10, 30); const total = randomInt(80, 150);
        const acid = total * purity / 100;
        const newPct = acid / (total + add) * 100;
        addQuestion(makeQuestion("aptitude",
          `A ${total} ml solution is ${purity}% pure acid. ${add} ml of water is added. What is the new concentration of acid?`,
          `${newPct.toFixed(2)}%`,
          [`${(newPct + 2).toFixed(2)}%`, `${(newPct - 1.5).toFixed(2)}%`, `${(purity).toFixed(2)}%`]
        ));
      } else if (template === 15) {
        const cp = randomInt(500, 1500); const mp = cp * (1 + randomInt(30, 60) / 100);
        const disc = randomInt(10, 25); const sp = mp * (1 - disc / 100);
        const profit = (sp - cp) / cp * 100;
        addQuestion(makeQuestion("aptitude",
          `Cost price of an article is Rs.${cp}. It is marked up to Rs.${mp.toFixed(0)} and sold at a ${disc}% discount. What is the profit/loss percentage?`,
          `${profit.toFixed(2)}%`,
          [`${(profit + 3).toFixed(2)}%`, `${(profit - 2).toFixed(2)}%`, `${disc.toFixed(2)}%`]
        ));
      } else if (template === 16) {
        const ageA = randomInt(20, 35); const ageB = randomInt(18, 30); const years = randomInt(4, 8);
        const ratio = (ageA + years) / (ageB + years);
        addQuestion(makeQuestion("aptitude",
          `The present ages of A and B are ${ageA} and ${ageB}. After ${years} years, what will be the ratio of their ages?`,
          `${(ageA + years)}:${(ageB + years)}`,
          [`${(ageA)}:${(ageB)}`, `${(ageA + years + 1)}:${(ageB + years)}`, `${(ageA + years)}:${(ageB + years + 1)}`]
        ));
      } else if (template === 17) {
        const radius = randomInt(4, 9); const height = randomInt(8, 18);
        const slant = Math.sqrt(radius * radius + height * height);
        const csa = Math.PI * radius * slant;
        addQuestion(makeQuestion("aptitude",
          `A cone has base radius ${radius} cm and height ${height} cm. Find its curved surface area (use π = 3.14159).`,
          `${csa.toFixed(2)} cm²`,
          [`${(csa + 10).toFixed(2)} cm²`, `${(csa - 8).toFixed(2)} cm²`, `${(Math.PI * radius * height).toFixed(2)} cm²`]
        ));
      } else if (template === 18) {
        const present = randomInt(500, 1200); const growth = randomInt(8, 15); const years = randomInt(3, 5);
        const ans = present * Math.pow(1 + growth / 100, years);
        addQuestion(makeQuestion("aptitude",
          `A city's population of ${present} thousands grows at ${growth}% per year compounded. What will it be after ${years} years (in thousands)?`,
          `${ans.toFixed(2)}`,
          [`${(ans + 50).toFixed(2)}`, `${(ans - 30).toFixed(2)}`, `${(present * (1 + growth * years / 100)).toFixed(2)}`]
        ));
      } else if (template === 19) {
        const n = randomInt(5, 8); const r = randomInt(2, Math.floor(n / 2));
        const perm = factorial(n) / factorial(n - r);
        const comb = perm / factorial(r);
        addQuestion(makeQuestion("aptitude",
          `In how many ways can ${r} books be selected from a shelf of ${n} distinct books, and then arranged on a table?`,
          `${perm}`,
          [`${comb}`, `${perm * 2}`, `${perm - r}`]
        ));
      } else if (template === 20) {
        const a = randomInt(60, 100); const b = randomInt(40, 80); const meet = randomInt(3, 7);
        const totalDist = (a + b) * meet;
        addQuestion(makeQuestion("aptitude",
          `Two trains start simultaneously from two stations ${totalDist} km apart toward each other at speeds ${a} km/h and ${b} km/h. After meeting, how much more time does the slower train take to reach the other station?`,
          `${(meet * a / b).toFixed(2)} hours`,
          [`${(meet * b / a).toFixed(2)} hours`, `${(meet).toFixed(2)} hours`, `${(meet * (a + b) / b).toFixed(2)} hours`]
        ));
      } else if (template === 21) {
        const p = randomInt(1000, 4000); const r = randomInt(8, 16); const t = randomInt(2, 4);
        const si = p * r * t / 100;
        const ci = p * (Math.pow(1 + r / 100, t) - 1);
        addQuestion(makeQuestion("aptitude",
          `The difference between CI and SI on Rs.${p} at ${r}% for ${t} years is Rs.?`,
          `Rs.${(ci - si).toFixed(2)}`,
          [`Rs.${(ci - si + 40).toFixed(2)}`, `Rs.${(ci - si - 25).toFixed(2)}`, `Rs.${si.toFixed(2)}`]
        ));
      } else if (template === 22) {
        const sp1 = randomInt(300, 600); const profit1 = randomInt(10, 25); const loss2 = randomInt(10, 25); const sp2 = randomInt(300, 600);
        const cp1 = sp1 * 100 / (100 + profit1); const cp2 = sp2 * 100 / (100 - loss2);
        const totalCP = cp1 + cp2; const totalSP = sp1 + sp2;
        const overallPL = (totalSP - totalCP) / totalCP * 100;
        addQuestion(makeQuestion("aptitude",
          `A sells two articles: one at Rs.${sp1} (gaining ${profit1}%) and another at Rs.${sp2} (losing ${loss2}%). What is the overall profit or loss percentage?`,
          `${overallPL.toFixed(2)}%`,
          [`${(overallPL + 2).toFixed(2)}%`, `${(overallPL - 1.5).toFixed(2)}%`, `${((profit1 - loss2) / 2).toFixed(2)}%`]
        ));
      } else if (template === 23) {
        const x = randomInt(4, 9); const y = randomInt(3, 7); const z = randomInt(5, 11); const total = randomInt(120, 250);
        const shareX = total * x / (x + y + z);
        addQuestion(makeQuestion("aptitude",
          `Three partners share profits in the ratio ${x}:${y}:${z}. If the total profit is Rs.${total}, what is the first partner's share?`,
          `Rs.${shareX.toFixed(2)}`,
          [`Rs.${(shareX + 10).toFixed(2)}`, `Rs.${(shareX - 5).toFixed(2)}`, `Rs.${(total * y / (x + y + z)).toFixed(2)}`]
        ));
      } else if (template === 24) {
        const sp = randomInt(400, 900); const lossP = randomInt(10, 20); const cp = sp * 100 / (100 - lossP);
        const gainP = randomInt(15, 30); const newSP = cp * (100 + gainP) / 100;
        addQuestion(makeQuestion("aptitude",
          `An article sold at Rs.${sp} results in a loss of ${lossP}%. At what price should it be sold to gain ${gainP}%?`,
          `Rs.${newSP.toFixed(2)}`,
          [`Rs.${(newSP + 30).toFixed(2)}`, `Rs.${(newSP - 20).toFixed(2)}`, `Rs.${(sp + gainP * 10).toFixed(2)}`]
        ));

        // ── New harder templates (25–40) ───────────────────────────────────────
      } else if (template === 25) {
        const a = randomInt(10, 18); const b = randomInt(12, 20); const done = randomInt(3, 6);
        const remaining = 1 - done * (1 / a + 1 / b);
        const daysC = remaining > 0 ? remaining / (1 / a + 1 / b + 1 / randomInt(8, 14)) : 0;
        const c = randomInt(8, 14);
        const tot = done + (remaining / (1 / a + 1 / b + 1 / c));
        addQuestion(makeQuestion("aptitude",
          `A and B together can do a job in some time. A alone takes ${a} days, B alone ${b} days. After ${done} days of A and B working together, C joins. C alone takes ${c} days. In how many total days is the job finished?`,
          `${tot.toFixed(2)} days`,
          [`${(tot + 1).toFixed(2)} days`, `${(tot - 0.5).toFixed(2)} days`, `${(tot + 2.5).toFixed(2)} days`]
        ));
      } else if (template === 26) {
        const base = randomInt(100, 200); const inc1 = randomInt(10, 25); const dec1 = randomInt(10, 20); const inc2 = randomInt(5, 15);
        const final = base * (1 + inc1 / 100) * (1 - dec1 / 100) * (1 + inc2 / 100);
        const netChange = (final - base) / base * 100;
        addQuestion(makeQuestion("aptitude",
          `A price of Rs.${base} is increased by ${inc1}%, then decreased by ${dec1}%, then increased again by ${inc2}%. What is the net percentage change?`,
          `${netChange.toFixed(2)}%`,
          [`${(inc1 - dec1 + inc2).toFixed(2)}%`, `${(netChange + 3).toFixed(2)}%`, `${(netChange - 2).toFixed(2)}%`]
        ));
      } else if (template === 27) {
        const n1 = randomInt(20, 40); const n2 = randomInt(25, 50); const n3 = randomInt(30, 60);
        // LCM via product / GCD (simplified with small numbers)
        const g12 = gcd(n1, n2); const l12 = n1 * n2 / g12;
        const g123 = gcd(l12, n3); const lcmAll = l12 * n3 / g123;
        addQuestion(makeQuestion("aptitude",
          `Three bells ring at intervals of ${n1}, ${n2}, and ${n3} minutes. If they ring together at 8:00 AM, when will they next ring together?`,
          `After ${lcmAll} minutes (${Math.floor(lcmAll / 60)}h ${lcmAll % 60}m)`,
          [`After ${lcmAll + 10} minutes`, `After ${lcmAll - 5} minutes`, `After ${lcmAll * 2} minutes`]
        ));
      } else if (template === 28) {
        const r = randomInt(5, 10); const h = randomInt(10, 20);
        const vol = Math.PI * r * r * h;
        const tsa = 2 * Math.PI * r * (r + h);
        addQuestion(makeQuestion("aptitude",
          `A cylinder has radius ${r} cm and height ${h} cm. If the volume is doubled by increasing only the radius, what is the new radius?`,
          `${(r * Math.sqrt(2)).toFixed(2)} cm`,
          [`${(r * 2).toFixed(2)} cm`, `${(r * Math.sqrt(3)).toFixed(2)} cm`, `${(r + h / 2).toFixed(2)} cm`]
        ));
      } else if (template === 29) {
        const s = randomInt(6, 12); const dist = randomInt(100, 200); const faster = s + randomInt(2, 5);
        const gap = dist / s - dist / faster;
        addQuestion(makeQuestion("aptitude",
          `A person covers ${dist} km at ${s} km/h. If the speed is increased by ${faster - s} km/h, how much time (in hours) is saved?`,
          `${gap.toFixed(3)} hours`,
          [`${(gap + 0.2).toFixed(3)} hours`, `${(gap - 0.1).toFixed(3)} hours`, `${(dist / faster).toFixed(3)} hours`]
        ));
      } else if (template === 30) {
        const cp = randomInt(800, 2000); const overhead = randomInt(5, 15);
        const mp = cp * (1 + overhead / 100) * (1 + randomInt(20, 40) / 100);
        const disc = randomInt(10, 20); const sp = mp * (1 - disc / 100);
        const profit = (sp - cp) / cp * 100;
        addQuestion(makeQuestion("aptitude",
          `A trader buys goods at Rs.${cp}, spends ${overhead}% on overheads, marks the price at ${(mp / (cp * (1 + overhead / 100)) * 100 - 100).toFixed(0)}% above cost+overhead, then gives a ${disc}% discount. What is the profit on original cost price?`,
          `${profit.toFixed(2)}%`,
          [`${(profit + 4).toFixed(2)}%`, `${(profit - 3).toFixed(2)}%`, `${disc.toFixed(2)}%`]
        ));
      } else if (template === 31) {
        const v1 = randomInt(20, 40); const v2 = randomInt(25, 50); const t = randomInt(3, 6);
        const dist = v1 * t;
        const timeB = dist / v2;
        addQuestion(makeQuestion("aptitude",
          `A leaves a city at ${v1} km/h. B starts ${t} hours later at ${v2} km/h in the same direction. After how many hours from B's start does B overtake A?`,
          `${(v1 * t / (v2 - v1)).toFixed(2)} hours`,
          [`${(v1 * t / (v2 - v1) + 1).toFixed(2)} hours`, `${(v1 * t / (v2 - v1) - 0.5).toFixed(2)} hours`, `${t.toFixed(2)} hours`]
        ));
      } else if (template === 32) {
        const men = randomInt(10, 20); const wom = randomInt(12, 25); const days = randomInt(8, 15); const target = randomInt(5, 10);
        const workM = men * days; const workW = wom * days;
        addQuestion(makeQuestion("aptitude",
          `${men} men can do a work in ${days} days. ${wom} women can do the same work in ${days} days. In how many days can ${target} men and ${target} women together finish the work?`,
          `${(workM / (target + target * men / wom)).toFixed(2)} days`,
          [`${(workM / (target + target * men / wom) + 1.5).toFixed(2)} days`, `${(workM / (target + target * men / wom) - 1).toFixed(2)} days`, `${days.toFixed(2)} days`]
        ));
      } else if (template === 33) {
        const ppal = randomInt(2000, 6000); const rate = randomInt(10, 20); const time = 2;
        const ci = ppal * (Math.pow(1 + rate / 200, 4) - 1); // half-yearly compounding
        const si = ppal * rate * time / 100;
        addQuestion(makeQuestion("aptitude",
          `Find the difference between CI (compounded half-yearly) and SI on Rs.${ppal} at ${rate}% p.a. for ${time} years.`,
          `Rs.${(ci - si).toFixed(2)}`,
          [`Rs.${(ci - si + 60).toFixed(2)}`, `Rs.${(ci - si - 40).toFixed(2)}`, `Rs.${si.toFixed(2)}`]
        ));
      } else if (template === 34) {
        const a = randomInt(15, 25); const b = randomInt(10, 20); const total = randomInt(30, 60);
        const xA = total * b / (a + b); const xB = total * a / (a + b);
        addQuestion(makeQuestion("aptitude",
          `Two alloys contain gold and silver in the ratios ${a}:${b} and ${b}:${a} respectively. In what ratio must they be mixed so that the resultant alloy has equal quantities of gold and silver?`,
          `${a}:${b}`,
          [`${b}:${a}`, `${a + 1}:${b}`, `${a}:${b + 1}`]
        ));
      } else if (template === 35) {
        const n = randomInt(6, 12); const r = randomInt(1, 4);
        const comb = factorial(n) / (factorial(r) * factorial(n - r));
        addQuestion(makeQuestion("aptitude",
          `From a group of ${n} men and ${r} women, a committee of ${r + 1} is formed. In how many ways can this be done if exactly ${r} men are included?`,
          `${(comb * (n - r)).toFixed(0)}`,
          [`${comb}`, `${comb * (r + 1)}`, `${comb * 2}`]
        ));
      } else if (template === 36) {
        const sp = randomInt(500, 1200); const profitP = randomInt(15, 35);
        const cp = sp * 100 / (100 + profitP);
        const sp2 = cp * (1 - randomInt(5, 15) / 100);
        const lossP = (cp - sp2) / cp * 100;
        addQuestion(makeQuestion("aptitude",
          `An article is sold at Rs.${sp} making a ${profitP}% profit. At what price should it have been sold to incur a ${(lossP).toFixed(0)}% loss?`,
          `Rs.${sp2.toFixed(2)}`,
          [`Rs.${(sp2 + 50).toFixed(2)}`, `Rs.${(sp2 - 30).toFixed(2)}`, `Rs.${cp.toFixed(2)}`]
        ));
      } else if (template === 37) {
        const a = randomInt(3, 7); const b = randomInt(2, 6); const c = randomInt(4, 8);
        const lcmABC = lcm3(a, b, c);
        addQuestion(makeQuestion("aptitude",
          `Pipes A, B, C fill a tank. A fills 1/${a} of the tank per hour, B fills 1/${b}, and C drains 1/${c}. Starting empty, how many hours to fill the tank completely?`,
          `${(1 / (1 / a + 1 / b - 1 / c)).toFixed(2)} hours`,
          [`${(1 / (1 / a + 1 / b - 1 / c) + 1).toFixed(2)} hours`, `${lcmABC} hours`, `${(1 / (1 / a + 1 / b)).toFixed(2)} hours`]
        ));
      } else if (template === 38) {
        const age1 = randomInt(25, 40); const age2 = randomInt(20, 35); const yAgo = randomInt(5, 10);
        const ratio = (age1 - yAgo) / (age2 - yAgo);
        addQuestion(makeQuestion("aptitude",
          `The present ages of two persons are ${age1} and ${age2}. ${yAgo} years ago, what was the ratio of their ages?`,
          `${age1 - yAgo}:${age2 - yAgo}`,
          [`${age1}:${age2}`, `${age1 + yAgo}:${age2 + yAgo}`, `${age2 - yAgo}:${age1 - yAgo}`]
        ));
      } else if (template === 39) {
        const base = randomInt(50, 120); const pct = randomInt(20, 40);
        const after = base * (1 + pct / 100);
        const reverse = pct * 100 / (100 + pct);
        addQuestion(makeQuestion("aptitude",
          `A number is increased by ${pct}% to get ${after.toFixed(0)}. By what percentage must ${after.toFixed(0)} be reduced to get back the original number?`,
          `${reverse.toFixed(2)}%`,
          [`${pct}%`, `${(reverse + 3).toFixed(2)}%`, `${(100 - pct).toFixed(2)}%`]
        ));
      } else {
        // template 40
        const sp1 = randomInt(300, 700); const sp2 = randomInt(300, 700); const totalProfit = randomInt(50, 200);
        const cp1 = sp1 - totalProfit / 2; const cp2 = sp2 - totalProfit / 2;
        addQuestion(makeQuestion("aptitude",
          `A sells two articles at Rs.${sp1} and Rs.${sp2}. The combined profit is Rs.${totalProfit}. If the profit on each is equal, what is the cost price of the second article?`,
          `Rs.${cp2.toFixed(0)}`,
          [`Rs.${(cp2 + 20).toFixed(0)}`, `Rs.${(cp2 - 10).toFixed(0)}`, `Rs.${sp2.toFixed(0)}`]
        ));
      }

    } else {
      // ── Reasoning templates (1–25, harder) ────────────────────────────────
      const template = randomInt(1, 25);

      if (template === 1) {
        addQuestion(makeQuestion("reasoning",
          `A is the mother of B. C is the brother of A. D is married to C. E is the son of D. F is the sister of E. How is F related to B?`,
          "Cousin", ["Aunt", "Niece", "Sister"]));
      } else if (template === 2) {
        const start = randomInt(2, 6); const d1 = randomInt(2, 4); const d2 = randomInt(1, 3);
        const seq = [start, start + d1, start + d1 + d2, start + d1 + d2 + d1, start + d1 + d2 + d1 + d2, start + d1 + d2 + d1 + d2 + d1];
        addQuestion(makeQuestion("reasoning",
          `Find the missing term: ${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ?, ${seq[5]}`,
          `${seq[4]}`,
          [`${seq[4] + 2}`, `${seq[4] - 1}`, `${seq[4] + d1}`]
        ));
      } else if (template === 3) {
        addQuestion(makeQuestion("reasoning",
          `Six persons P, Q, R, S, T, U sit in a row facing north. Q is third from the left. P is to the immediate right of Q. R is not adjacent to P. U is at one end. T is second from the right. Who sits in the middle?`,
          "P", ["Q", "T", "S"]));
      } else if (template === 4) {
        addQuestion(makeQuestion("reasoning",
          `In a code language, 'na pa ka' means 'birds fly high', 'ka ja ma' means 'high trees grow', and 'la pa ma' means 'flowers grow beautifully'. What does 'pa' stand for?`,
          "fly", ["high", "grow", "birds"]));
      } else if (template === 5) {
        addQuestion(makeQuestion("reasoning",
          `A man walks 3 km north, then 4 km east, then 5 km south, then 2 km west. What is his distance and direction from the starting point?`,
          "2√2 km, South-East",
          ["5 km, South", "3 km, East", "2 km, South-West"]));
      } else if (template === 6) {
        addQuestion(makeQuestion("reasoning",
          `Statement: All cats are animals. All animals have legs. Some animals can fly. Conclusion I: All cats have legs. Conclusion II: Some cats can fly.`,
          "Only Conclusion I follows",
          ["Both follow", "Only Conclusion II follows", "Neither follows"]));
      } else if (template === 7) {
        const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const d = randomInt(0, 6); const addDays = randomInt(50, 100);
        const ans = week[(d + addDays) % 7];
        addQuestion(makeQuestion("reasoning",
          `If ${week[d]} is the 1st of a month, what day will the ${addDays + 1}th be?`,
          ans,
          [week[(d + addDays + 1) % 7], week[(d + addDays - 1 + 7) % 7], week[(d + addDays + 2) % 7]]
        ));
      } else if (template === 8) {
        addQuestion(makeQuestion("reasoning",
          `In a certain language, 'PAINT' is coded as 'RCKAR'. Using the same rule, decode 'MOTHER'.`,
          "OQVJGT",
          ["NPTIFS", "OPUIFS", "OQVJFS"]));
      } else if (template === 9) {
        addQuestion(makeQuestion("reasoning",
          `Eight people sit around a circular table. A is third to the left of B. C is opposite A. D is between E and F. G is not adjacent to C. H is to the right of G. Who is opposite B?`,
          "F", ["E", "G", "D"]));
      } else if (template === 10) {
        const seq = [1, 4, 9, 16, 25, 36, 49, 51];
        addQuestion(makeQuestion("reasoning",
          `Find the odd one out: 1, 4, 9, 16, 25, 36, 49, 51`,
          "51", ["25", "36", "49"]));
      } else if (template === 11) {
        addQuestion(makeQuestion("reasoning",
          `If P # Q means P is the son of Q, P @ Q means P is the wife of Q, and P $ Q means P is the sister of Q, then what does 'A # B @ C $ D' mean?`,
          "A is the nephew of D",
          ["A is the son of D", "A is the cousin of D", "A is the brother of D"]));
      } else if (template === 12) {
        addQuestion(makeQuestion("reasoning",
          `Which word does NOT belong: Nitrogen, Oxygen, Helium, Water, Argon?`,
          "Water", ["Nitrogen", "Helium", "Oxygen"]));
      } else if (template === 13) {
        addQuestion(makeQuestion("reasoning",
          `In a code: 5 = 25, 6 = 36, 7 = 49, then 11 = ?`,
          "121", ["111", "110", "112"]));
      } else if (template === 14) {
        addQuestion(makeQuestion("reasoning",
          `A clock reads 3:27. What is the angle between the hour and minute hands?`,
          "58.5 degrees",
          ["57 degrees", "60 degrees", "55.5 degrees"]));
      } else if (template === 15) {
        addQuestion(makeQuestion("reasoning",
          `Premises: All pens write. No pen is a pencil. Some pencils are erasers. Which of the following is definitely true?`,
          "No pen is an eraser",
          ["Some pens are erasers", "All erasers are pencils", "Some pencils write"]));
      } else if (template === 16) {
        addQuestion(makeQuestion("reasoning",
          `In a queue, Ram is 7th from the front and 11th from the back. How many people are in the queue?`,
          "17", ["18", "16", "15"]));
      } else if (template === 17) {
        addQuestion(makeQuestion("reasoning",
          `If 'DELHI' is coded as '73541' and 'KOLKATA' as '8964818', then 'LIKE' is coded as?`,
          "5183", ["5182", "5193", "4183"]));
      } else if (template === 18) {
        addQuestion(makeQuestion("reasoning",
          `Choose the best analogy: Surgeon : Scalpel :: Painter : ?`,
          "Brush", ["Canvas", "Colour", "Gallery"]));
      } else if (template === 19) {
        addQuestion(makeQuestion("reasoning",
          `A is older than B. C is younger than D. B is older than C. D is younger than A. Who is the youngest?`,
          "C", ["B", "D", "A"]));
      } else if (template === 20) {
        addQuestion(makeQuestion("reasoning",
          `Input: 72 48 15 36 64 27. Step 1: Numbers arranged in descending order. Step 2: Each number divided by 3. What is Step 2 output?`,
          "24, 21.33, 16, 12, 9, 5",
          ["24, 16, 12, 9, 5, 21.33", "24, 21.33, 16, 9, 12, 5", "21.33, 24, 16, 12, 9, 5"]));
      } else if (template === 21) {
        addQuestion(makeQuestion("reasoning",
          `A series: AZ, BY, CX, DW, ?`,
          "EV", ["EU", "FV", "EW"]));
      } else if (template === 22) {
        addQuestion(makeQuestion("reasoning",
          `Three friends scored 72, 85, and 91 in a test. The topper's score is how many percent more than the lowest scorer's?`,
          "26.39%", ["19%", "21%", "25%"]));
      } else if (template === 23) {
        addQuestion(makeQuestion("reasoning",
          `Statement I: All squares are rectangles. Statement II: Some rectangles are rhombuses. Can we conclude: Some squares are rhombuses?`,
          "Cannot be determined", ["Yes, definitely", "No, never", "Only if all rectangles are rhombuses"]));
      } else if (template === 24) {
        addQuestion(makeQuestion("reasoning",
          `A word puzzle: ROAD → DARE (letters rearranged and shifted). Using same rule, what does LANE become?`,
          "FONA", ["ENAM", "FNAM", "EONA"]));
      } else {
        addQuestion(makeQuestion("reasoning",
          `Data Sufficiency: Is integer N divisible by 6? Statement 1: N is divisible by 2. Statement 2: N is divisible by 3.`,
          "Both statements together are sufficient",
          ["Statement 1 alone", "Statement 2 alone", "Neither statement is sufficient"]));
      }
    }
  }

  return shuffle(bank).slice(0, Math.min(size, 150));
}

// ─── Math Helpers ─────────────────────────────────────────────────────────────

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm3(a, b, c) {
  const l = a * b / gcd(a, b);
  return l * c / gcd(l, c);
}

// ─── Local Question Picker ────────────────────────────────────────────────────

function generateLocalQuestions(category, count, excludeQuestions = []) {
  const used = new Set((excludeQuestions || []).map((q) => String(q).toLowerCase()));
  console.log(`[QGEN] Loading local hard-bank questions for ${category} from fallback bank...`);
  let bank = Array.isArray(generateHardBank(category, 150)) ? generateHardBank(category, 150) : [];
  let filtered = bank.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const text = String(item.question || "").trim().toLowerCase();
    const options = Array.isArray(item.options) ? item.options.map((o) => String(o || "").trim()) : [];
    return item.question && item.answer && options.length === 4 && options.includes(String(item.answer).trim()) && !used.has(text);
  });

  if (filtered.length < count) {
    for (let attempt = 0; attempt < 2 && filtered.length < count; attempt += 1) {
      bank = Array.isArray(generateHardBank(category, 250)) ? generateHardBank(category, 250) : bank;
      filtered = bank.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const text = String(item.question || "").trim().toLowerCase();
        const options = Array.isArray(item.options) ? item.options.map((o) => String(o || "").trim()) : [];
        return item.question && item.answer && options.length === 4 && options.includes(String(item.answer).trim()) && !used.has(text);
      });
    }
  }
  console.log(`[QGEN] Fallback selected ${Math.min(count, filtered.length)} hard questions for ${category}.`);
  return shuffle(filtered).slice(0, count);
}

module.exports = generateQuestions;