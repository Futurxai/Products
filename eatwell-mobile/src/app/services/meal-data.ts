import { Injectable } from '@angular/core';

export interface Meal {
  name: string; emoji: string; cal: number; p: number; c: number; f: number;
  time?: number; cuisine?: string;
  ingredients?: string[]; steps?: string[];
  type?: string; icon?: string; bg?: string; mealTime?: string;
}

export interface WeekDay {
  label: string; date: string;
  meals: Meal[];
}

@Injectable({ providedIn: 'root' })
export class MealDataService {

  readonly allCuisines = ['South Indian','North Indian','Continental','Chinese','Italian','Mexican','Thai','Japanese','Mediterranean','Middle Eastern'];

  readonly foodData = [
    { cat: 'Meat', items: ['Beef','Lamb','Pork','Mutton'] },
    { cat: 'Chicken', items: ['Chicken Breast','Chicken Thighs','Chicken Wings','Ground Chicken'] },
    { cat: 'Fish & Seafood', items: ['Salmon','Tuna','Shrimp','Crab','Lobster','Tilapia'] },
    { cat: 'Dairy Products', items: ['Milk','Cheese','Butter','Cream','Paneer'] },
    { cat: 'Eggs', items: ['Chicken Eggs','Duck Eggs','Quail Eggs'] },
    { cat: 'Vegetables', items: ['Spinach','Broccoli','Carrots','Tomatoes','Peppers'] },
    { cat: 'Fruits', items: ['Apples','Bananas','Mangoes','Berries','Citrus'] },
    { cat: 'Grains & Cereals', items: ['Rice','Wheat','Oats','Quinoa','Millet'] },
    { cat: 'Glucose-based Foods', items: ['Sugar','Honey','Jaggery','Syrup'] },
    { cat: 'Legumes', items: ['Lentils','Chickpeas','Black Beans','Kidney Beans'] },
  ];

  readonly onboardingSlides = [
    { title: 'Personalized Meal Planning', desc: 'Get a weekly diet plan tailored to your body, goals, and food preferences. No generic diets — only what works for you.', iconBg: '#DCFCE7', iconName: 'person-outline', btn: 'Next →' },
    { title: 'No More Calorie Confusion', desc: 'We calculate everything for you — daily calories, fat loss timeline, and what to eat. Just follow the plan, no tracking needed.', iconBg: '#FEF9C3', iconName: 'document-text-outline', btn: 'Next →' },
    { title: 'Eat What You Love', desc: 'Flexible Indian meal plans with your favourite foods. Easy to follow, realistic, and designed for long-term results.', iconBg: '#FCE7F3', iconName: 'heart-outline', btn: 'Get Started →' },
  ];

