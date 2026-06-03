// Formes de l'API "La Table des Savoirs" — confirmées via un échantillon réel.
// GET /game/{facile|difficile}/{dayNumber}

export interface LtdsQuestion {
  order: number;
  text: string;
  theme?: string;
  validAnswers?: string[]; // [0] = réponse canonique, suivantes = variantes acceptées
  initialTimerInMs?: number;
}

export interface LtdsQuestionResult {
  questionNumber: number;
  correct?: number;
  incorrect?: number;
  percentageIncorrect?: number; // 0-100
  contested?: number;
  avgAnswerPoints?: number;
}

export interface LtdsDay {
  _id?: string;
  dayNumber: number;
  difficulty: 'facile' | 'difficile';
  name?: string;
  dayExpired?: boolean;
  dayExpiresAt?: string;
  totalQuestions?: number;
  questions?: LtdsQuestion[];
  results?: {
    questionResults?: Record<string, LtdsQuestionResult>;
    totalParticipants?: number;
    averageScore?: number;
  };
}

export interface LtdsGameResponse {
  day?: LtdsDay;
  serverTime?: string;
  message?: string;
  error?: unknown;
  playerGame?: unknown;
}
