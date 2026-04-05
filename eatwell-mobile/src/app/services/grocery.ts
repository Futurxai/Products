import { Injectable } from '@angular/core';

export interface GrocerySection {
  cat: string;
  icon: string;
  items: string[];
}

export const GROCERY_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Proteins', 'Dairy & Nuts', 'Spices'];

export const GROCERY_CAT_ICON: Record<string, string> = {
  'Vegetables': '🥦', 'Fruits': '🍎', 'Grains': '🌾',
  'Proteins': '🥩', 'Dairy & Nuts': '🥛', 'Spices': '🧂',
};

const GROCERY_KEYWORDS: [string, string[]][] = [
  ['Vegetables', ['spinach','broccoli','tomato','pepper','onion','carrot','cucumber','lettuce',
    'zucchini','mushroom','bok choy','capsicum','brinjal','drumstick','peas','potato',
    'cabbage','cauliflower','beans','beetroot','corn','kale','celery','asparagus',
    'spring onion','green chilli','curry leaves']],
  ['Fruits', ['banana','apple','mango','berries','lemon','avocado','citrus','orange',
    'papaya','grapes','cherry','strawberry','blueberry','raspberry','peach',
    'pear','pineapple','melon','watermelon','dates','fig']],
  ['Grains', ['rice','oat','bread','roti','paratha','pasta','noodle','quinoa','wheat',
    'poha','rava','idli','dosa','tortilla','cracker','granola','flour','barley',
    'millet','semolina','couscous','bulgur']],
  ['Proteins', ['chicken','salmon','tuna','egg','tofu','paneer','turkey','mutton','fish',
    'prawn','shrimp','beef','pork','lamb','crab','lobster','dal','lentil','chickpea',
    'rajma','moong','toor','masoor','black bean','kidney bean','sprout','tempeh',
    'soy','edamame']],
  ['Dairy & Nuts', ['yogurt','curd','milk','cheese','butter','cream','feta','ghee',
    'almond milk','oat milk','coconut milk','peanut','almond','walnut','cashew',
    'pistachio','nut','seed','tahini','coconut','pumpkin seed','chia','flaxseed']],
  ['Spices', ['sambar','chutney','masala','spice','turmeric','cumin','mustard','soy sauce',
    'honey','tamarind','ginger','garlic','coriander','basil','dill','olive oil',
    'sesame oil','vinegar','lemon juice','salt','pepper','chilli','mint','oregano',
    'bay leaf','cardamom','cinnamon','clove']],
];

@Injectable({
  providedIn: 'root',
})
export class GroceryService {

  categoriseIngredient(ing: string): string {
    const lower = ing.toLowerCase();
    for (const [cat, keywords] of GROCERY_KEYWORDS) {
      if (keywords.some(k => lower.includes(k))) return cat;
    }
    return 'Grains';
  }

  buildGroceryFromPlan(days: any[]): GrocerySection[] {
    const catMap: Record<string, Set<string>> = {};
    GROCERY_CATEGORIES.forEach(c => { catMap[c] = new Set(); });

    days.forEach(day => {
      (day.meals || []).forEach((meal: any) => {
        (meal.ingredients || []).forEach((ing: string) => {
          const cleaned = ing
            .replace(/^[\d½¼¾⅓⅔\s\/\.]+(?:cup|cups|tbsp|tsp|g|kg|ml|l|pcs?|pieces?|slices?|heads?|pinch|handful|can|bottle|loaf|bunch)\s*/i, '')
            .replace(/^\d+\s*[-–]\s*\d+\s*/, '')
            .trim();
          if (!cleaned || cleaned.length < 3) return;
          if (/^(salt|pepper|water|ice|oil and |for |to taste|as needed)/i.test(cleaned)) {
            catMap['Spices'].add(cleaned);
            return;
          }
          const cat = this.categoriseIngredient(cleaned);
          catMap[cat].add(cleaned);
        });
      });
    });

    return GROCERY_CATEGORIES
      .filter(c => catMap[c].size > 0)
      .map(c => ({
        cat: c,
        icon: GROCERY_CAT_ICON[c],
        items: [...catMap[c]].sort(),
      }));
  }

  buildGroceryData(weeklyPlanData: any[], currentWeekDay: number): { today: GrocerySection[], tomorrow: GrocerySection[], weekly: GrocerySection[] } {
    if (!weeklyPlanData.length) return { today: [], tomorrow: [], weekly: [] };
    const dayIdx = Math.min(currentWeekDay, weeklyPlanData.length - 1);
    const tomorrowIdx = Math.min(dayIdx + 1, weeklyPlanData.length - 1);
    return {
      today: this.buildGroceryFromPlan([weeklyPlanData[dayIdx]]),
      tomorrow: this.buildGroceryFromPlan([weeklyPlanData[tomorrowIdx]]),
      weekly: this.buildGroceryFromPlan(weeklyPlanData),
    };
  }
}