  readonly MEAL_DB: Record<string, Record<string, Meal[]>> = {
    'South Indian': {
      breakfast: [
        { name:'Idli with Sambar & Chutney', emoji:'🥣', cal:290, p:11, c:50, f:5, time:20, cuisine:'South Indian', ingredients:['4 soft idlis','½ cup toor dal','¼ cup tamarind pulp','Sambar powder 1 tsp','Mustard seeds, curry leaves','Coconut chutney'], steps:['Cook toor dal with tamarind, tomato, sambar powder.','Prepare tadka with mustard seeds and curry leaves.','Steam idli batter 10-12 mins.','Serve with sambar and coconut chutney.'] },
        { name:'Masala Dosa with Potato Filling', emoji:'🫓', cal:340, p:9, c:58, f:8, time:25, cuisine:'South Indian', ingredients:['2 dosas (from batter)','2 boiled potatoes','1 onion sliced','Mustard seeds, turmeric','Green chilli, curry leaves'], steps:['Spread dosa batter thin on hot tawa.','Sauté onion and potatoes with spices for filling.','Place filling, fold dosa golden.','Serve with sambar and chutney.'] },
        { name:'Upma with Vegetables', emoji:'🍚', cal:260, p:8, c:44, f:6, time:15, cuisine:'South Indian', ingredients:['1 cup rava','1 carrot diced','¼ cup peas','Mustard seeds, ginger','Lemon juice, coriander'], steps:['Dry roast rava until light golden.','Sauté onion, vegetables with mustard.','Add 2 cups water, boil, add rava.','Stir 5 mins, finish with lemon.'] },
      ],
      lunch: [
        { name:'Sambar Rice with Papad', emoji:'🍛', cal:420, p:16, c:72, f:8, time:30, cuisine:'South Indian', ingredients:['1 cup rice','½ cup toor dal','Drumstick, brinjal','Sambar powder 2 tsp','Tamarind, ghee for tadka'], steps:['Cook dal and vegetables.','Add tamarind, sambar powder, simmer.','Prepare ghee tadka, add to dal.','Serve over hot rice with papad.'] },
        { name:'Curd Rice with Pickle', emoji:'🥛', cal:320, p:12, c:55, f:7, time:10, cuisine:'South Indian', ingredients:['1 cup cooked rice','½ cup thick curd','Mustard seeds, ginger','Curry leaves, green chilli','Mango pickle'], steps:['Cool rice, mix with curd.','Prepare tadka with mustard, ginger.','Pour over curd rice.','Serve with pickle.'] },
        { name:'Lemon Rice', emoji:'🍚', cal:300, p:7, c:56, f:6, time:15, cuisine:'South Indian', ingredients:['1 cup cooked rice','2 tbsp lemon juice','Mustard seeds, turmeric','Curry leaves, peanuts','Green chilli'], steps:['Heat oil, add mustard and curry leaves.','Add turmeric and peanuts.','Toss with rice and lemon juice.','Garnish with coriander.'] },
      ],
      dinner: [
        { name:'Roti with Egg Curry', emoji:'🫓', cal:410, p:22, c:46, f:14, time:25, cuisine:'South Indian', ingredients:['3 whole wheat rotis','3 hard-boiled eggs','2 onions','2 tomatoes','Coconut milk ¼ cup','South Indian spices'], steps:['Make onion-tomato masala with spices.','Add coconut milk, simmer 5 mins.','Halve eggs, add to curry.','Serve with fresh rotis.'] },
        { name:'Pesarattu (Green Moong Dosa)', emoji:'🥬', cal:280, p:14, c:42, f:6, time:20, cuisine:'South Indian', ingredients:['1 cup green moong soaked','1 green chilli','Ginger small piece','Onion for topping','Cumin seeds'], steps:['Grind soaked moong with chilli.','Pour on hot tawa, spread thin.','Top with onion and cumin.','Serve with ginger chutney.'] },
      ],
      snacks: [
        { name:'Murukku & Masala Chai', emoji:'🫖', cal:180, p:4, c:28, f:7, time:5, cuisine:'South Indian', ingredients:['2-3 murukku','Masala tea with ginger','Cardamom'], steps:['Boil water with ginger and spices.','Add tea leaves and milk.','Strain and serve with murukku.'] },
        { name:'Sundal (Chickpea Stir-fry)', emoji:'🫘', cal:160, p:9, c:22, f:4, time:10, cuisine:'South Indian', ingredients:['½ cup boiled chickpeas','Mustard seeds, curry leaves','Grated coconut','Green chilli'], steps:['Heat oil, add mustard seeds.','Add chickpeas and curry leaves.','Toss with coconut, serve warm.'] },
      ],
    },
    'North Indian': {
      breakfast: [
        { name:'Aloo Paratha with Curd', emoji:'🫓', cal:380, p:10, c:58, f:14, time:20, cuisine:'North Indian', ingredients:['2 whole wheat parathas','2 mashed potatoes','Cumin, coriander powder','Green chilli, ginger','Butter, thick curd'], steps:['Mix mashed potato with spices.','Stuff into dough balls, roll flat.','Cook on tawa with butter.','Serve with curd and pickle.'] },
        { name:'Poha with Peanuts', emoji:'🍚', cal:290, p:8, c:50, f:7, time:12, cuisine:'North Indian', ingredients:['1 cup thick poha','¼ cup peanuts','1 onion','Mustard seeds, turmeric','Lemon juice, coriander'], steps:['Rinse and drain poha.','Roast peanuts. Sauté onion with mustard.','Add poha, turmeric, salt.','Finish with lemon and coriander.'] },
      ],
      lunch: [
        { name:'Dal Makhani + Jeera Rice', emoji:'🍛', cal:480, p:20, c:70, f:14, time:40, cuisine:'North Indian', ingredients:['1 cup black lentils','2 tbsp butter','1 cup cream','Tomatoes, ginger-garlic','Garam masala'], steps:['Pressure cook dal till soft.','Prepare tomato-butter gravy.','Simmer dal with cream 20 mins.','Serve with jeera rice.'] },
        { name:'Palak Paneer + Roti', emoji:'🥬', cal:420, p:20, c:44, f:18, time:30, cuisine:'North Indian', ingredients:['200g paneer','2 cups spinach','1 onion, 2 tomatoes','Ginger-garlic paste','Cream 2 tbsp','2 whole wheat rotis'], steps:['Blanch spinach, blend smooth.','Make onion-tomato masala.','Add spinach, paneer, cream. Simmer.','Serve with hot rotis.'] },
      ],
      dinner: [
        { name:'Rajma Chawal', emoji:'🍛', cal:440, p:18, c:72, f:8, time:35, cuisine:'North Indian', ingredients:['1 cup kidney beans (soaked)','Onion, tomato, garlic','Rajma masala 1.5 tsp','Basmati rice 1 cup','Ghee, coriander'], steps:['Pressure cook kidney beans.','Sauté onion-tomato masala.','Add beans, simmer 15 mins.','Serve with steamed rice.'] },
        { name:'Chole Bhature (Light)', emoji:'🫓', cal:460, p:16, c:68, f:14, time:30, cuisine:'North Indian', ingredients:['1 cup chickpeas','Onion, tomato, ginger','Chole masala, amchur','2 small bhature'], steps:['Cook chickpeas with masala.','Simmer in thick onion-tomato gravy.','Deep fry bhature golden.','Serve together.'] },
      ],
      snacks: [
        { name:'Samosa + Chai', emoji:'🫖', cal:200, p:5, c:26, f:9, time:5, cuisine:'North Indian', ingredients:['2 samosas','Masala chai','Mint chutney'], steps:['Serve samosas with chutney.','Prepare masala chai.','Enjoy as evening snack.'] },
      ],
    },
    'Continental': {
      breakfast: [
        { name:'Avocado Toast + Poached Eggs', emoji:'🥑', cal:360, p:16, c:32, f:18, time:15, cuisine:'Continental', ingredients:['2 slices multigrain bread','1 avocado','2 eggs','Lemon juice','Red chilli flakes'], steps:['Toast bread. Mash avocado with lemon.','Poach eggs 3 mins in simmering water.','Spread avocado, top with egg.','Season with chilli flakes.'] },
      ],
      lunch: [
        { name:'Grilled Chicken Caesar Salad', emoji:'🥗', cal:420, p:36, c:22, f:20, time:20, cuisine:'Continental', ingredients:['200g chicken breast','Romaine lettuce','Caesar dressing','Parmesan','Croutons'], steps:['Grill chicken 6-7 mins each side.','Toss lettuce with dressing.','Slice chicken over salad.','Top with parmesan and croutons.'] },
        { name:'Mushroom Pasta Primavera', emoji:'🍝', cal:440, p:16, c:68, f:12, time:22, cuisine:'Continental', ingredients:['100g pasta','200g mixed mushrooms','Cherry tomatoes','Olive oil, garlic','Parmesan, basil'], steps:['Cook pasta al dente.','Sauté mushrooms with garlic.','Add tomatoes, toss with pasta.','Finish with parmesan and basil.'] },
      ],
      dinner: [
        { name:'Baked Salmon with Roasted Veggies', emoji:'🐟', cal:500, p:38, c:45, f:19, time:25, cuisine:'Continental', ingredients:['200g salmon fillet','Broccoli 1 cup','Bell peppers 1 cup','Olive oil 2 tbsp','Garlic, lemon, dill'], steps:['Preheat oven 200°C.','Season salmon, toss veggies in oil.','Bake 18-20 mins together.','Garnish with dill and lemon.'] },
      ],
      snacks: [
        { name:'Greek Yogurt with Berries', emoji:'🍓', cal:160, p:12, c:20, f:4, time:3, cuisine:'Continental', ingredients:['150g Greek yogurt','½ cup mixed berries','1 tbsp honey','Granola'], steps:['Spoon yogurt.','Top with berries.','Drizzle honey, add granola.'] },
      ],
    },
    'Chinese': {
      breakfast: [
        { name:'Vegetable Congee', emoji:'🍲', cal:240, p:8, c:44, f:4, time:20, cuisine:'Chinese', ingredients:['½ cup rice','4 cups veggie broth','Ginger slices','Spring onion, soy sauce','Bok choy, sesame oil'], steps:['Simmer rice in broth with ginger 20 mins.','Add bok choy last 3 mins.','Drizzle soy and sesame oil.','Garnish with spring onion.'] },
      ],
      lunch: [
        { name:'Stir-Fried Tofu with Veggies', emoji:'🥡', cal:380, p:18, c:40, f:16, time:18, cuisine:'Chinese', ingredients:['200g firm tofu','Broccoli, bell peppers','Soy sauce 2 tbsp','Oyster sauce 1 tbsp','Garlic, ginger, sesame oil'], steps:['Press tofu, pan-fry until golden.','Stir-fry veggies in hot wok.','Add sauces and tofu.','Serve over steamed rice.'] },
      ],
      dinner: [
        { name:'Noodle Soup (Clear Broth)', emoji:'🍜', cal:340, p:16, c:52, f:8, time:22, cuisine:'Chinese', ingredients:['100g rice noodles','Chicken broth 2 cups','Bok choy, mushrooms','Soy sauce, ginger','Spring onion'], steps:['Boil broth with ginger and soy.','Cook noodles separately, drain.','Add veggies to broth.','Serve noodles with hot broth.'] },
      ],
      snacks: [
        { name:'Steamed Dim Sum (3 pcs)', emoji:'🥟', cal:150, p:7, c:22, f:4, time:10, cuisine:'Chinese', ingredients:['3 steamed dumplings','Soy-ginger dipping sauce'], steps:['Steam for 8-10 mins.','Serve with dipping sauce.'] },
      ],
    },
    'default': {
      breakfast: [
        { name:'Oatmeal with Berries & Almonds', emoji:'🥣', cal:350, p:12, c:52, f:10, time:10, cuisine:'Healthy', ingredients:['½ cup rolled oats','1 cup almond milk','½ cup mixed berries','2 tbsp almonds','1 tsp honey','Cinnamon'], steps:['Simmer almond milk in pan.','Add oats, cook 5 mins.','Top with berries and almonds.','Drizzle honey, sprinkle cinnamon.'] },
      ],
      lunch: [
        { name:'Quinoa Veggie Bowl', emoji:'🥗', cal:380, p:14, c:52, f:12, time:18, cuisine:'Healthy', ingredients:['¾ cup cooked quinoa','Chickpeas ½ cup','Cucumber, cherry tomatoes','Tahini dressing'], steps:['Cook quinoa, let cool.','Toss with veggies and chickpeas.','Drizzle tahini dressing.'] },
      ],
      dinner: [
        { name:'Grilled Paneer + Salad', emoji:'🧀', cal:390, p:28, c:22, f:20, time:20, cuisine:'Healthy', ingredients:['200g paneer','Mixed greens','Cherry tomatoes','Olive oil, lemon'], steps:['Grill paneer cubes golden.','Toss greens with dressing.','Top with paneer.'] },
      ],
      snacks: [
        { name:'Mixed Nuts & Seeds', emoji:'🥜', cal:160, p:6, c:10, f:13, time:1, cuisine:'Healthy', ingredients:['30g almonds','10g pumpkin seeds','10g walnuts'], steps:['Portion into a bowl.','Enjoy as is.'] },
      ],
    },
  };

