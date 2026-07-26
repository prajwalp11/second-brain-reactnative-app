  export const DOMAIN_TYPES = [
    { type: 'GYM', label: 'Gym', icon: '🏋️' },
    { type: 'RUNNING', label: 'Running', icon: '🏃' },
    { type: 'READING', label: 'Reading', icon: '📚' },
    { type: 'GUITAR', label: 'Guitar', icon: '🎸' },
    { type: 'CHESS', label: 'Chess', icon: '♟️' },
    { type: 'LANGUAGE', label: 'Language', icon: '🌍' },
    { type: 'NUTRITION', label: 'Nutrition', icon: '🥗' },
    { type: 'SLEEP', label: 'Sleep', icon: '😴' },
    { type: 'SWIMMING', label: 'Swimming', icon: '🏊' },
    { type: 'MEDITATION', label: 'Meditation', icon: '🧘' },
    { type: 'CUSTOM', label: 'Custom', icon: '✏️' },
  ] as const;

  export const SKILL_LEVELS = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
  ] as const;