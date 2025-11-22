import { Recipe } from "../types";

// Pre-defined responses to simulate AI personality without API calls
const REVIEWS = {
  low: [
    "This tastes like battery acid mixed with despair.",
    "My sensors are detecting... straight garbage.",
    "Did you scoop this out of a reactor leak?",
    "I wouldn't serve this to a silicon rat.",
    "Error 404: Flavor not found.",
    "Pure sludge. Try again.",
    "Disgusting. Absolutely disgusting.",
    "Are you trying to poison the clientele?"
  ],
  mid: [
    "Passable. Just barely.",
    "Mediocre at best.",
    "It's... edible. Drinkable? Maybe.",
    "Not impressive, but it won't kill them.",
    "Average. Like your programming.",
    "I've seen better algorithms in a toaster.",
    "Standard fare. Nothing special.",
    "A safe, boring choice."
  ],
  high: [
    "Now we're talking. Good balance.",
    "Impressive. You might have a soul.",
    "Solid mix. The customer looks happy.",
    "Not bad... for a rookie.",
    "Detecting high satisfaction levels.",
    "You're actually learning. Scarily efficient.",
    "That hits the spot. Well done."
  ],
  perfect: [
    "Flawless victory. A perfect blend.",
    "My logic circuits are overloaded. It's perfect.",
    "Divine nectar. Are you sure you're human?",
    "Optimization complete. Maximum bliss achieved.",
    "The perfect drink exists. You found it.",
    "Unbelievable. You beat the odds."
  ]
};

export const getBartenderReview = async (recipe: Recipe, score: number, turn: number): Promise<string> => {
  // Select pool based on score
  let pool = REVIEWS.mid;
  
  if (score < 40) {
    pool = REVIEWS.low;
  } else if (score >= 40 && score < 75) {
    pool = REVIEWS.mid;
  } else if (score >= 75 && score < 90) {
    pool = REVIEWS.high;
  } else if (score >= 90) {
    pool = REVIEWS.perfect;
  }

  // Pick a random response
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
};