  readonly QUICK_RECIPES: Record<string, Meal[]> = {
    breakfast: [
      { name:'Banana Oat Smoothie Bowl', emoji:'🍌', cal:290, p:9, c:52, f:7, time:5, cuisine:'Healthy', ingredients:['1 banana','½ cup rolled oats','½ cup milk','1 tbsp honey','Toppings: granola, berries'], steps:['Blend banana, oats and milk.','Pour into bowl.','Top with granola and berries.','Serve immediately.'] },
      { name:'Egg & Avocado Toast', emoji:'🥑', cal:340, p:16, c:28, f:18, time:8, cuisine:'Continental', ingredients:['2 slices whole wheat bread','1 avocado','2 eggs','Salt, chilli flakes','Lemon juice'], steps:['Toast bread. Mash avocado with lemon.','Fry or poach eggs.','Spread avocado on toast.','Top with egg and chilli flakes.'] },
      { name:'Greek Yogurt Parfait', emoji:'🍓', cal:260, p:14, c:36, f:6, time:3, cuisine:'Continental', ingredients:['200g Greek yogurt','¼ cup granola','½ cup mixed berries','1 tbsp honey'], steps:['Layer yogurt in a glass.','Add granola layer.','Top with berries.','Drizzle honey.'] },
      { name:'Idli with Coconut Chutney', emoji:'🥣', cal:250, p:9, c:46, f:4, time:12, cuisine:'South Indian', ingredients:['4 idlis (reheated)','Coconut chutney','Curry leaves tadka'], steps:['Steam or microwave idlis 2 min.','Heat chutney gently.','Prepare quick tadka.','Serve together.'] },
      { name:'Poha', emoji:'🍚', cal:270, p:7, c:48, f:6, time:12, cuisine:'North Indian', ingredients:['1 cup thick poha','1 onion diced','Mustard seeds, turmeric','Lemon juice, peanuts'], steps:['Rinse and drain poha.','Heat oil, add mustard seeds and peanuts.','Add onion, chilli, turmeric.','Toss in poha, squeeze lemon.'] },
      { name:'Overnight Oats', emoji:'🫙', cal:310, p:12, c:50, f:8, time:2, cuisine:'Healthy', ingredients:['½ cup oats','½ cup yogurt','¼ cup milk','1 tbsp chia seeds','Berries, honey'], steps:['Combine all in a jar night before.','Refrigerate overnight.','Stir and top with berries.','Ready in 2 min!'] },
    ],
    lunch: [
      { name:'Curd Rice', emoji:'🥛', cal:300, p:10, c:52, f:7, time:10, cuisine:'South Indian', ingredients:['1 cup cooked rice','½ cup thick curd','Mustard seeds, ginger','Curry leaves, salt'], steps:['Let rice cool slightly.','Mix with curd and salt.','Prepare quick tadka.','Pour over rice, serve.'] },
      { name:'Quinoa Salad Bowl', emoji:'🥗', cal:360, p:14, c:50, f:12, time:10, cuisine:'Continental', ingredients:['1 cup cooked quinoa','Cucumber, cherry tomatoes','Feta cheese','Olive oil, lemon'], steps:['Use leftover quinoa.','Chop vegetables.','Toss everything together.','Drizzle olive oil and lemon.'] },
      { name:'Bread Omelette', emoji:'🥚', cal:320, p:18, c:26, f:14, time:8, cuisine:'Continental', ingredients:['3 eggs','2 slices bread','1 onion, 1 chilli','Salt, pepper, butter'], steps:['Beat eggs with onion, chilli, salt.','Heat butter in pan, pour egg mix.','Place bread slices on top.','Flip once set, toast both sides.'] },
      { name:'Lemon Rice', emoji:'🍚', cal:280, p:6, c:52, f:6, time:10, cuisine:'South Indian', ingredients:['1 cup cooked rice','2 tbsp lemon juice','Mustard seeds, turmeric','Curry leaves, peanuts'], steps:['Heat oil, splutter mustard.','Add peanuts, turmeric.','Add rice, mix well.','Squeeze lemon, toss and serve.'] },
      { name:'Veggie Wrap', emoji:'🌮', cal:330, p:12, c:44, f:11, time:10, cuisine:'Continental', ingredients:['1 large tortilla','¼ cup hummus','Cucumber, carrots, bell pepper','Spinach, feta'], steps:['Warm tortilla.','Spread hummus.','Layer vegetables.','Roll tightly and serve.'] },
    ],
    snacks: [
      { name:'Mixed Nuts & Seeds', emoji:'🥜', cal:160, p:6, c:10, f:13, time:1, cuisine:'Healthy', ingredients:['20g almonds','10g walnuts','10g pumpkin seeds'], steps:['Portion into a small bowl.','Enjoy as is.'] },
      { name:'Apple with Peanut Butter', emoji:'🍎', cal:190, p:5, c:28, f:8, time:3, cuisine:'Healthy', ingredients:['1 medium apple','2 tbsp peanut butter','Pinch of cinnamon'], steps:['Core and slice the apple.','Arrange with peanut butter.','Sprinkle cinnamon.','Dip and enjoy.'] },
      { name:'Greek Yogurt & Honey', emoji:'🍯', cal:160, p:12, c:20, f:4, time:3, cuisine:'Healthy', ingredients:['150g Greek yogurt','1 tbsp honey','5-6 berries'], steps:['Spoon yogurt into bowl.','Top with berries.','Drizzle honey.','Serve chilled.'] },
      { name:'Sprouts Chaat', emoji:'🫘', cal:150, p:8, c:22, f:3, time:5, cuisine:'South Indian', ingredients:['½ cup boiled sprouts','Onion, tomato, chilli','Lemon juice, chaat masala'], steps:['Mix all ingredients.','Add lemon and masala.','Toss well.','Serve at room temperature.'] },
      { name:'Banana Smoothie', emoji:'🥤', cal:180, p:5, c:38, f:2, time:5, cuisine:'Healthy', ingredients:['1 banana','1 cup milk','1 tbsp peanut butter','Pinch of cinnamon'], steps:['Add all to blender.','Blend 30 seconds.','Pour into glass.','Drink immediately.'] },
    ],
    dinner: [
      { name:'Egg Bhurji & Roti', emoji:'🥚', cal:380, p:22, c:40, f:14, time:12, cuisine:'North Indian', ingredients:['3 eggs','1 onion','1 tomato','Green chilli, cumin','2 rotis (ready-made)'], steps:['Beat eggs. Heat oil, sauté onion 2 min.','Add tomato, cook 1 min.','Pour eggs, scramble.','Warm rotis and serve.'] },
      { name:'Dal Tadka (Express)', emoji:'🫙', cal:320, p:16, c:48, f:8, time:15, cuisine:'North Indian', ingredients:['1 cup masoor dal (soaked)','1 tomato, garlic-ginger paste','Cumin, turmeric','Ghee, mustard, curry leaves'], steps:['Pressure cook dal 3-4 whistles.','Mash. Add tomato paste, cook 2 min.','Prepare tadka with ghee, cumin.','Pour tadka over dal.'] },
      { name:'Pesarattu', emoji:'🥬', cal:280, p:13, c:40, f:6, time:15, cuisine:'South Indian', ingredients:['1 cup green moong (soaked)','Green chilli, ginger','Onion for topping','Cumin seeds, salt'], steps:['Grind soaked moong with chilli.','Heat tawa, pour thin crepe.','Top with onion and cumin.','Cook both sides 3 min.'] },
      { name:'Stir-Fry Veggies & Egg Rice', emoji:'🍳', cal:360, p:16, c:52, f:10, time:12, cuisine:'Chinese', ingredients:['1 cup cooked rice','2 eggs','Mixed veggies','Soy sauce, sesame oil','Garlic, spring onion'], steps:['Heat wok, fry garlic.','Add veggies, stir-fry 3 min.','Scramble eggs.','Add rice, soy sauce, toss.'] },
      { name:'Paneer Bhurji', emoji:'🧀', cal:340, p:20, c:18, f:20, time:12, cuisine:'North Indian', ingredients:['200g paneer (grated)','1 onion, 1 tomato','Green chilli, turmeric','Cumin, coriander'], steps:['Heat oil, add cumin and onion 2 min.','Add tomato and spices 2 min.','Add grated paneer, mix well.','Cook 3 min, garnish.'] },
    ],
  };

