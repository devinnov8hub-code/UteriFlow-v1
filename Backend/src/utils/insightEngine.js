/**
 * insightEngine.js
 *
 * Daily Insight Engine — implements the PRD §5 selection pipeline.
 *
 *   load context → calculate phase → load symptoms → infer if needed
 *   → evaluate PCOS flags → query content library → cooldown filter
 *   → priority scoring → select best, fall back if empty.
 *
 * The content library is held in INSIGHT_LIBRARY below. Each card has:
 *   - key:              stable identifier (used for cooldown tracking)
 *   - title:            ≤ 60 chars (PRD §5.2)
 *   - body:             ≤ 280 chars (PRD §5.2)
 *   - phases:           which phases the card applies to (or '*' for any)
 *   - userTypes:        which user_types the card applies to (or '*')
 *   - pcosTier:         optional — required pcos_tier for the card
 *   - contraceptive:    'hormonal_only' | 'natural_only' | 'any'
 *   - symptomTriggers:  symptoms that boost the priority score
 *   - basePriority:     1-10
 *   - actionLink:       optional follow-up content
 *
 * The library is intentionally English-only and follows the PRD §8 voice:
 *   plain language, no diagnoses, doctor prompt where escalation matters.
 *
 * IMPORTANT: This is the v1.0 baseline content. The PRD pre-launch checklist
 * requires medical review of all cards before public release. Cards here are
 * derived from the PRD's own example insights (§6 scenarios) so they're
 * already aligned with the clinical voice approved in the document.
 */

