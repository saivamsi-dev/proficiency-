/**
 * Analytics utilities for processing submission history data on the frontend.
 * All data analysis is performed client-side using existing API responses.
 */

/**
 * Analyze error categories from submission history
 * @param {Array} submissions - Array of submission objects with errors
 * @returns {Object} Error category counts and percentages
 */
export function analyzeErrorCategories(submissions = []) {
  const categories = {}
  let totalErrors = 0

  submissions.forEach(sub => {
    const errors = sub.errors || []
    errors.forEach(err => {
      const cat = err.error_category || 'other'
      categories[cat] = (categories[cat] || 0) + 1
      totalErrors++
    })
  })

  // Convert to array with percentages
  const result = Object.entries(categories).map(([name, count]) => ({
    name: formatCategoryName(name),
    value: count,
    percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
  }))

  // Sort by count descending
  result.sort((a, b) => b.value - a.value)

  return { categories: result, total: totalErrors }
}

/**
 * Calculate weekly improvement trend
 * @param {Array} submissions - Array of submission objects with submitted_at dates
 * @returns {Array} Weekly data points with accuracy
 */
export function calculateWeeklyTrend(submissions = []) {
  if (submissions.length === 0) return []

  // Group by week
  const weeks = {}

  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at)
    const weekStart = getWeekStart(date)
    const key = weekStart.toISOString().split('T')[0]

    if (!weeks[key]) {
      weeks[key] = { total: 0, correct: 0, date: weekStart }
    }
    weeks[key].total++
    if (!sub.has_errors) {
      weeks[key].correct++
    }
  })

  // Convert to array and calculate accuracy
  const result = Object.values(weeks)
    .map(week => ({
      week: formatWeekLabel(week.date),
      date: week.date,
      accuracy: week.total > 0 ? Math.round((week.correct / week.total) * 100) : 0,
      exercises: week.total,
    }))
    .sort((a, b) => a.date - b.date)
    .slice(-8) // Last 8 weeks

  return result
}

/**
 * Analyze error severity distribution
 * @param {Array} submissions - Array of submission objects with errors
 * @returns {Array} Severity counts
 */
export function analyzeSeverityDistribution(submissions = []) {
  const severities = { high: 0, medium: 0, low: 0 }

  submissions.forEach(sub => {
    const errors = sub.errors || []
    errors.forEach(err => {
      const sev = err.severity || 'medium'
      if (severities[sev] !== undefined) {
        severities[sev]++
      }
    })
  })

  return [
    { name: 'High', value: severities.high, color: '#ef4444' },
    { name: 'Medium', value: severities.medium, color: '#f59e0b' },
    { name: 'Low', value: severities.low, color: '#3b82f6' },
  ]
}

/**
 * Calculate writing progress stats
 * @param {Array} submissions - Array of submission objects
 * @returns {Object} Progress statistics
 */
export function calculateWritingProgress(submissions = []) {
  if (submissions.length === 0) {
    return {
      totalWords: 0,
      accuracyPercent: 0,
      improvementTrend: 0,
      avgWordsPerSubmission: 0,
    }
  }

  let totalWords = 0
  let totalCorrect = 0

  submissions.forEach(sub => {
    const words = (sub.original_text || '').split(/\s+/).filter(w => w.length > 0)
    totalWords += words.length
    if (!sub.has_errors) totalCorrect++
  })

  const accuracyPercent = Math.round((totalCorrect / submissions.length) * 100)

  // Calculate improvement: compare first half vs second half
  const half = Math.floor(submissions.length / 2)
  const firstHalf = submissions.slice(0, half)
  const secondHalf = submissions.slice(half)

  const firstAccuracy = firstHalf.length > 0
    ? (firstHalf.filter(s => !s.has_errors).length / firstHalf.length) * 100
    : 0
  const secondAccuracy = secondHalf.length > 0
    ? (secondHalf.filter(s => !s.has_errors).length / secondHalf.length) * 100
    : 0

  const improvementTrend = Math.round(secondAccuracy - firstAccuracy)

  return {
    totalWords,
    accuracyPercent,
    improvementTrend,
    avgWordsPerSubmission: Math.round(totalWords / submissions.length),
  }
}

/**
 * Identify user weaknesses from error patterns
 * @param {Array} submissions - Array of submission objects with errors
 * @returns {Array} Top weakness areas with suggestions
 */
export function identifyWeaknesses(submissions = []) {
  const { categories } = analyzeErrorCategories(submissions)
  
  const suggestions = {
    'Articles': 'Practice using a, an, the in different contexts',
    'Prepositions': 'Focus on common preposition pairs (in/on/at)',
    'Tense': 'Review verb tense consistency rules',
    'Subject Verb': 'Practice subject-verb agreement exercises',
    'Spelling': 'Use vocabulary building exercises',
    'Word Order': 'Study sentence structure patterns',
    'Vocabulary': 'Expand word choice with synonym practice',
    'Punctuation': 'Review comma and period usage rules',
    'Other': 'Continue practicing varied sentence types',
  }

  return categories.slice(0, 3).map(cat => ({
    category: cat.name,
    count: cat.value,
    percentage: cat.percentage,
    suggestion: suggestions[cat.name] || suggestions['Other'],
  }))
}