  readonly mealPools: Record<string, Meal[]> = {
    'Vegetarian': [
      { name:'Masala Oats Upma', emoji:'🥣', cal:290, p:10, c:48, f:7, time:15, cuisine:'South Indian', ingredients:['1 cup oats','1 onion','1 tomato','2 tbsp peas','Mustard seeds, curry leaves'], steps:['Heat oil, splutter mustard.','Add onion and tomato.','Add oats and water.','Cook 5 mins, serve.'] },
      { name:'Idli & Sambar', emoji:'🍚', cal:310, p:12, c:55, f:4, time:20, cuisine:'South Indian', ingredients:['4 idlis','½ cup toor dal','Tamarind paste','Sambar powder'], steps:['Prepare sambar.','Steam idlis.','Serve with sambar and chutney.'] },
    ],
    'Non-Vegetarian': [
      { name:'Egg Bhurji & Toast', emoji:'🥚', cal:340, p:20, c:28, f:16, time:10, cuisine:'North Indian', ingredients:['3 eggs','1 onion','1 tomato','Green chilli','Whole wheat toast x2'], steps:['Beat eggs.','Sauté onion, chilli, tomato.','Scramble eggs.','Serve with toast.'] },
      { name:'Oatmeal with Berries & Almonds', emoji:'🥣', cal:350, p:12, c:52, f:10, time:10, cuisine:'Healthy', ingredients:['½ cup oats','1 cup almond milk','½ cup berries','2 tbsp almonds','1 tsp honey'], steps:['Simmer almond milk, add oats.','Cook 5 mins.','Top with berries and almonds.','Drizzle honey.'] },
    ],
    'Vegan': [
      { name:'Overnight Chia Bowl', emoji:'🫙', cal:280, p:8, c:44, f:9, time:2, cuisine:'Healthy', ingredients:['3 tbsp chia seeds','1 cup oat milk','½ cup mango','1 tbsp maple syrup','Granola'], steps:['Mix chia with oat milk and syrup.','Refrigerate overnight.','Top with mango and granola.'] },
    ],
    'Keto': [
      { name:'Avocado Egg Cups', emoji:'🥑', cal:360, p:18, c:4, f:30, time:15, cuisine:'Healthy', ingredients:['2 avocados','4 eggs','Salt, pepper','Chilli flakes','Coriander'], steps:['Halve avocados.','Crack egg into each half.','Bake at 200°C 12-15 mins.','Season and garnish.'] },
    ],
  };