export const INSIGHT_LIBRARY = [
  // ─── Menstrual phase ─────────────────────────────────────────────
  {
    key: 'menstrual_day1_general',
    title: 'Day 1 of your period',
    body: 'Your body is starting a new cycle. Cramps and lower energy are common in the first two days. A heating pad on your lower abdomen and rest can help.',
    phases: ['MENSTRUAL'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: ['cramps','fatigue'], basePriority: 7,
    actionLink: { type: 'article', title: 'Why cramps happen and what helps' },
  },
  {
    key: 'menstrual_heavy_flow',
    title: 'Heavy flow today',
    body: 'Heavy bleeding in the first two days is normal. If you are soaking through protection every hour for several hours, mention it to a doctor — it is worth checking.',
    phases: ['MENSTRUAL'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: ['heavy_flow'], basePriority: 8,
  },
  {
    key: 'menstrual_iron_nutrition',
    title: 'Replenish iron today',
    body: 'Bleeding depletes iron. Foods like ugu (pumpkin leaves), beans, and liver help replace what is lost. Pair them with citrus or pepper for better absorption.',
    phases: ['MENSTRUAL'], userTypes: ['*'], contraceptive: 'any',
    symptomTriggers: [], basePriority: 5,
  },

  // ─── Follicular phase ────────────────────────────────────────────
  {
    key: 'follicular_energy_rising',
    title: 'Your energy is climbing',
    body: 'Oestrogen is rising and many women feel sharper and more motivated this week. A good time to start a new task or workout if you are up to it.',
    phases: ['FOLLICULAR'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: [], basePriority: 6,
  },

  // ─── Ovulation phase ─────────────────────────────────────────────
  {
    key: 'ovulation_window',
    title: 'You may be ovulating',
    body: 'You are in your estimated fertile window. If you are trying to conceive, this is a peak time. If not, take whatever precautions feel right for you.',
    phases: ['OVULATION'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: ['high_libido'], basePriority: 8,
  },
  {
    key: 'ovulation_mucus_signal',
    title: 'Cervical mucus signs',
    body: 'Egg-white or watery discharge often signals ovulation is near or here. This is a normal hormonal change, not an infection.',
    phases: ['OVULATION','APPROACHING_OVULATION'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: [], basePriority: 6,
  },

  // ─── Luteal phase ────────────────────────────────────────────────
  {
    key: 'luteal_pms_general',
    title: 'The week before your period',
    body: 'Falling progesterone affects serotonin, which is the biological cause of mood changes now. Bloating is also driven by hormonal water retention.',
    phases: ['LUTEAL'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: ['mood_swings','bloating'], basePriority: 7,
  },
  {
    key: 'luteal_complex_carbs',
    title: 'Complex carbs help PMS',
    body: 'Complex carbs like oats, sweet potato, beans, or brown rice support serotonin levels and can ease premenstrual mood changes.',
    phases: ['LUTEAL'], userTypes: ['*'], contraceptive: 'any',
    symptomTriggers: ['mood_swings','food_cravings','cravings'], basePriority: 6,
  },
  {
    key: 'luteal_breast_tenderness',
    title: 'Breast tenderness is hormonal',
    body: 'Tender breasts in the days before your period are caused by progesterone and water retention. A supportive bra and reducing salt can help.',
    phases: ['LUTEAL'], userTypes: ['*'], contraceptive: 'any',
    symptomTriggers: ['breast_tenderness'], basePriority: 5,
  },

  // ─── LATE phase (no special pathway) ─────────────────────────────
  {
    key: 'late_general',
    title: 'Your period is later than usual',
    body: 'Late periods can come from stress, illness, sleep changes, or natural cycle variation. Keep tracking how you feel — it helps us understand your cycle.',
    phases: ['LATE'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: [], basePriority: 6,
  },
  {
    key: 'late_with_unprotected_sex',
    title: 'Late period — a few things to consider',
    body: 'Your period is late. Many things can cause this — stress, illness, cycle variation. If you would like to rule out pregnancy, a home test is the most straightforward next step.',
    phases: ['LATE'], userTypes: ['REGULAR','IRREGULAR'], contraceptive: 'natural_only',
    symptomTriggers: [], basePriority: 10, // wins over generic late insight when pathway flag is set
    requiresFlag: 'late_period_pregnancy_pathway',
  },

  // ─── Hormonal contraceptive users ────────────────────────────────
  {
    key: 'contraceptive_spotting',
    title: 'Spotting on the pill is common',
    body: 'Spotting between periods can be common when taking the combined pill, especially in the first few months or if you missed a dose. If it is heavy or painful, mention it to a pharmacist.',
    phases: ['*'], userTypes: ['*'], contraceptive: 'hormonal_only',
    symptomTriggers: ['spotting'], basePriority: 9,
  },
  {
    key: 'contraceptive_general',
    title: 'Tracking on hormonal contraception',
    body: 'Your contraceptive suppresses natural ovulation, so we focus on side-effect tracking instead of fertility predictions. Keep logging symptoms to spot patterns.',
    phases: ['*'], userTypes: ['*'], contraceptive: 'hormonal_only',
    symptomTriggers: [], basePriority: 4,
  },

  // ─── PCOS-track insights ─────────────────────────────────────────
  {
    key: 'pcos_androgen_pattern',
    title: 'Acne, fatigue and hair changes',
    body: 'Jaw or chin acne, fatigue, and hair thinning can all be linked to elevated androgens — a common feature of PCOS. A gynaecologist can discuss treatment options with you.',
    phases: ['*'], userTypes: ['PCOS'], contraceptive: 'any',
    pcosTier: ['confirmed','likely'],
    symptomTriggers: ['acne','hair_thinning','fatigue','excess_hair'], basePriority: 9,
  },
  {
    key: 'pcos_blood_sugar',
    title: 'Steady blood sugar helps energy',
    body: 'Fatigue with PCOS is often linked to how the body processes blood sugar. Pairing carbs with protein at every meal — for example rice with beans and egg — can reduce energy crashes.',
    phases: ['*'], userTypes: ['PCOS'], contraceptive: 'any',
    pcosTier: ['confirmed','likely','possible'],
    symptomTriggers: ['fatigue'], basePriority: 7,
  },
  {
    key: 'pcos_likely_notification',
    title: 'Patterns worth discussing with a doctor',
    body: 'Your cycle patterns and logged symptoms are worth discussing with a doctor. Conditions like PCOS are very manageable, and getting answers early makes a difference.',
    phases: ['*'], userTypes: ['*'], contraceptive: 'any',
    pcosTier: ['likely'],
    symptomTriggers: [], basePriority: 10, // high priority when tier is 'likely'
  },
  {
    key: 'pcos_general_tracking',
    title: 'Your body is showing hormonal changes',
    body: 'Hormonal changes can be unpredictable with PCOS. Keep tracking your symptoms — over time, patterns emerge that help you and your doctor understand what is going on.',
    phases: ['*'], userTypes: ['PCOS'], contraceptive: 'any',
    pcosTier: ['confirmed','likely','possible','none'],
    symptomTriggers: [], basePriority: 4,
  },
];

// ─── Fallback library (PRD §5.1 step 10) ───────────────────────────
export const FALLBACK_LIBRARY = [
  {
    key: 'fallback_log_more',
    title: 'Tap to log how you feel',
    body: 'The more you log, the more personalised your insights become. Even a single tap on your mood or energy today helps us learn your pattern.',
  },
  {
    key: 'fallback_welcome',
    title: 'Welcome to UteriFlow',
    body: 'Start by logging how you feel today — your energy, mood, and any physical symptoms. Every entry helps us understand your body better.',
  },
  {
    key: 'fallback_keep_tracking',
    title: 'Every cycle teaches us something',
    body: 'Your insights get sharper with each entry. Try to log at least once every few days, even if nothing feels different.',
  },
  {
    key: 'fallback_self_care',
    title: 'A small act of care today',
    body: 'A glass of water, ten minutes of fresh air, or stepping away from your screen can make a real difference in how you feel.',
  },
];


// ─── Selection pipeline ────────────────────────────────────────────
// Inputs (assembled by the route handler from DB):
//   userType:      'REGULAR' | 'IRREGULAR' | 'PCOS'
//   currentPhase:  'MENSTRUAL'|'FOLLICULAR'|'OVULATION'|'LUTEAL'|'LATE'|null
//   pcosTier:      'none'|'possible'|'likely'|'confirmed'
//   contraceptive: { type, isHormonal }
//   todaySymptoms: array of strings
//   recentlyShown: array of { insight_key, shown_date } (last 14 days)
//   pathwayFlags:  array of strings — e.g. ['late_period_pregnancy_pathway']
export function selectDailyInsight({
  userType, currentPhase, pcosTier, contraceptive,
  todaySymptoms = [], recentlyShown = [], pathwayFlags = [],
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Step 7: filter library by phase + userType + pcosTier + contraceptive
  let candidates = INSIGHT_LIBRARY.filter(card => {
    // Phase match
    if (!card.phases.includes('*') && currentPhase && !card.phases.includes(currentPhase)) return false;
    if (!card.phases.includes('*') && !currentPhase) return false; // calendar-only cards need a phase

    // User type match
    if (!card.userTypes.includes('*') && !card.userTypes.includes(userType)) return false;

    // Contraceptive match
    if (card.contraceptive === 'hormonal_only' && !contraceptive.isHormonal) return false;
    if (card.contraceptive === 'natural_only'  &&  contraceptive.isHormonal) return false;

    // PCOS tier match (if specified)
    if (card.pcosTier && !card.pcosTier.includes(pcosTier)) return false;

    // Pathway flag (if required)
    if (card.requiresFlag && !pathwayFlags.includes(card.requiresFlag)) return false;

    return true;
  });

  // Step 8: cooldown filter — exclude cards shown to this user in last 14 days
  // (the recency penalty in the priority score handles soft cooldown <14 days)
  const recentMap = new Map();
  for (const r of recentlyShown) {
    const days = Math.floor((today - new Date(r.shown_date)) / 86400000);
    // Keep the most recent occurrence per key
    if (!recentMap.has(r.insight_key) || days < recentMap.get(r.insight_key)) {
      recentMap.set(r.insight_key, days);
    }
  }
  candidates = candidates.filter(card => {
    const daysAgo = recentMap.get(card.key);
    return daysAgo === undefined || daysAgo > 14;
  });

  // Step 9: priority scoring
  const scored = candidates.map(card => {
    let score = card.basePriority || 1;

    // +3 per symptom trigger that the user logged today
    if (Array.isArray(card.symptomTriggers)) {
      for (const trigger of card.symptomTriggers) {
        if (todaySymptoms.includes(trigger)) score += 3;
      }
    }

    // +2 if pcosTier matches and this card is PCOS-flagged
    if (card.pcosTier && card.pcosTier.includes(pcosTier) && pcosTier !== 'none') {
      score += 2;
    }

    // Recency penalty (3-7 days ago)
    const daysAgo = recentMap.get(card.key);
    if (daysAgo !== undefined) {
      if (daysAgo <= 3) score -= 10;
      else if (daysAgo <= 7) score -= 5;
    }

    return { card, score };
  });

  // Filter out non-positive scores (PRD: "If priority_score <= 0: card is excluded")
  const viable = scored.filter(s => s.score > 0);

  if (viable.length === 0) {
    // Step 10: fallback
    const fb = FALLBACK_LIBRARY[Math.floor(Date.now() / 86400000) % FALLBACK_LIBRARY.length];
    return { ...fb, isFallback: true, score: 0, source: 'fallback_library' };
  }

  // Highest score wins; ties broken by basePriority then by stable order
  viable.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.card.basePriority || 0) - (a.card.basePriority || 0);
  });

  const winner = viable[0];
  return {
    ...winner.card,
    score: winner.score,
    isFallback: false,
    source: 'library',
  };
}