/**
 * Calculate text complexity metrics (for live typing analysis)
 * @param {string} text - The text to analyze
 * @returns {Object} Complexity metrics
 */
export function calculateTextComplexity(text = '') {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))

  const wordCount = words.length
  const sentenceCount = Math.max(sentences.length, 1)
  const avgWordLength = wordCount > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
    : 0
  const avgSentenceLength = wordCount / sentenceCount
  const vocabularyDiversity = wordCount > 0
    ? Math.min((uniqueWords.size / wordCount) * 100, 100)
    : 0

  // Calculate complexity score (0-100)
  const complexityScore = Math.min(
    Math.round(
      (avgWordLength / 8) * 25 +           // Longer words = more complex
      (avgSentenceLength / 25) * 25 +       // Longer sentences = more complex
      (vocabularyDiversity / 100) * 50       // More unique words = more complex
    ),
    100
  )

  return {
    wordCount,
    sentenceCount,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    vocabularyDiversity: Math.round(vocabularyDiversity),
    complexityScore,
    level: getComplexityLevel(complexityScore),
  }
}

/**
 * Check achievements based on user stats
 * @param {Object} stats - User stats object
 * @param {Array} submissions - Submission history
 * @returns {Array} Unlocked achievements
 */
export function checkAchievements(stats = {}, submissions = []) {
  const achievements = []

  // First Correction
  if (stats.total_exercises >= 1) {
    achievements.push({
      id: 'first_correction',
      name: 'First Steps',
      description: 'Complete your first exercise',
      icon: '🎯',
      unlocked: true,
    })
  }

  // 3-Day Streak
  if (stats.current_streak >= 3) {
    achievements.push({
      id: 'streak_3',
      name: 'Getting Started',
      description: 'Maintain a 3-day streak',
      icon: '🔥',
      unlocked: true,
    })
  }

  // 7-Day Streak
  if (stats.current_streak >= 7) {
    achievements.push({
      id: 'streak_7',
      name: 'Dedicated Learner',
      description: 'Maintain a 7-day streak',
      icon: '⚡',
      unlocked: true,
    })
  }

  // 50 Exercises
  if (stats.total_exercises >= 50) {
    achievements.push({
      id: 'exercises_50',
      name: 'Practice Makes Perfect',
      description: 'Complete 50 exercises',
      icon: '📝',
      unlocked: true,
    })
  }

  // 100 Exercises
  if (stats.total_exercises >= 100) {
    achievements.push({
      id: 'exercises_100',
      name: 'Centurion',
      description: 'Complete 100 exercises',
      icon: '💯',
      unlocked: true,
    })
  }

  // High Accuracy
  const correctSubmissions = submissions.filter(s => !s.has_errors).length
  const accuracy = submissions.length > 0
    ? (correctSubmissions / submissions.length) * 100
    : 0

  if (accuracy >= 80 && submissions.length >= 10) {
    achievements.push({
      id: 'accuracy_80',
      name: 'Sharp Writer',
      description: 'Achieve 80% accuracy over 10+ exercises',
      icon: '✨',
      unlocked: true,
    })
  }

  if (accuracy >= 95 && submissions.length >= 20) {
    achievements.push({
      id: 'accuracy_95',
      name: 'Grammar Master',
      description: 'Achieve 95% accuracy over 20+ exercises',
      icon: '👑',
      unlocked: true,
    })
  }

  // XP milestones
  if (stats.xp >= 500) {
    achievements.push({
      id: 'xp_500',
      name: 'Rising Star',
      description: 'Earn 500 XP',
      icon: '⭐',
      unlocked: true,
    })
  }

  if (stats.xp >= 1000) {
    achievements.push({
      id: 'xp_1000',
      name: 'Knowledge Seeker',
      description: 'Earn 1000 XP',
      icon: '🌟',
      unlocked: true,
    })
  }

  // Level achievements
  if (stats.level === 'intermediate' || stats.level === 'advanced') {
    achievements.push({
      id: 'level_intermediate',
      name: 'Level Up',
      description: 'Reach Intermediate level',
      icon: '📈',
      unlocked: true,
    })
  }

  if (stats.level === 'advanced') {
    achievements.push({
      id: 'level_advanced',
      name: 'Elite Status',
      description: 'Reach Advanced level',
      icon: '🏆',
      unlocked: true,
    })
  }

  return achievements
}

/**
 * Get all possible achievements (for showing locked ones)
 * @returns {Array} All achievements with unlocked status
 */