  readonly lunchPools: Record<string, Meal[]> = {
    'Vegetarian': [
      { name:'Rajma Chawal Bowl', emoji:'🍛', cal:440, p:18, c:70, f:8, time:35, cuisine:'North Indian', ingredients:['1 cup kidney beans','1 cup rice','Onion, tomato','Spices'], steps:['Cook rajma with spices.','Serve over rice.','Garnish with coriander.'] },
      { name:'Palak Paneer + Roti', emoji:'🥬', cal:420, p:20, c:44, f:18, time:30, cuisine:'North Indian', ingredients:['200g paneer','2 cups spinach','Onion, garlic, cream','2 rotis'], steps:['Blanch spinach.','Sauté onion-garlic, add spinach.','Add paneer and cream.','Serve with roti.'] },
    ],
    'Non-Vegetarian': [
      { name:'Grilled Chicken Salad Bowl', emoji:'🍗', cal:450, p:35, c:32, f:18, time:20, cuisine:'Continental', ingredients:['200g chicken breast','Lettuce','Cherry tomatoes','Olive oil','Lemon'], steps:['Grill chicken.','Slice over salad greens.','Drizzle olive oil and lemon.'] },
      { name:'Chicken Biryani (Light)', emoji:'🍚', cal:480, p:30, c:58, f:14, time:35, cuisine:'North Indian', ingredients:['200g chicken','1 cup basmati rice','Biryani masala','Onion, yogurt','Mint, saffron'], steps:['Marinate chicken.','Layer with rice.','Dum cook 20 mins.'] },
    ],
    'Vegan': [
      { name:'Lentil Dal + Brown Rice', emoji:'🫙', cal:380, p:16, c:60, f:6, time:30, cuisine:'South Indian', ingredients:['1 cup toor dal','1 cup brown rice','Tomatoes','Turmeric, cumin'], steps:['Cook dal with turmeric.','Prepare tadka.','Serve over rice.'] },
    ],
    'Keto': [
      { name:'Grilled Chicken + Salad', emoji:'🥗', cal:380, p:38, c:8, f:22, time:20, cuisine:'Continental', ingredients:['250g chicken breast','Mixed greens','Cucumber','Olive oil','Feta cheese'], steps:['Grill chicken.','Toss salad.','Top with chicken and feta.'] },
    ],
  };

