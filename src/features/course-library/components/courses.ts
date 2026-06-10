export type CourseState = 'installed' | 'not_installed' | 'locked';

export type Course = {
  id: string;
  title: string;
  level: string;
  ages: string;
  teaches: string[];
  lessons: number;
  weeks: number;
  state: CourseState;
  completion: number;
  lcd: string;
  blurb: string;
};

export const COURSES: Course[] = [
  { id: 'c_hello',   title: 'Hello Friends',     level: 'Just starting',     ages: '4–6', teaches: ['Greetings','Names','Family','Feelings'],                    lessons: 24, weeks: 6, state: 'installed',     completion: 0.4, lcd: 'happy',   blurb: 'A warm first course. Robot teaches everyday hellos and how to talk about people you love.' },
  { id: 'c_animals', title: 'My Animal Friends', level: 'Just starting',     ages: '4–6', teaches: ['Animals','Sounds','Colors','Counting 1–10'],               lessons: 30, weeks: 7, state: 'installed',     completion: 0.0, lcd: 'idle',    blurb: 'Animals your child already loves, with simple sound games and color play.' },
  { id: 'c_food',    title: 'Yummy Words',       level: 'Building up',       ages: '5–7', teaches: ['Food','Asking politely','Likes & dislikes','Numbers 10–20'], lessons: 28, weeks: 7, state: 'not_installed', completion: 0,   lcd: 'speak',   blurb: 'Mealtime English — fruits, snacks, and gentle table phrases.' },
  { id: 'c_outside', title: 'Out & About',       level: 'Building up',       ages: '5–7', teaches: ['Weather','Clothes','Park & playground','Simple questions'], lessons: 32, weeks: 8, state: 'locked',        completion: 0,   lcd: 'gentle',  blurb: 'Words for sunny days, rainy days, and what to wear.' },
  { id: 'c_stories', title: 'Story Time',        level: 'Confident speaker', ages: '6–8', teaches: ['Story words','Past tense','Feelings (deeper)','Retelling'], lessons: 36, weeks: 9, state: 'locked',        completion: 0,   lcd: 'think',   blurb: 'Robot tells short stories your child can join in and retell.' },
];

export default COURSES;