export function getAllAchievements() {
  return [
    { id: 'first_correction', name: 'First Steps', description: 'Complete your first exercise', icon: '🎯' },
    { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day streak', icon: '🔥' },
    { id: 'streak_7', name: 'Dedicated Learner', description: 'Maintain a 7-day streak', icon: '⚡' },
    { id: 'exercises_50', name: 'Practice Makes Perfect', description: 'Complete 50 exercises', icon: '📝' },
    { id: 'exercises_100', name: 'Centurion', description: 'Complete 100 exercises', icon: '💯' },
    { id: 'accuracy_80', name: 'Sharp Writer', description: 'Achieve 80% accuracy', icon: '✨' },
    { id: 'accuracy_95', name: 'Grammar Master', description: 'Achieve 95% accuracy', icon: '👑' },
    { id: 'xp_500', name: 'Rising Star', description: 'Earn 500 XP', icon: '⭐' },
    { id: 'xp_1000', name: 'Knowledge Seeker', description: 'Earn 1000 XP', icon: '🌟' },
    { id: 'level_intermediate', name: 'Level Up', description: 'Reach Intermediate level', icon: '📈' },
    { id: 'level_advanced', name: 'Elite Status', description: 'Reach Advanced level', icon: '🏆' },
  ]
}

/**
 * Generate writing tips based on user activity
 * @param {Object} stats - User stats
 * @param {Array} submissions - Recent submissions
 * @returns {Array} Relevant tips
 */
export function generateTips(submissions = []) {
  const tips = [
    { category: 'general', tip: 'Try writing at least one paragraph daily to build consistency.', icon: '📅' },
    { category: 'general', tip: 'Read your text aloud to catch awkward phrasing.', icon: '🗣️' },
    { category: 'general', tip: 'Use the AI explanation feature to understand your mistakes.', icon: '💡' },
    { category: 'articles', tip: 'Use "a" before consonant sounds and "an" before vowel sounds.', icon: '📚' },
    { category: 'tense', tip: 'Stay consistent with your tense throughout a paragraph.', icon: '⏱️' },
    { category: 'preposition', tip: 'Common pairs: "interested in", "good at", "depend on".', icon: '🔗' },
    { category: 'vocabulary', tip: 'Learn synonyms to avoid repetition in your writing.', icon: '📖' },
    { category: 'structure', tip: 'Start sentences with the subject for clarity.', icon: '🏗️' },
    { category: 'punctuation', tip: 'Use commas before conjunctions in compound sentences.', icon: '✏️' },
    { category: 'spelling', tip: 'Double-check commonly confused words: their/there/they\'re.', icon: '🔤' },
  ]

  // Prioritize tips based on user's weak areas
  const weaknesses = identifyWeaknesses(submissions)
  const weakCategories = weaknesses.map(w => w.category.toLowerCase())

  // Sort tips - relevant ones first
  const sortedTips = tips.sort((a, b) => {
    const aRelevant = weakCategories.some(wc => a.category.includes(wc) || wc.includes(a.category))
    const bRelevant = weakCategories.some(wc => b.category.includes(wc) || wc.includes(b.category))
    if (aRelevant && !bRelevant) return -1
    if (!aRelevant && bRelevant) return 1
    return 0
  })

  return sortedTips
}

// ── Helper Functions ──────────────────────────────────────────────

function formatCategoryName(name) {
  const map = {
    'article': 'Articles',
    'tense': 'Tense',
    'preposition': 'Prepositions',
    'subject_verb': 'Subject Verb',
    'spelling': 'Spelling',
    'vocabulary': 'Vocabulary',
    'word_order': 'Word Order',
    'punctuation': 'Punctuation',
    'other': 'Other',
  }
  return map[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1)
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

function formatWeekLabel(date) {
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

function getComplexityLevel(score) {
  if (score >= 70) return 'Advanced'
  if (score >= 45) return 'Intermediate'
  if (score >= 20) return 'Basic'
  return 'Simple'
}

/**
 * Create diff between original and corrected text
 * @param {string} original - Original text
 * @param {string} corrected - Corrected text
 * @returns {Array} Array of diff segments
 */
export function createTextDiff(original, corrected) {
  const origWords = original.split(/(\s+)/)
  const corrWords = corrected.split(/(\s+)/)
  const result = []

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(origWords, corrWords)
  
  let origIdx = 0
  let corrIdx = 0
  let lcsIdx = 0

  while (origIdx < origWords.length || corrIdx < corrWords.length) {
    if (lcsIdx < lcs.length && origIdx < origWords.length && origWords[origIdx] === lcs[lcsIdx]) {
      // Match in LCS
      if (corrIdx < corrWords.length && corrWords[corrIdx] === lcs[lcsIdx]) {
        result.push({ type: 'same', text: origWords[origIdx] })
        origIdx++
        corrIdx++
        lcsIdx++
      } else {
        // Addition in corrected
        result.push({ type: 'added', text: corrWords[corrIdx] })
        corrIdx++
      }
    } else if (origIdx < origWords.length && (lcsIdx >= lcs.length || origWords[origIdx] !== lcs[lcsIdx])) {
      // Deletion from original
      result.push({ type: 'removed', text: origWords[origIdx] })
      origIdx++
    } else if (corrIdx < corrWords.length) {
      // Addition in corrected
      result.push({ type: 'added', text: corrWords[corrIdx] })
      corrIdx++
    } else {
      break
    }
  }

  return result
}

function longestCommonSubsequence(arr1, arr2) {
  const m = arr1.length
  const n = arr2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const lcs = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}