  readonly detectedFoods = [
    { emoji:'🍛', name:'Chicken Biryani', cal:480, p:22, c:62, f:14, suggest:{ emoji:'🫙', name:'Lentil Dal + Brown Rice', cal:380, p:16, c:58, f:6 } },
    { emoji:'🍕', name:'Margherita Pizza', cal:520, p:18, c:72, f:18, suggest:{ emoji:'🥗', name:'Grilled Chicken Salad', cal:350, p:30, c:18, f:14 } },
    { emoji:'🍜', name:'Instant Noodles', cal:380, p:8, c:62, f:12, suggest:{ emoji:'🥣', name:'Oat Porridge + Egg', cal:310, p:16, c:42, f:9 } },
    { emoji:'🍟', name:'French Fries', cal:430, p:5, c:58, f:20, suggest:{ emoji:'🥦', name:'Roasted Veggies + Paneer', cal:280, p:18, c:22, f:14 } },
    { emoji:'🧆', name:'Samosa (2 pcs)', cal:350, p:6, c:44, f:16, suggest:{ emoji:'🫓', name:'Roti + Dal + Sabzi', cal:340, p:14, c:52, f:8 } },
  ];

  getPrimaryCuisine(profileCuisines: Set<string>, setupCuisines: Set<string>): string {
    const available = ['South Indian','North Indian','Continental','Chinese'];
    for (const c of profileCuisines) { if (available.includes(c)) return c; }
    for (const c of setupCuisines) { if (available.includes(c)) return c; }
    return 'default';
  }

  getMealsForCuisine(cuisine: string): { breakfast: Meal[], lunch: Meal[], dinner: Meal[], snacks: Meal[] } {
    const db = this.MEAL_DB[cuisine] || this.MEAL_DB['default'];
    return { breakfast: db['breakfast'], lunch: db['lunch'], dinner: db['dinner'], snacks: db['snacks'] };
  }

  getSwapOptionsForMeal(mealType: string, cuisine: string): Meal[] {
    const meals = this.getMealsForCuisine(cuisine);
    return (meals as any)[mealType.toLowerCase()] || meals.breakfast;
  }

  buildWeeklyPlan(cuisine: string): WeekDay[] {
    const meals = this.getMealsForCuisine(cuisine);
    const pick = (arr: Meal[]) => arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : this.MEAL_DB['default']['breakfast'][0];
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map((label, i) => ({
      label, date: 'Mar ' + (17 + i),
      meals: [
        { ...pick(meals.breakfast), type: 'Breakfast', icon: '🍳', mealTime: '8:00 AM' },
        { ...pick(meals.lunch), type: 'Lunch', icon: '🥗', mealTime: '1:00 PM' },
        { ...pick(meals.snacks), type: 'Snacks', icon: '🍎', mealTime: '4:00 PM' },
        { ...pick(meals.dinner), type: 'Dinner', icon: '🍽️', mealTime: '7:30 PM' },
      ]
    }));
  }

  calcBMI(h: number, w: number): number | null {
    if (!h || !w) return null;
    return +(w / ((h / 100) * (h / 100))).toFixed(1);
  }

  getBMIInfo(bmi: number | null): { cat: string, color: string, bg: string, advice: string, barPct: number } {
    if (!bmi) return { cat: 'Unknown', color: '#6b7280', bg: '#f3f4f6', advice: 'Enter your measurements', barPct: 0 };
    if (bmi < 18.5) return { cat: 'Underweight', color: '#1d4ed8', bg: '#eff6ff', advice: 'Aim to gain healthy weight', barPct: 25 };
    if (bmi < 25) return { cat: 'Healthy Weight', color: '#15803d', bg: '#f0fdf4', advice: 'Great! Maintain your weight', barPct: 50 };
    if (bmi < 30) return { cat: 'Overweight', color: '#b45309', bg: '#fffbeb', advice: 'A bit above healthy range', barPct: 72 };
    return { cat: 'Obese', color: '#dc2626', bg: '#fef2f2', advice: 'Weight loss recommended', barPct: 90 };
  }

  initDashMeals(cuisine: string): Meal[] {
    const meals = this.getMealsForCuisine(cuisine);
    const pick = (arr: Meal[]) => arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : this.MEAL_DB['default']['breakfast'][0];
    return [
      { ...pick(meals.breakfast), type: 'Breakfast', icon: '🍳', bg: '#fff3e0', mealTime: '8:00 AM' },
      { ...pick(meals.lunch), type: 'Lunch', icon: '🥗', bg: '#e8f5e9', mealTime: '1:00 PM' },
      { ...pick(meals.snacks), type: 'Snacks', icon: '🍎', bg: '#f3e5f5', mealTime: '4:00 PM' },
      { ...pick(meals.dinner), type: 'Dinner', icon: '🍽️', bg: '#e3f2fd', mealTime: '7:30 PM' },
    ];
  }
}
